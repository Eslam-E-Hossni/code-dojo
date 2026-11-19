import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";
import { PROMISE_HELPERS } from "./promise-helpers";

const tests: TestCase[] = [
  {
    id: "first-value",
    name: "resolves with the first value",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseRace([after(50, "slow"), after(10, "fast")]));
await clock.tick(10);
expect(state).toEqual({ status: "fulfilled", value: "fast" });`,
  },
  {
    id: "waits-for-first",
    name: "does not settle before any input settles",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseRace([after(50, "a"), after(80, "b")]));
await clock.tick(49);
expect(state.status, "status after 49 ms").toBe("pending");
await clock.tick(1);
expect(state.status, "status after 50 ms").toBe("fulfilled");`,
  },
  {
    id: "first-rejects",
    name: "edge case: the first one to settle rejects",
    code:
      PROMISE_HELPERS +
      `
const error = new Error("too slow");
const state = watch(promiseRace([after(50, "data"), failAfter(10, error)]));
await clock.tick(10);
expect(state.status).toBe("rejected");
expect(state.value, "the reason").toBe(error);`,
  },
  {
    id: "ignores-later",
    name: "edge case: later results are ignored",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseRace([after(10, "first"), failAfter(20, "late error"), after(30, "last")]));
await clock.tick(100);
expect(state).toEqual({ status: "fulfilled", value: "first" });`,
  },
  {
    id: "plain-value",
    name: "edge case: a plain value wins against a waiting promise",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseRace([after(10, "promise"), "plain"]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: "plain" });`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array stays pending",
    code:
      PROMISE_HELPERS +
      `
const state = watch(promiseRace([]));
await clock.tick(1000);
expect(state.status).toBe("pending");`,
  },
  {
    id: "already-rejected",
    name: "a promise that is already rejected beats a fulfilled one after it",
    code:
      PROMISE_HELPERS +
      `
const error = new Error("first in line");
const state = watch(promiseRace([Promise.reject(error), Promise.resolve("second in line")]));
await clock.tick(0);
expect(state.status).toBe("rejected");
expect(state.value, "the reason").toBe(error);`,
  },
];

export const promiseRace: CodeProblem = {
  id: "promise-race",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.race",
  difficulty: "easy",
  tag: "polyfill",
  language: "js",
  api: ["promiseRace"],
  plainLoops: true,
  statement: "Write your own Promise.race, as a function promiseRace(promises).",
  examples: ["promiseRace([fetchData(), timeout(5000)]); // settles like whichever settles first"],
  askFirst: [
    "Does a rejection also end the race, or only a fulfilled promise?",
    "Can the input contain plain values?",
    "What should happen with an empty array?",
  ],
  edgeCases: [
    "The first one to settle rejects",
    "Plain values in the input",
    "Empty array: the promise stays pending",
    "Later results are ignored",
  ],
  parts: [
    {
      id: "main",
      title: "promiseRace",
      signature: "promiseRace(promises)",
      steps: [
        line("function promiseRace(promises) {", {
          coach:
            "Let's start, Islam. We need a function that takes an array of promises and follows the first one that settles.",
          hint1: "Declare a function called `promiseRace` with one parameter.",
          explain: "promiseRace takes an array of promises.",
        }),
        line("  return new Promise((resolve, reject) => {", {
          coach:
            "The caller gets back one new promise. The first input to settle can be a success or a failure, so we need both ways to settle the new promise.",
          hint1: "Return a `new Promise`. Its executor is an arrow function that takes `resolve` and `reject`.",
          explain: "I return a new Promise that settles like the first input to settle.",
        }),
        line("    for (let i = 0; i < promises.length; i++) {", {
          coach: "Any of the promises can be the first to settle, so we go through all of them.",
          hint1: "A plain `for` loop over `promises`, from the first index to the last.",
          explain: "I loop over the input.",
        }),
        line("      Promise.resolve(promises[i]).then(resolve, reject);", {
          coach:
            "We wrap each item, because it can be a plain value, and we connect its success and its failure straight to the returned promise. The first one to settle decides, and the others can change nothing after that.",
          hint1: "`Promise.resolve` on the item, then `then` with two arguments: `resolve` and `reject` themselves.",
          explain:
            "Each input passes its result to resolve or reject, and because a promise settles only once, only the first call counts.",
        }),
        line("    }\n  });\n}", {
          coach: "Last, we close the loop, then the promise, and then the function. Three lines.",
          hint1:
            "A closing brace for the loop, then a brace with a parenthesis and a semicolon for the promise, then a brace for the function.",
          explain: "The loop ends first, then the new Promise, and then promiseRace.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n) to attach the handlers. It settles with the first input that settles.",
  followUps: [
    {
      question: "What is a real use for race?",
      answer: "A timeout: race the request against a promise that rejects after some seconds.",
    },
    {
      question: "Why then(resolve, reject) and not then(resolve).catch(reject)?",
      answer:
        "With catch the rejection arrives one step later, so a fulfilled promise after it could win. With two arguments both paths take the same number of steps.",
    },
    {
      question: "How is any different from race?",
      answer: "any ignores rejections and waits for the first fulfilled promise. race takes the first one to settle, whatever it is.",
    },
  ],
};
