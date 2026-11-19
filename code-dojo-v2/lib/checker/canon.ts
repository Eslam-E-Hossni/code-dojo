/**
 * Turns a Babel AST into a small "canonical" tree.
 *
 * Two pieces of code that mean the same thing should give the same tree,
 * so that the checker compares meaning and not typing. These differences
 * disappear here:
 *
 *   x => y            (x) => y            (x) => { return y; }
 *   i++               i += 1              i = i + 1
 *   a > b             b < a
 *   `Hi ${name}`      "Hi " + name
 *   obj["key"]        obj.key
 *   { a }             { a: a }
 *   if (c) return a; else return b;       return c ? a : b;
 *   if (c) x = a; else x = b;             x = c ? a : b;
 *   let x; x = 5;                         let x = 5;
 *   const { a, b } = obj;                 const a = obj.a; const b = obj.b;
 *   let a = 1, b = 2;                     let a = 1; let b = 2;
 *   fn.call(this, ...args)                fn.apply(this, args)
 *   function f() {}                       const f = function () {};
 *   list.length > 0                       list.length        (as a condition)
 *
 * Whitespace, semicolons, quotes, trailing commas, comments and brackets
 * around one arrow parameter are already gone in the Babel AST.
 *
 * Three differences are kept as notes on the node and decided when two
 * trees are compared (see diff.ts), because they depend on the other side:
 * arrow or function (`_arrow`, `_this`), a counting loop that could be a
 * for...of (`_ofForm`), and an arrow that gives back its one expression
 * without the word return (`_implicit`).
 */

import type { File } from "@babel/types";
import { HOLE } from "./parse";

/** A node of the canonical tree. Keys that start with "_" are notes, not part of the meaning. */
export interface CNode {
  t: string;
  /** Where the node is in the parsed source. Not part of the meaning. */
  start: number;
  end: number;
  [key: string]: unknown;
}

type BNode = { type: string; start: number; end: number } & Record<string, unknown>;

function b(value: unknown): BNode {
  return value as BNode;
}

function bs(value: unknown): BNode[] {
  return Array.isArray(value) ? (value as BNode[]) : [];
}

function mk(t: string, at: { start: number; end: number }, fields: Record<string, unknown> = {}): CNode {
  return { t, start: at.start, end: at.end, ...fields };
}

export function isNode(value: unknown): value is CNode {
  return typeof value === "object" && value !== null && typeof (value as CNode).t === "string";
}

// ------------------------------------------------------------ expressions

const FLIP: Record<string, string> = { "===": "!==", "!==": "===", "==": "!=", "!=": "==" };
const COMMUTATIVE = new Set(["*", "===", "!==", "==", "!=", "&", "|", "^"]);
const COMPOUND: Record<string, string> = { "+=": "+", "-=": "-", "*=": "*", "/=": "/", "%=": "%", "**=": "**" };

function isStringy(node: CNode): boolean {
  return node.t === "Str" || node.t === "Concat";
}

function partsOf(node: CNode): CNode[] {
  return node.t === "Concat" ? (node.parts as CNode[]) : [node];
}

/** Joins the parts of a string: empty text goes, text next to text becomes one. */
function concat(parts: CNode[], at: { start: number; end: number }): CNode {
  const out: CNode[] = [];
  for (const part of parts) {
    if (part.t === "Str" && part.value === "") continue;
    const last = out.length > 0 ? out[out.length - 1] : null;
    if (part.t === "Str" && last !== null && last.t === "Str") {
      out[out.length - 1] = mk("Str", { start: last.start, end: part.end }, { value: String(last.value) + String(part.value) });
    } else {
      out.push(part);
    }
  }
  if (out.length === 0) return mk("Str", at, { value: "" });
  if (out.length === 1 && out[0].t === "Str") return out[0];
  return mk("Concat", at, { parts: out });
}

/** left + right. With text on either side it is a string being built, so the order matters. */
function plus(left: CNode, right: CNode, at: { start: number; end: number }): CNode {
  if (isStringy(left) || isStringy(right)) return concat([...partsOf(left), ...partsOf(right)], at);
  return mk("Bin", at, { op: "+", left, right, _comm: left.t === "Num" || right.t === "Num" });
}

function binary(op: string, left: CNode, right: CNode, at: { start: number; end: number }): CNode {
  if (op === "+") return plus(left, right, at);
  // a > b is b < a.
  if (op === ">") return mk("Bin", at, { op: "<", left: right, right: left, _comm: false });
  if (op === ">=") return mk("Bin", at, { op: "<=", left: right, right: left, _comm: false });
  return mk("Bin", at, { op, left, right, _comm: COMMUTATIVE.has(op) });
}

/** True for an expression that is always true or false, never some other value. */
function isBoolean(node: CNode): boolean {
  if (node.t === "Bool") return true;
  if (node.t === "Unary" && node.op === "!") return true;
  if (node.t === "Bin") return ["<", "<=", "===", "!==", "==", "!=", "in", "instanceof"].includes(String(node.op));
  if (node.t === "Logic" && node.op !== "??") return isBoolean(node.left as CNode) && isBoolean(node.right as CNode);
  return false;
}

function negate(arg: CNode, at: { start: number; end: number }): CNode {
  if (arg.t === "Bin") {
    const op = String(arg.op);
    if (FLIP[op] !== undefined) return { ...arg, start: at.start, end: at.end, op: FLIP[op] };
  }
  if (arg.t === "Unary" && arg.op === "!" && isBoolean(arg.arg as CNode)) return arg.arg as CNode;
  return mk("Unary", at, { op: "!", arg });
}

function isLength(node: CNode): boolean {
  return node.t === "Member" && (node.name === "length" || node.name === "size");
}

function isZero(node: CNode): boolean {
  return node.t === "Num" && node.value === 0;
}

/** `list.length === 0` is `!list.length`, as a value too: both are true exactly when the list is empty. */
function emptyCheck(node: CNode): CNode {
  if (node.t !== "Bin" || node.op !== "===") return node;
  const left = node.left as CNode;
  const right = node.right as CNode;
  if (isLength(left) && isZero(right)) return mk("Unary", node, { op: "!", arg: left });
  if (isLength(right) && isZero(left)) return mk("Unary", node, { op: "!", arg: right });
  return node;
}

