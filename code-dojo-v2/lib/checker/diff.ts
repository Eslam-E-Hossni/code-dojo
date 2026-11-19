/**
 * Compares the learner's tree with the reference tree and finds the first
 * place where they differ.
 *
 * Most style differences are already gone (see canon.ts). The ones that
 * depend on both sides are decided here:
 *
 * - let or const: fine either way, unless the reference gives the variable
 *   a new value later. Then const is an error.
 * - arrow or function: the same, unless one of them uses `this` or
 *   `arguments`.
 * - a counting loop or for...of: the same, when the counter is only used
 *   to read the item.
 * - != null or !== null: the same, when the value can never be undefined.
 *   == and === are never the same.
 * - () => run() or () => { run(); }: the short arrow is accepted where the
 *   reference has the long one. Not the other way: that loses the value.
 */

import { ELEMENT, isNode, signature, type CNode } from "./canon";

export type DifferenceKind =
  | "missing"
  | "extra"
  | "type"
  | "value"
  | "operator"
  | "var"
  | "const-reassigned"
  | "arrow-this"
  | "function-this"
  | "loose-equality"
  | "loose-null"
  | "strict-null"
  | "name"
  | "api-name"
  | "global"
  | "for-of-index"
  | "jsx-tag"
  | "jsx-attr-missing"
  | "jsx-attr-extra";

export interface Difference {
  kind: DifferenceKind;
  /** The learner's node at the difference. Null when something is missing. */
  user: CNode | null;
  /** The reference node at the difference. Null when the learner wrote something extra. */
  ref: CNode | null;
  /** The learner's node that holds the difference, and the field it is in. */
  owner: CNode | null;
  key: string;
  /**
   * True when nothing the learner wrote is wrong: the code only stops
   * early, inside something that is still open.
   */
  unfinished: boolean;
}

export interface DiffContext {
  /** The length of the learner's text. A node that reaches it is still open. */
  length: number;
  /** Names already agreed for things declared outside this unit: reference name -> learner's name. */
  names: Record<string, string>;
  /** Ids of the names that the full reference solution assigns again after declaring them. */
  reassigned: Set<string>;
  /** Ids of the names that can never hold undefined in the reference solution. */
  defined: Set<string>;
  /**
   * Where the functions start that use `this` or `arguments` somewhere in
   * the full reference solution. A function that is still empty does not
   * show it yet, so the full solution is asked.
   */
  thisFunctions: Set<number>;
  /** Where the counting loops start that the full reference could write as a for...of. */
  ofLoops: Set<number>;
  /** Filled while comparing: reference name -> learner's name, for every declaration that matched. */
  pairs: Map<string, string>;
  /**
   * Filled while comparing, for a pair whose reference side is a piece of
   * code like `arr[i]`: where the loop ends in which it means the item.
   */
  pieceEnds: Map<string, number>;
}

/**
 * Something the reference has is not there. Is that only because the
 * learner is still typing, or did they move on without it?
 *
 * - A single missing piece (the value of `let x`, the else of an if) is
 *   unfinished when nothing was typed after its owner.
 * - A list (arguments, statements of a block) is unfinished when its closing
 *   bracket was not typed: we added it, so the owner ends after the text.
 * - The parameters of a function are finished as soon as its body starts.
 */
function isUnfinished(owner: CNode | null, key: string, isList: boolean, context: DiffContext): boolean {
  // The top level is never closed: more code can always follow.
  if (owner === null || owner._root === true) return true;
  if (!isList) return owner.end >= context.length;
  if (owner.t === "Fn" && key === "params") return isNode(owner.body) && owner.body.start >= context.length;
  return owner.end > context.length;
}

function difference(
  kind: DifferenceKind,
  user: CNode | null,
  ref: CNode | null,
  owner: CNode | null,
  key: string,
  unfinished = false,
): Difference {
  return { kind, user, ref, owner, key, unfinished };
}

function isNull(node: unknown): boolean {
  return isNode(node) && node.t === "Null";
}

/** For `x != null` against `x !== null`: is x a name that can never be undefined? */
function neverUndefined(binary: CNode, context: DiffContext): boolean {
  const other = isNull(binary.left) ? binary.right : binary.left;
  return isNode(other) && other.t === "Ref" && context.defined.has(String(other.id));
}

