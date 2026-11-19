import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";
import { PROMISE_HELPERS } from "./promise-helpers";

const tests: TestCase[] = [
  {
    id: "reports-both",
    name: "reports fulfilled and rejected promises, in input order",
    code:
      PROMISE_HELPERS +
      `
const error = new Error("boom");
const state = watch(promiseAllSettled([after(20, "a"), failAfter(10, error), after(5, "c")]));
await clock.tick(20);
expect(state.status).toBe("fulfilled");
expect(state.value).toEqual([
  { status: "fulfilled", value: "a" },
  { status: "rejected", reason: error },
  { status: "fulfilled", value: "c" },
]);`,
  },
  {
    id: "waits-for-all",
    name: "waits for every promise, also after a rejection",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAllSettled([failAfter(10, "early"), after(100, "late")]));
await clock.tick(99);
expect(state.status, "status after 99 ms").toBe("pending");
await clock.tick(1);
expect(state.status, "status after 100 ms").toBe("fulfilled");`,
  },
  {
    id: "all-rejected",
    name: "edge case: every promise rejects, and it still resolves",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAllSettled([failAfter(5, "x"), Promise.reject("y")]));
await clock.tick(5);
expect(state).toEqual({
  status: "fulfilled",
  value: [
    { status: "rejected", reason: "x" },
    { status: "rejected", reason: "y" },
  ],
});`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array resolves with []",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAllSettled([]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: [] });`,
  },
  {
    id: "plain-values",
    name: "edge case: plain values in the input",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAllSettled([1, "two", after(10, 3)]));
await clock.tick(10);
expect(state.value).toEqual([
  { status: "fulfilled", value: 1 },
  { status: "fulfilled", value: "two" },
  { status: "fulfilled", value: 3 },
]);`,
  },
  {
    id: "keeps-order",
    name: "edge case: results keep the input order, not the finish order",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAllSettled([after(30, "slow"), after(10, "fast")]));
await clock.tick(30);
expect(state.value).toEqual([
  { status: "fulfilled", value: "slow" },
  { status: "fulfilled", value: "fast" },
]);`,
  },
  {
    id: "result-keys",
    name: "a fulfilled result has no reason, and a rejected one has no value",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAllSettled([Promise.resolve(1), Promise.reject(2)]));