function isUndefined(node: CNode): boolean {
  return node.t === "Id" && node.name === "undefined";
}

/** For `x === null` or `x === undefined`: the thing that is compared, and with which of the two. */
function nullSide(node: CNode, op: string): { target: CNode; what: "null" | "undefined" } | null {
  if (node.t !== "Bin" || node.op !== op) return null;
  const left = node.left as CNode;
  const right = node.right as CNode;
  for (const [target, other] of [[left, right], [right, left]]) {
    if (other.t === "Null") return { target, what: "null" };
    if (isUndefined(other)) return { target, what: "undefined" };
  }
  return null;
}

/**
 * `x === null || x === undefined` is `x == null`, and
 * `x !== null && x !== undefined` is `x != null`: the one place where the
 * loose operator is the usual way to write the check.
 */
function nullCheck(node: CNode): CNode {
  if (node.t !== "Logic") return node;
  const strict = node.op === "||" ? "===" : node.op === "&&" ? "!==" : null;
  if (strict === null) return node;
  const a = nullSide(node.left as CNode, strict);
  const b2 = nullSide(node.right as CNode, strict);
  if (a === null || b2 === null || a.what === b2.what) return node;
  if (!isSimpleTarget(a.target) || signature(a.target) !== signature(b2.target)) return node;
  return mk("Bin", node, { op: strict === "===" ? "==" : "!=", left: a.target, right: mk("Null", node), _comm: true });
}

/**
 * An expression used as a condition. There `list.length > 0`,
 * `list.length !== 0` and `list.length` say the same thing.
 */
function asCondition(node: CNode): CNode {
  if (node.t === "Logic") {
    return { ...node, left: asCondition(node.left as CNode), right: asCondition(node.right as CNode) };
  }
  if (node.t === "Unary" && node.op === "!") return negate(asCondition(node.arg as CNode), node);
  if (node.t === "Bin") {
    const left = node.left as CNode;
    const right = node.right as CNode;
    // 0 < x.length (written x.length > 0)
    if (node.op === "<" && isZero(left) && isLength(right)) return right;
    for (const [length, zero] of [[left, right], [right, left]]) {
      if (!isLength(length) || !isZero(zero)) continue;
      // Only the strict operators: == is never taken for ===, here as everywhere.
      if (node.op === "!==") return length;
      if (node.op === "===") return mk("Unary", node, { op: "!", arg: length });
    }
  }
  return node;
}

/** True when working out this expression can change something or run other code. */
function hasEffect(value: unknown): boolean {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (hasEffect(item)) return true;
    }
    return false;
  }
  if (!isNode(value)) return false;
  if (["Call", "New", "Assign", "Update", "Await", "Yield", "Fn"].includes(value.t)) return true;
  for (const key of Object.keys(value)) {
    if (key !== "start" && key !== "end" && key[0] !== "_" && hasEffect(value[key])) return true;
  }
  return false;
}

/**
 * `a > b ? a : b` picks the bigger one: it is Math.max(a, b). With the two
 * answers swapped it is Math.min(a, b). Only for plain values: with a call
 * inside, the ternary would run it twice.
 */
function extreme(test: CNode, cons: CNode, alt: CNode): "max" | "min" | null {
  if (test.t !== "Bin" || (test.op !== "<" && test.op !== "<=")) return null;
  if (hasEffect(test)) return null;
  // The test reads: small < big.
  const small = signature(test.left);
  const big = signature(test.right);
  const first = signature(cons);
  const second = signature(alt);
  if (first === big && second === small) return "max";
  if (first === small && second === big) return "min";
  return null;
}

function conditional(test: CNode, cons: CNode, alt: CNode, at: { start: number; end: number }): CNode {
  // c ? true : false is just c, when c is already true or false.
  if (cons.t === "Bool" && alt.t === "Bool" && isBoolean(test)) {
    if (cons.value === true && alt.value === false) return test;
    if (cons.value === false && alt.value === true) return negate(test, at);
  }
  const picked = extreme(test, cons, alt);
  if (picked !== null) return mk("Bin", at, { op: picked, left: cons, right: alt, _comm: true });
  return mk("Cond", at, { test, cons, alt });
}

/** A place that can be read twice without doing anything: x, obj.a, this.list. */
function isSimpleTarget(node: CNode): boolean {
  if (node.t === "Id" || node.t === "This") return true;
  if (node.t === "Member") {
    return isSimpleTarget(node.object as CNode) && (node.index === null || isSimpleTarget(node.index as CNode) || (node.index as CNode).t === "Num");
  }
  return false;
}

function keyOf(node: BNode, computed: boolean): { key: string | null; keyExpr: CNode | null } {
  if (!computed) {
    if (node.type === "Identifier") return { key: String(node.name), keyExpr: null };
    if (node.type === "StringLiteral") return { key: String(node.value), keyExpr: null };
    if (node.type === "NumericLiteral") return { key: String(node.value), keyExpr: null };
    if (node.type === "PrivateName") return { key: "#" + String(b(node.id).name), keyExpr: null };
  }
  if (node.type === "StringLiteral") return { key: String(node.value), keyExpr: null };
  return { key: null, keyExpr: expr(node) };
}

/** Does this function read `this` or `arguments`? Nested arrows count, nested functions do not. */
function usesThis(fn: BNode): boolean {
  let found = false;
  const walk = (value: unknown, top: boolean) => {
    if (found || typeof value !== "object" || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, false);
      return;
    }
    const node = value as BNode;
    if (typeof node.type !== "string") return;
    if (node.type === "ThisExpression" || node.type === "Super") found = true;
    if (node.type === "Identifier" && node.name === "arguments") found = true;
    if (node.type === "MetaProperty") found = true;
    const ownThis =
      node.type === "FunctionExpression" ||
      node.type === "FunctionDeclaration" ||
      node.type === "ObjectMethod" ||
      node.type === "ClassMethod" ||
      node.type === "ClassPrivateMethod" ||
      node.type === "ClassDeclaration" ||
      node.type === "ClassExpression";
    if (ownThis && !top) return;
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "extra" || key === "leadingComments" || key === "trailingComments") continue;
      walk(node[key], false);
    }
  };
  walk(fn, true);
  return found;
}

