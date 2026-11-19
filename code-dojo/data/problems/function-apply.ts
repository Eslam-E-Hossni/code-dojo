import type { CodeProblem } from "../types";

export const functionApply: CodeProblem = {
  id: "function-apply",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Function.prototype.apply",
  difficulty: "medium",
  tag: "polyfill",
  statement:
    "Write your own apply, as Function.prototype.myApply. Do not use call, apply or bind inside it.",
  examples: [
    "function add(a, b) {",
    "  return this.base + a + b;",
    "}",
    "add.myApply({ base: 10 }, [1, 2]); // 13",
  ],
  askFirst: [
    "What should happen when the context is null or undefined?",
    "What if no array of arguments is passed?",
    "Can I use the spread operator?",
  ],
  edgeCases: [
    "context is null or undefined: use the global object",
    "The array of arguments is missing",
    "The object must not keep the temporary property",
  ],
  parts: [
    {
      id: "main",
      title: "myApply",
      signature: "Function.prototype.myApply(context, args)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: نفس `myCall`، بس القيم بتيجي كلها في array واحدة. وخلّيها array فاضية لو متبعتتش.",
          expected: "Function.prototype.myApply = function (context, args = []) {",
          hint1:
            "`Function.prototype.myApply` بيساوي `function` بتاخد `context`، و `args` بقيمة افتراضية array فاضية.",
          hint2: "Function._________.myApply = function (_______, ____ = []) {",
          explain: "myApply takes the this value and one array of arguments, which defaults to an empty array.",
        },
        {
          coach:
            "نفس الحيلة: هننادي الدالة من جوه object. لو الـ `context` فاضي ناخد الـ global، وغير كده نحوّله لـ object.",
          expected: "  const target = context === null || context === undefined ? globalThis : Object(context);",
          accept: ["const target = context == null ? globalThis : Object(context);"],
          hint1:
            "`const` اسمه `target`، وقيمته ternary: لو `context` بيساوي `null` أو `undefined` يبقى `globalThis`، غير كده `Object(context)`.",
          hint2: "const ______ = _______ === ____ || _______ === _________ ? __________ : Object(_______);",
          explain:
            "I need an object to call the function on: the global one for null or undefined, and Object(context) for primitives.",
        },
        {
          coach: "اسم مؤقت للـ property ميتخانقش مع أي اسم موجود.",
          expected: "  const key = Symbol();",
          accept: ['const key = Symbol("fn");'],
          hint1: "`const` اسمه `key` وقيمته `Symbol()`.",
          hint2: "const ___ = ______();",
          explain: "A Symbol is a key that cannot clash with any property the object already has.",
        },
        {
          coach: "حط الدالة الأصلية، اللي هي `this` هنا، جوه الـ object.",
          expected: "  target[key] = this;",
          hint1: "`target[key]` بيساوي `this`.",
          hint2: "______[___] = ____;",
          explain: "I put the function on the object under that key.",
        },
        {
          coach: "ناديها من الـ object، وافرد الـ array علشان كل قيمة تروح في مكانها.",
          expected: "  const result = target[key](...args);",
          hint1: "`const` اسمه `result` وقيمته نداء `target[key]` وجواه `args` بالـ spread.",
          hint2: "const ______ = ______[___](...____);",
          explain: "I call it as a method, and spread the array into separate arguments.",
        },
        {
          coach: "امسح الـ property المؤقتة.",
          expected: "  delete target[key];",
          hint1: "`delete` على `target[key]`.",
          hint2: "______ ______[___];",
          explain: "Then I remove the temporary property,",
        },
        {
          coach: "رجّع الناتج واقفل الـ method، ومعاها semicolon. سطرين.",
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
expect(getName.myApply(user)).toBe("Islam");`,
    },
    {
      name: "spreads the array into separate arguments",
      code: `
const fn = spy();
fn.myApply({}, [1, "two", [3]]);
expect(fn.calls, "calls to the function").toEqual([[1, "two", [3]]]);`,
    },
    {
      name: "returns what the function returns",
      code: `
function add(a, b) {
  return this.base + a + b;
}
expect(add.myApply({ base: 10 }, [1, 2])).toBe(13);`,
    },
    {
      name: "does not change the array it was given",
      code: `
const args = [3, 1, 2];
function first(a) {
  return a;
}
expect(first.myApply(null, args)).toBe(3);
expect(args, "the array after the call").toEqual([3, 1, 2]);`,
    },
    {
      name: "edge case: the array of arguments is missing",
      code: `
const fn = spy(() => "done");
expect(fn.myApply({})).toBe("done");
expect(fn.calls, "calls to the function").toEqual([[]]);`,
    },
    {
      name: "edge case: the object does not keep the temporary property",
      code: `
const user = { name: "Islam" };
function look() {
  return Object.keys(this);
}
expect(look.myApply(user), "Object.keys(this) during the call").toEqual(["name"]);
expect(Object.keys(user), "keys after the call").toEqual(["name"]);
expect(Object.getOwnPropertySymbols(user).length, "symbols left on the object").toBe(0);`,
    },
    {
      name: "edge case: context is null or undefined",
      code: `
function getThis() {
  return this;
}
expect(getThis.myApply(null, []), "this for null").toBe(globalThis);
expect(getThis.myApply(undefined, []), "this for undefined").toBe(globalThis);`,
    },
    {
      name: "works like Math.max over an array",
      code: `expect(Math.max.myApply(null, [3, 9, 2])).toBe(9);`,
    },
  ],
  complexity: "O(1), plus the call itself.",
  idea: "هي `myCall` بالظبط، والفرق الوحيد إن القيم جاية في array واحدة بنفردها ساعة النداء.",
  followUps: [
    {
      question: "What is the difference between call and apply?",
      answer: "call takes the arguments one by one. apply takes them as one array.",
    },
    {
      question: "When was apply useful before the spread operator?",
      answer: "To pass an array as separate arguments, like Math.max.apply(null, numbers).",
    },
  ],
};
