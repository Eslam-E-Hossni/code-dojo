import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";
import { PROMISE_HELPERS } from "./promise-helpers";

const tests: TestCase[] = [
  {
    id: "first-fulfilled",
    name: "resolves with the first fulfilled value",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAny([after(50, "slow"), after(10, "fast")]));
await clock.tick(10);
expect(state).toEqual({ status: "fulfilled", value: "fast" });`,
  },
  {
    id: "ignores-rejections",
    name: "edge case: earlier rejections are ignored",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAny([failAfter(5, "first error"), after(30, "ok"), failAfter(10, "second error")]));
await clock.tick(10);
expect(state.status, "status after two rejections").toBe("pending");
await clock.tick(20);
expect(state).toEqual({ status: "fulfilled", value: "ok" });`,
  },
  {
    id: "all-rejected",
    name: "edge case: every promise rejects",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAny([failAfter(20, "a"), failAfter(10, "b")]));
await clock.tick(10);
expect(state.status, "status after the first rejection").toBe("pending");
await clock.tick(10);
expect(state.status, "status after the last rejection").toBe("rejected");
expect(state.value instanceof AggregateError, "the reason is an AggregateError").toBe(true);`,
  },
  {
    id: "errors-order",
    name: "edge case: the errors keep the input order",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAny([failAfter(20, "slow error"), failAfter(10, "fast error")]));
await clock.tick(20);
expect(state.value.errors, "errors of the AggregateError").toEqual(["slow error", "fast error"]);`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array rejects at once",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAny([]));
await clock.tick(0);
expect(state.status).toBe("rejected");
expect(state.value instanceof AggregateError, "the reason is an AggregateError").toBe(true);
expect(state.value.errors, "errors of the AggregateError").toEqual([]);`,
  },
  {
    id: "plain-value",
    name: "a plain value counts as a success",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAny([failAfter(10, "error"), 42]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: 42 });`,
  },
  {
    id: "ignores-later",
    name: "later results are ignored",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseAny([after(10, "first"), after(20, "second"), failAfter(30, "late error")]));
await clock.tick(100);
expect(state).toEqual({ status: "fulfilled", value: "first" });`,
  },
];

export const promiseAny: CodeProblem = {
  id: "promise-any",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.any",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: ["promiseAny"],
  plainLoops: true,
  statement: "Write your own Promise.any, as a function promiseAny(promises).",
  examples: ["promiseAny([fetchFromMirror1(), fetchFromMirror2()]); // the first one that succeeds"],
  askFirst: [
    "What should it reject with when every promise fails?",
    "Can the input contain plain values?",
    "What should happen with an empty array?",
  ],
  edgeCases: [
    "Some promises reject first: they are ignored",
    "Every promise rejects: reject with an AggregateError",
    "Empty array: reject at once",
    "The errors keep the input order",
  ],
  parts: [
    {
      id: "main",
      title: "promiseAny",
      signature: "promiseAny(promises)",
      steps: [
        line("function promiseAny(promises) {", {
          coach:
            "Let's start, Islam. We need a function that takes an array of promises and waits for the first one that succeeds.",
          hint1: "Declare a function called `promiseAny` with one parameter.",
          explain: "promiseAny takes an array of promises.",
        }),
        line("  return new Promise((resolve, reject) => {", {
          coach:
            "The caller gets back one new promise. It succeeds with the first success and fails only when every input fails, so we need both ways to settle it.",
          hint1: "Return a `new Promise`. Its executor is an arrow function that takes `resolve` and `reject`.",
          explain: "I return a new Promise that fulfills with the first success and rejects only if everything fails.",
        }),
        line("    const errors = [];", {
          coach:
            "This is the opposite of Promise.all: here we collect the failures, not the values. We need a place for them.",
          hint1: "Create an empty array and keep it in a variable.",
          explain: "Here I collect the errors and not the values, which is the opposite of Promise.all.",
        }),
        line("    let rejected = 0;", {
          coach: "We also need to know when every promise has failed, so we count the failures.",
          hint1: "A counter: declare it with `let` and start it at 0.",
          explain: "A counter tells me how many promises have rejected.",
        }),
        line("    if (promises.length === 0) {", {
          coach: "One special case first: with an empty array no promise can ever succeed.",
          hint1: "An `if` that checks if the `length` of `promises` is 0.",
          explain: "I check for an empty array, because then nothing can succeed.",
        }),
        line('      return reject(new AggregateError(errors, "All promises were rejected"));\n    }', {
          coach:
            "In that case we fail at once with the special error that holds a list of errors, with a message that says all promises were rejected, and then we close the if. Two lines.",
          hint1:
            '`return` a call to `reject` with a `new AggregateError`. It takes `errors` and the message "All promises were rejected". Then close the block.',
          explain: "For an empty array I reject at once with an AggregateError.",
        }),
        line("    for (let i = 0; i < promises.length; i++) {", {
          coach:
            "Now we go through the promises one by one. Each turn of the loop must remember its own index, because the callbacks run later.",
          hint1: "A plain `for` loop over `promises`. Declare the index with `let`, not with `var`.",
          explain: "I loop over the input with let, so every callback remembers its own index.",
        }),
        line("      Promise.resolve(promises[i]).then(resolve, (reason) => {", {
          coach:
            "We wrap each item, because it can be a plain value, and the first success must settle the returned promise directly. A failure is different: we must record it, so it gets our own handler, which receives the reason.",
          hint1:
            "`Promise.resolve` on the item, then `then` with two arguments: `resolve` itself, and an arrow function that takes `reason`.",
          explain: "A success goes straight to resolve, so the first one wins, and a failure goes to my own handler.",
        }),
        line("        errors[i] = reason;", {
          coach:
            "The errors must keep the input order, like the values in Promise.all. So the reason goes to the position of its own promise.",
          hint1: "Assign to `errors` at index `i`.",
          explain: "I store the reason at the index of its promise.",
        }),
        line("        rejected++;", {
          coach: "One more promise has failed, so we count it.",
          hint1: "Add 1 to `rejected`.",
          explain: "I add one to the counter of rejections.",
        }),
        line("        if (rejected === promises.length) {", {
          coach: "Now we ask: has every promise failed?",
          hint1: "Compare `rejected` with the `length` of `promises`.",
          explain: "I check if every promise has rejected.",
        }),
        line('          reject(new AggregateError(errors, "All promises were rejected"));\n        }', {
          coach:
            "If so, no success can come any more, so we fail with the same special error, which now holds all the reasons, and then we close the if. Two lines.",
          hint1: "Call `reject` with a `new AggregateError`, with `errors` and the same message as before. Then close the block.",
          explain: "I reject with an AggregateError that holds all the reasons.",
        }),
        line("      });", {
          coach: "We close the failure handler, and then the call that it was passed to.",
          hint1: "Close the arrow function, then the `then` call, then a semicolon.",
          explain: "The rejection handler ends here, and the then call ends with it.",
        }),
        line("    }\n  });\n}", {
          coach: "Last, we close the loop, then the promise, and then the function. Three lines.",
          hint1:
            "A closing brace for the loop, then a brace with a parenthesis and a semicolon for the promise, then a brace for the function.",
          explain: "The loop ends first, then the new Promise, and then promiseAny.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). All promises run in parallel.",
  followUps: [
    {
      question: "How is any different from race?",
      answer: "race takes the first one to settle, also a rejection. any waits for the first one that fulfills.",
    },
    {
      question: "What is an AggregateError?",
      answer: "One error that holds many errors, in its errors property.",
    },
  ],
};