function fn(node: BNode): CNode {
  const params: CNode[] = [];
  for (const param of bs(node.params)) params.push(pattern(param));
  const rawBody = b(node.body);
  const body =
    rawBody.type === "BlockStatement"
      ? block(rawBody)
      : // x => value. The note says the return was not written out (see diff.ts).
        mk("Block", rawBody, { body: [mk("Return", rawBody, { arg: expr(rawBody), _implicit: true })] });
  return mk("Fn", node, {
    async: node.async === true,
    generator: node.generator === true,
    params,
    body,
    _arrow: node.type === "ArrowFunctionExpression",
    _this: usesThis(node),
  });
}

function classOf(node: BNode): CNode {
  const members: CNode[] = [];
  for (const member of bs(b(node.body).body)) {
    const computed = member.computed === true;
    if (member.type === "ClassMethod" || member.type === "ClassPrivateMethod") {
      members.push(mk("Method", member, { ...keyOf(b(member.key), computed), static: member.static === true, kind: member.kind, fn: fn(member) }));
    } else if (member.type === "ClassProperty" || member.type === "ClassPrivateProperty") {
      members.push(mk("Field", member, { ...keyOf(b(member.key), computed), static: member.static === true, value: member.value ? expr(b(member.value)) : null }));
    } else {
      members.push(generic(member));
    }
  }
  return mk("Class", node, { superClass: node.superClass ? expr(b(node.superClass)) : null, members });
}

function exprs(list: unknown): (CNode | null)[] {
  const out: (CNode | null)[] = [];
  for (const item of bs(list)) out.push(item === null ? null : expr(item));
  return out;
}

// ---------------------------------------------------------------------- JSX

/** The text of a JSX child as React shows it: every line is trimmed, and the lines are joined with one space. */
function jsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/[^ \t]/.test(lines[i])) lastNonEmpty = i;
  }
  let out = "";
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, " ");
    if (i !== 0) line = line.replace(/^ +/, "");
    if (i !== lines.length - 1) line = line.replace(/ +$/, "");
    if (line !== "") {
      if (i !== lastNonEmpty) line += " ";
      out += line;
    }
  }
  return out;
}

/** The name of a tag. A lower-case name is an HTML element, any other name is a component that must be in scope. */
function jsxTag(name: BNode): CNode {
  if (name.type === "JSXMemberExpression") {
    return mk("Member", name, { object: jsxTag(b(name.object)), name: String(b(name.property).name), index: null, optional: false });
  }
  if (name.type === "JSXNamespacedName") {
    return mk("Str", name, { value: String(b(name.namespace).name) + ":" + String(b(name.name).name) });
  }
  const text = String(name.name);
  if (/^[a-z]/.test(text) || text.includes("-")) return mk("Str", name, { value: text });
  return mk("Id", name, { name: text });
}

/** <Fragment> and <React.Fragment> without attributes are the same as <>. */
function isFragmentTag(tag: CNode): boolean {
  if (tag.t === "Id") return tag.name === "Fragment";
  if (tag.t !== "Member" || tag.name !== "Fragment") return false;
  const owner = tag.object as CNode;
  return owner.t === "Id" && owner.name === "React";
}

/** null, undefined and false: the values that React shows as nothing. */
function isNothing(node: BNode): boolean {
  if (node.type === "NullLiteral") return true;
  if (node.type === "BooleanLiteral") return node.value === false;
  return node.type === "Identifier" && node.name === "undefined";
}

function pushChild(children: CNode[], child: CNode): void {
  // Text next to text is one text.
  const last = children.length > 0 ? children[children.length - 1] : null;
  if (child.t === "Str" && last !== null && last.t === "Str") {
    children[children.length - 1] = { ...last, end: child.end, value: String(last.value) + String(child.value) };
    return;
  }
  children.push(child);
}

function jsxChildren(list: BNode[]): CNode[] {
  const out: CNode[] = [];
  for (const child of list) {
    if (child.type === "JSXText") {
      const text = jsxText(String(child.value));
      if (text !== "") pushChild(out, mk("Str", child, { value: text }));
      continue;
    }
    if (child.type === "JSXSpreadChild") {
      out.push(mk("Spread", child, { arg: expr(b(child.expression)) }));
      continue;
    }
    if (child.type !== "JSXExpressionContainer") {
      pushChild(out, expr(child));
      continue;
    }
    const inner = b(child.expression);
    // {} and {/* a comment */} show nothing.
    if (inner.type === "JSXEmptyExpression") continue;
    // {c ? <A /> : null} shows the same as {c && <A />}, when c is true or false and nothing else.
    // (With a number for c the two differ: 0 && <A /> shows a 0.)
    if (inner.type === "ConditionalExpression" && isNothing(b(inner.alternate))) {
      const test = expr(b(inner.test));
      if (isBoolean(test)) {
        pushChild(out, mk("Logic", inner, { op: "&&", left: test, right: expr(b(inner.consequent)) }));
        continue;
      }
    }
    const value = expr(inner);
    // A template or a joined string shows as its parts, one after the other.
    if (value.t === "Concat") {
      for (const part of value.parts as CNode[]) pushChild(out, part);
      continue;
    }
    pushChild(out, value);
  }
  return out;
}

/**
 * What an event handler returns is thrown away, so `() => save()` and
 * `() => { save(); }` are the same handler. Both become the second form.
 */
function asHandler(value: CNode): CNode {
  if (value.t !== "Fn" || !isNode(value.body)) return value;
  const body = value.body.body as CNode[];
  if (body.length !== 1 || body[0].t !== "Return" || body[0]._implicit !== true || !isNode(body[0].arg)) return value;
  const call = body[0].arg;
  if (call.t !== "Call") return value;
  return { ...value, body: { ...value.body, body: [mk("Expr", body[0], { expr: call })] } };
}

