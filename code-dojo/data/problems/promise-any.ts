import type { CodeProblem } from "../types";
import { PROMISE_HELPERS } from "./promise-helpers";

export const promiseAny: CodeProblem = {
  id: "promise-any",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.any",
  difficulty: "medium",
  tag: "polyfill",
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
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد array من الـ promises. اكتب تعريفها.",
          expected: "function promiseAny(promises) {",
          hint1: "دالة اسمها `promiseAny` وبتاخد `promises`.",
          hint2: "function __________(________) {",
          explain: "promiseAny takes an array of promises.",
        },
        {
          coach: "بترجّع Promise جديدة: بتنجح مع أول نجاح، وبتفشل بس لو الكل فشل.",
          expected: "  return new Promise((resolve, reject) => {",
          hint1: "`return new Promise`، والـ executor arrow بياخد `resolve` و `reject` وبيفتح قوس.",
          hint2: "return new _______((_______, ______) => {",
          explain: "It returns a new Promise. It fulfills with the first success, and rejects only if everything fails.",
        },
        {
          coach: "دي عكس `promiseAll`: اللي بنجمّعه هنا الأخطاء مش النتايج.",
          expected: "    const errors = [];",
          hint1: "`const` اسمه `errors` وقيمته array فاضية.",
          hint2: "const ______ = [];",
          explain: "This is the mirror of promiseAll: I collect the errors, not the values.",
        },
        {
          coach: "وعدّاد للي فشل.",
          expected: "    let rejected = 0;",
          hint1: "`let` اسمه `rejected` وقيمته صفر.",
          hint2: "let ________ = 0;",
          explain: "And I count the rejections.",
        },
        {
          coach: "لو الـ array فاضية، مفيش حد ممكن ينجح.",
          expected: "    if (promises.length === 0) {",
          hint1: "`if` بتسأل `promises.length` بيساوي صفر.",
          hint2: "if (________.______ === 0) {",
          explain: "With an empty array nothing can succeed,",
        },
        {
          coach:
            "افشل على طول بالخطأ الخاص اللي بيشيل كل الأخطاء، ومعاه رسالة. واقفل الـ `if`. سطرين.",
          expected: '      return reject(new AggregateError(errors, "All promises were rejected"));\n    }',
          hint1:
            "`return reject` وجواه `new AggregateError` بـ `errors` والرسالة: All promises were rejected.",
          hint2: 'return ______(new ______________(______, "All promises were ________"));\n}',
          explain: "so I reject at once with an AggregateError.",
        },
        {
          coach: "لف على الـ promises بـ `let`.",
          expected: "    for (let i = 0; i < promises.length; i++) {",
          accept: ["for (let i = 0; i < promises.length; i += 1) {", "for (let i = 0; i < promises.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `promises.length`.",
          hint2: "for (let _ = 0; _ < ________.______; _++) {",
          explain: "I loop over the input with let, so every callback remembers its own index.",
        },
        {
          coach:
            "كل واحدة: لو نجحت ادّي `resolve` نفسها، فأول نجاح يحسم. ولو فشلت، arrow بتاخد السبب.",
          expected: "      Promise.resolve(promises[i]).then(resolve, (reason) => {",
          hint1:
            "`Promise.resolve` على `promises[i]`، وبعدها `.then` بـ `resolve` و arrow بتاخد `reason` وبتفتح قوس.",
          hint2: "Promise._______(________[_]).____(_______, (______) => {",
          explain: "A success goes straight to resolve, so the first one wins. A failure goes to my own handler.",
        },
        {
          coach: "سجّل السبب في مكانه بالـ index.",
          expected: "        errors[i] = reason;",
          hint1: "`errors[i]` بيساوي `reason`.",
          hint2: "______[_] = ______;",
          explain: "I store the reason at its index,",
        },
        {
          coach: "زوّد عدّاد الفشل.",
          expected: "        rejected++;",
          accept: ["rejected += 1;", "++rejected;"],
          hint1: "`rejected` زائد واحد.",
          hint2: "________++;",
          explain: "count it,",
        },
        {
          coach: "هل الكل فشل؟",
          expected: "        if (rejected === promises.length) {",
          hint1: "`if` بتقارن `rejected` بـ `promises.length`.",
          hint2: "if (________ === ________.______) {",
          explain: "and if every promise has rejected,",
        },
        {
          coach: "لو آه، افشل بنفس الخطأ الخاص ومعاه كل الأسباب. واقفل الـ `if`. سطرين.",
          expected: '          reject(new AggregateError(errors, "All promises were rejected"));\n        }',
          hint1: "`reject` وجواه `new AggregateError` بـ `errors` ونفس الرسالة.",
          hint2: '______(new ______________(______, "All promises were ________"));\n}',
          explain: "I reject with an AggregateError that holds all the reasons.",
        },
        {
          coach: "اقفل الـ arrow وقوس الـ `then`.",
          expected: "      });",
          hint1: "قوس الـ arrow وقوس `then` و semicolon.",
          hint2: "_);",
          explain: "That ends the handler.",
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
      name: "resolves with the first fulfilled value",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAny([after(50, "slow"), after(10, "fast")]));
await clock.tick(10);
expect(state).toEqual({ status: "fulfilled", value: "fast" });`,
    },
    {
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
      name: "edge case: the errors keep the input order",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAny([failAfter(20, "slow error"), failAfter(10, "fast error")]));
await clock.tick(20);
expect(state.value.errors, "errors of the AggregateError").toEqual(["slow error", "fast error"]);`,
    },
    {
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
      name: "a plain value counts as a success",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAny([failAfter(10, "error"), 42]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: 42 });`,
    },
    {
      name: "later results are ignored",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAny([after(10, "first"), after(20, "second"), failAfter(30, "late error")]));
await clock.tick(100);
expect(state).toEqual({ status: "fulfilled", value: "first" });`,
    },
  ],
  complexity: "Time: O(n). All promises run in parallel.",
  idea: "هي عكس `promiseAll`: أول نجاح بيحسم، والأخطاء هي اللي بتتجمّع بالـ index. ولو الكل فشل بنرمي `AggregateError` فيه كل الأسباب.",
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
