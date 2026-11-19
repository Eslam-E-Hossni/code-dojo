import type { CodeProblem } from "../types";
import { PROMISE_HELPERS } from "./promise-helpers";

export const promiseAllSettled: CodeProblem = {
  id: "promise-all-settled",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.allSettled",
  difficulty: "medium",
  tag: "polyfill",
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
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد array من الـ promises. اكتب تعريفها.",
          expected: "function promiseAllSettled(promises) {",
          hint1: "دالة اسمها `promiseAllSettled` وبتاخد `promises`.",
          hint2: "function _________________(________) {",
          explain: "promiseAllSettled takes an array of promises.",
        },
        {
          coach:
            "بترجّع Promise جديدة. الفرق عن `promiseAll` إنها عمرها ما بتفشل، فمش محتاجين `reject` خالص.",
          expected: "  return new Promise((resolve) => {",
          hint1: "`return new Promise`، والـ executor arrow بياخد `resolve` بس وبيفتح قوس.",
          hint2: "return new _______((_______) => {",
          explain: "It returns a new Promise. It never rejects, so I only need resolve.",
        },
        {
          coach: "مكان للنتايج.",
          expected: "    const results = [];",
          hint1: "`const` اسمه `results` وقيمته array فاضية.",
          hint2: "const _______ = [];",
          explain: "I keep the results in an array.",
        },
        {
          coach: "وعدّاد للي خلص، سواء نجح أو فشل.",
          expected: "    let completed = 0;",
          hint1: "`let` اسمه `completed` وقيمته صفر.",
          hint2: "let _________ = 0;",
          explain: "And I count how many promises have settled.",
        },
        {
          coach: "لو الـ array فاضية، انجح على طول.",
          expected: "    if (promises.length === 0) return resolve(results);",
          accept: ["if (promises.length === 0) { return resolve(results); }", "if (promises.length === 0) resolve(results);"],
          hint1: "`if` بتسأل `promises.length` بيساوي صفر، ولو آه `return resolve(results)`.",
          hint2: "if (________.______ === 0) return _______(_______);",
          explain: "An empty array resolves at once with an empty array.",
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
          coach: "لف العنصر في Promise علشان القيم العادية. من غير semicolon علشان هنكمّل عليه.",
          expected: "      Promise.resolve(promises[i])",
          hint1: "`Promise.resolve` على `promises[i]`.",
          hint2: "Promise._______(________[_])",
          explain: "Promise.resolve turns a plain value into a promise.",
        },
        {
          coach: "لو نجحت، هناخد القيمة.",
          expected: "        .then((value) => {",
          hint1: "`.then` بـ arrow بتاخد `value` وبتفتح قوس.",
          hint2: ".____((_____) => {",
          explain: "If it fulfills,",
        },
        {
          coach:
            "سجّل في مكانها object فيه الحالة والقيمة. الحالة نص: fulfilled. واقفل الـ `then`. سطرين.",
          expected: '          results[i] = { status: "fulfilled", value };\n        })',
          accept: ['results[i] = { status: "fulfilled", value: value };\n})'],
          hint1: "`results[i]` بيساوي object فيه `status` بالنص fulfilled، و `value`.",
          hint2: '_______[_] = { ______: "_________", _____ };\n_)',
          explain: "I store an object with the status fulfilled and the value.",
        },
        {
          coach: "ولو فشلت، هناخد السبب.",
          expected: "        .catch((reason) => {",
          hint1: "`.catch` بـ arrow بتاخد `reason` وبتفتح قوس.",
          hint2: "._____((______) => {",
          explain: "If it rejects,",
        },
        {
          coach: "سجّل object فيه الحالة والسبب. الحالة نص: rejected. واقفل الـ `catch`. سطرين.",
          expected: '          results[i] = { status: "rejected", reason };\n        })',
          accept: ['results[i] = { status: "rejected", reason: reason };\n})'],
          hint1: "`results[i]` بيساوي object فيه `status` بالنص rejected، و `reason`.",
          hint2: '_______[_] = { ______: "________", ______ };\n_)',
          explain: "I store an object with the status rejected and the reason.",
        },
        {
          coach: "وفي الحالتين، بعد ما تخلص، فيه شغل مشترك. استخدم الـ method اللي بتشتغل دايمًا.",
          expected: "        .finally(() => {",
          hint1: "`.finally` بـ arrow من غير parameters وبتفتح قوس.",
          hint2: "._______(() => {",
          explain: "In both cases, after it settles,",
        },
        {
          coach: "زوّد العدّاد.",
          expected: "          completed++;",
          accept: ["completed += 1;", "++completed;"],
          hint1: "`completed` زائد واحد.",
          hint2: "_________++;",
          explain: "I count it,",
        },
        {
          coach: "ولو الكل خلص، انجح بالنتايج كلها.",
          expected: "          if (completed === promises.length) resolve(results);",
          accept: ["if (completed === promises.length) { resolve(results); }"],
          hint1: "`if` بتقارن `completed` بـ `promises.length`، ولو متساويين `resolve(results)`.",
          hint2: "if (_________ === ________.______) _______(_______);",
          explain: "and when all of them have settled, I resolve with the results.",
        },
        {
          coach: "اقفل الـ `finally`، والمرة دي بـ semicolon علشان السلسلة خلصت.",
          expected: "        });",
          hint1: "قوس الـ arrow وقوس `finally` و semicolon.",
          hint2: "_);",
          explain: "That ends the chain.",
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
      name: "edge case: empty array resolves with []",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAllSettled([]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: [] });`,
    },
    {
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
      name: "a fulfilled result has no reason, and a rejected one has no value",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAllSettled([Promise.resolve(1), Promise.reject(2)]));
await clock.tick(0);
expect(Object.keys(state.value[0]), "keys of a fulfilled result").toEqual(["status", "value"]);
expect(Object.keys(state.value[1]), "keys of a rejected result").toEqual(["status", "reason"]);`,
    },
  ],
  complexity: "Time: O(n). All promises run in parallel.",
  idea: "نفس `promiseAll` بالعدّاد والـ index، بس عمرها ما بتفشل: كل واحدة بتتسجّل بحالتها، والعدّاد بيزيد في `finally` سواء نجحت أو فشلت.",
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