function jsxElement(node: BNode): CNode {
  if (node.type === "JSXFragment") {
    return mk("Jsx", node, {
      tag: mk("Str", b(node.openingFragment), { value: "" }),
      attrs: [],
      children: jsxChildren(bs(node.children)),
      _tagEnd: b(node.openingFragment).end,
    });
  }
  const opening = b(node.openingElement);
  let tag = jsxTag(b(opening.name));
  const attrs: CNode[] = [];
  for (const attr of bs(opening.attributes)) {
    if (attr.type === "JSXSpreadAttribute") {
      attrs.push(mk("JsxSpread", attr, { arg: expr(b(attr.argument)) }));
      continue;
    }
    const rawName = b(attr.name);
    const name =
      rawName.type === "JSXNamespacedName" ? String(b(rawName.namespace).name) + ":" + String(b(rawName.name).name) : String(rawName.name);
    let value: CNode;
    if (!attr.value) {
      // <input disabled /> is <input disabled={true} />.
      value = mk("Bool", attr, { value: true });
    } else {
      const raw = b(attr.value);
      value = raw.type === "JSXExpressionContainer" ? expr(b(raw.expression)) : expr(raw);
    }
    if (/^on[A-Z]/.test(name)) value = asHandler(value);
    attrs.push(mk("JsxAttr", attr, { name, value }));
  }
  if (isFragmentTag(tag) && attrs.length === 0) tag = mk("Str", opening, { value: "" });
  // `_tagEnd`: where the opening tag ends. After the typed text = the tag is still being written.
  return mk("Jsx", node, { tag, attrs, children: jsxChildren(bs(node.children)), _tagEnd: opening.end });
}

export function expr(node: BNode): CNode {
  switch (node.type) {
    case "JSXElement":
    case "JSXFragment":
      return jsxElement(node);
    case "ParenthesizedExpression":
      return expr(b(node.expression));
    case "Identifier":
      return node.name === HOLE ? mk("Hole", node) : mk("Id", node, { name: node.name });
    case "NumericLiteral":
      return mk("Num", node, { value: node.value });
    case "StringLiteral":
      return mk("Str", node, { value: node.value });
    case "BooleanLiteral":
      return mk("Bool", node, { value: node.value });
    case "NullLiteral":
      return mk("Null", node);
    case "BigIntLiteral":
      return mk("BigInt", node, { value: node.value });
    case "RegExpLiteral":
      return mk("RegExp", node, { pattern: node.pattern, flags: node.flags });
    case "TemplateLiteral": {
      const quasis = bs(node.quasis);
      const values = bs(node.expressions);
      const parts: CNode[] = [];
      for (let i = 0; i < quasis.length; i++) {
        const cooked = (quasis[i].value as { cooked?: string }).cooked ?? "";
        parts.push(mk("Str", quasis[i], { value: cooked }));
        if (i < values.length) parts.push(expr(values[i]));
      }
      const joined = concat(parts, node);
      // `${x}` alone still turns x into a string, so it is not just x.
      return joined.t === "Str" || joined.t === "Concat" ? joined : mk("Concat", node, { parts: [joined] });
    }
    case "BinaryExpression": {
      const op = String(node.operator);
      const left = expr(b(node.left));
      const right = expr(b(node.right));
      // x == undefined is x == null: the loose operator treats the two alike.
      if (op === "==" || op === "!=") {
        if (isUndefined(right)) return binary(op, left, mk("Null", b(node.right)), node);
        if (isUndefined(left)) return binary(op, right, mk("Null", b(node.left)), node);
      }
      return emptyCheck(binary(op, left, right, node));
    }
    case "LogicalExpression":
      return nullCheck(mk("Logic", node, { op: node.operator, left: expr(b(node.left)), right: expr(b(node.right)) }));
    case "UnaryExpression": {
      const arg = expr(b(node.argument));
      if (node.operator === "!") return negate(arg, node);
      if (node.operator === "-" && arg.t === "Num") return mk("Num", node, { value: -(arg.value as number) });
      return mk("Unary", node, { op: node.operator, arg });
    }
    case "UpdateExpression":
      return mk("Update", node, { op: node.operator, prefix: node.prefix === true, arg: expr(b(node.argument)) });
    case "AssignmentExpression": {
      const rawLeft = b(node.left);
      const op = String(node.operator);
      if (rawLeft.type === "ObjectPattern" || rawLeft.type === "ArrayPattern") {
        return mk("Assign", node, { op, left: pattern(rawLeft, false), right: expr(b(node.right)) });
      }
      const left = expr(rawLeft);
      const right = expr(b(node.right));
      // x += 1 is x = x + 1, when reading x twice changes nothing.
      if (COMPOUND[op] !== undefined && isSimpleTarget(left)) {
        return mk("Assign", node, { op: "=", left, right: binary(COMPOUND[op], left, right, node) });
      }
      return mk("Assign", node, { op, left, right });
    }
    case "ConditionalExpression":
      return conditional(asCondition(expr(b(node.test))), expr(b(node.consequent)), expr(b(node.alternate)), node);
    case "CallExpression":
    case "OptionalCallExpression": {
      const callee = expr(b(node.callee));
      const args = exprs(node.arguments) as CNode[];
      // Math.max(a, b) and Math.min(a, b) have the same form as the ternary that picks one of two.
      if (callee.t === "Member" && (callee.name === "max" || callee.name === "min") && args.length === 2) {
        const owner = callee.object as CNode;
        if (owner.t === "Id" && owner.name === "Math" && args[0].t !== "Spread" && args[1].t !== "Spread") {
          return mk("Bin", node, { op: String(callee.name), left: args[0], right: args[1], _comm: true });
        }
      }
      // fn.call(obj, a, ...rest) and fn.apply(obj, [a, ...rest]) are the same call. Both are
      // kept as apply with one list: the list itself for (obj, ...list) and for (obj, [...list]).
      if (callee.t === "Member" && callee.name === "call" && args.length >= 2) {
        const rest = args.slice(1);
        const list = rest.length === 1 && rest[0].t === "Spread" ? (rest[0].arg as CNode) : mk("Array", node, { items: rest });
        return mk("Call", node, { callee: { ...callee, name: "apply" }, args: [args[0], list], optional: node.optional === true });
      }
      if (callee.t === "Member" && callee.name === "apply" && args.length === 2 && args[1].t === "Array") {
        const items = args[1].items as (CNode | null)[];
        const only = items.length === 1 ? items[0] : null;
        if (only !== null && only.t === "Spread") {
          return mk("Call", node, { callee, args: [args[0], only.arg as CNode], optional: node.optional === true });
        }
      }
      return mk("Call", node, { callee, args, optional: node.optional === true });
    }
    case "NewExpression":
      return mk("New", node, { callee: expr(b(node.callee)), args: exprs(node.arguments) });
    case "MemberExpression":
    case "OptionalMemberExpression": {
      const key = keyOf(b(node.property), node.computed === true);
      return mk("Member", node, { object: expr(b(node.object)), name: key.key, index: key.keyExpr, optional: node.optional === true });
    }
    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return fn(node);
    case "ObjectExpression": {
      const props: CNode[] = [];
      for (const prop of bs(node.properties)) {
        if (prop.type === "SpreadElement") {
          props.push(mk("Spread", prop, { arg: expr(b(prop.argument)) }));
        } else if (prop.type === "ObjectMethod") {
          props.push(mk("Prop", prop, { ...keyOf(b(prop.key), prop.computed === true), kind: prop.kind, value: fn(prop) }));
        } else {
          props.push(mk("Prop", prop, { ...keyOf(b(prop.key), prop.computed === true), kind: "init", value: expr(b(prop.value)) }));
        }
      }
      return mk("Object", node, { props });
    }
    case "ArrayExpression":
      return mk("Array", node, { items: exprs(node.elements) });
    case "SpreadElement":
      return mk("Spread", node, { arg: expr(b(node.argument)) });
    case "AwaitExpression":
      return mk("Await", node, { arg: expr(b(node.argument)) });
    case "YieldExpression":
      return mk("Yield", node, { arg: node.argument ? expr(b(node.argument)) : null, delegate: node.delegate === true });
    case "ThisExpression":
      return mk("This", node);
    case "Super":
      return mk("Super", node);
    case "SequenceExpression":
      return mk("Seq", node, { items: exprs(node.expressions) });
    case "ClassExpression":
      return classOf(node);
    // Wrappers that do not change the value.
    case "ParenthesizedExpression":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
    case "TSTypeAssertion":
    case "TSInstantiationExpression":
      return expr(b(node.expression));
    default:
      return generic(node);
  }
}

