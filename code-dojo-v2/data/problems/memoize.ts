import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "same-result",
    name: "returns the same result as fn",
    code: `
const add = memoize((a, b) => a + b);
expect(add(2, 3)).toBe(5);
expect(add(2, 3)).toBe(5);`,
  },
  {
    id: "calls-once",
    name: "calls fn once for the same arguments",
    code: `
const fn = spy((n) => n * 2);
const fast = memoize(fn);
fast(4);
fast(4);
fast(4);
expect(fn.calls.length, "calls to fn").toBe(1);`,
  },
  {
    id: "other-arguments",
    name: "calls fn again for different arguments",
    code: `
const fn = spy((n) => n * 2);
const fast = memoize(fn);
expect(fast(1)).toBe(2);
expect(fast(2)).toBe(4);
expect(fast(1)).toBe(2);
expect(fn.calls, "calls to fn").toEqual([[1], [2]]);`,
  },
  {
    id: "every-argument",
    name: "every argument is part of the key",
    code: `
const fn = spy((a, b) => a + b);
const fast = memoize(fn);
expect(fast(1, 2)).toBe(3);
expect(fast(1, 3)).toBe(4);
expect(fn.calls.length, "calls to fn").toBe(2);`,
  },
  {
    id: "argument-order",
    name: "the order of the arguments matters",
    code: `
const fn = spy((a, b) => a - b);
const fast = memoize(fn);
expect(fast(5, 2)).toBe(3);
expect(fast(2, 5)).toBe(-3);
expect(fn.calls.length, "calls to fn").toBe(2);`,
  },
  {
    id: "no-arguments",
    name: "works with no arguments",
    code: `
const fn = spy(() => 42);
const fast = memoize(fn);
expect(fast()).toBe(42);
expect(fast()).toBe(42);
expect(fn.calls.length, "calls to fn").toBe(1);`,
  },
  {
    id: "falsy-results",
    name: "caches falsy results too: 0, '', false, null, undefined",
    code: `
const values = [0, "", false, null, undefined];
for (let i = 0; i < values.length; i++) {
  const fn = spy(() => values[i]);
  const fast = memoize(fn);
  fast("x");
  expect(fast("x")).toBe(values[i]);
  expect(fn.calls.length, "calls to fn when it returns " + String(values[i])).toBe(1);
}`,
  },
  {
    id: "number-or-string",
    name: "the number 1 and the string '1' are different arguments",
    code: `
const fast = memoize((x) => typeof x);
expect(fast(1)).toBe("number");
expect(fast("1")).toBe("string");`,
  },
  {
    id: "same-object",
    name: "edge case: the same object argument hits the cache",
    code: `
const fn = spy((user) => user.name.toUpperCase());
const fast = memoize(fn);
const user = { name: "a" };
expect(fast(user)).toBe("A");
expect(fast(user)).toBe("A");
expect(fn.calls.length, "calls to fn").toBe(1);`,
  },
  {
    id: "other-object",
    name: "edge case: different object arguments are not mixed up",
    code: `
const fast = memoize((user) => user.name);
expect(fast({ name: "a" })).toBe("a");
expect(fast({ name: "b" })).toBe("b");`,
  },
  {
    id: "keeps-this",
    name: "keeps this",
    code: `
const counter = {
  step: 3,
  times: memoize(function (n) {
    return this.step * n;
  }),
};
expect(counter.times(2)).toBe(6);`,
  },
  {
    id: "own-cache",
    name: "each memoized function has its own cache",
    code: `
const double = memoize((n) => n * 2);
const triple = memoize((n) => n * 3);
expect(double(2)).toBe(4);
expect(triple(2)).toBe(6);`,
  },
];

export const memoize: CodeProblem = {
  id: "memoize",
  kind: "code",
  group: "most-repeated",
  title: "memoize",
  difficulty: "medium",
  tag: "likely",
  language: "js",
  api: ["memoize"],
  plainLoops: true,
  statement: "Write memoize(fn): cache the result for the same arguments.",
  examples: ["const fast = memoize(slowSquare);", "fast(4); // computes 16", "fast(4); // returns 16 from the cache"],
  askFirst: ["Are the arguments always simple values?", "Should the cache have a size limit?"],
  edgeCases: [
    "Object arguments: the key from JSON.stringify can be wrong or slow",
    "The cache grows forever",
  ],
  parts: [
    {
      id: "main",
      title: "memoize",
      signature: "memoize(fn)",
      steps: [
        line("function memoize(fn) {", {
          coach: "Let's start, Islam. We need a function that takes the slow function we want to speed up.",
          hint1: "Declare a function called `memoize` with one parameter.",
          explain: "memoize takes the function whose results I want to save.",
        }),
        line("  const cache = new Map();", {
          coach: "We need a place to remember old results, so the same input is not computed twice.",
          hint1: "Use a `Map`, so keys can be any type.",
          explain: "A Map inside a closure keeps the saved results.",
        }),
        line("  return function (...args) {", {
          coach:
            "We give back a new function that the caller uses in place of the original. It takes any number of arguments, and it must keep the caller's `this`.",
          hint1: "Return a regular `function`, not an arrow, with a rest parameter.",
          explain: "I return a new function that collects all the arguments.",
        }),
        line("    const key = JSON.stringify(args);", {
          coach: "To find an old result, we need one key that stands for the whole list of arguments. A string works well.",
          hint1: "Turn `args` into a string with `JSON.stringify`.",
          explain: "I turn the arguments into a string and use it as the cache key.",
        }),
        line("    if (cache.has(key)) {", {
          coach: "First we ask: did we see these arguments before?",
          hint1: "A Map can tell you if it holds a key. The method is `has`.",
          explain: "I check if the key is already in the cache.",
        }),
        line("      return cache.get(key);\n    }", {
          coach: "If we did, the work is already done: we give back the saved answer and stop here. Then we close the if.",
          hint1: "`return` what the Map holds for `key`, with `get`. Then close the block.",
          explain: "I return the saved result and skip the work.",
        }),
        line("    const result = fn.apply(this, args);", {
          coach: "If not, we do the real work once. The original function must get the same `this` and the same arguments.",
          hint1: "Use `apply` on `fn` with `this` and `args`, and keep the answer in a variable.",
          explain: "The original function runs only on a cache miss, and I keep its answer.",
        }),
        line("    cache.set(key, result);", {
          coach: "We save the new answer, so the next call with these arguments is fast.",
          hint1: "A Map saves a value with `set`: first the key, then the value.",
          explain: "I save the result in the cache under that key.",
        }),
        line("    return result;", {
          coach: "The caller of this call still needs its answer.",
          hint1: "`return` the variable that holds the answer.",
          explain: "And I return the result.",
        }),
        line("  };\n}", {
          coach: "Last, we close the returned function, and then the outer function. Two lines.",
          hint1: "One line with a closing brace and a semicolon, then one line with a closing brace.",
          explain: "The returned function ends first, and then memoize ends.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "A cache hit is O(1) plus building the key.",
  followUps: [
    {
      question: "What is the weak point?",
      answer: "The key. JSON.stringify fails on functions and on circular objects, and the order of keys matters.",
    },
    {
      question: "How would you stop the cache from growing forever?",
      answer: "I would give it a size limit and remove the oldest entry first, or the one that was used least recently.",
    },
  ],
};
