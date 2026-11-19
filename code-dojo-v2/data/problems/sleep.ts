import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "sleep-returns-promise",
    name: "sleep: returns a promise",
    part: "sleep",
    code: `
const promise = sleep(10);
expect(promise instanceof Promise, "sleep(10) is a Promise").toBe(true);
await clock.tick(10);
await promise;`,
  },
  {
    id: "sleep-waits",
    name: "sleep: does not resolve before the time is over",
    part: "sleep",
    code: `
let done = false;
sleep(100).then(() => {
  done = true;
});
await clock.tick(99);
expect(done, "resolved after 99 ms").toBe(false);
await clock.tick(1);
expect(done, "resolved after 100 ms").toBe(true);`,
  },
  {
    id: "sleep-await",
    name: "sleep: works with await",
    part: "sleep",
    code: `
const order = [];
(async function demo() {
  order.push("start");
  await sleep(1000);
  order.push("one second later");
})();
await clock.tick(999);
expect(order, "after 999 ms").toEqual(["start"]);
await clock.tick(1);
expect(order, "after 1000 ms").toEqual(["start", "one second later"]);`,
  },
  {
    id: "sleep-zero",
    name: "sleep: edge case: ms is 0",
    part: "sleep",
    code: `
let done = false;
sleep(0).then(() => {
  done = true;
});
expect(done, "resolved in the same tick").toBe(false);
await clock.tick(0);
expect(done, "resolved after the timer").toBe(true);`,
  },
  {
    id: "sleep-missing",
    name: "sleep: edge case: ms is missing",
    part: "sleep",
    code: `
let done = false;
sleep().then(() => {
  done = true;
});
await clock.tick(0);
expect(done, "resolved after the timer").toBe(true);`,
  },
  {
    id: "sleep-independent",
    name: "sleep: two sleeps do not affect each other",
    part: "sleep",
    code: `
const order = [];
sleep(300).then(() => order.push("slow"));
sleep(100).then(() => order.push("fast"));
await clock.tick(100);
expect(order, "after 100 ms").toEqual(["fast"]);
await clock.tick(200);
expect(order, "after 300 ms").toEqual(["fast", "slow"]);`,
  },
  {
    id: "delay-calls-callback",
    name: "delay: calls the callback after the time, with the arguments",
    part: "delay",
    code: `
const fn = spy();
delay(fn, 200, 1, "two");
await clock.tick(199);
expect(fn.calls.length, "calls after 199 ms").toBe(0);
await clock.tick(1);
expect(fn.calls, "calls to the callback").toEqual([[1, "two"]]);`,
  },
  {
    id: "delay-result",
    name: "delay: resolves with what the callback returns",
    part: "delay",
    code: `
const promise = delay((a, b) => a + b, 50, 2, 3);
await clock.tick(50);
expect(await promise).toBe(5);`,
  },
  {
    id: "delay-waits",
    name: "delay: does not resolve before the time is over",
    part: "delay",
    code: `
let result = "pending";
delay(() => "done", 100).then((value) => {
  result = value;
});
await clock.tick(99);
expect(result, "after 99 ms").toBe("pending");
await clock.tick(1);
expect(result, "after 100 ms").toBe("done");`,
  },
  {
    id: "delay-zero",
    name: "delay: edge case: ms is 0",
    part: "delay",
    code: `
const fn = spy(() => "now");
const promise = delay(fn, 0);
expect(fn.calls.length, "calls in the same tick").toBe(0);
await clock.tick(0);
expect(await promise).toBe("now");`,
  },
];

function idsOf(part: string): string[] {
  const out: string[] = [];
  for (const test of tests) {
    if (test.part === part) out.push(test.id);
  }
  return out;
}

export const sleep: CodeProblem = {
  id: "sleep",
  kind: "code",
  group: "most-repeated",
  title: "sleep / delay with a Promise",
  difficulty: "easy",
  tag: "reported",
  language: "js",
  api: ["sleep", "delay"],
  plainLoops: true,
  statement: "Write a function that waits for some milliseconds and returns a Promise.",
  examples: [
    "async function demo() {",
    '  console.log("start");',
    "  await sleep(1000);",
    '  console.log("one second later");',
    "}",
  ],
  askFirst: ["Should it only wait, or also run a callback?", "Should it pass arguments to the callback?"],
  edgeCases: ["ms is 0 or missing", "The callback throws an error"],
  parts: [
    {
      id: "sleep",
      title: "sleep: only wait",
      signature: "sleep(ms)",
      steps: [
        line("function sleep(ms) {", {
          coach: "Let's start, Islam. We begin with the simplest version: a function that takes the number of milliseconds to wait.",
          hint1: "Declare a function called `sleep` with one parameter.",
          explain: "sleep takes the number of milliseconds to wait.",
        }),
        line("  return new Promise((resolve) => setTimeout(resolve, ms));", {
          coach:
            "The caller needs something to await, so we give back a Promise. A timer inside it must resolve the Promise when the time is over.",
          hint1: "Return a `new Promise`. In its executor, give `resolve` to `setTimeout` as the callback.",
          explain: "I return a new Promise, and setTimeout calls resolve when the time is over.",
          accept: [
            "  return new Promise((resolve) => { setTimeout(resolve, ms); });",
            "  return new Promise((resolve) => setTimeout(() => resolve(), ms));",
          ],
        }),
        line("}", {
          coach: "The function has nothing more to do, so we close it.",
          hint1: "One closing brace.",
          explain: "The function ends here, and its whole body is one timer inside a promise.",
          checks: idsOf("sleep"),
        }),
      ],
    },
    {
      id: "delay",
      title: "delay: run a callback after a delay, promise style",
      signature: "delay(fn, ms, ...args)",
      steps: [
        line("function delay(fn, ms, ...args) {", {
          coach:
            "Now the second version, which runs a callback after the wait. It takes the callback, the time, and any arguments for the callback.",
          hint1: "Declare a function called `delay` with two parameters and then a rest parameter.",
          explain: "delay takes a callback, the time to wait, and the arguments for the callback.",
        }),
        line("  return new Promise((resolve) => {", {
          coach: "Again the caller gets a Promise. This time the executor has more to do, so it needs a body in braces.",
          hint1: "Return a `new Promise`. Its executor is an arrow function that takes `resolve` and opens a block.",
          explain: "I return a new Promise, and its executor gets the resolve function to use later.",
        }),
        line("    setTimeout(() => resolve(fn(...args)), ms);", {
          coach:
            "Inside, we start the timer. When it ends, the callback runs with its arguments, and its result becomes the value of the Promise.",
          hint1: "Use `setTimeout` with an arrow function. Inside it, call `fn` with the spread arguments and give the result to `resolve`.",
          explain: "When the timer fires, I call the callback and resolve with its result.",
          accept: ["    setTimeout(() => { resolve(fn(...args)); }, ms);"],
        }),
        line("  });\n}", {
          coach: "We close the executor together with the Promise call, and then the function. Two lines.",
          hint1: "One line with a closing brace, a closing parenthesis and a semicolon, then one line with a closing brace.",
          explain: "The executor and the Promise call end first, and then delay ends.",
          checks: idsOf("delay"),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(1). It only wraps one timer.",
  followUps: [
    {
      question: "How would you add a cancel?",
      answer: "I return the timer id with the promise, or I accept an AbortSignal and call clearTimeout on abort.",
    },
    {
      question: "Where does the callback of await sleep() run?",
      answer: "In the microtask queue, after the timer macrotask resolves the promise.",
    },
  ],
};