/** A name that is being declared, or a shape that declares several. `declares` is false for an assignment like [a, b] = [b, a]. */
function pattern(node: BNode, declares = true): CNode {
  switch (node.type) {
    case "Identifier":
      if (node.name === HOLE) return mk("Hole", node);
      return declares ? mk("Bind", node, { name: node.name }) : mk("Id", node, { name: node.name });
    case "AssignmentPattern":
      return mk("Default", node, { target: pattern(b(node.left), declares), value: expr(b(node.right)) });
    case "RestElement":
      return mk("Rest", node, { target: pattern(b(node.argument), declares) });
    case "ObjectPattern": {
      const props: CNode[] = [];
      for (const prop of bs(node.properties)) {
        if (prop.type === "RestElement") props.push(pattern(prop, declares));
        else props.push(mk("PatProp", prop, { ...keyOf(b(prop.key), prop.computed === true), target: pattern(b(prop.value), declares) }));
      }
      return mk("ObjPat", node, { props });
    }
    case "ArrayPattern": {
      const items: (CNode | null)[] = [];
      for (const item of bs(node.elements)) items.push(item === null ? null : pattern(item, declares));
      return mk("ArrPat", node, { items });
    }
    case "TSParameterProperty":
      return pattern(b(node.parameter), declares);
    default:
      return declares ? generic(node) : expr(node);
  }
}

const SKIP = new Set([
  "type", "start", "end", "loc", "extra", "range", "leadingComments", "trailingComments", "innerComments",
  "typeAnnotation", "returnType", "typeParameters", "typeArguments", "optional", "definite", "declare", "accessibility",
]);

/** Any node this file has no special shape for: kept field by field. */
function generic(node: BNode): CNode {
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(node)) {
    if (SKIP.has(key)) continue;
    const value = node[key];
    if (Array.isArray(value)) {
      const list: unknown[] = [];
      for (const item of value) list.push(typeof item === "object" && item !== null && "type" in item ? anyNode(item as BNode) : item);
      fields[key] = list;
    } else if (typeof value === "object" && value !== null && "type" in value) {
      fields[key] = anyNode(value as BNode);
    } else if (typeof value !== "object" || value === null) {
      fields[key] = value;
    }
  }
  return mk(node.type, node, fields);
}

function anyNode(node: BNode): CNode {
  const type = node.type;
  if (type.endsWith("Statement") || type.endsWith("Declaration")) {
    const list = statement(node);
    return list.length === 1 ? list[0] : mk("Block", node, { body: list });
  }
  if (type.endsWith("Pattern") || type === "RestElement") return pattern(node);
  return expr(node);
}

// -------------------------------------------------------------- statements

function single(blockNode: CNode, t: string): CNode | null {
  const body = blockNode.body as CNode[];
  return body.length === 1 && body[0].t === t ? body[0] : null;
}

function isAssignTo(statementNode: CNode | null): { target: CNode; value: CNode } | null {
  if (statementNode === null || statementNode.t !== "Expr") return null;
  const assign = statementNode.expr as CNode;
  if (assign.t !== "Assign" || assign.op !== "=") return null;
  return { target: assign.left as CNode, value: assign.right as CNode };
}

/** The end of what the learner typed, while a tree is being made. See `canonical`. */
let typedEnd = Number.POSITIVE_INFINITY;