function compareList(user: unknown[], ref: unknown[], owner: CNode | null, key: string, context: DiffContext): Difference | null {
  const length = Math.max(user.length, ref.length);
  for (let i = 0; i < length; i++) {
    if (i >= user.length) {
      return difference("missing", null, isNode(ref[i]) ? (ref[i] as CNode) : null, owner, key, isUnfinished(owner, key, true, context));
    }
    const mine = user[i];
    // A hole stands for everything that is not written yet.
    if (isNode(mine) && mine.t === "Hole") return null;
    if (i >= ref.length) return difference("extra", isNode(mine) ? mine : null, null, owner, key);
    const found = compare(mine, ref[i], owner, key, context);
    if (found !== null) return found;
  }
  return null;
}

/**
 * A chain that is still being written: the learner has `load().then(a)` and
 * the reference goes on with `.catch(b)`. What is typed is the inside of
 * what the reference has, and it is the last thing typed, so it is right so
 * far. With a `;` after it the statement is closed, and it is not.
 */
function startsChain(user: CNode, ref: CNode, context: DiffContext): boolean {
  if (user.end < context.length) return false;
  let inner: unknown = ref;
  for (let depth = 0; depth < 12; depth++) {
    if (!isNode(inner)) return false;
    if (inner.t === "Call" || inner.t === "New") inner = inner.callee;
    else if (inner.t === "Member") inner = inner.object;
    else return false;
    if (!isNode(inner)) return false;
    // Tried on the side: a failed try must not leave name pairs behind.
    const scratch: DiffContext = { ...context, pairs: new Map(), pieceEnds: new Map() };
    if (compare(user, inner, null, "", scratch) === null) return true;
  }
  return false;
}

/**
 * The attributes of a JSX tag. Their order does not matter, so they are
 * matched by name. With a spread ({...props}) the order does matter,
 * because a later attribute wins, so then they are compared in order.
 */
function compareAttrs(user: CNode, ref: CNode, context: DiffContext): Difference | null {
  const mine = user.attrs as CNode[];
  const theirs = ref.attrs as CNode[];
  const ordered = mine.some((attr) => attr.t === "JsxSpread") || theirs.some((attr) => attr.t === "JsxSpread");
  if (ordered) return compareList(mine, theirs, user, "attrs", context);

  const wanted = new Map<string, CNode>();
  for (const attr of theirs) wanted.set(String(attr.name), attr);
  const seen = new Set<string>();
  for (const attr of mine) {
    const name = String(attr.name);
    const match = wanted.get(name);
    if (match === undefined) return difference("jsx-attr-extra", attr, null, user, "attrs");
    seen.add(name);
    const found = compare(attr.value, match.value, attr, "value", context);
    if (found !== null) return found;
  }
  for (const attr of theirs) {
    if (seen.has(String(attr.name))) continue;
    // While the opening tag is still being written, a missing attribute can still come.
    const tagOpen = typeof user._tagEnd === "number" && user._tagEnd > context.length;
    return difference("jsx-attr-missing", null, attr, user, "attrs", tagOpen);
  }
  return null;
}

function compareFields(user: CNode, ref: CNode, context: DiffContext, skip: string[] = []): Difference | null {
  const keys = new Set<string>();
  for (const key of Object.keys(ref)) keys.add(key);
  for (const key of Object.keys(user)) keys.add(key);
  for (const key of keys) {
    if (key === "t" || key === "start" || key === "end" || key[0] === "_" || skip.includes(key)) continue;
    const found = compare(user[key], ref[key], user, key, context);
    if (found !== null) return found;
  }
  return null;
}

