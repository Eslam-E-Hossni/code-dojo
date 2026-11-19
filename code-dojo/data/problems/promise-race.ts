import type { CodeProblem } from "../types";
import { PROMISE_HELPERS } from "./promise-helpers";

export const promiseRace: CodeProblem = {
  id: "promise-race",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.race",
  difficulty: "easy",
  tag: "polyfill",
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
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد array من الـ promises. اكتب تعريفها.",
          expected: "function promiseRace(promises) {",
          hint1: "دالة اسمها `promiseRace` وبتاخد `promises`.",
          hint2: "function ___________(________) {",
          explain: "promiseRace takes an array of promises.",
        },
        {
          coach: "بترجّع Promise جديدة، وممكن تنجح أو تفشل حسب مين يخلص الأول.",
          expected: "  return new Promise((resolve, reject) => {",
          hint1: "`return new Promise`، والـ executor arrow بياخد `resolve` و `reject` وبيفتح قوس.",
          hint2: "return new _______((_______, ______) => {",
          explain: "It returns a new Promise that settles like the first input to settle.",
        },
        {
          coach: "لف على كل الـ promises.",
          expected: "    for (let i = 0; i < promises.length; i++) {",
          accept: ["for (let i = 0; i < promises.length; i += 1) {", "for (let i = 0; i < promises.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `promises.length`.",
          hint2: "for (let _ = 0; _ < ________.______; _++) {",
          explain: "I loop over the input.",
        },
        {
          coach:
            "كل واحدة: لفّها في Promise، وادّي `resolve` و `reject` نفسهم لـ `then`. أول واحدة تخلص هي اللي هتحسم، والباقي ندائهم مبيعملش حاجة.",
          expected: "      Promise.resolve(promises[i]).then(resolve, reject);",
          hint1: "`Promise.resolve` على `promises[i]`، وبعدها `.then` بـ `resolve` و `reject`.",
          hint2: "Promise._______(________[_]).____(_______, ______);",
          explain:
            "Each one passes its result straight to resolve or reject. A promise settles only once, so the first one wins and the rest are ignored.",
        },
        {
          coach: "اقفل الـ loop، واقفل الـ Promise، واقفل الدالة. تلات سطور.",
          expected: "    }\n  });\n}",
          hint1: "قوس الـ loop، وبعده قوس الـ arrow مع قوس الـ Promise و semicolon، وبعده قوس الدالة.",
          hint2: "_\n_);\n_",
          explain: "I close the loop, the promise and the function.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "resolves with the first value",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseRace([after(50, "slow"), after(10, "fast")]));
await clock.tick(10);
expect(state).toEqual({ status: "fulfilled", value: "fast" });`,
    },
    {
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
      name: "edge case: later results are ignored",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseRace([after(10, "first"), failAfter(20, "late error"), after(30, "last")]));
await clock.tick(100);
expect(state).toEqual({ status: "fulfilled", value: "first" });`,
    },
    {
      name: "edge case: a plain value wins against a waiting promise",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseRace([after(10, "promise"), "plain"]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: "plain" });`,
    },
    {
      name: "edge case: empty array stays pending",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseRace([]));
await clock.tick(1000);
expect(state.status).toBe("pending");`,
    },
    {
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
  ],
  complexity: "Time: O(n) to attach the handlers. It settles with the first input that settles.",
  idea: "الـ Promise بتتحسم مرة واحدة بس. فبندّي `resolve` و `reject` لكل الـ promises، وأول واحدة تخلص هي اللي بتحسم.",
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