function ifStatement(node: BNode): CNode {
  const test = asCondition(expr(b(node.test)));
  const cons = block(b(node.consequent));
  // An empty else stays in the tree: "} else {" must not look the same as "}".
  const alt = node.alternate ? block(b(node.alternate)) : null;
  // A branch that the parser had to close is not finished: more lines can come into it.
  const whole = b(node.consequent).end <= typedEnd && (!node.alternate || b(node.alternate).end <= typedEnd);

  if (alt === null && whole) {
    // if (x > best) best = x;   ->   best = Math.max(best, x). Only this shape: any other "if" stays an if.
    const only = isAssignTo(single(cons, "Expr"));
    if (only !== null && isSimpleTarget(only.target)) {
      const picked = conditional(test, only.value, only.target, node);
      if (picked.t === "Bin" && (picked.op === "max" || picked.op === "min")) {
        return mk("Expr", node, { expr: mk("Assign", node, { op: "=", left: only.target, right: picked }) });
      }
    }
  }

  if (alt !== null && whole) {
    // if (c) return a; else return b;   ->   return c ? a : b;
    const a = single(cons, "Return");
    const z = single(alt, "Return");
    if (a !== null && z !== null && a.arg !== null && z.arg !== null) {
      return mk("Return", node, { arg: conditional(test, a.arg as CNode, z.arg as CNode, node) });
    }
    // if (c) x = a; else x = b;   ->   x = c ? a : b;
    const first = isAssignTo(single(cons, "Expr"));
    const second = isAssignTo(single(alt, "Expr"));
    if (first !== null && second !== null && isSimpleTarget(first.target) && signature(first.target) === signature(second.target)) {
      return mk("Expr", node, {
        expr: mk("Assign", node, { op: "=", left: first.target, right: conditional(test, first.value, second.value, node) }),
      });
    }
  }
  return mk("If", node, { test, cons, alt });
}

/** Every Id with this name in the tree, with what it sits in. */
function findUses(root: unknown, name: string, visit: (node: CNode, parent: CNode | null, key: string) => void): void {
  const walk = (value: unknown, parent: CNode | null, key: string) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item, parent, key);
      return;
    }
    if (!isNode(value)) return;
    if ((value.t === "Id" || value.t === "Bind") && value.name === name) visit(value, parent, key);
    for (const field of Object.keys(value)) {
      if (field[0] === "_" || field === "start" || field === "end") continue;
      walk(value[field], value, field);
    }
  };
  walk(root, null, "");
}

/** A copy of the tree with some nodes replaced. `swap` returns the new node, or null to keep going down. */
function rewrite(value: unknown, swap: (node: CNode) => CNode | null): unknown {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) out.push(rewrite(item, swap));
    return out;
  }
  if (!isNode(value)) return value;
  const replaced = swap(value);
  if (replaced !== null) return replaced;
  const copy: CNode = { t: value.t, start: value.start, end: value.end };
  for (const field of Object.keys(value)) {
    if (field === "t" || field === "start" || field === "end") continue;
    // Notes are plain values and are kept as they are. `_ofForm` is a tree of its
    // own: it gets its own copy, because names are resolved in place later, and a
    // tree that two loops share would be resolved twice.
    copy[field] = field[0] === "_" && field !== "_ofForm" ? value[field] : rewrite(value[field], swap);
  }
  return copy;
}

/** The name for the item of a for...of that was made from a counting loop. No real name can look like this. */
export const ELEMENT = "#item";

/**
 * for (let i = 0; i < list.length; i++) { ... list[i] ... }
 * can be read as for (const item of list) { ... item ... }, when i is used
 * for nothing but reading list[i]. Returns that reading, or null.
 */
function asForOf(loop: CNode): CNode | null {
  const init = loop.init as CNode | null;
  const test = loop.test as CNode | null;
  const update = loop.update as CNode | null;
  if (init === null || test === null || update === null) return null;
  if (init.t !== "Var" || (init.id as CNode).t !== "Bind") return null;
  const start = init.init as CNode | null;
  if (start === null || !isZero(start)) return null;
  const counter = String((init.id as CNode).name);

  // i < list.length
  if (test.t !== "Bin" || test.op !== "<") return null;
  const limit = test.right as CNode;
  const left = test.left as CNode;
  if (left.t !== "Id" || left.name !== counter || limit.t !== "Member" || limit.name !== "length") return null;
  const list = limit.object as CNode;
  if (!isSimpleTarget(list)) return null;
  const listKey = signature(list);

  // i = i + 1
  const step = update.t === "Assign" && update.op === "=" ? (update.right as CNode) : null;
  if (step === null || (update.left as CNode).t !== "Id" || (update.left as CNode).name !== counter) return null;
  if (step.t !== "Bin" || step.op !== "+") return null;
  const operands = [step.left as CNode, step.right as CNode];
  const one = operands.find((operand) => operand.t === "Num" && operand.value === 1);
  const self = operands.find((operand) => operand.t === "Id" && operand.name === counter);
  if (one === undefined || self === undefined) return null;

  // In the body, i may only appear as list[i], and only to be read.
  let reads = 0;
  let other = false;
  findUses(loop.body, counter, (node, parent, key) => {
    const isItem = parent !== null && parent.t === "Member" && key === "index" && signature(parent.object as CNode) === listKey;
    if (!isItem) other = true;
    else reads++;
  });
  if (other) return null;
  // list[i] = value writes to the list: a for...of cannot do that.
  let written = false;
  const lookForWrites = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) lookForWrites(item);
      return;
    }
    if (!isNode(value)) return;
    const target = value.t === "Assign" ? (value.left as CNode) : value.t === "Update" ? (value.arg as CNode) : null;
    if (target !== null && target.t === "Member" && isNode(target.index) && target.index.t === "Id" && target.index.name === counter) written = true;
    for (const field of Object.keys(value)) {
      if (field[0] !== "_" && field !== "start" && field !== "end") lookForWrites(value[field]);
    }
  };
  lookForWrites(loop.body);
  if (written) return null;

  let item = ELEMENT;
  let body = rewrite(loop.body, (node) => {
    const isItem = node.t === "Member" && isNode(node.index) && node.index.t === "Id" && node.index.name === counter && signature(node.object as CNode) === listKey;
    return isItem ? mk("Id", node, { name: ELEMENT }) : null;
  }) as CNode;

  // const item = list[i]; as the first line just gives the item its name.
  const statements = body.body as CNode[];
  const first = statements.length > 0 ? statements[0] : null;
  if (first !== null && first.t === "Var" && first.kind !== "var" && (first.id as CNode).t === "Bind" && isNode(first.init) && first.init.t === "Id" && first.init.name === ELEMENT) {
    item = String((first.id as CNode).name);
    body = rewrite({ ...body, body: statements.slice(1) }, (node) => (node.t === "Id" && node.name === ELEMENT ? mk("Id", node, { name: item }) : null)) as CNode;
  }

  const elem = mk("Bind", init.id as CNode, { name: item });
  // The item has no name of its own in this loop. Keep how the code writes it: arr[i].
  if (item === ELEMENT && list.t === "Id") elem._reads = String(list.name) + "[" + counter + "]";
  // That text means the item only inside this loop.
  elem._until = loop.end;
  const form = mk("ForOf", loop, { await: false, kind: "const", elem, right: list, body });
  // The item is not read (yet). A loop that is still being written may read it
  // later, or may turn out to need its counter: the full reference decides.
  form._open = reads === 0;
  return form;
}

