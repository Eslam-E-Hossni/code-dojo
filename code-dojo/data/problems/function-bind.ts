import type { CodeProblem } from "../types";

export const functionBind: CodeProblem = {
  id: "function-bind",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Function.prototype.bind",
  difficulty: "medium",
  tag: "polyfill",
  statement: "Write your own bind, as Function.prototype.myBind.",
  examples: [
    'const user = { name: "Islam" };',
    "function greet(greeting) {",
    '  return greeting + ", " + this.name;',
    "}",
    'greet.myBind(user)("Hello"); // "Hello, Islam"',
  ],
  askFirst: ["Should it support preset arguments?", "Do I need to support new?"],
  edgeCases: [
    "Arguments at bind time and at call time",
    "Called on something that is not a function",
  ],
  parts: [
    {
      id: "main",
      title: "myBind",
      signature: "Function.prototype.myBind(context, ...boundArgs)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: method على كل الدوال. بتاخد الـ `this` اللي عايزين نثبّته، وأي قيم نثبّتها من دلوقتي.",
          expected: "Function.prototype.myBind = function (context, ...boundArgs) {",
          hint1:
            "`Function.prototype.myBind` بيساوي `function` بتاخد `context` و rest parameter اسمه `boundArgs`.",
          hint2: "Function._________.myBind = function (_______, ...__________) {",
          explain: "myBind takes the this value I want to fix, and arguments to preset.",
        },
        {
          coach:
            "جوه الـ method دي `this` هي الدالة الأصلية. احفظها في متغير، علشان `this` هتتغير جوه الدالة اللي هنرجّعها.",
          expected: "  const fn = this;",
          hint1: "`const` اسمه `fn` وقيمته `this`.",
          hint2: "const __ = ____;",
          explain: "Here this is the original function. I save it, because this is different inside the function I return.",
        },
        {
          coach: "رجّع الدالة الجديدة، وتاخد أي قيم تتبعت وقت النداء.",
          expected: "  return function (...callArgs) {",
          hint1: "`return function` ومعاها rest parameter اسمه `callArgs`.",
          hint2: "return ________ (...________) {",
          explain: "I return a new function that collects the arguments of the call.",
        },
        {
          coach:
            "جواها: نادي الدالة الأصلية بالـ `context` المثبّت، والقيم المثبّتة الأول وبعدها قيم النداء. ورجّع الناتج.",
          expected: "    return fn.apply(context, [...boundArgs, ...callArgs]);",
          accept: ["return fn.call(context, ...boundArgs, ...callArgs);"],
          hint1:
            "`return fn.apply` بـ `context` و array فيها `boundArgs` وبعدها `callArgs` بالـ spread.",
          hint2: "return __.apply(_______, [...__________, ...________]);",
          explain:
            "It calls the original function with the fixed this, the preset arguments first, then the call arguments.",
        },
        {
          coach: "اقفل الدالة اللي رجّعناها، واقفل الـ method. الاتنين معاهم semicolon. سطرين.",
          expected: "  };\n};",
          hint1: "سطرين، كل واحد قوس قفل ومعاه semicolon.",
          hint2: "_;\n_;",
          explain: "I close both functions.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "fixes this",
      code: `
const user = { name: "Islam" };
function getName() {
  return this.name;
}
expect(getName.myBind(user)()).toBe("Islam");`,
    },
    {
      name: "returns a new function and does not call the original yet",
      code: `
const fn = spy();
const bound = fn.myBind({});
expect(typeof bound, "typeof the result").toBe("function");
expect(fn.calls.length, "calls before the bound function is used").toBe(0);`,
    },
    {
      name: "edge case: arguments at bind time and at call time",
      code: `
const fn = spy();
const bound = fn.myBind(null, 1, 2);
bound(3, 4);
expect(fn.calls, "calls to the original").toEqual([[1, 2, 3, 4]]);`,
    },
    {
      name: "returns what the original returns",
      code: `
function add(a, b) {
  return a + b;
}
expect(add.myBind(null, 2)(3)).toBe(5);`,
    },
    {
      name: "the bound this wins over the object it is called on",
      code: `
const first = { name: "first" };
const second = { name: "second" };
function getName() {
  return this.name;
}
second.getName = getName.myBind(first);
expect(second.getName()).toBe("first");`,
    },
    {
      name: "can be called many times and does not change the original",
      code: `
const counter = { count: 0 };
function add(n) {
  this.count += n;
  return this.count;
}
const bound = add.myBind(counter);
expect(bound(1)).toBe(1);
expect(bound(5)).toBe(6);
const other = { count: 100, add };
expect(other.add(1), "the original still follows its caller").toBe(101);`,
    },
    {
      name: "works with no preset arguments and no call arguments",
      code: `
const fn = spy(() => "done");
expect(fn.myBind({ a: 1 })()).toBe("done");
expect(fn.calls, "calls to the original").toEqual([[]]);`,
    },
    {
      name: "edge case: called on something that is not a function",
      code: `
expect(() => {
  const bound = Function.prototype.myBind.call(5, null);
  bound();
}).toThrow(TypeError);`,
    },
  ],
  complexity: "O(1).",
  idea: "بنحفظ الدالة الأصلية في متغير، ونرجّع دالة جديدة بتناديها بـ `apply`.",
  followUps: [
    {
      question: "Why const fn = this?",
      answer: "Inside the returned function 'this' is different. I need the original function.",
    },
  ],
};