export function compare(user: unknown, ref: unknown, owner: CNode | null, key: string, context: DiffContext): Difference | null {
  const userMissing = user === null || user === undefined;
  const refMissing = ref === null || ref === undefined;
  if (userMissing && refMissing) return null;
  if (isNode(user) && user.t === "Hole") return null;
  if (userMissing) return difference("missing", null, isNode(ref) ? ref : null, owner, key, isUnfinished(owner, key, false, context));
  if (refMissing) return difference("extra", isNode(user) ? user : null, null, owner, key);

  if (Array.isArray(user) || Array.isArray(ref)) {
    if (!Array.isArray(user) || !Array.isArray(ref)) return difference("type", null, null, owner, key);
    return compareList(user, ref, owner, key, context);
  }

  if (!isNode(user) || !isNode(ref)) {
    if (isNode(user) || isNode(ref)) return difference("type", isNode(user) ? user : null, isNode(ref) ? ref : null, owner, key);
    return user === ref ? null : difference("value", owner, owner, owner, key);
  }

  if (user.t !== ref.t) {
    // A counting loop that only reads the item is the same as a for...of.
    if (user.t === "ForOf" && ref.t === "For") {
      // A loop that does not read its item yet is still being written. What the
      // finished loop does with its counter is known from the full reference.
      const form = ref._ofForm;
      const fits = isNode(form) && (form._open !== true || context.ofLoops.has(ref.start));
      if (isNode(form) && fits) return compare(user, form, owner, key, context);
      return difference("for-of-index", user, ref, owner, key);
    }
    if (user.t === "For" && ref.t === "ForOf" && isNode(user._ofForm)) {
      return compare(user._ofForm, ref, owner, key, context);
    }
    if ((user.t === "Global" || user.t === "Ref") && (ref.t === "Global" || ref.t === "Ref")) {
      return difference("name", user, ref, owner, key);
    }
    // () => run() where the reference has () => { run(); }. The arrow now also gives the
    // value back, which a callback is free to do. The other way round is a missing return.
    if (user.t === "Return" && user._implicit === true && ref.t === "Expr") {
      return compare(user.arg, ref.expr, user, "arg", context);
    }
    if (startsChain(user, ref, context)) return difference("missing", null, ref, owner, key, true);
    // `list.length == 0` where the reference has `!list.length`: say what is wrong with ==,
    // not only that the two look different. (== null is its own case, and is fine.)
    if (user.t === "Bin" && (user.op === "==" || user.op === "!=") && !isNull(user.left) && !isNull(user.right)) {
      return difference("loose-equality", user, ref, owner, key);
    }
    return difference("type", user, ref, owner, key);
  }

  switch (user.t) {
    case "Bind":
      if (user.id !== ref.id) {
        return difference(String(ref.id).startsWith("api:") ? "api-name" : "name", user, ref, owner, key);
      }
      pairNames(user, ref, context);
      return null;

    case "Ref":
      return user.id === ref.id ? null : difference("name", user, ref, owner, key);

    case "Global": {
      if (user.name === ref.name) return null;
      // A helper from an earlier unit keeps the name the learner gave it there.
      if (context.names[String(ref.name)] === user.name) return null;
      return difference("global", user, ref, owner, key);
    }

    case "Var": {
      // `export` is the first word of the line, so a missing one is never "not typed yet".
      if (user.exported !== ref.exported) {
        const kind = user.exported === undefined ? "missing" : ref.exported === undefined ? "extra" : "value";
        return difference(kind, user, ref, user, "exported");
      }
      const mine = String(user.kind);
      const theirs = String(ref.kind);
      if (mine !== theirs) {
        if (mine === "var" || theirs === "var") return difference("var", user, ref, owner, key);
        const refId = isNode(ref.id) && ref.id.t === "Bind" ? String(ref.id.id) : "";
        if (mine === "const" && theirs === "let" && context.reassigned.has(refId)) {
          return difference("const-reassigned", user, ref, owner, key);
        }
      }
      return compareFields(user, ref, context, ["kind", "exported"]);
    }

    case "Fn": {
      const needsThis = user._this === true || ref._this === true || context.thisFunctions.has(ref.start);
      if (user._arrow !== ref._arrow && needsThis) {
        return difference(user._arrow === true ? "arrow-this" : "function-this", user, ref, owner, key);
      }
      return compareFields(user, ref, context);
    }

    case "For": {
      const direct = compareFields(user, ref, context);
      // Two counting loops that differ only in how they name the item: compare them as for...of.
      // A loop that does not read its item yet has only a guessed for...of form, which says
      // nothing here: a bare loop header would then stand for the header and the line after it.
      const userForm = user._ofForm;
      const refForm = ref._ofForm;
      if (direct !== null && isNode(userForm) && isNode(refForm) && userForm._open !== true && refForm._open !== true) {
        if (compare(userForm, refForm, owner, key, context) === null) return null;
      }
      return direct;
    }

    case "Jsx": {
      const mine = user.tag as CNode;
      const theirs = ref.tag as CNode;
      if (mine.t === "Str" && theirs.t === "Str") {
        if (mine.value !== theirs.value) return difference("jsx-tag", mine, theirs, user, "tag");
      } else {
        const tag = compare(mine, theirs, user, "tag", context);
        if (tag !== null) return tag;
      }
      const attrs = compareAttrs(user, ref, context);
      if (attrs !== null) return attrs;
      return compare(user.children, ref.children, user, "children", context);
    }

    case "Call":
    case "Member": {
      const direct = compareFields(user, ref, context);
      if (direct !== null && startsChain(user, ref, context)) return difference("missing", null, ref, owner, key, true);
      return direct;
    }

    case "Bin": {
      const mine = String(user.op);
      const theirs = String(ref.op);
      if (mine !== theirs) {
        const loose = (mine === "==" && theirs === "===") || (mine === "!=" && theirs === "!==");
        const strict = (mine === "===" && theirs === "==") || (mine === "!==" && theirs === "!=");
        if (loose || strict) {
          const withNull = (isNull(user.left) || isNull(user.right)) && (isNull(ref.left) || isNull(ref.right));
          if (withNull && neverUndefined(ref, context)) return compareFields(user, ref, context, ["op"]);
          if (withNull) return difference(loose ? "loose-null" : "strict-null", user, ref, owner, key);
          if (loose) return difference("loose-equality", user, ref, owner, key);
        }
        return difference("operator", user, ref, owner, key);
      }
      return compareFields(user, ref, context);
    }

    default:
      return compareFields(user, ref, context);
  }
}