/** The update of a for loop, or a statement that is only an update: i++ becomes i = i + 1. */
function asAssignment(node: BNode): CNode {
  if (node.type === "UpdateExpression") {
    const arg = expr(b(node.argument));
    if (isSimpleTarget(arg)) {
      const one = mk("Num", node, { value: 1 });
      return mk("Assign", node, { op: "=", left: arg, right: binary(node.operator === "++" ? "+" : "-", arg, one, node) });
    }
  }
  return expr(node);
}

function declarations(node: BNode): CNode[] {
  const out: CNode[] = [];
  const kind = String(node.kind);
  for (const declarator of bs(node.declarations)) {
    const id = b(declarator.id);
    const init = declarator.init ? expr(b(declarator.init)) : null;

    // const { a, b } = obj;  ->  const a = obj.a; const b = obj.b;
    if (id.type === "ObjectPattern" && init !== null && isSimpleTarget(init)) {
      const props = bs(id.properties);
      const plain = props.every((prop) => prop.type === "ObjectProperty" && prop.computed !== true && b(prop.value).type === "Identifier" && b(prop.key).type === "Identifier");
      if (plain && props.length > 0) {
        for (const prop of props) {
          const target = b(prop.value);
          out.push(mk("Var", prop, {
            kind,
            id: mk("Bind", target, { name: target.name }),
            init: mk("Member", prop, { object: init, name: String(b(prop.key).name), index: null, optional: false }),
          }));
        }
        continue;
      }
    }
    // const [a, b] = list;  ->  const a = list[0]; const b = list[1];
    if (id.type === "ArrayPattern" && init !== null && isSimpleTarget(init)) {
      const items = bs(id.elements);
      const plain = items.every((item) => item !== null && item.type === "Identifier");
      if (plain && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          out.push(mk("Var", items[i], {
            kind,
            id: mk("Bind", items[i], { name: items[i].name }),
            init: mk("Member", items[i], { object: init, name: null, index: mk("Num", items[i], { value: i }), optional: false }),
          }));
        }
        continue;
      }
    }
    out.push(mk("Var", declarator, { kind, id: pattern(id), init }));
  }
  return out;
}

