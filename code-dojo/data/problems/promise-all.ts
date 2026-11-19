import type { CodeProblem } from "../types";
import { PROMISE_HELPERS } from "./promise-helpers";

export const promiseAll: CodeProblem = {
  id: "promise-all",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Promise.all",
  difficulty: "medium",
  tag: "polyfill",
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
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد array من الـ promises. اكتب تعريفها.",
          expected: "function promiseAll(promises) {",
          hint1: "دالة اسمها `promiseAll` وبتاخد `promises`.",
          hint2: "function __________(________) {",
          explain: "promiseAll takes an array of promises.",
        },
        {
          coach:
            "اللي بيرجع Promise واحدة جديدة. إحنا اللي هنقرر إمتى تنجح وإمتى تفشل، فمحتاجين الاتنين: `resolve` و `reject`.",
          expected: "  return new Promise((resolve, reject) => {",
          hint1: "`return new Promise`، والـ executor arrow بياخد `resolve` و `reject` وبيفتح قوس.",
          hint2: "return new _______((_______, ______) => {",
          explain: "It returns one new Promise that I resolve or reject myself.",
        },
        {
          coach: "محتاجين مكان نحط فيه النتايج.",
          expected: "    const results = [];",
          hint1: "`const` اسمه `results` وقيمته array فاضية.",
          hint2: "const _______ = [];",
          explain: "I keep the results in an array.",
        },
        {
          coach: "وعدّاد نعرف بيه كام واحدة خلصت.",
          expected: "    let completed = 0;",
          hint1: "`let` اسمه `completed` وقيمته صفر.",
          hint2: "let _________ = 0;",
          explain: "And I count how many promises are done.",
        },
        {
          coach: "حالة خاصة: لو الـ array فاضية مفيش حاجة نستناها، انجح على طول.",
          expected: "    if (promises.length === 0) return resolve(results);",
          accept: ["if (promises.length === 0) { return resolve(results); }", "if (promises.length === 0) resolve(results);"],
          hint1: "`if` بتسأل `promises.length` بيساوي صفر، ولو آه `return resolve(results)`.",
          hint2: "if (________.______ === 0) return _______(_______);",
          explain: "An empty array resolves at once with an empty array.",
        },
        {
          coach: "لف على الـ promises. لازم `let` علشان كل لفة تفضل فاكرة الـ `i` بتاعتها.",
          expected: "    for (let i = 0; i < promises.length; i++) {",
          accept: ["for (let i = 0; i < promises.length; i += 1) {", "for (let i = 0; i < promises.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `promises.length`.",
          hint2: "for (let _ = 0; _ < ________.______; _++) {",
          explain: "I loop over the input with let, so every callback remembers its own index.",
        },
        {
          coach:
            "العنصر ممكن يبقى قيمة عادية مش Promise. لفّه الأول علشان نتعامل مع الكل بنفس الطريقة. السطر ده من غير semicolon علشان هنكمّل عليه.",
          expected: "      Promise.resolve(promises[i])",
          hint1: "`Promise.resolve` على `promises[i]`.",
          hint2: "Promise._______(________[_])",
          explain: "Promise.resolve turns a plain value into a promise, so every item is handled the same way.",
        },
        {
          coach: "لما تنجح، هناخد القيمة.",
          expected: "        .then((value) => {",
          hint1: "`.then` بـ arrow بتاخد `value` وبتفتح قوس.",
          hint2: ".____((_____) => {",
          explain: "When it fulfills,",
        },
        {
          coach: "حط القيمة في مكانها بالـ index، مش بـ push. دي أهم نقطة: الـ promises بتخلص بأي ترتيب.",
          expected: "          results[i] = value;",
          hint1: "`results[i]` بيساوي `value`.",
          hint2: "_______[_] = _____;",
          explain: "I store the value at its index, not with push, because promises finish in any order.",
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
          coach: "ولو الكل خلص، انجح بكل النتايج.",
          expected: "          if (completed === promises.length) resolve(results);",
          accept: ["if (completed === promises.length) { resolve(results); }"],
          hint1: "`if` بتقارن `completed` بـ `promises.length`، ولو متساويين `resolve(results)`.",
          hint2: "if (_________ === ________.______) _______(_______);",
          explain: "and when all of them are done, I resolve with the results.",
        },
        {
          coach:
            "اقفل الـ `then`. ولو أي واحدة فشلت، افشل على طول: ادّي `reject` نفسها لـ `catch`. سطرين.",
          expected: "        })\n        .catch(reject);",
          hint1: "سطر فيه قوس الـ arrow وقوس `then`، وسطر فيه `.catch(reject)`.",
          hint2: "_)\n._____(______);",
          explain: "If any promise rejects, I reject at once with its reason.",
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
      name: "returns a promise",
      code: `expect(promiseAll([]) instanceof Promise, "promiseAll([]) is a Promise").toBe(true);`,
    },
    {
      name: "resolves with all the values",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAll([after(10, "a"), after(20, "b")]));
await clock.tick(20);
expect(state).toEqual({ status: "fulfilled", value: ["a", "b"] });`,
    },
    {
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
      name: "edge case: results keep the input order, not the finish order",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAll([after(30, "slow"), after(10, "fast"), after(20, "middle")]));
await clock.tick(30);
expect(state.value).toEqual(["slow", "fast", "middle"]);`,
    },
    {
      name: "edge case: empty array resolves with []",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAll([]));
await clock.tick(0);
expect(state).toEqual({ status: "fulfilled", value: [] });`,
    },
    {
      name: "edge case: plain values in the input",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAll([1, after(10, 2), "three", null]));
await clock.tick(10);
expect(state).toEqual({ status: "fulfilled", value: [1, 2, "three", null] });`,
    },
    {
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
      name: "works with one item",
      code:
        PROMISE_HELPERS +
        `
const state = watch(promiseAll([after(5, "only")]));
await clock.tick(5);
expect(state.value).toEqual(["only"]);`,
    },
  ],
  complexity: "Time: O(n). All promises run in parallel.",
  idea: "أهم نقطتين: النتيجة تتحط بالـ index مش بـ `push`، وعدّاد يعرف إمتى الكل خلص.",
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