/**
 * Remembers which name the learner chose for a name of the reference.
 * The item of a counting loop has no name: the code writes it `arr[i]`.
 * Against a for...of, that text is paired with the name of the loop variable.
 */
function pairNames(user: CNode, ref: CNode, context: DiffContext): void {
  const userMade = user._name === ELEMENT;
  const refMade = ref._name === ELEMENT;
  if (userMade && refMade) return;
  const mine = userMade ? user._reads : user._name;
  const theirs = refMade ? ref._reads : ref._name;
  if (typeof mine !== "string" || typeof theirs !== "string") return;
  context.pairs.set(theirs, mine);
  if (refMade && typeof ref._until === "number") context.pieceEnds.set(theirs, ref._until);
}

/** True when the two trees are the same code. */
export function sameCode(user: CNode, ref: CNode, context: DiffContext): boolean {
  return compare(user, ref, null, "", context) === null;
}

// ---------------------------------------------------- facts about a reference

/** Where the counting loops start that read their item and use the counter for nothing else. */
export function forOfStarts(tree: CNode): Set<number> {
  const out = new Set<number>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isNode(value)) return;
    if (value.t === "For" && isNode(value._ofForm) && value._ofForm._open !== true) out.add(value.start);
    for (const key of Object.keys(value)) {
      if (key !== "start" && key !== "end" && key[0] !== "_") walk(value[key]);
    }
  };
  walk(tree);
  return out;
}

/** Where the functions start that read `this` or `arguments`. */
export function thisFunctionStarts(tree: CNode): Set<number> {
  const out = new Set<number>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isNode(value)) return;
    if (value.t === "Fn" && value._this === true) out.add(value.start);
    for (const key of Object.keys(value)) {
      if (key !== "start" && key !== "end" && key[0] !== "_") walk(value[key]);
    }
  };
  walk(tree);
  return out;
}

/** The names that the code assigns again after declaring them (x = ..., x++, x += ...). */
export function reassignedIds(tree: CNode): Set<string> {
  const out = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isNode(value)) return;
    const target = value.t === "Assign" ? value.left : value.t === "Update" ? value.arg : null;
    if (isNode(target) && target.t === "Ref") out.add(String(target.id));
    for (const key of Object.keys(value)) {
      if (key !== "start" && key !== "end" && key[0] !== "_") walk(value[key]);
    }
  };
  walk(tree);
  return out;
}

const NEVER_UNDEFINED_CALLS = new Set(["setTimeout", "setInterval", "requestAnimationFrame", "Symbol", "String", "Number", "Boolean"]);

function isDefinedValue(node: unknown): boolean {
  if (!isNode(node)) return false;
  if (["Num", "Str", "Bool", "Null", "Array", "Object", "Fn", "New", "Concat", "Bin", "Class", "RegExp"].includes(node.t)) return true;
  if (node.t === "Unary") return node.op !== "void";
  if (node.t === "Cond") return isDefinedValue(node.cons) && isDefinedValue(node.alt);
  if (node.t === "Call") return isNode(node.callee) && node.callee.t === "Global" && NEVER_UNDEFINED_CALLS.has(String(node.callee.name));
  return false;
}

/** The names that always hold a real value: declared with one, and only ever given one. */
export function definedIds(tree: CNode): Set<string> {
  const declared = new Set<string>();
  const spoiled = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isNode(value)) return;
    if (value.t === "Var" && isNode(value.id) && value.id.t === "Bind") {
      if (isDefinedValue(value.init)) declared.add(String(value.id.id));
      else spoiled.add(String(value.id.id));
    }
    if (value.t === "Assign" && isNode(value.left) && value.left.t === "Ref" && !isDefinedValue(value.right)) {
      spoiled.add(String(value.left.id));
    }
    for (const key of Object.keys(value)) {
      if (key !== "start" && key !== "end" && key[0] !== "_") walk(value[key]);
    }
  };
  walk(tree);
  for (const id of spoiled) declared.delete(id);
  return declared;
}

export { signature };