function statement(node: BNode): CNode[] {
  switch (node.type) {
    case "VariableDeclaration":
      return declarations(node);
    case "FunctionDeclaration": {
      const id = b(node.id);
      return [mk("Var", node, { kind: "function", id: mk("Bind", id, { name: id.name }), init: fn(node) })];
    }
    case "ClassDeclaration": {
      const id = b(node.id);
      return [mk("Var", node, { kind: "class", id: mk("Bind", id, { name: id.name }), init: classOf(node) })];
    }
    case "ExpressionStatement": {
      const inner = b(node.expression);
      if (inner.type === "Identifier" && inner.name === HOLE) return [mk("Hole", node)];
      return [mk("Expr", node, { expr: asAssignment(inner) })];
    }
    case "ReturnStatement":
      return [mk("Return", node, { arg: node.argument ? expr(b(node.argument)) : null })];
    case "IfStatement":
      return [ifStatement(node)];
    case "ForStatement": {
      const rawInit = node.init ? b(node.init) : null;
      let init: CNode | null = null;
      if (rawInit !== null) {
        const list = rawInit.type === "VariableDeclaration" ? declarations(rawInit) : [mk("Expr", rawInit, { expr: asAssignment(rawInit) })];
        init = list.length === 1 ? list[0] : mk("Block", rawInit, { body: list });
      }
      const loop = mk("For", node, {
        init,
        test: node.test ? asCondition(expr(b(node.test))) : null,
        update: node.update ? asAssignment(b(node.update)) : null,
        body: block(b(node.body)),
      });
      loop._ofForm = asForOf(loop);
      return [loop];
    }
    case "ForOfStatement":
    case "ForInStatement": {
      const left = b(node.left);
      let kind = "none";
      let elem: CNode;
      if (left.type === "VariableDeclaration") {
        kind = String(left.kind);
        elem = pattern(b(bs(left.declarations)[0].id));
      } else {
        elem = pattern(left, false);
      }
      return [mk(node.type === "ForOfStatement" ? "ForOf" : "ForIn", node, {
        await: node.await === true,
        kind,
        elem,
        right: expr(b(node.right)),
        body: block(b(node.body)),
      })];
    }
    case "WhileStatement":
      return [mk("While", node, { test: asCondition(expr(b(node.test))), body: block(b(node.body)) })];
    case "DoWhileStatement":
      return [mk("DoWhile", node, { body: block(b(node.body)), test: asCondition(expr(b(node.test))) })];
    case "BlockStatement":
      return [block(node)];
    case "ThrowStatement":
      return [mk("Throw", node, { arg: expr(b(node.argument)) })];
    case "TryStatement": {
      const handler = node.handler ? b(node.handler) : null;
      return [mk("Try", node, {
        block: block(b(node.block)),
        handler: handler === null ? null : mk("Catch", handler, { param: handler.param ? pattern(b(handler.param)) : null, body: block(b(handler.body)) }),
        finalizer: node.finalizer ? block(b(node.finalizer)) : null,
      })];
    }
    case "BreakStatement":
    case "ContinueStatement":
      return [mk(node.type === "BreakStatement" ? "Break" : "Continue", node, { label: node.label ? String(b(node.label).name) : null })];
    case "SwitchStatement": {
      const cases: CNode[] = [];
      for (const item of bs(node.cases)) {
        cases.push(mk("Case", item, { test: item.test ? expr(b(item.test)) : null, body: statements(bs(item.consequent)) }));
      }
      return [mk("Switch", node, { value: expr(b(node.discriminant)), cases })];
    }
    case "LabeledStatement":
      return [mk("Label", node, { label: String(b(node.label).name), body: block(b(node.body)) })];
    case "EmptyStatement":
    case "DebuggerStatement":
    // Types do not change what the code does.
    case "TSInterfaceDeclaration":
    case "TSTypeAliasDeclaration":
    case "TSDeclareFunction":
      return [];
    case "ExportNamedDeclaration": {
      if (!node.declaration) return [generic(node)];
      // `exported` is part of what the line means: the preview and the tests import this name.
      const made = statement(b(node.declaration));
      for (const item of made) {
        if (item.t === "Var") item.exported = "named";
      }
      return made;
    }
    case "ExportDefaultDeclaration": {
      const inner = b(node.declaration);
      if ((inner.type === "FunctionDeclaration" || inner.type === "ClassDeclaration") && inner.id) {
        const made = statement(inner);
        for (const item of made) {
          if (item.t === "Var") item.exported = "default";
        }
        return made;
      }
      return [mk("ExportDefault", node, { value: anyNode(inner) })];
    }
    case "ImportDeclaration": {
      const names: CNode[] = [];
      for (const spec of bs(node.specifiers)) {
        const local = b(spec.local);
        const imported =
          spec.type === "ImportDefaultSpecifier" ? "default" : spec.type === "ImportNamespaceSpecifier" ? "*" : String(b(spec.imported).name ?? b(spec.imported).value);
        // `import React, { useState } from "react"`: the default import is not needed for JSX
        // any more, so it changes nothing when it is there.
        if (imported === "default" && local.name === "React" && String(b(node.source).value) === "react") continue;
        names.push(mk("ImportName", spec, { imported, local: mk("Bind", local, { name: local.name }) }));
      }
      // { useState, useEffect } and { useEffect, useState } import the same things.
      names.sort((first, second) => (String(first.imported) < String(second.imported) ? -1 : String(first.imported) > String(second.imported) ? 1 : 0));
      if (names.length === 0 && bs(node.specifiers).length > 0) return [];
      return [mk("Import", node, { source: String(b(node.source).value), names })];
    }
    default:
      return [generic(node)];
  }
}

/** A list of statements, with the pairs that say one thing joined into one. */
function statements(list: BNode[]): CNode[] {
  const flat: CNode[] = [];
  for (const item of list) {
    for (const made of statement(item)) flat.push(made);
  }

  const out: CNode[] = [];
  for (let i = 0; i < flat.length; i++) {
    const current = flat[i];
    const next = i + 1 < flat.length ? flat[i + 1] : null;

    // let x; x = 5;   ->   let x = 5;
    if (current.t === "Var" && current.init === null && current.kind !== "const" && (current.id as CNode).t === "Bind" && next !== null) {
      const assign = isAssignTo(next);
      if (assign !== null && assign.target.t === "Id" && assign.target.name === (current.id as CNode).name) {
        out.push({ ...current, end: next.end, init: assign.value });
        i++;
        continue;
      }
    }
    // if (c) return a;  return b;   ->   return c ? a : b;   (only as the last two lines of a block)
    if (current.t === "If" && current.alt === null && next !== null && next.t === "Return" && next.arg !== null && i + 2 === flat.length) {
      const early = single(current.cons as CNode, "Return");
      if (early !== null && early.arg !== null) {
        out.push(mk("Return", { start: current.start, end: next.end }, {
          arg: conditional(current.test as CNode, early.arg as CNode, next.arg as CNode, current),
        }));
        i++;
        continue;
      }
    }
    out.push(current);
  }
  return out;
}

/** A block. A single statement where a block could be (if (x) return;) is wrapped in one. */
function block(node: BNode): CNode {
  if (node.type === "BlockStatement") return mk("Block", node, { body: statements(bs(node.body)) });
  return mk("Block", node, { body: statements([node]) });
}

/** The canonical tree of a whole file. */
/**
 * `typedLength` is the length of the text the learner really typed. A block
 * that ends after it was closed by the parser, not by the learner: it is
 * still being written, so it is not folded into a shorter form yet.
 */
export function canonical(file: File, typedLength = Number.POSITIVE_INFINITY): CNode {
  const program = b(file.program);
  const before = typedEnd;
  typedEnd = typedLength;
  try {
    return mk("Block", program, { body: statements(bs(program.body)), _root: true });
  } finally {
    typedEnd = before;
  }
}

// ---------------------------------------------------------------- signature

/** The tree as text, without positions and notes. Two nodes with the same signature are the same code. */
export function signature(value: unknown): string {
  if (Array.isArray(value)) {
    let out = "[";
    for (let i = 0; i < value.length; i++) out += (i > 0 ? "," : "") + signature(value[i]);
    return out + "]";
  }
  if (!isNode(value)) return JSON.stringify(value === undefined ? null : value);
  let out = "{" + value.t;
  for (const key of Object.keys(value).sort()) {
    if (key === "t" || key === "start" || key === "end" || key[0] === "_") continue;
    out += "," + key + ":" + signature(value[key]);
  }
  return out + "}";
}
