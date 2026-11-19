import type { CodeProblem } from "../types";

export const throttle: CodeProblem = {
  id: "throttle",
  kind: "code",
  group: "most-repeated",
  title: "Throttle",
  difficulty: "medium",
  tag: "likely",
  statement: "Write throttle(fn, limit): fn runs at most once every limit ms.",
  examples: ['window.addEventListener("scroll", throttle(() => console.log("scroll"), 200));'],
  askFirst: ["Should the last call run at the end too?", "Keep 'this' and the arguments?"],
  edgeCases: ["First call runs at once", "Calls inside the period are dropped"],
  parts: [
    {
      id: "main",
      title: "throttle",
      signature: "throttle(fn, limit)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: الدالة هتاخد الدالة الأصلية وأقل مدة بين كل تشغيل والتاني. اكتب تعريفها.",
          expected: "function throttle(fn, limit) {",
          hint1: "دالة اسمها `throttle` وبتاخد `fn` و `limit`.",
          hint2: "function ________(__, _____) {",
          explain: "throttle takes the function and the minimum time between two runs.",
        },
        {
          coach:
            "محتاجين نفتكر إمتى شغّلنا الدالة آخر مرة. نبدأ بصفر علشان أول نداء يعدّي على طول.",
          expected: "  let lastCall = 0;",
          hint1: "متغير بـ `let` اسمه `lastCall` وقيمته صفر.",
          hint2: "let ________ = 0;",
          explain: "I keep the time of the last run. It starts at 0, so the first call runs at once.",
        },
        {
          coach:
            "نرجّع الدالة اللي المستخدم هيناديها. دالة عادية علشان `this`، وتاخد أي عدد من القيم.",
          expected: "  return function (...args) {",
          hint1: "`return function` ومعاها rest parameter اسمه `args`.",
          hint2: "return ________ (...____) {",
          explain: "I return a regular function that keeps this and collects the arguments.",
        },
        {
          coach: "أول حاجة جوه: الساعة كام دلوقتي؟ احفظها في متغير.",
          expected: "    const now = Date.now();",
          hint1: "`Date.now()` والناتج في `const` اسمه `now`.",
          hint2: "const ___ = Date.___();",
          explain: "On every call I read the current time.",
        },
        {
          coach: "السؤال: هل عدّى وقت كفاية من آخر تشغيل؟ قارن الفرق بالمدة.",
          expected: "    if (now - lastCall >= limit) {",
          hint1: "`if` بتطرح `lastCall` من `now` وتقارن الناتج بـ `limit` بأكبر من أو يساوي.",
          hint2: "if (___ - ________ >= _____) {",
          explain: "If enough time has passed since the last run,",
        },
        {
          coach: "لو عدّى، سجّل إن ده وقت آخر تشغيل. لازم قبل النداء مش بعده.",
          expected: "      lastCall = now;",
          hint1: "`lastCall` بيساوي `now`.",
          hint2: "________ = ___;",
          explain: "I save this moment as the last run,",
        },
        {
          coach:
            "ونادي الدالة الأصلية بنفس الـ `this` ونفس القيم، واقفل الـ `if`. سطرين.",
          expected: "      fn.apply(this, args);\n    }",
          accept: ["fn.call(this, ...args);\n}"],
          hint1: "`fn.apply` بـ `this` و `args`، وبعدها قوس القفل في سطر لوحده.",
          hint2: "__.apply(____, ____);\n}",
          explain: "and I call the original function with the same this and arguments.",
        },
        {
          coach:
            "اقفل الدالة اللي رجّعناها، ومعاها semicolon علشان هي جزء من `return`. وبعدها اقفل `throttle`. سطرين.",
          expected: "  };\n}",
          hint1: "سطر فيه قوس قفل ومعاه semicolon، وسطر فيه قوس قفل بس.",
          hint2: "_;\n_",
          explain: "Calls that come too early do nothing. I close both functions.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "edge case: the first call runs at once",
      code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled("a");
expect(fn.calls, "calls to fn").toEqual([["a"]]);`,
    },
    {
      name: "edge case: calls inside the period are dropped",
      code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled("a");
throttled("b");
await clock.tick(50);
throttled("c");
expect(fn.calls, "calls to fn").toEqual([["a"]]);`,
    },
    {
      name: "runs again once the period is over",
      code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled(1);
await clock.tick(100);
throttled(2);
await clock.tick(100);
throttled(3);
expect(fn.calls, "calls to fn").toEqual([[1], [2], [3]]);`,
    },
    {
      name: "a call exactly at the limit runs, one millisecond earlier does not",
      code: `
const fn = spy();
const throttled = throttle(fn, 200);
throttled("first");
await clock.tick(199);
throttled("too early");
expect(fn.calls.length, "calls after 199 ms").toBe(1);
await clock.tick(1);
throttled("on time");
expect(fn.calls, "calls to fn").toEqual([["first"], ["on time"]]);`,
    },
    {
      name: "dropped calls are not run later",
      code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled(1);
throttled(2);
await clock.tick(1000);
expect(fn.calls, "calls to fn").toEqual([[1]]);`,
    },
    {
      name: "the period is counted from the last run, not from a dropped call",
      code: `
const fn = spy();
const throttled = throttle(fn, 100);
throttled(1);
await clock.tick(60);
throttled(2);
await clock.tick(40);
throttled(3);
expect(fn.calls, "calls to fn").toEqual([[1], [3]]);`,
    },
    {
      name: "keeps this",
      code: `
const fn = spy();
const page = { name: "page", onScroll: throttle(fn, 100) };
page.onScroll();
expect(fn.thisValues[0], "this inside fn").toBe(page);`,
    },
    {
      name: "passes all the arguments",
      code: `
const fn = spy();
throttle(fn, 100)(1, "two", [3]);
expect(fn.calls, "calls to fn").toEqual([[1, "two", [3]]]);`,
    },
    {
      name: "two throttled functions do not share their time",
      code: `
const first = spy();
const second = spy();
const a = throttle(first, 100);
const b = throttle(second, 100);
a();
b();
expect(first.calls.length, "calls to the first fn").toBe(1);
expect(second.calls.length, "calls to the second fn").toBe(1);`,
    },
  ],
  complexity: "O(1) per call.",
  idea: "بنحفظ وقت آخر نداء، ولو المدة عدّت بنشغّل.",
  followUps: [
    {
      question: "When do you use it?",
      answer: "For scroll, resize and mouse move events.",
    },
  ],
};
