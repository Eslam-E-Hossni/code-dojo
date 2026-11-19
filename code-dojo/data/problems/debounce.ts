import type { CodeProblem } from "../types";

export const debounce: CodeProblem = {
  id: "debounce",
  kind: "code",
  group: "most-repeated",
  title: "Debounce",
  difficulty: "medium",
  tag: "reported",
  statement:
    "Write debounce(fn, delay): fn runs only after the calls stop for delay ms.",
  examples: [
    'const onSearch = debounce((text) => console.log("search:", text), 300);',
  ],
  askFirst: [
    "Should it keep 'this' and the arguments?",
    "Do you need a cancel method?",
    "Run at the start or at the end?",
  ],
  edgeCases: ["Called once only", "delay is 0", "fn uses 'this'"],
  parts: [
    {
      id: "main",
      title: "debounce",
      signature: "debounce(fn, delay)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: عايزين دالة بتاخد الدالة الأصلية والمدة اللي هنستناها. اكتب تعريفها.",
          expected: "function debounce(fn, delay) {",
          hint1: "دالة اسمها `debounce` وبتاخد اتنين parameters: `fn` و `delay`.",
          hint2: "function ________(__, _____) {",
          explain: "debounce takes the function and the delay in milliseconds.",
        },
        {
          coach:
            "محتاجين متغير يفضل فاكر التايمر بين كل نداء والتاني، علشان نقدر نلغيه.",
          expected: "  let timer;",
          accept: ["let timer = null;", "let timer = undefined;"],
          hint1: "متغير بـ `let` اسمه `timer` من غير قيمة. هيعيش في الـ closure.",
          hint2: "let _____;",
          explain: "A variable in the closure remembers the timer between calls.",
        },
        {
          coach:
            "دلوقتي نرجّع الدالة الجديدة اللي المستخدم هيناديها. لازم تبقى دالة عادية مش arrow علشان `this`، وتاخد أي عدد من القيم.",
          expected: "  return function (...args) {",
          hint1: "`return function` ومعاها rest parameter اسمه `args`.",
          hint2: "return ________ (...____) {",
          explain:
            "I return a regular function, so it keeps the caller's this and collects the arguments.",
        },
        {
          coach: "أول حاجة جوه الدالة: لو فيه تايمر قديم لسه مستني، نلغيه.",
          expected: "    clearTimeout(timer);",
          hint1: "الدالة الجاهزة اللي بتلغي تايمر، وبتاخد `timer`.",
          hint2: "____________(_____);",
          explain: "Every new call cancels the old timer first.",
        },
        {
          coach:
            "نبدأ تايمر جديد ونحفظه في نفس المتغير. الـ callback يبقى arrow function علشان `this` تفضل زي ما هي.",
          expected: "    timer = setTimeout(() => {",
          hint1:
            "`timer` بيساوي `setTimeout`، وأول argument هو arrow function بتفتح قوس.",
          hint2: "_____ = __________(() => {",
          explain:
            "Then I start a new timer and save its id. The arrow keeps this from the outer function.",
        },
        {
          coach:
            "جوه التايمر: ننادي الدالة الأصلية بنفس الـ `this` ونفس القيم اللي جت.",
          expected: "      fn.apply(this, args);",
          accept: ["fn.call(this, ...args);"],
          hint1: "استخدم `apply` على `fn`، وادّيها `this` و `args`.",
          hint2: "__.apply(____, ____);",
          explain:
            "When the timer fires, I call the original function with the same this and arguments.",
        },
        {
          coach:
            "اقفل الـ arrow function، وادّي `setTimeout` المدة اللي هيستناها. دي اللي ناس كتير بتنساها.",
          expected: "    }, delay);",
          hint1:
            "قوس الـ arrow بيتقفل، بعده فاصلة، بعدها `delay`، وبعدين قوس `setTimeout`.",
          hint2: "}, _____);",
          explain: "The second argument of setTimeout is the delay.",
        },
        {
          coach:
            "آخر حاجة: اقفل الدالة اللي رجّعناها، ومعاها semicolon علشان هي جزء من `return`. وبعدها اقفل `debounce` نفسها. سطرين.",
          expected: "  };\n}",
          hint1: "سطر فيه قوس قفل ومعاه semicolon، وسطر فيه قوس قفل بس.",
          hint2: "_;\n_",
          explain: "I close the returned function, and then debounce itself.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "does not call fn before the delay has passed",
      code: `
const fn = spy();
const debounced = debounce(fn, 300);
debounced("a");
expect(fn.calls.length, "calls right after calling it").toBe(0);
await clock.tick(299);
expect(fn.calls.length, "calls after 299 ms").toBe(0);
await clock.tick(1);
expect(fn.calls.length, "calls after 300 ms").toBe(1);`,
    },
    {
      name: "many fast calls run fn once, with the last arguments",
      code: `
const fn = spy();
const debounced = debounce(fn, 100);
debounced("a");
debounced("b");
debounced("c");
await clock.tick(100);
expect(fn.calls, "calls to fn").toEqual([["c"]]);`,
    },
    {
      name: "every new call starts the wait again",
      code: `
const fn = spy();
const debounced = debounce(fn, 100);
debounced(1);
await clock.tick(80);
debounced(2);
await clock.tick(80);
expect(fn.calls.length, "calls 160 ms after the first call").toBe(0);
await clock.tick(20);
expect(fn.calls, "calls to fn").toEqual([[2]]);`,
    },
    {
      name: "runs again after a quiet period",
      code: `
const fn = spy();
const debounced = debounce(fn, 50);
debounced("first");
await clock.tick(50);
debounced("second");
await clock.tick(50);
expect(fn.calls, "calls to fn").toEqual([["first"], ["second"]]);`,
    },
    {
      name: "edge case: called once only",
      code: `
const fn = spy();
debounce(fn, 200)("only");
await clock.tick(1000);
expect(fn.calls, "calls to fn").toEqual([["only"]]);`,
    },
    {
      name: "edge case: delay is 0",
      code: `
const fn = spy();
const debounced = debounce(fn, 0);
debounced("x");
expect(fn.calls.length, "calls before any timer ran").toBe(0);
await clock.tick(0);
expect(fn.calls, "calls to fn").toEqual([["x"]]);`,
    },
    {
      name: "edge case: fn uses 'this'",
      code: `
const fn = spy();
const input = { name: "search", onType: debounce(fn, 100) };
input.onType("q");
await clock.tick(100);
expect(fn.thisValues[0], "this inside fn").toBe(input);`,
    },
    {
      name: "passes all the arguments",
      code: `
const fn = spy();
debounce(fn, 10)(1, "two", [3]);
await clock.tick(10);
expect(fn.calls, "calls to fn").toEqual([[1, "two", [3]]]);`,
    },
    {
      name: "two debounced functions do not share a timer",
      code: `
const first = spy();
const second = spy();
const a = debounce(first, 100);
const b = debounce(second, 100);
a("a");
b("b");
await clock.tick(100);
expect(first.calls.length, "calls to the first fn").toBe(1);
expect(second.calls.length, "calls to the second fn").toBe(1);`,
    },
  ],
  complexity: "O(1) per call.",
  idea: "الـ closure ماسك التايمر. كل نداء يمسح القديم ويبدأ جديد.",
  followUps: [
    {
      question: "Debounce vs throttle?",
      answer:
        "Debounce waits until the calls stop. Throttle runs at most once per period.",
    },
    {
      question: "Why a regular function and not an arrow for the returned one?",
      answer: "To keep the caller's 'this' and pass it with apply.",
    },
  ],
};
