import type { CodeProblem } from "../types";

export const functionCall: CodeProblem = {
  id: "function-call",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Function.prototype.call",
  difficulty: "medium",
  tag: "polyfill",
  statement:
    "Write your own call, as Function.prototype.myCall. Do not use call, apply or bind inside it.",
  examples: [
    'const user = { name: "Islam" };',
    "function greet(greeting) {",
    '  return greeting + ", " + this.name;',
    "}",
    'greet.myCall(user, "Hello"); // "Hello, Islam"',
  ],
  askFirst: [
    "What should happen when the context is null or undefined?",
    "Can I use the spread operator?",
    "Can the context be a primitive, like a number?",
  ],
  edgeCases: [
    "context is null or undefined: use the global object",
    "context is a primitive like 5",
    "The object must not keep the temporary property",
  ],
  parts: [
    {
      id: "main",
      title: "myCall",
      signature: "Function.prototype.myCall(context, ...args)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: method على كل الدوال، بتاخد الـ `this` اللي عايزينه وبعده القيم واحدة واحدة.",
          expected: "Function.prototype.myCall = function (context, ...args) {",
          hint1: "`Function.prototype.myCall` بيساوي `function` بتاخد `context` و rest parameter اسمه `args`.",
          hint2: "Function._________.myCall = function (_______, ...____) {",
          explain: "myCall takes the this value, then the arguments one by one.",
        },
        {
          coach:
            "الحيلة كلها إننا هنحط الدالة جوه الـ object وننادي عليها من هناك. فلازم يبقى عندنا object: لو الـ `context` فاضي ناخد الـ global، وغير كده نحوّله لـ object.",
          expected: "  const target = context === null || context === undefined ? globalThis : Object(context);",
          accept: ["const target = context == null ? globalThis : Object(context);"],
          hint1:
            "`const` اسمه `target`، وقيمته ternary: لو `context` بيساوي `null` أو `undefined` يبقى `globalThis`، غير كده `Object(context)`.",
          hint2: "const ______ = _______ === ____ || _______ === _________ ? __________ : Object(_______);",
          explain:
            "The trick is to call the function as a method of the object. So I need an object: the global one for null or undefined, and Object(context) for primitives.",
        },
        {
          coach: "محتاجين اسم مؤقت للـ property ميتخانقش مع أي اسم موجود في الـ object.",
          expected: "  const key = Symbol();",
          accept: ['const key = Symbol("fn");'],
          hint1: "`const` اسمه `key` وقيمته `Symbol()`.",
          hint2: "const ___ = ______();",
          explain: "A Symbol is a key that cannot clash with any property the object already has.",
        },
        {
          coach: "حط الدالة الأصلية، اللي هي `this` هنا، جوه الـ object تحت الاسم المؤقت.",
          expected: "  target[key] = this;",
          hint1: "`target[key]` بيساوي `this`.",
          hint2: "______[___] = ____;",
          explain: "I put the function on the object under that key.",
        },
        {
          coach: "ناديها من الـ object بالقيم واحفظ الناتج. النداء بالشكل ده هو اللي بيخلّي `this` تبقى الـ object.",
          expected: "  const result = target[key](...args);",
          hint1: "`const` اسمه `result` وقيمته نداء `target[key]` وجواه `args` بالـ spread.",
          hint2: "const ______ = ______[___](...____);",
          explain: "Calling it as a method makes this the object.",
        },
        {
          coach: "نضّف وراك: امسح الـ property المؤقتة من الـ object.",
          expected: "  delete target[key];",
          hint1: "`delete` على `target[key]`.",
          hint2: "______ ______[___];",
          explain: "Then I remove the temporary property,",
        },
        {
          coach: "رجّع ناتج الدالة واقفل الـ method، ومعاها semicolon. سطرين.",
          expected: "  return result;\n};",
          hint1: "`return result`، وبعدها قوس قفل ومعاه semicolon.",
          hint2: "return ______;\n_;",
          explain: "and return the result.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "calls the function with the given this",
      code: `
const user = { name: "Islam" };
function getName() {
  return this.name;
}
expect(getName.myCall(user)).toBe("Islam");`,
    },
    {
      name: "passes the arguments one by one",
      code: `
const fn = spy();
fn.myCall({}, 1, "two", [3]);
expect(fn.calls, "calls to the function").toEqual([[1, "two", [3]]]);`,
    },
    {
      name: "returns what the function returns",
      code: `
function add(a, b) {
  return this.base + a + b;
}
expect(add.myCall({ base: 10 }, 1, 2)).toBe(13);`,
    },
    {
      name: "works with no arguments",
      code: `
const fn = spy(() => "done");
expect(fn.myCall({})).toBe("done");
expect(fn.calls, "calls to the function").toEqual([[]]);`,
    },
    {
      name: "edge case: the object does not keep the temporary property",
      code: `
const user = { name: "Islam" };
let keysDuringCall = [];
function look() {
  keysDuringCall = Object.keys(this);
}
look.myCall(user);
expect(keysDuringCall, "Object.keys(this) during the call").toEqual(["name"]);
expect(Object.keys(user), "keys after the call").toEqual(["name"]);
expect(Object.getOwnPropertySymbols(user).length, "symbols left on the object").toBe(0);`,
    },
    {
      name: "edge case: context is null or undefined",
      code: `
function getThis() {
  return this;
}
expect(getThis.myCall(null), "this for null").toBe(globalThis);
expect(getThis.myCall(undefined), "this for undefined").toBe(globalThis);`,
    },
    {
      name: "edge case: context is a primitive",
      code: `
function describe() {
  return typeof this + ":" + this.valueOf();
}
expect(describe.myCall(5)).toBe("object:5");
expect(describe.myCall("a")).toBe("object:a");`,
    },
    {
      name: "does not change the function for later calls",
      code: `
function getName() {
  return this.name;
}
getName.myCall({ name: "first" });
const other = { name: "second", getName };
expect(other.getName()).toBe("second");`,
    },
  ],
  complexity: "O(1), plus the call itself.",
  idea: "دالة بتتنادى كـ method بتاخد الـ object كـ `this`. فبنحطها مؤقتًا جوه الـ `context` بمفتاح `Symbol`، نناديها، ونمسحها.",
  followUps: [
    {
      question: "Why a Symbol and not a name like 'fn'?",
      answer: "The object may already have a property called fn. A new Symbol can never clash.",
    },
    {
      question: "What is the difference between call and apply?",
      answer: "call takes the arguments one by one. apply takes them as one array.",
    },
  ],
};
