/**
 * Patterns that are refused with a clear reason, even when the tests pass.
 *
 * - Plain JavaScript problems: no higher-order array methods where the
 *   point is to write the loop by hand.
 * - React problems: the mistakes an interviewer looks for. A list item
 *   without a `key`, the index used as a key in a list that can lose
 *   items, an effect that starts an interval, a timeout or a listener and
 *   never stops it, and state or props that are changed in place.
 */

import type { File } from "@babel/types";
import type { RiskyRule } from "@/data/types";

export interface BannedUse {
  message: string;
  /** Where it is in the parsed source. */
  start: number;
  end: number;
}

/** The array helpers that replace a loop. The hard rule of the app: write the loop. */
const ARRAY_HELPERS = new Set(["map", "filter", "reduce", "reduceRight", "forEach", "sort", "flat", "flatMap"]);

/** Array methods that change the array they are called on. */
const MUTATING = new Set(["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"]);

/** What an effect can start, what stops it, and how to say it. */
const STARTERS: Record<string, { stop: string; message: string }> = {
  setInterval: { stop: "clearInterval", message: "This interval is never cleared." },
  setTimeout: { stop: "clearTimeout", message: "This timeout is never cleared." },
  addEventListener: { stop: "removeEventListener", message: "This listener is never removed." },
};

type BNode = { type: string; start: number; end: number } & Record<string, unknown>;

function isBNode(value: unknown): value is BNode {
  return typeof value === "object" && value !== null && typeof (value as BNode).type === "string";
}

function walk(value: unknown, visit: (node: BNode) => void | false): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!isBNode(value)) return;
  // A visitor that gives back false does not want the inside of this node.
  if (visit(value) === false) return;
  for (const key of Object.keys(value)) {
    if (key === "loc" || key === "extra" || key === "leadingComments" || key === "trailingComments") continue;
    walk(value[key], visit);
  }
}

export interface BannedOptions {
  /** Refuse array helpers like map and filter. */
  plainLoops: boolean;
  /** Only report what starts at or after this offset: the new line, not the lines already accepted. */
  from: number;
  /** The React rules to apply. */
  risky?: RiskyRule[];
  /**
   * The length of the text that was really typed. What ends after it was
   * closed by the parser and is still being written, so it is not judged yet.
   */
  typedEnd?: number;
}

function isFunction(node: unknown): boolean {
  return isBNode(node) && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration");
}

/** The name of a called function: `useEffect(...)` and `React.useEffect(...)` both give "useEffect". */
function calleeName(call: BNode): string {
  const callee = call.callee as BNode;
  if (callee.type === "Identifier") return String(callee.name);
  if (callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression") {
    const property = callee.property as BNode;
    return callee.computed === true ? "" : String(property.name ?? "");
  }
  return "";
}

/** The variable at the root of `a`, `a.b`, `a.b[0]`. Null for anything that is not a plain chain from a name. */
function rootName(node: unknown): string | null {
  let at = node;
  while (isBNode(at) && (at.type === "MemberExpression" || at.type === "OptionalMemberExpression")) at = at.object;
  return isBNode(at) && at.type === "Identifier" ? String(at.name) : null;
}

// ------------------------------------------------------------------ list keys

/** The JSX elements a function gives back: its expression body, or what its return statements return. */
function returnedElements(fn: BNode): BNode[] {
  const out: BNode[] = [];
  const add = (value: unknown) => {
    if (!isBNode(value)) return;
    if (value.type === "JSXElement" || value.type === "JSXFragment") out.push(value);
    // c ? <A /> : <B /> and c && <A />
    if (value.type === "ConditionalExpression") {
      add(value.consequent);
      add(value.alternate);
    }
    if (value.type === "LogicalExpression") add(value.right);
  };
  const body = fn.body as BNode;
  if (body.type !== "BlockStatement") {
    add(body);
    return out;
  }
  walk(body.body, (node) => {
    // A function inside has its own returns.
    if (isFunction(node)) return false;
    if (node.type === "ReturnStatement") add(node.argument);
    return undefined;
  });
  return out;
}

function keyOf(element: BNode): { present: boolean; value: BNode | null; spread: boolean } {
  if (element.type === "JSXFragment") return { present: false, value: null, spread: false };
  const opening = element.openingElement as BNode;
  let spread = false;
  for (const attr of opening.attributes as BNode[]) {
    if (attr.type === "JSXSpreadAttribute") spread = true;
    if (attr.type !== "JSXAttribute" || String((attr.name as BNode).name) !== "key") continue;
    const raw = attr.value as BNode | null;
    const value = raw !== null && raw.type === "JSXExpressionContainer" ? (raw.expression as BNode) : raw;
    return { present: true, value, spread };
  }
  return { present: false, value: null, spread };
}

