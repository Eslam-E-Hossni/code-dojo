import type { CodeProblem } from "../types";

export const sleep: CodeProblem = {
  id: "sleep",
  kind: "code",
  group: "most-repeated",
  title: "sleep / delay with a Promise",
  difficulty: "easy",
  tag: "reported",
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
        {
          coach:
            "نبدأ يا إسلام بأبسط نسخة: دالة بتاخد عدد الـ milliseconds اللي هنستناها. اكتب تعريفها.",
          expected: "function sleep(ms) {",
          hint1: "دالة اسمها `sleep` وبتاخد `ms`.",
          hint2: "function _____(__) {",
          explain: "sleep takes the number of milliseconds to wait.",
        },
        {
          coach:
            "الفكرة كلها في سطر واحد: نرجّع Promise جديدة، وجواها تايمر بينادي `resolve` لما المدة تخلص.",
          expected: "  return new Promise((resolve) => setTimeout(resolve, ms));",
          accept: [
            "return new Promise((resolve) => { setTimeout(resolve, ms); });",
            "return new Promise((resolve) => setTimeout(() => resolve(), ms));",
          ],
          hint1:
            "`return new Promise`، والـ executor arrow بياخد `resolve` وبينادي `setTimeout` بـ `resolve` و `ms`.",
          hint2: "return new _______((_______) => __________(_______, __));",
          explain: "I return a new Promise, and setTimeout calls resolve when the time is over.",
        },
        {
          coach: "اقفل الدالة.",
          expected: "}",
          hint1: "قوس قفل واحد.",
          hint2: "_",
          explain: "That is the whole function.",
        },
      ],
    },
    {
      id: "delay",
      title: "delay: run a callback after a delay, promise style",
      signature: "delay(fn, ms, ...args)",
      steps: [
        {
          coach:
            "النسخة التانية بتشغّل callback بعد المدة وترجّع ناتجه. هتاخد الدالة، والمدة، وأي قيم نبعتها للدالة.",
          expected: "function delay(fn, ms, ...args) {",
          hint1: "دالة اسمها `delay` وبتاخد `fn` و `ms` وبعدهم rest parameter اسمه `args`.",
          hint2: "function _____(__, __, ...____) {",
          explain: "delay takes a callback, the time to wait, and the arguments for the callback.",
        },
        {
          coach:
            "برضه نرجّع Promise، بس المرة دي الـ executor جواه أكتر من حاجة، فافتح قوس.",
          expected: "  return new Promise((resolve) => {",
          hint1: "`return new Promise`، والـ executor arrow بياخد `resolve` وبيفتح قوس.",
          hint2: "return new _______((_______) => {",
          explain: "Again I return a new Promise.",
        },
        {
          coach:
            "جوه: تايمر بعد `ms`. لما يخلص ينادي `fn` بالقيم ويدّي ناتجها لـ `resolve`.",
          expected: "    setTimeout(() => resolve(fn(...args)), ms);",
          accept: ["setTimeout(() => { resolve(fn(...args)); }, ms);"],
          hint1: "`setTimeout` بـ arrow بتنادي `resolve` على ناتج `fn(...args)`، والمدة `ms`.",
          hint2: "__________(() => _______(__(...____)), __);",
          explain: "When the timer fires, I call the callback and resolve with its result.",
        },
        {
          coach: "اقفل الـ executor والـ Promise، وبعدها اقفل الدالة. سطرين.",
          expected: "  });\n}",
          hint1: "سطر فيه قوس الـ arrow وقوس الـ Promise و semicolon، وسطر فيه قوس الدالة.",
          hint2: "_);\n_",
          explain: "I close the promise and the function.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "sleep: returns a promise",
      part: "sleep",
      code: `
const promise = sleep(10);
expect(promise instanceof Promise, "sleep(10) is a Promise").toBe(true);
await clock.tick(10);
await promise;`,
    },
    {
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
      name: "delay: resolves with what the callback returns",
      part: "delay",
      code: `
const promise = delay((a, b) => a + b, 50, 2, 3);
await clock.tick(50);
expect(await promise).toBe(5);`,
    },
    {
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
      name: "delay: edge case: ms is 0",
      part: "delay",
      code: `
const fn = spy(() => "now");
const promise = delay(fn, 0);
expect(fn.calls.length, "calls in the same tick").toBe(0);
await clock.tick(0);
expect(await promise).toBe("now");`,
    },
  ],
  complexity: "Time: O(1). It only wraps one timer.",
  idea: "الفكرة كلها: بنلف `setTimeout` جوه `new Promise`، والـ `resolve` هو اللي بيتنادى لما التايمر يخلص.",
  followUps: [
    {
      question: "How would you add a cancel?",
      answer:
        "I return the timer id with the promise, or I accept an AbortSignal and call clearTimeout on abort.",
    },
    {
      question: "Where does the callback of await sleep() run?",
      answer: "In the microtask queue, after the timer macrotask resolves the promise.",
    },
  ],
};
