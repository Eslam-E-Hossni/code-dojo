import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "initial-value",
    name: "reduces with an initial value",
    code: `
expect([1, 2, 3].myReduce((acc, x) => acc + x, 0)).toBe(6);
expect([1, 2, 3].myReduce((acc, x) => acc + x, 10)).toBe(16);`,
  },
  {
    id: "no-initial-value",
    name: "with no initial value, the first item is the start",
    code: `
const fn = spy((acc, x) => acc + x);
expect([5, 1, 2].myReduce(fn)).toBe(8);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[0].slice(0, 3), "first call: acc, item, index").toEqual([5, 1, 1]);`,
  },
  {
    id: "callback-arguments",
    name: "passes the accumulator, the item, the index and the array",
    code: `
const fn = spy((acc, x) => acc + x);
const list = ["a", "b"];
list.myReduce(fn, "");
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[0].slice(0, 3)).toEqual(["", "a", 0]);
expect(fn.calls[1].slice(0, 3)).toEqual(["a", "b", 1]);
expect(fn.calls[1][3], "fourth argument").toBe(list);`,
  },
  {
    id: "any-result",
    name: "can build any kind of result",
    code: `
const counts = ["a", "b", "a"].myReduce((acc, letter) => {
  acc[letter] = (acc[letter] || 0) + 1;
  return acc;
}, {});
expect(counts).toEqual({ a: 2, b: 1 });`,
  },
  {
    id: "empty-with-initial",
    name: "edge case: empty array with an initial value returns it",
    code: `
const fn = spy();
expect([].myReduce(fn, "start")).toBe("start");
expect(fn.calls.length, "calls to the callback").toBe(0);`,
  },
  {
    id: "empty-no-initial",
    name: "edge case: empty array with no initial value throws a TypeError",
    code: `expect(() => [].myReduce((acc, x) => acc + x)).toThrow(TypeError);`,
  },
  {
    id: "one-item",
    name: "edge case: one item and no initial value returns the item",
    code: `
const fn = spy();
expect([7].myReduce(fn)).toBe(7);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
  },
  {
    id: "undefined-initial",
    name: "edge case: undefined passed as the initial value still counts",
    code: `
const result = [1, 2].myReduce((acc, x) => String(acc) + x, undefined);
expect(result).toBe("undefined12");`,
  },
  {
    id: "not-a-function",
    name: "edge case: callback is not a function",
    code: `expect(() => [1, 2].myReduce("nope", 0)).toThrow(TypeError);`,
  },
];

export const arrayReduce: CodeProblem = {
  id: "array-reduce",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.reduce",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: [],
  plainLoops: true,
  statement: "Write your own reduce, as Array.prototype.myReduce.",
  examples: ["[1, 2, 3].myReduce((acc, x) => acc + x, 0); // 6"],
  askFirst: [
    "Should reduce work without an initial value?",
    "Do I pass index and array to the callback?",
  ],
  edgeCases: [
    "reduce on an empty array with no initial value: TypeError",
    "Callback is not a function",
    "Holes in the array",
  ],
  parts: [
    {
      id: "main",
      title: "myReduce",
      signature: "Array.prototype.myReduce(callback, initialValue)",
      steps: [
        line("Array.prototype.myReduce = function (callback, initialValue) {", {
          coach:
            "Let's start, Islam. We need a method on all arrays that takes a callback and a start value, and the start value may be missing.",
          hint1:
            "Assign a regular `function` to `Array.prototype.myReduce`. It has two parameters: the callback and the initial value.",
          explain: "I add myReduce to Array.prototype, and it takes a callback and an optional initial value.",
        }),
        line("  let acc = initialValue;", {
          coach:
            "We need the accumulator: the one value that we build while we go over the array. It begins as the start value the caller gave.",
          hint1: "Declare it with `let`, because it changes on every round, and give it `initialValue`.",
          explain: "The accumulator starts as the initial value.",
        }),
        line("  let start = 0;", {
          coach: "We also need to remember where the loop begins, because it can begin at the first item or at the second.",
          hint1: "A second `let` that holds an index. For now it is the first index.",
          explain: "I keep the index where the loop starts, and for now it is 0.",
        }),
        line("  if (arguments.length < 2) {", {
          coach:
            "Now we must find out if a start value was passed at all. We cannot compare it with `undefined`, because the caller may pass `undefined` as a real start value.",
          hint1: "The `arguments` object knows how many values were passed. Fewer than two means no initial value.",
          explain: "arguments.length tells me if an initial value was passed at all.",
        }),
        line("    if (this.length === 0) {", {
          coach:
            "With no start value we plan to start from the first item. An empty array has no first item, so we check for that case.",
          hint1: "An `if` inside the first one: is the length of `this` equal to 0?",
          explain: "With no initial value and an empty array, there is nothing to start from.",
        }),
        line('      throw new TypeError("Reduce of empty array with no initial value");\n    }', {
          coach:
            "In that case we stop with the same error that the real reduce throws, and then we close the inner if. Two lines.",
          hint1:
            '`throw` a `new TypeError` with the message "Reduce of empty array with no initial value". Then close the block.',
          explain: "I throw a TypeError, like the real reduce does for an empty array with no initial value.",
        }),
        line("    acc = this[0];", {
          coach: "If the array is not empty, we use its first item as the start value.",
          hint1: "Assign the item at index 0 of `this` to `acc`.",
          explain: "When no initial value was passed, the first item becomes the accumulator.",
        }),
        line("    start = 1;\n  }", {
          coach:
            "The first item is used already, so the loop must begin at the second item, and then we close the outer if. Two lines.",
          hint1: "Set `start` to the second index, then close the block.",
          explain: "The loop will start at index 1, so the first item is not counted twice.",
        }),
        line("  for (let i = start; i < this.length; i++) {", {
          coach: "Now the main loop. It goes from the start index we chose to the end of the array.",
          hint1: "A plain `for` loop, but the counter begins at `start` and not at 0.",
          explain: "I loop from the start index to the end of the array.",
        }),
        line("    acc = callback(acc, this[i], i, this);\n  }", {
          coach:
            "For each item we give the callback the accumulator, the item, the index and the array, keep its answer as the new accumulator, and then close the loop. Two lines.",
          hint1: "Call `callback` directly with four arguments, and assign what it returns back to `acc`. Then close the block.",
          explain: "On every step the callback gets the accumulator and the item, and returns the new accumulator.",
        }),
        line("  return acc;\n};", {
          coach:
            "After the last item the accumulator holds the final answer, so we give it back and close the function, with a semicolon because this is an assignment. Two lines.",
          hint1: "`return` the accumulator. Then a closing brace with a semicolon after it.",
          explain: "At the end I return the accumulator.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(n).",
  followUps: [
    {
      question: "What does reduce do with no initial value?",
      answer: "It uses the first item as the start and begins the loop at index 1.",
    },
  ],
};
