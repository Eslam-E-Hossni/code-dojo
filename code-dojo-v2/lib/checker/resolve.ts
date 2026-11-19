/**
 * Gives every declared name a position-based id, so that two programs can
 * be compared without caring what the names are.
 *
 *   const cache = new Map();          const seen = new Map();
 *   cache.set(key, 1);                seen.set(k, 1);
 *
 * Both declare "the first name of this scope", and both use it in the
 * second line. After this pass the two trees are identical.
 *
 * - A declared name becomes Bind { id }, a use of it becomes Ref { id }.
 * - A name that nothing declares (setTimeout, Map, JSON) stays as
 *   Global { name }: it must be written exactly.
 * - A name of the required API (the function the tests call) keeps its
 *   own name as its id, so it cannot be renamed.
 *
 * An id is "<scope path>#<position in the scope>". The scope path is made
 * from positions too, so a change deep inside one block does not shift
 * the ids of another block.
 */

import { isNode, signature, type CNode } from "./canon";

interface Scope {
  id: string;
  names: Map<string, string>;
  parent: Scope | null;
  /** How many scopes were opened inside this one. */
  kids: number;
}

function child(parent: Scope): Scope {
  return { id: parent.id + "." + parent.kids++, names: new Map(), parent, kids: 0 };
}

function lookup(scope: Scope | null, name: string): string | null {
  for (let s = scope; s !== null; s = s.parent) {
    const id = s.names.get(name);
    if (id !== undefined) return id;
  }
  return null;
}

class Resolver {
  constructor(private api: Set<string>) {}

  private declare(scope: Scope, name: string): void {
    if (scope.names.has(name)) return;
    const pinned = this.api.has(name) && scope.parent === null;
    scope.names.set(name, pinned ? "api:" + name : scope.id + "#" + scope.names.size);
  }

  /** Declares every name a pattern introduces: x, { a, b }, [first, ...rest]. */
  private declarePattern(scope: Scope, node: unknown): void {
    if (!isNode(node)) return;
    if (node.t === "Bind") this.declare(scope, String(node.name));
    else if (node.t === "Default" || node.t === "Rest" || node.t === "PatProp") this.declarePattern(scope, node.target);
    else if (node.t === "ObjPat") for (const prop of node.props as CNode[]) this.declarePattern(scope, prop);
    else if (node.t === "ArrPat") for (const item of node.items as (CNode | null)[]) this.declarePattern(scope, item);
  }

  /** The names of a block exist from its first line, so they are declared before the block is walked. */
  predeclare(scope: Scope, statements: CNode[]): void {
    for (const statement of statements) {
      if (statement.t === "Var") this.declarePattern(scope, statement.id);
      if (statement.t === "Import") for (const name of statement.names as CNode[]) this.declarePattern(scope, name.local);
    }
  }

  private forOf(node: CNode, outer: Scope, scope: Scope): void {
    if (node.kind !== "none") this.declarePattern(scope, node.elem);
    this.visit(node.elem, node.kind !== "none" ? scope : outer);
    this.visit(node.right, outer);
    this.visit(node.body, scope);
  }

  visit(value: unknown, scope: Scope): void {
    if (Array.isArray(value)) {
      for (const item of value) this.visit(item, scope);
      return;
    }
    if (!isNode(value)) return;
    const node = value;

    switch (node.t) {
      case "Id": {
        const name = String(node.name);
        const id = lookup(scope, name);
        if (id === null) {
          node.t = "Global";
        } else {
          node.t = "Ref";
          node.id = id;
          node._name = name;
          delete node.name;
        }
        return;
      }
      case "Bind": {
        const name = String(node.name);
        node.id = lookup(scope, name) ?? "free:" + name;
        node._name = name;
        delete node.name;
        return;
      }
      case "Block": {
        const inner = child(scope);
        this.predeclare(inner, node.body as CNode[]);
        this.visit(node.body, inner);
        return;
      }
      case "Fn": {
        // The parameters and the body share one scope.
        const inner = child(scope);
        for (const param of node.params as CNode[]) this.declarePattern(inner, param);
        const body = node.body as CNode;
        this.predeclare(inner, body.body as CNode[]);
        this.visit(node.params, inner);
        this.visit(body.body, inner);
        return;
      }
      case "For": {
        const inner = child(scope);
        const init = node.init as CNode | null;
        if (init !== null) this.predeclare(inner, init.t === "Block" ? (init.body as CNode[]) : [init]);
        if (init !== null && init.t === "Block") this.visit(init.body, inner);
        else this.visit(init, inner);
        this.visit(node.test, inner);
        this.visit(node.update, inner);
        this.visit(node.body, inner);
        // The same loop read as a for...of sits in the same place, so it gets the same scope id.
        if (isNode(node._ofForm)) {
          this.forOf(node._ofForm, scope, { id: inner.id, names: new Map(), parent: scope, kids: 0 });
        }
        return;
      }
      case "ForOf":
      case "ForIn":
        this.forOf(node, scope, child(scope));
        return;
      case "Catch": {
        const inner = child(scope);
        this.declarePattern(inner, node.param);
        this.visit(node.param, inner);
        this.visit(node.body, inner);
        return;
      }
      case "Switch": {
        this.visit(node.value, scope);
        const inner = child(scope);
        for (const item of node.cases as CNode[]) this.predeclare(inner, item.body as CNode[]);
        this.visit(node.cases, inner);
        return;
      }
      default:
        for (const key of Object.keys(node)) {
          if (key === "t" || key === "start" || key === "end" || key[0] === "_") continue;
          this.visit(node[key], scope);
        }
    }
  }
}

/** Puts the two sides of a + 1, a * b, a === b in one fixed order, so 1 + a and a + 1 are the same tree. */
function orderOperands(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) orderOperands(item);
    return;
  }
  if (!isNode(value)) return;
  for (const key of Object.keys(value)) {
    if (key === "t" || key === "start" || key === "end") continue;
    if (key[0] === "_" && key !== "_ofForm") continue;
    orderOperands(value[key]);
  }
  if (value.t === "Bin" && value._comm === true && signature(value.left) > signature(value.right)) {
    const left = value.left;
    value.left = value.right;
    value.right = left;
  }
}

/**
 * Resolves the names of a canonical tree, in place, and returns it.
 * `api` holds the names that cannot be renamed.
 */
export function resolve(tree: CNode, api: string[]): CNode {
  const root: Scope = { id: "s", names: new Map(), parent: null, kids: 0 };
  const resolver = new Resolver(new Set(api));
  // The top level is a scope of its own; its Block node must not open a second one.
  resolver.predeclare(root, tree.body as CNode[]);
  resolver.visit(tree.body, root);
  orderOperands(tree);
  return tree;
}