await clock.tick(0);
expect(Object.keys(state.value[0]), "keys of a fulfilled result").toEqual(["status", "value"]);
expect(Object.keys(state.value[1]), "keys of a rejected result").toEqual(["status", "reason"]);`,
  },
];

export const promiseAllSettled: CodeProblem = {
  id: "promise-all-settled",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.allSettled",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: ["promiseAllSettled"],
  plainLoops: true,
  statement: "Write your own Promise.allSettled, as a function promiseAllSettled(promises).",
  examples: [
    "promiseAllSettled([Promise.resolve(1), Promise.reject(error)]);",
    '// [{ status: "fulfilled", value: 1 }, { status: "rejected", reason: error }]',
  ],
  askFirst: [
    "Can the input contain plain values, not only promises?",
    "What exactly is the shape of each result?",
  ],
  edgeCases: [
    "Empty array: resolve with []",
    "Every promise rejects: it still resolves",
    "Plain values in the input",
    "Results arrive in a different order",
  ],
  parts: [
    {
      id: "main",
      title: "promiseAllSettled",
      signature: "promiseAllSettled(promises)",
      steps: [
        line("function promiseAllSettled(promises) {", {
          coach:
            "Let's start, Islam. We need a function that takes an array of promises and reports how each one of them ended.",
          hint1: "Declare a function called `promiseAllSettled` with one parameter.",
          explain: "promiseAllSettled takes an array of promises.",
        }),
        line("  return new Promise((resolve) => {", {
          coach:
            "The caller gets back one new promise. This one never fails, because a failure of an input is only one more result, so we need only the way to succeed.",
          hint1: "Return a `new Promise`. Its executor is an arrow function that takes only `resolve`.",
          explain: "I return a new Promise that never rejects, so the executor takes only resolve.",
        }),
        line("    const results = [];", {
          coach: "We need a place to keep one result for each promise.",
          hint1: "Create an empty array and keep it in a variable.",
          explain: "The results array will hold one object for each promise.",
        }),
        line("    let completed = 0;", {
          coach:
            "We also need to know when all of them are done, so we count the promises that have settled. A success and a failure both count.",
          hint1: "A counter: declare it with `let` and start it at 0.",
          explain: "The counter tells me how many promises have settled.",
        }),
        line("    if (promises.length === 0) return resolve(results);", {
          coach: "One special case first: with an empty array there is nothing to wait for, so we succeed at once.",
          hint1: "An `if` on the `length` of `promises`. When it is 0, `return` a call to `resolve` with `results`.",
          explain: "An empty array resolves at once with an empty array.",
          accept: ["    if (promises.length === 0) resolve(results);"],
        }),
        line("    for (let i = 0; i < promises.length; i++) {", {
          coach:
            "Now we go through the promises one by one. Each turn of the loop must remember its own index, because the callbacks run later.",
          hint1: "A plain `for` loop over `promises`. Declare the index with `let`, not with `var`.",
          explain: "I loop over the input with let, so every callback remembers its own index.",
        }),
        line("      Promise.resolve(promises[i])", {
          coach:
            "An item can be a plain value and not a promise, so we wrap it first. We leave the line without a semicolon, because the chain goes on after it.",
          hint1: "`Promise.resolve` turns any value into a promise. Give it the item at index `i`.",
          explain: "Promise.resolve turns a plain value into a promise.",
        }),
        line("        .then((value) => {", {
          coach: "First the case where this promise succeeds. We will get its value.",
          hint1: "Chain `then` with an arrow function that takes `value`.",
          explain: "The then callback runs when this promise fulfills.",
        }),
        line('          results[i] = { status: "fulfilled", value };\n        })', {
          coach:
            "We record the success at the position of this promise, as an object with the status as text and the value, and then we close the callback. Two lines.",
          hint1:
            'An object with two keys, `status` and `value`, stored at index `i`. The status is the text `"fulfilled"`. Then close the `then` call.',
          explain: "I store an object with the status fulfilled and the value.",
        }),
        line("        .catch((reason) => {", {
          coach: "Now the other case: this promise fails. We will get the reason.",
          hint1: "Chain `catch` with an arrow function that takes `reason`.",
          explain: "The catch callback runs when this promise rejects.",
        }),
        line('          results[i] = { status: "rejected", reason };\n        })', {
          coach:
            "A failure is recorded in the same way, as an object with the status as text and the reason, and then we close the callback. Two lines.",
          hint1: 'The same shape as before, with the text `"rejected"` and with `reason`. Then close the `catch` call.',
          explain: "I store an object with the status rejected and the reason.",
        }),
        line("        .finally(() => {", {
          coach:
            "After the promise settles there is work that both cases share. We need the method whose callback runs after a success and after a failure.",
          hint1: "Chain `finally` with an arrow function that takes no parameters.",
          explain: "The finally callback runs after this promise settles, in both cases.",
        }),
        line("          completed++;", {
          coach: "One more promise has settled, so we count it.",
          hint1: "Add 1 to `completed`.",
          explain: "I add one to the counter of settled promises.",
        }),
        line("          if (completed === promises.length) resolve(results);", {
          coach: "If this was the last one, every result is recorded, and the returned promise can succeed with all of them.",
          hint1: "Compare `completed` with the `length` of `promises`. When they are equal, call `resolve` with `results`.",
          explain: "When all of them have settled, I resolve with the results.",
        }),
        line("        });", {
          coach:
            "We close the callback, and then the call that it was passed to. The chain ends here, so this time the line ends with a semicolon.",
          hint1: "Close the arrow function, then the `finally` call, then a semicolon.",
          explain: "The finally callback ends here, and the chain ends with it.",
        }),
        line("    }\n  });\n}", {
          coach: "Last, we close the loop, then the promise, and then the function. Three lines.",
          hint1:
            "A closing brace for the loop, then a brace with a parenthesis and a semicolon for the promise, then a brace for the function.",
          explain: "The loop ends first, then the new Promise, and then promiseAllSettled.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). All promises run in parallel.",
  followUps: [
    {
      question: "When do you use allSettled and not all?",
      answer:
        "When I want every result, also the failed ones. For example several independent requests, where one failure must not hide the others.",
    },
    {
      question: "Why count in finally?",
      answer: "Because it runs after both a fulfilled and a rejected promise, so I count in one place.",
    },
  ],
};
