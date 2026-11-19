import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "every-item",
    name: "calls the callback for every item, in order",
    code: `
const seen = [];
[10, 20, 30].myForEach((x) => seen.push(x));
expect(seen).toEqual([10, 20, 30]);`,
  },
  {
    id: "callback-arguments",
    name: "passes the item, the index and the array to the callback",
    code: `
const fn = spy();
const list = ["a", "b"];
list.myForEach(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[1][0]).toBe("b");
expect(fn.calls[1][1]).toBe(1);
expect(fn.calls[1][2], "third argument").toBe(list);`,
  },
  {
    id: "this-arg",
    name: "uses thisArg as this",
    code: `
const fn = spy();
const context = { name: "context" };
[1].myForEach(fn, context);
expect(fn.thisValues[0], "this inside the callback").toBe(context);`,
  },
  {
    id: "returns-undefined",
    name: "returns undefined",
    code: `expect([1, 2].myForEach((x) => x * 2)).toBe(undefined);`,
  },
  {
    id: "same-array",
    name: "does not change the array",
    code: `
const original = [1, 2, 3];
original.myForEach((x) => x * 2);
expect(original).toEqual([1, 2, 3]);`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array",
    code: `
const fn = spy();
[].myForEach(fn);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
  },
  {
    id: "holes",
    name: "edge case: holes in the array are skipped",
    code: `
const fn = spy();
[1, , 3].myForEach(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[1][1], "index of the second call").toBe(2);`,
  },
  {
    id: "not-a-function",
    name: "edge case: callback is not a function",
    code: `
expect(() => [1].myForEach("nope")).toThrow(TypeError);
expect(() => [].myForEach()).toThrow(TypeError);`,
  },
];

export const arrayForEach: CodeProblem = {
  id: "array-for-each",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.forEach",
  difficulty: "easy",
  tag: "polyfill",
  language: "js",
  api: [],
  plainLoops: true,
  statement: "Write your own forEach, as Array.prototype.myForEach.",
  examples: ['["a", "b"].myForEach((item, i) => console.log(i, item)); // 0 "a", then 1 "b"'],
  askFirst: [
    "Do I pass index and array to the callback?",
    "Do I need to support thisArg?",
    "What should it return?",
  ],
  edgeCases: ["Empty array", "Callback is not a function", "Holes in the array"],
  parts: [
    {
      id: "main",
      title: "myForEach",
      signature: "Array.prototype.myForEach(callback, thisArg)",
      steps: [
        line("Array.prototype.myForEach = function (callback, thisArg) {", {
          coach:
            "Let's start, Islam. We need a method on all arrays that takes a callback and an optional value for the callback's `this`, and inside the method `this` must be the array.",
          hint1:
            "Assign a regular `function`, not an arrow, to `Array.prototype.myForEach`. It has two parameters: the callback and the value for `this`.",
          explain: "I add myForEach to Array.prototype with a regular function, so this is the array.",
        }),
        line('  if (typeof callback !== "function") {', {
          coach: "Without a real function there is nothing to run, so we check what the caller gave us.",
          hint1: 'Use `typeof` on `callback` and compare the answer with the string "function".',
          explain: "First I check that the callback is a function.",
        }),
        line('    throw new TypeError(callback + " is not a function");\n  }', {
          coach:
            "If it is not a function, we stop with a type error, as the real method does, and then we close the if. Two lines.",
          hint1: '`throw` a `new TypeError`. The message is `callback` plus the text " is not a function". Then close the block.',
          explain: "If the callback is not a function, I throw a TypeError.",
        }),
        line("  for (let i = 0; i < this.length; i++) {", {
          coach: "This method builds nothing, so we need no result array. We only go over the array it was called on.",
          hint1: "A plain `for` loop with a counter. The array is `this`, so the limit is `this.length`.",
          explain: "I loop over this, which is the array, and I need no result array.",
        }),
        line("    if (i in this) {", {
          coach: "The real method does not run the callback for holes, the indexes that have no value. We must do the same.",
          hint1: "The `in` operator tells you if an index exists in `this`.",
          explain: "I skip the holes of the array.",
        }),
        line("      callback.call(thisArg, this[i], i, this);", {
          coach:
            "We run the callback with the item, the index and the array, and with the `this` value the caller chose. Nothing is saved, because this method returns nothing.",
          hint1: "Use `call` on `callback`: first `thisArg`, then the three arguments.",
          explain: "I call the callback with the item, the index and the array, and I do not keep what it returns.",
        }),
        line("    }\n  }\n};", {
          coach:
            "We close the if, then the loop, then the function, with no return because this method always gives back `undefined`. Three lines.",
          hint1: "Two closing braces, then a closing brace with a semicolon. Each one is on its own line.",
          explain: "There is no return, so the result is undefined.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(n).",
  followUps: [
    {
      question: "Can you stop a forEach in the middle?",
      answer: "No. break does not work inside the callback. For that I use a plain for loop.",
    },
    {
      question: "What does forEach return?",
      answer: "Always undefined, so it cannot be chained like map or filter.",
    },
  ],
};
