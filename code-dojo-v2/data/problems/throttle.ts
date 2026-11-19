import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "first-call",
    name: "edge case: the first call runs at once",
    code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled("a");
expect(fn.calls, "calls to fn").toEqual([["a"]]);`,
  },
  {
    id: "drops-calls",
    name: "edge case: calls inside the period are dropped",
    code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled("a");
throttled("b");
await clock.tick(50);
throttled("c");
expect(fn.calls, "calls to fn").toEqual([["a"]]);`,
  },
  {
    id: "runs-again",
    name: "runs again once the period is over",
    code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled(1);
await clock.tick(100);
throttled(2);
await clock.tick(100);
throttled(3);
expect(fn.calls, "calls to fn").toEqual([[1], [2], [3]]);`,
  },
  {
    id: "exact-limit",
    name: "a call exactly at the limit runs, one millisecond earlier does not",
    code: `
const fn = spy();
const throttled = throttle(fn, 200);
throttled("first");
await clock.tick(199);
throttled("too early");
expect(fn.calls.length, "calls after 199 ms").toBe(1);
await clock.tick(1);
throttled("on time");
expect(fn.calls, "calls to fn").toEqual([["first"], ["on time"]]);`,
  },
  {
    id: "no-late-run",
    name: "dropped calls are not run later",
    code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled(1);
throttled(2);
await clock.tick(1000);
expect(fn.calls, "calls to fn").toEqual([[1]]);`,
  },
  {
    id: "from-last-run",
    name: "the period is counted from the last run, not from a dropped call",
    code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled(1);
await clock.tick(60);
throttled(2);
await clock.tick(40);
throttled(3);
expect(fn.calls, "calls to fn").toEqual([[1], [3]]);`,
  },
  {
    id: "keeps-this",
    name: "keeps this",
    code: `
const fn = spy();
const page = { name: "page", onScroll: throttle(fn, 100) };
page.onScroll();
expect(fn.thisValues[0], "this inside fn").toBe(page);`,
  },
  {
    id: "all-arguments",
    name: "passes all the arguments",
    code: `
const fn = spy();
throttle(fn, 100)(1, "two", [3]);
expect(fn.calls, "calls to fn").toEqual([[1, "two", [3]]]);`,
  },
  {
    id: "own-time",
    name: "two throttled functions do not share their time",
    code: `
const first = spy();
const second = spy();
const a = throttle(first, 100);
const b = throttle(second, 100);
a();
b();
expect(first.calls.length, "calls to the first fn").toBe(1);
expect(second.calls.length, "calls to the second fn").toBe(1);`,
  },
];

export const throttle: CodeProblem = {
  id: "throttle",
  kind: "code",
  group: "most-repeated",
  title: "Throttle",
  difficulty: "medium",
  tag: "likely",
  language: "js",
  api: ["throttle"],
  plainLoops: true,
  statement: "Write throttle(fn, limit): fn runs at most once every limit ms.",
  examples: ['window.addEventListener("scroll", throttle(() => console.log("scroll"), 200));'],
  askFirst: ["Should the last call run at the end too?", "Keep 'this' and the arguments?"],
  edgeCases: ["First call runs at once", "Calls inside the period are dropped"],
  parts: [
    {
      id: "main",
      title: "throttle",
      signature: "throttle(fn, limit)",
      steps: [
        line("function throttle(fn, limit) {", {
          coach:
            "Let's start, Islam. We need a function that takes the original function and the shortest time allowed between two runs.",
          hint1: "Declare a function called `throttle` with two parameters: the function and the limit.",
          explain: "throttle takes the function and the minimum time between two runs.",
        }),
        line("  let lastCall = 0;", {
          coach: "We need to remember when the original function last ran. We start from zero, so the first call is allowed at once.",
          hint1: "Declare it with `let`, because it changes later, and give it the value 0.",
          explain: "The closure keeps the time of the last run, and it starts at 0 so the first call runs at once.",
        }),
        line("  return function (...args) {", {
          coach:
            "Now we give back the function that the caller will really use. It must keep the caller's `this`, and it takes any number of arguments.",
          hint1: "Return a regular `function`, not an arrow, with a rest parameter.",
          explain: "I return a regular function, so it keeps the caller's this and collects the arguments.",
        }),
        line("    const now = Date.now();", {
          coach: "Inside, we first need the current time, so we can compare it with the time of the last run.",
          hint1: "`Date.now` gives the current time in milliseconds. Keep it in a variable.",
          explain: "On every call I read the current time.",
        }),
        line("    if (now - lastCall >= limit) {", {
          coach: "Now we ask: has enough time passed since the last run?",
          hint1: "Subtract `lastCall` from `now`, and check that the result is at least `limit`.",
          explain: "I subtract the time of the last run from now and compare the result with the limit.",
        }),
        line("      lastCall = now;", {
          coach: "If it has, this moment becomes the time of the last run. We record it before we call the original function, not after.",
          hint1: "Give `lastCall` a new value: the time we just read.",
          explain: "I move lastCall to now, so the next period is counted from this run.",
        }),
        line("      fn.apply(this, args);\n    }", {
          coach: "Then the original function runs with the caller's `this` and arguments, and we close the if. Two lines.",
          hint1: "Use `apply` on `fn`. It takes `this` and the array of arguments. Then close the block.",
          explain: "apply calls the original function with the same this and the same arguments.",
        }),
        line("  };\n}", {
          coach: "Last, we close the returned function, and then the outer function. Two lines.",
          hint1: "One line with a closing brace and a semicolon, then one line with a closing brace.",
          explain: "The returned function ends with no else, so a call that comes too early does nothing.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1) per call.",
  followUps: [
    {
      question: "When do you use it?",
      answer: "For scroll, resize and mouse move events.",
    },
  ],
};
