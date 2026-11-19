import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "keeps-accepted",
    name: "keeps the items the callback accepts",
    code: `expect([1, 2, 3, 4].myFilter((x) => x % 2 === 0)).toEqual([2, 4]);`,
  },
  {
    id: "callback-arguments",
    name: "passes the item, the index and the array to the callback",
    code: `
const fn = spy(() => true);
const list = ["a", "b"];
list.myFilter(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[1][0]).toBe("b");
expect(fn.calls[1][1]).toBe(1);
expect(fn.calls[1][2], "third argument").toBe(list);`,
  },
  {
    id: "this-arg",
    name: "uses thisArg as this",
    code: `
const fn = spy(() => true);
const context = { name: "context" };
[1].myFilter(fn, context);
expect(fn.thisValues[0], "this inside the callback").toBe(context);`,
  },
  {
    id: "truthy-falsy",
    name: "any truthy value keeps the item, any falsy value drops it",
    code: `
const answers = [1, 0, "yes", "", {}, null, undefined, NaN];
const kept = ["a", "b", "c", "d", "e", "f", "g", "h"].myFilter((item, i) => answers[i]);
expect(kept).toEqual(["a", "c", "e"]);`,
  },
  {
    id: "new-array",
    name: "returns a new array and does not change the original",
    code: `
const original = [1, 2, 3];
const result = original.myFilter(() => true);
expect(result).toEqual([1, 2, 3]);
expect(result, "the result").not.toBe(original);
expect(original, "the original after the call").toEqual([1, 2, 3]);`,
  },
  {
    id: "nothing-passes",
    name: "edge case: nothing passes",
    code: `expect([1, 2, 3].myFilter(() => false)).toEqual([]);`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array",
    code: `
const fn = spy(() => true);
expect([].myFilter(fn)).toEqual([]);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
  },
  {
    id: "holes",
    name: "edge case: holes in the array are skipped",
    code: `
const fn = spy(() => true);
const result = [1, , 3].myFilter(fn);
expect(result).toEqual([1, 3]);
expect(fn.calls.length, "calls to the callback").toBe(2);`,
  },
  {
    id: "not-a-function",
    name: "edge case: callback is not a function",
    code: `expect(() => [1, 2].myFilter("nope")).toThrow(TypeError);`,
  },
];

export const arrayFilter: CodeProblem = {
  id: "array-filter",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.filter",
  difficulty: "easy",
  tag: "polyfill",
  language: "js",
  api: [],
  plainLoops: true,
  statement: "Write your own filter, as Array.prototype.myFilter.",
  examples: ["[1, 2, 3, 4].myFilter((x) => x % 2 === 0); // [2, 4]"],
  askFirst: ["Do I pass index and array to the callback?", "Do I need to support thisArg?"],
  edgeCases: ["Callback is not a function", "Holes in the array", "Nothing passes: return an empty array"],
  parts: [
    {
      id: "main",
      title: "myFilter",
      signature: "Array.prototype.myFilter(callback, thisArg)",
      steps: [
        line("Array.prototype.myFilter = function (callback, thisArg) {", {
          coach:
            "Let's start, Islam. We need a method on all arrays that takes a callback and an optional value for the callback's `this`, and inside the method `this` must be the array.",
          hint1:
            "Assign a regular `function`, not an arrow, to `Array.prototype.myFilter`. It has two parameters: the callback and the value for `this`.",
          explain: "I add myFilter to Array.prototype with a regular function, so this is the array.",
        }),
        line("  const result = [];", {
          coach: "We do not know how many items will pass, so we start with an empty list and add to it later.",
          hint1: "Create an empty array and keep it in a variable.",
          explain: "The result starts as an empty array.",
        }),
        line("  for (let i = 0; i < this.length; i++) {", {
          coach: "We look at every index of the array that the method was called on, in order.",
          hint1: "A plain `for` loop with a counter. The array is `this`, so the limit is `this.length`.",
          explain: "I loop over this, which is the array.",
        }),
        line("    if (i in this && callback.call(thisArg, this[i], i, this)) {", {
          coach:
            "An item is kept only when two things are true: its index really exists, and the callback gives a truthy answer for it. The callback gets the item, the index and the array, with the `this` value the caller chose.",
          hint1:
            "Join two conditions with `&&`: first the `in` operator, then `callback.call` with `thisArg` and the three arguments.",
          explain: "For every index that exists, I call the callback and check if it returns a truthy value.",
        }),
        line("      result.push(this[i]);", {
          coach: "Both are true, so the item goes into the result. We keep the item itself, not what the callback returned.",
          hint1: "`push` the item at index `i` of `this` into `result`.",
          explain: "I push the original item into the result.",
        }),
        line("    }\n  }", {
          coach: "We close the if, and then the loop. Two lines.",
          hint1: "Two closing braces, each on its own line.",
          explain: "The if ends first, and then the loop ends.",
        }),
        line("  return result;\n};", {
          coach:
            "The loop is over, so we give back the items that passed and close the function, with a semicolon because this is an assignment. Two lines.",
          hint1: "`return` the result array. Then a closing brace with a semicolon after it.",
          explain: "At the end I return the result.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(n).",
  followUps: [
    {
      question: "What is the difference from map?",
      answer:
        "map keeps the length and stores what the callback returns. filter keeps the item itself, only when the callback returns a truthy value.",
    },
  ],
};
