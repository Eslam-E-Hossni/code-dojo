import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "fixes-this",
    name: "fixes this",
    code: `
const user = { name: "Islam" };
function getName() {
  return this.name;
}
expect(getName.myBind(user)()).toBe("Islam");`,
  },
  {
    id: "new-function",
    name: "returns a new function and does not call the original yet",
    code: `
const fn = spy();
const bound = fn.myBind({});
expect(typeof bound, "typeof the result").toBe("function");
expect(fn.calls.length, "calls before the bound function is used").toBe(0);`,
  },
  {
    id: "both-arguments",
    name: "edge case: arguments at bind time and at call time",
    code: `
const fn = spy();
const bound = fn.myBind(null, 1, 2);
bound(3, 4);
expect(fn.calls, "calls to the original").toEqual([[1, 2, 3, 4]]);`,
  },
  {
    id: "return-value",
    name: "returns what the original returns",
    code: `
function add(a, b) {
  return a + b;
}
expect(add.myBind(null, 2)(3)).toBe(5);`,
  },
  {
    id: "bound-this-wins",
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
    id: "many-calls",
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
    id: "no-arguments",
    name: "works with no preset arguments and no call arguments",
    code: `
const fn = spy(() => "done");
expect(fn.myBind({ a: 1 })()).toBe("done");
expect(fn.calls, "calls to the original").toEqual([[]]);`,
  },
  {
    id: "not-a-function",
    name: "edge case: called on something that is not a function",
    code: `
expect(() => {
  const bound = Function.prototype.myBind.call(5, null);
  bound();
}).toThrow(TypeError);`,
  },
];

export const functionBind: CodeProblem = {
  id: "function-bind",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Function.prototype.bind",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: [],
  plainLoops: true,
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
        line("Function.prototype.myBind = function (context, ...boundArgs) {", {
          coach:
            "Let's start, Islam. We need a method on all functions that takes the `this` value we want to fix, and any arguments we want to fix now.",
          hint1:
            "Assign a regular `function` to `Function.prototype.myBind`. After the first parameter, use a rest parameter for the other arguments.",
          explain: "myBind takes the this value I want to fix and the arguments I want to preset.",
        }),
        line("  const fn = this;", {
          coach:
            "Inside this method, `this` is the original function. We must save it now, because `this` will mean something else inside the function we return.",
          hint1: "Keep `this` in a variable. The inner function will reach it through the closure.",
          explain: "I save this, which is the original function here, because this is different inside the function I return.",
        }),
        line("  return function (...callArgs) {", {
          coach: "We give back a new function that the caller will use later. It takes any arguments that come at call time.",
          hint1: "Return a `function` with a rest parameter.",
          explain: "I return a new function that collects the arguments of the call.",
        }),
        line("    return fn.apply(context, [...boundArgs, ...callArgs]);", {
          coach:
            "Inside it we run the original function with the fixed `this` and give its answer back. The arguments we fixed go first, then the arguments of this call.",
          hint1: "Use `apply` on `fn` with `context` and one array. Build the array with two spreads, and `return` the answer.",
          explain: "The new function calls the original with the fixed this, the preset arguments first and then the call arguments.",
        }),
        line("  };\n};", {
          coach: "We close the returned function, and then the method, each with a semicolon. Two lines.",
          hint1: "Two lines, and each one is a closing brace with a semicolon.",
          explain: "The returned function ends first, and then myBind ends.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1).",
  followUps: [
    {
      question: "Why const fn = this?",
      answer: "Inside the returned function 'this' is different. I need the original function.",
    },
  ],
};
