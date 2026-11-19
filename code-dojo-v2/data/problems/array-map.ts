import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "maps-items",
    name: "maps every item",
    code: `expect([1, 2, 3].myMap((x) => x * 2)).toEqual([2, 4, 6]);`,
  },
  {
    id: "callback-arguments",
    name: "passes the item, the index and the array to the callback",
    code: `
const fn = spy((x) => x);
const list = ["a", "b"];
list.myMap(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[0][0]).toBe("a");
expect(fn.calls[0][1]).toBe(0);
expect(fn.calls[0][2], "third argument").toBe(list);
expect(fn.calls[1][1]).toBe(1);`,
  },
  {
    id: "this-arg",
    name: "uses thisArg as this",
    code: `
const fn = spy();
const context = { name: "context" };
[1].myMap(fn, context);
expect(fn.thisValues[0], "this inside the callback").toBe(context);`,
  },
  {
    id: "new-array",
    name: "returns a new array and does not change the original",
    code: `
const original = [1, 2, 3];
const result = original.myMap((x) => x + 1);
expect(result, "the result").not.toBe(original);
expect(original, "the original after the call").toEqual([1, 2, 3]);`,
  },
  {
    id: "undefined-results",
    name: "keeps undefined results",
    code: `expect([1, 2].myMap(() => undefined)).toEqual([undefined, undefined]);`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array",
    code: `
const fn = spy();
expect([].myMap(fn)).toEqual([]);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
  },
  {
    id: "not-a-function",
    name: "edge case: callback is not a function",
    code: `
expect(() => [1].myMap("nope")).toThrow(TypeError);
expect(() => [1].myMap()).toThrow(TypeError);`,
  },
  {
    id: "holes",
    name: "edge case: holes in the array stay holes",
    code: `
const fn = spy((x) => x * 2);
const sparse = [1, , 3];
const result = sparse.myMap(fn);
expect(result.length, "length of the result").toBe(3);
expect(1 in result, "index 1 exists in the result").toBe(false);
expect(result[0]).toBe(2);
expect(result[2]).toBe(6);
expect(fn.calls.length, "calls to the callback").toBe(2);`,
  },
  {
    id: "same-as-map",
    name: "gives the same result as the real map",
    code: `
const words = ["a", "bb", "", "dddd"];
expect(words.myMap((word, i) => word.length + i)).toEqual(words.map((word, i) => word.length + i));`,
  },
];

export const arrayMap: CodeProblem = {
  id: "array-map",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.map",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: [],
  plainLoops: true,
  statement: "Add your own map to all arrays, as Array.prototype.myMap.",
  examples: ["[1, 2, 3].myMap((x) => x * 2); // [2, 4, 6]"],
  askFirst: [
    "Do I pass the index and the array to the callback?",
    "Do I need to support thisArg?",
    "Should holes in the array be skipped?",
  ],
  edgeCases: ["Empty array", "Callback is not a function", "Holes in the array"],
  parts: [
    {
      id: "main",
      title: "myMap",
      signature: "Array.prototype.myMap(callback, thisArg)",
      steps: [
        line("Array.prototype.myMap = function (callback, thisArg) {", {
          coach:
            "Let's start, Islam. We need a method on all arrays that takes a callback and an optional value for the callback's `this`, and inside the method `this` must be the array.",
          hint1:
            "Assign a regular `function`, not an arrow, to `Array.prototype.myMap`. It has two parameters: the callback and the value for `this`.",
          explain: "I add myMap to Array.prototype with a regular function, so this is the array.",
        }),
        line('  if (typeof callback !== "function") {', {
          coach: "Before any work, we must be sure that the caller really gave us a function.",
          hint1: 'Use `typeof` on `callback` and compare the answer with the string "function".',
          explain: "First I check that the callback is a function.",
        }),
        line('    throw new TypeError(callback + " is not a function");\n  }', {
          coach:
            "If it is not a function, we stop with the same kind of error that the real map throws, and then we close the if. Two lines.",
          hint1: '`throw` a `new TypeError`. The message is `callback` plus the text " is not a function". Then close the block.',
          explain: "If the callback is not a function, I throw a TypeError, like the real map.",
        }),
        line("  const result = new Array(this.length);", {
          coach: "We need a new array for the answers. It gets the same length as the original, so the empty places stay empty.",
          hint1: "Use `new Array` and give it the length of `this`.",
          explain: "The result is a new array with the same length, so holes stay holes.",
        }),
        line("  for (let i = 0; i < this.length; i++) {", {
          coach: "We go over the array that the method was called on, one index at a time.",
          hint1: "A plain `for` loop with a counter. The array is `this`, so the limit is `this.length`.",
          explain: "I loop over this, which is the array.",
        }),
        line("    if (i in this) {", {
          coach:
            "An array can have holes, which are indexes with no value at all. The callback must run only for an index that really exists.",
          hint1: "The `in` operator tells you if an index exists in `this`.",
          explain: "I check that the index exists, so holes are skipped.",
        }),
        line("      result[i] = callback.call(thisArg, this[i], i, this);", {
          coach:
            "Now we run the callback with the item, the index and the whole array, and with the `this` value the caller chose. What it returns goes to the same index of the new array.",
          hint1: "Use `call` on `callback`: first `thisArg`, then the three arguments. Assign the answer to `result` at index `i`.",
          explain: "I call the callback with the item, the index and the array, and store what it returns at the same index.",
        }),
        line("    }\n  }", {
          coach: "We close the if, and then the loop. Two lines.",
          hint1: "Two closing braces, each on its own line.",
          explain: "The if ends first, and then the loop ends.",
        }),
        line("  return result;\n};", {
          coach:
            "Every index is handled now, so we give the new array back and close the function, with a semicolon because this is an assignment. Two lines.",
          hint1: "`return` the new array. Then a closing brace with a semicolon after it.",
          explain: "At the end I return the new array.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(n).",
  followUps: [
    {
      question: "Why not an arrow function?",
      answer: "An arrow has no own 'this', so 'this' would not be the array.",
    },
    {
      question: "Why is it a bad idea in real code?",
      answer: "It affects all code and can clash with future language features.",
    },
  ],
};