function checkLists(file: File, options: BannedOptions, typedEnd: number): BannedUse | null {
  const rules = options.risky ?? [];
  if (!rules.includes("list-key") && !rules.includes("index-key")) return null;
  let found: BannedUse | null = null;

  walk(file.program, (node) => {
    if (found !== null) return false;
    if (node.type !== "CallExpression" && node.type !== "OptionalCallExpression") return undefined;
    if (calleeName(node) !== "map") return undefined;
    const callback = (node.arguments as BNode[])[0];
    if (!isFunction(callback)) return undefined;
    const params = callback.params as BNode[];
    const indexName = params.length > 1 && params[1].type === "Identifier" ? String(params[1].name) : null;

    for (const element of returnedElements(callback)) {
      const opening = element.type === "JSXFragment" ? (element.openingFragment as BNode) : (element.openingElement as BNode);
      // The opening tag is still being written: its key can still come.
      if (opening.end > typedEnd || opening.start < options.from) continue;
      const key = keyOf(element);
      if (!key.present && !key.spread && rules.includes("list-key")) {
        found = {
          message: "Each item of a list needs a `key`, so React can tell the items apart when the list changes.",
          start: opening.start,
          end: opening.end,
        };
        return false;
      }
      if (key.present && rules.includes("index-key") && key.value !== null && key.value.type === "Identifier" && key.value.name === indexName) {
        found = {
          message:
            "The index is not a safe `key` in this list. When an item is removed, every item after it gets another key. Use something that belongs to the item, like its id.",
          start: key.value.start,
          end: key.value.end,
        };
        return false;
      }
    }
    return undefined;
  });
  return found;
}

// ------------------------------------------------------------ effect cleanup

function checkEffects(file: File, options: BannedOptions, typedEnd: number): BannedUse | null {
  if (!(options.risky ?? []).includes("effect-cleanup")) return null;
  let found: BannedUse | null = null;

  walk(file.program, (node) => {
    if (found !== null) return false;
    if (node.type !== "CallExpression" || calleeName(node) !== "useEffect") return undefined;
    const effect = (node.arguments as BNode[])[0];
    if (!isFunction(effect)) return undefined;
    const body = effect.body as BNode;
    // An effect that is still open is not finished: its cleanup can still come.
    // And only an effect that this input closed is new.
    if (body.type !== "BlockStatement" || body.end > typedEnd || body.end <= options.from) return undefined;

    // The cleanup: the function that the effect returns at its top level.
    const stops = new Set<string>();
    let cleanup: BNode | null = null;
    for (const statement of body.body as BNode[]) {
      if (statement.type === "ReturnStatement" && isFunction(statement.argument)) cleanup = statement.argument as BNode;
    }
    if (cleanup !== null) {
      walk(cleanup.body, (inner) => {
        if (inner.type === "CallExpression" || inner.type === "OptionalCallExpression") stops.add(calleeName(inner));
        return undefined;
      });
    }

    walk(body.body, (inner) => {
      if (found !== null) return false;
      // What the cleanup itself calls does not need a cleanup.
      if (inner === cleanup) return false;
      if (inner.type !== "CallExpression" && inner.type !== "OptionalCallExpression") return undefined;
      const starter = STARTERS[calleeName(inner)];
      if (starter === undefined || stops.has(starter.stop)) return undefined;
      found = {
        message: starter.message + " An effect that starts one must return a cleanup function that stops it.",
        start: inner.start,
        end: (inner.callee as BNode).end,
      };
      return false;
    });
    return undefined;
  });
  return found;
}

// ------------------------------------------------------------ state mutation

