import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";
import { PROMISE_HELPERS } from "./promise-helpers";

const tests: TestCase[] = [
  {
    id: "returns-promise",
    name: "returns a promise",
    code: `expect(promiseAll([]) instanceof Promise, "promiseAll([]) is a Promise").toBe(true);`,
  },
  {
    id: "all-values",
    name: "resolves with all the values",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAll([after(10, "a"), after(20, "b")]));
await clock.tick(20);
expect(state).toEqual({ status: "fulfilled", value: ["a", "b"] });`,
  },
  {
    id: "waits-for-slowest",
    name: "does not resolve before the slowest one is done",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAll([after(10, "fast"), after(100, "slow")]));
await clock.tick(99);
expect(state.status, "status after 99 ms").toBe("pending");
await clock.tick(1);
expect(state.status, "status after 100 ms").toBe("fulfilled");`,
  },
  {
    id: "keeps-order",
    name: "edge case: results keep the input order, not the finish order",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAll([after(30, "slow"), after(10, "fast"), after(20, "middle")]));
await clock.tick(30);
expect(state.value).toEqual(["slow", "fast", "middle"]);`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array resolves with []",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAll([]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: [] });`,
  },
  {
    id: "plain-values",
    name: "edge case: plain values in the input",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAll([1, after(10, 2), "three", null]));
await clock.tick(10);
expect(state).toEqual({ status: "fulfilled", value: [1, 2, "three", null] });`,
  },
  {
    id: "rejects-at-once",
    name: "edge case: one rejection rejects at once",
    code:
      PROMISE_HELPERS +
      `
const error = new Error("boom");
const state = watch(promiseAll([after(100, "slow"), failAfter(10, error)]));
await clock.tick(10);
expect(state.status, "status right after the rejection").toBe("rejected");
expect(state.value, "the reason").toBe(error);
await clock.tick(100);
expect(state.status, "status after the slow one finished").toBe("rejected");`,
  },
  {
    id: "already-rejected",
    name: "a promise that is already rejected rejects the result",
    code:
      PROMISE_HELPERS +
      `
const error = new Error("already failed");
const state = watch(promiseAll([Promise.resolve(1), Promise.reject(error)]));
await clock.tick(0);
expect(state.status).toBe("rejected");
expect(state.value, "the reason").toBe(error);`,
  },
  {
    id: "one-item",
    name: "works with one item",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAll([after(5, "only")]));
await clock.tick(5);
expect(state.value).toEqual(["only"]);`,
  },
];

export const promiseAll: CodeProblem = {
  id: "promise-all",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.all",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: ["promiseAll"],
  plainLoops: true,
  statement: "Write your own Promise.all, as a function promiseAll(promises).",
  examples: ['promiseAll([fetchUser(), fetchPosts(), 42]).then(([user, posts, n]) => console.log(n)); // 42'],
  askFirst: [
    "Can the input contain plain values, not only promises?",
    "Must the results keep the input order?",
  ],
  edgeCases: [
    "Empty array: resolve with []",
    "One promise rejects: reject at once",
    "Plain values in the input",
    "Results arrive in a different order",
  ],
  parts: [
    {
      id: "main",
      title: "promiseAll",
      signature: "promiseAll(promises)",
      steps: [
        line("function promiseAll(promises) {", {
          coach: "Let's start, Islam. We need a function that takes the array of promises we want to wait for.",
          hint1: "Declare a function called `promiseAll` with one parameter.",
          explain: "promiseAll takes an array of promises.",
        }),
        line("  return new Promise((resolve, reject) => {", {
          coach:
            "The caller gets back one new promise. We decide when it succeeds and when it fails, so we need both ways to settle it.",
          hint1: "Return a `new Promise`. Its executor is an arrow function that takes `resolve` and `reject`.",
          explain: "I return one new Promise, and I resolve or reject it myself.",
        }),
        line("    const results = [];", {
          coach: "We need a place to keep the values as they arrive.",
          hint1: "Create an empty array and keep it in a variable.",
          explain: "I keep the results in an array.",
        }),
        line("    let completed = 0;", {
          coach: "We also need to know when every promise is done, so we count the ones that have finished.",
          hint1: "A counter: declare it with `let` and start it at 0.",
          explain: "A counter tells me how many promises are done.",
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
            "An item can be a plain value and not a promise, and a plain value has no `then`. So we wrap every item first, and we leave the line without a semicolon because the chain goes on.",
          hint1: "`Promise.resolve` turns any value into a promise. Give it the item at index `i`.",
          explain: "Promise.resolve turns a plain value into a promise, so every item is handled the same way.",
        }),
        line("        .then((value) => {", {
          coach: "Next we say what happens when this promise succeeds. We will get its value.",
          hint1: "Chain `then` with an arrow function that takes `value`.",
          explain: "The then callback runs when this promise fulfills, and it gets the value.",
        }),
        line("          results[i] = value;", {
          coach:
            "This is the most important line. The results must keep the input order, so the value goes to the position of its own promise and not to the end of the array.",
          hint1: "Assign to `results` at index `i`. Do not use push.",
          explain: "I store the value at its index, not with push, because promises finish in any order.",
        }),
        line("          completed++;", {
          coach: "One more promise is done, so we count it.",
          hint1: "Add 1 to `completed`.",
          explain: "I add one to the counter of finished promises.",
        }),
        line("          if (completed === promises.length) resolve(results);", {
          coach: "If this was the last one, all the values are ready, and the returned promise can succeed with them.",
          hint1: "Compare `completed` with the `length` of `promises`. When they are equal, call `resolve` with `results`.",
          explain: "When the counter reaches the number of promises, I resolve with the results.",
        }),
        line("        })\n        .catch(reject);", {
          coach:
            "We close the success callback, and then we handle failure: when any promise fails, the returned promise fails at once with the same reason. Two lines.",
          hint1: "First close the arrow function and the `then` call. Then chain `catch` and give it `reject` itself.",
          explain: "If any promise rejects, I reject at once with its reason.",
        }),
        line("    }\n  });\n}", {
          coach: "Last, we close the loop, then the promise, and then the function. Three lines.",
          hint1:
            "A closing brace for the loop, then a brace with a parenthesis and a semicolon for the promise, then a brace for the function.",
          explain: "The loop ends first, then the new Promise, and then promiseAll.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). All promises run in parallel.",
  followUps: [
    {
      question: "Why results[i] and not push?",
      answer: "Promises finish in any order. The index keeps the input order.",
    },
    {
      question: "How would allSettled differ?",
      answer: "It never rejects. It stores a status and a value or a reason for each one.",
    },
  ],
};
