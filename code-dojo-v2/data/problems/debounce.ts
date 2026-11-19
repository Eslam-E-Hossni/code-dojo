import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "waits",
    name: "does not call fn before the delay has passed",
    code: `
const fn = spy();
const debounced = debounce(fn, 300);
debounced("a");
expect(fn.calls.length, "calls right after calling it").toBe(0);
await clock.tick(299);
expect(fn.calls.length, "calls after 299 ms").toBe(0);
await clock.tick(1);
expect(fn.calls.length, "calls after 300 ms").toBe(1);`,
  },
  {
    id: "last-arguments",
    name: "many fast calls run fn once, with the last arguments",
    code: `
const fn = spy();
const debounced = debounce(fn, 100);
debounced("a");
debounced("b");
debounced("c");
await clock.tick(100);
expect(fn.calls, "calls to fn").toEqual([["c"]]);`,
  },
  {
    id: "restarts",
    name: "every new call starts the wait again",
    code: `
const fn = spy();
const debounced = debounce(fn, 100);
debounced(1);
await clock.tick(80);
debounced(2);
await clock.tick(80);
expect(fn.calls.length, "calls 160 ms after the first call").toBe(0);
await clock.tick(20);
expect(fn.calls, "calls to fn").toEqual([[2]]);`,
  },
  {
    id: "runs-again",
    name: "runs again after a quiet period",
    code: `
const fn = spy();
const debounced = debounce(fn, 50);
debounced("first");
await clock.tick(50);
debounced("second");
await clock.tick(50);
expect(fn.calls, "calls to fn").toEqual([["first"], ["second"]]);`,
  },
  {
    id: "once",
    name: "edge case: called once only",
    code: `
const fn = spy();
debounce(fn, 200)("only");
await clock.tick(1000);
expect(fn.calls, "calls to fn").toEqual([["only"]]);`,
  },
  {
    id: "zero-delay",
    name: "edge case: delay is 0",
    code: `
const fn = spy();
const debounced = debounce(fn, 0);
debounced("x");
expect(fn.calls.length, "calls before any timer ran").toBe(0);
await clock.tick(0);
expect(fn.calls, "calls to fn").toEqual([["x"]]);`,
  },
  {
    id: "keeps-this",
    name: "edge case: fn uses 'this'",
    code: `
const fn = spy();
const input = { name: "search", onType: debounce(fn, 100) };
input.onType("q");
await clock.tick(100);
expect(fn.thisValues[0], "this inside fn").toBe(input);`,
  },
  {
    id: "all-arguments",
    name: "passes all the arguments",
    code: `
const fn = spy();
debounce(fn, 10)(1, "two", [3]);
await clock.tick(10);
expect(fn.calls, "calls to fn").toEqual([[1, "two", [3]]]);`,
  },
  {
    id: "own-timer",
    name: "two debounced functions do not share a timer",
    code: `
const first = spy();
const second = spy();
const a = debounce(first, 100);
const b = debounce(second, 100);
a("a");
b("b");
await clock.tick(100);
expect(first.calls.length, "calls to the first fn").toBe(1);
expect(second.calls.length, "calls to the second fn").toBe(1);`,
  },
];

export const debounce: CodeProblem = {
  id: "debounce",
  kind: "code",
  group: "most-repeated",
  title: "Debounce",
  difficulty: "medium",
  tag: "reported",
  language: "js",
  api: ["debounce"],
  plainLoops: true,
  statement: "Write debounce(fn, delay): fn runs only after the calls stop for delay ms.",
  examples: ['const onSearch = debounce((text) => console.log("search:", text), 300);'],
  askFirst: [
    "Should it keep 'this' and the arguments?",
    "Do you need a cancel method?",
    "Run at the start or at the end?",
  ],
  edgeCases: ["Called once only", "delay is 0", "fn uses 'this'"],
  parts: [
    {
      id: "main",
      title: "debounce",
      signature: "debounce(fn, delay)",
      steps: [
        line("function debounce(fn, delay) {", {
          coach: "Let's start, Islam. We need a function that takes the original function and the time to wait.",
          hint1: "Declare a function called `debounce` with two parameters: the function and the delay.",
          explain: "debounce takes the function and the delay in milliseconds.",
        }),
        line("  let timer;", {
          coach: "We need one variable that lives between the calls, so a later call can cancel an earlier one.",
          hint1: "Declare it with `let` and give it no value yet. It will live in the closure.",
          explain: "The closure keeps the timer id between calls.",
          accept: ["  let timer = null;", "  let timer = 0;"],
        }),
        line("  return function (...args) {", {
          coach:
            "Now we give back the function that the caller will really use. It must keep the caller's `this`, and it takes any number of arguments.",
          hint1: "Return a regular `function`, not an arrow, with a rest parameter.",
          explain: "I return a regular function, so it keeps the caller's this and collects the arguments.",
        }),
        line("    clearTimeout(timer);", {
          coach: "A new call means the old wait is no longer valid. We cancel it first.",
          hint1: "Use the built-in function that cancels a timeout, and give it `timer`.",
          explain: "Every new call cancels the timer of the call before it.",
        }),
        line("    timer = setTimeout(() => {", {
          coach:
            "Then we start a new wait and save its id in the same variable. The callback must see the same `this` as the function around it.",
          hint1: "Assign the result of `setTimeout` to `timer`. Use an arrow function as the callback.",
          explain: "I start a new timer and save its id, and the arrow function keeps this from the outer function.",
        }),
        line("      fn.apply(this, args);", {
          coach: "When the wait is over, the original function finally runs, as if the caller had called it directly.",
          hint1: "Use `apply` on `fn`. It takes `this` and the array of arguments.",
          explain: "apply calls the original function with the same this and the same arguments.",
        }),
        line("    }, delay);", {
          coach: "We close the callback and tell the timer how long to wait. Many people forget this part.",
          hint1: "Close the arrow function, then a comma, then `delay`, then close the call.",
          explain: "The second argument of setTimeout is the delay.",
        }),
        line("  };\n}", {
          coach: "Last, we close the returned function, and then the outer function. Two lines.",
          hint1: "One line with a closing brace and a semicolon, then one line with a closing brace.",
          explain: "The returned function ends first, and then debounce ends.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1) per call.",
  followUps: [
    {
      question: "Debounce vs throttle?",
      answer: "Debounce waits until the calls stop. Throttle runs at most once per period.",
    },
    {
      question: "Why a regular function and not an arrow for the returned one?",
      answer: "To keep the caller's 'this' and pass it on with apply.",
    },
  ],
};