/** The names that hold state or props in this file. */
function ownedNames(file: File): { state: Set<string>; props: Set<string> } {
  const state = new Set<string>();
  const props = new Set<string>();

  walk(file.program, (node) => {
    // const [items, setItems] = useState(...)
    if (node.type === "VariableDeclarator" && isBNode(node.init) && node.init.type === "CallExpression") {
      const hook = calleeName(node.init);
      const id = node.id as BNode;
      if ((hook === "useState" || hook === "useReducer") && id.type === "ArrayPattern") {
        const first = (id.elements as (BNode | null)[])[0];
        if (first && first.type === "Identifier") state.add(String(first.name));
      }
    }
    // function List({ items }) and function List(props): a component starts with a capital letter.
    if (isFunction(node)) {
      const named = isBNode(node.id) ? String(node.id.name) : "";
      if (!/^[A-Z]/.test(named)) return undefined;
      const first = (node.params as BNode[])[0];
      if (!first) return undefined;
      if (first.type === "Identifier") props.add(String(first.name));
      if (first.type === "ObjectPattern") {
        for (const property of first.properties as BNode[]) {
          const value = property.type === "ObjectProperty" ? (property.value as BNode) : null;
          const target = value !== null && value.type === "AssignmentPattern" ? (value.left as BNode) : value;
          if (target !== null && target.type === "Identifier") props.add(String(target.name));
        }
      }
    }
    return undefined;
  });
  return { state, props };
}

function checkMutation(file: File, options: BannedOptions): BannedUse | null {
  if (!(options.risky ?? []).includes("state-mutation")) return null;
  const owned = ownedNames(file);
  if (owned.state.size === 0 && owned.props.size === 0) return null;
  let found: BannedUse | null = null;

  const what = (name: string) => (owned.state.has(name) ? "State" : "Props");
  const why = (name: string) =>
    owned.state.has(name)
      ? "State must not be changed in place, because React then sees no change. Build a new value and pass it to the setter."
      : "Props belong to the parent. A component must not change them.";

  walk(file.program, (node) => {
    if (found !== null) return false;
    if (node.start < options.from) {
      // An older line. Something new can still be inside it, so keep looking.
      if (node.end <= options.from) return false;
    }

    // items.push(x), items.sort()
    if ((node.type === "CallExpression" || node.type === "OptionalCallExpression") && node.start >= options.from) {
      const callee = node.callee as BNode;
      if (callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression") {
        const method = callee.computed === true ? "" : String((callee.property as BNode).name ?? "");
        const root = rootName(callee.object);
        if (MUTATING.has(method) && root !== null && (owned.state.has(root) || owned.props.has(root))) {
          found = {
            message: "You used `" + method + "`, which changes the original array. " + why(root),
            start: (callee.property as BNode).start,
            end: (callee.property as BNode).end,
          };
          return false;
        }
      }
    }

    // user.name = x, items[0] = y, count = 5, count++
    const target =
      node.type === "AssignmentExpression" ? (node.left as BNode) : node.type === "UpdateExpression" ? (node.argument as BNode) : null;
    if (target !== null && node.start >= options.from) {
      const root = rootName(target);
      if (root !== null && (owned.state.has(root) || owned.props.has(root))) {
        const direct = target.type === "Identifier";
        // A plain assignment to a prop name only changes the local name. That is odd, but it changes nothing outside.
        if (direct && !owned.state.has(root)) return undefined;
        found = {
          message: direct
            ? "State is changed with its setter, never by giving the variable a new value."
            : what(root) + " is changed in place here. " + why(root),
          start: target.start,
          end: target.end,
        };
        return false;
      }
    }
    return undefined;
  });
  return found;
}

/** The first banned thing in the code, or null. */
export function findBanned(file: File, options: BannedOptions): BannedUse | null {
  const typedEnd = options.typedEnd ?? Number.POSITIVE_INFINITY;

  if (options.plainLoops) {
    let found: BannedUse | null = null;
    walk(file.program, (node) => {
      if (found !== null) return false;
      if (node.type !== "CallExpression" && node.type !== "OptionalCallExpression") return undefined;
      const callee = node.callee as BNode;
      if (callee.type !== "MemberExpression" && callee.type !== "OptionalMemberExpression") return undefined;
      const property = callee.property as BNode;
      const name = callee.computed === true ? (property.type === "StringLiteral" ? String(property.value) : "") : String(property.name ?? "");
      if (!ARRAY_HELPERS.has(name) || property.start < options.from) return undefined;
      found = {
        message:
          "You used `" + name + "`. In this problem we write the loop by hand, so helpers like map, filter, reduce, forEach, sort and flat are not allowed.",
        start: property.start,
        end: property.end,
      };
      return false;
    });
    if (found !== null) return found;
  }

  if (options.risky === undefined || options.risky.length === 0) return null;
  // The first one in the text is the one to fix first.
  let first: BannedUse | null = null;
  for (const found of [checkMutation(file, options), checkLists(file, options, typedEnd), checkEffects(file, options, typedEnd)]) {
    if (found !== null && (first === null || found.start < first.start)) first = found;
  }
  return first;
}
