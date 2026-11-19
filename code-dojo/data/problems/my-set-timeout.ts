import type { CodeProblem } from "../types";

export const mySetTimeout: CodeProblem = {
  id: "my-set-timeout",
  kind: "code",
  group: "most-repeated",
  title: "setTimeout without setTimeout",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write mySetTimeout(callback, delay, ...args) without using setTimeout or setInterval. Use requestAnimationFrame. Then write myClearTimeout to cancel it.",
  examples: [
    'const timer = mySetTimeout(() => console.log("one second later"), 1000);',
    "myClearTimeout(timer); // nothing is printed",
  ],
  askFirst: [
    "Can I use Date.now() or performance.now()?",
    "Must it be exact, or is one frame late fine?",
    "What should mySetTimeout return?",
  ],
  edgeCases: [
    "delay is 0 or missing",
    "Cancelled before it fires",
    "Cancelled after it fired",
    "A hidden tab: requestAnimationFrame pauses there",
  ],
  parts: [
    {
      id: "set",
      title: "mySetTimeout",
      signature: "mySetTimeout(callback, delay, ...args)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: نفس شكل `setTimeout` بالظبط، دالة ومدة وأي قيم زيادة. وخلّي المدة تبقى صفر لو متبعتتش.",
          expected: "function mySetTimeout(callback, delay = 0, ...args) {",
          hint1:
            "دالة اسمها `mySetTimeout` بتاخد `callback`، و `delay` بقيمة افتراضية صفر، و rest parameter اسمه `args`.",
          hint2: "function ____________(________, _____ = 0, ...____) {",
          explain: "mySetTimeout takes a callback, a delay that defaults to 0, and extra arguments.",
        },
        {
          coach: "مفيش تايمر، فلازم نعرف بدأنا إمتى علشان نحسب الوقت اللي عدّى بنفسنا.",
          expected: "  const start = Date.now();",
          hint1: "`Date.now()` في `const` اسمه `start`.",
          hint2: "const _____ = Date.___();",
          explain: "I save the start time, because I have to measure the time myself.",
        },
        {
          coach:
            "محتاجين حاجة نرجّعها للي نادى علشان يقدر يلغي. رقم الـ frame بيتغير كل مرة، فهنحطه جوه object.",
          expected: "  const timer = { frame: 0 };",
          hint1: "`const` اسمه `timer` وقيمته object فيه `frame` بصفر.",
          hint2: "const _____ = { _____: 0 };",
          explain: "The handle is an object, so it can always hold the latest frame id.",
        },
        {
          coach: "دلوقتي الدالة اللي هتتنادى كل frame وتسأل: الوقت خلص ولا لسه؟",
          expected: "  function check() {",
          hint1: "دالة عادية اسمها `check` من غير parameters.",
          hint2: "function _____() {",
          explain: "This inner function runs once per frame.",
        },
        {
          coach: "جواها السؤال نفسه: الوقت اللي عدّى من البداية وصل للمدة المطلوبة؟",
          expected: "    if (Date.now() - start >= delay) {",
          hint1: "`if` بتطرح `start` من `Date.now()` وتقارن الناتج بـ `delay` بأكبر من أو يساوي.",
          hint2: "if (Date.___() - _____ >= _____) {",
          explain: "It checks if the delay has passed.",
        },
        {
          coach: "لو خلص، نادي الـ callback بالقيم اللي جت.",
          expected: "      callback(...args);",
          hint1: "نادي `callback` وافرد `args` جواها.",
          hint2: "________(...____);",
          explain: "If it has, I call the callback with its arguments.",
        },
        {
          coach: "ولو لسه؟ افتح الحالة التانية.",
          expected: "    } else {",
          hint1: "اقفل الـ `if` وافتح `else` في نفس السطر.",
          hint2: "} ____ {",
          explain: "If it has not,",
        },
        {
          coach: "اطلب frame تاني يشغّل نفس الدالة، واحفظ رقمه في الـ handle.",
          expected: "      timer.frame = requestAnimationFrame(check);",
          hint1: "`timer.frame` بيساوي `requestAnimationFrame` على `check`.",
          hint2: "_____._____ = _____________________(_____);",
          explain: "I ask for another frame and save its id in the handle.",
        },
        {
          coach: "اقفل الـ `else`، واقفل الدالة `check`. سطرين.",
          expected: "    }\n  }",
          hint1: "قوسين قفل، كل واحد في سطر.",
          hint2: "_\n_",
          explain: "I close the else and the inner function.",
        },
        {
          coach:
            "الدالة اتعرّفت بس محدش شغّلها لسه. اطلب أول frame، واحفظ رقمه برضه.",
          expected: "  timer.frame = requestAnimationFrame(check);",
          hint1: "نفس سطر طلب الـ frame اللي جوه `check`، بس هنا بره.",
          hint2: "_____._____ = _____________________(_____);",
          explain: "I start the loop with the first frame.",
        },
        {
          coach: "رجّع الـ handle علشان الإلغاء، واقفل الدالة. سطرين.",
          expected: "  return timer;\n}",
          hint1: "`return timer`، وبعدها قوس قفل الدالة.",
          hint2: "return _____;\n}",
          explain: "And I return the handle, so the caller can cancel.",
        },
      ],
    },
    {
      id: "clear",
      title: "myClearTimeout",
      signature: "myClearTimeout(timer)",
      steps: [
        {
          coach: "الإلغاء بقى سهل يا إسلام: دالة بتاخد الـ handle اللي رجّعناه.",
          expected: "function myClearTimeout(timer) {",
          hint1: "دالة اسمها `myClearTimeout` وبتاخد `timer`.",
          hint2: "function ______________(_____) {",
          explain: "myClearTimeout takes the handle that mySetTimeout returned.",
        },
        {
          coach: "الغي الـ frame اللي مستني دلوقتي، واقفل الدالة. سطرين.",
          expected: "  cancelAnimationFrame(timer.frame);\n}",
          hint1: "`cancelAnimationFrame` على `timer.frame`، وبعدها قوس القفل.",
          hint2: "____________________(_____._____);\n}",
          explain: "It cancels the frame that is waiting, so the check never runs again.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "mySetTimeout: does not call the callback before the delay",
      part: "set",
      code: `
const fn = spy();
mySetTimeout(fn, 100);
expect(fn.calls.length, "calls right away").toBe(0);
await clock.tick(96);
expect(fn.calls.length, "calls after 96 ms").toBe(0);`,
    },
    {
      name: "mySetTimeout: calls the callback once the delay has passed",
      part: "set",
      code: `
const fn = spy();
mySetTimeout(fn, 100);
await clock.tick(120);
expect(fn.calls.length, "calls after 120 ms").toBe(1);`,
    },
    {
      name: "mySetTimeout: calls it only once",
      part: "set",
      code: `
const fn = spy();
mySetTimeout(fn, 50);
await clock.tick(2000);
expect(fn.calls.length, "calls after 2 seconds").toBe(1);`,
    },
    {
      name: "mySetTimeout: passes the extra arguments",
      part: "set",
      code: `
const fn = spy();
mySetTimeout(fn, 30, 1, "two", [3]);
await clock.tick(60);
expect(fn.calls, "calls to the callback").toEqual([[1, "two", [3]]]);`,
    },
    {
      name: "mySetTimeout: edge case: delay is 0 or missing",
      part: "set",
      code: `
const zero = spy();
const missing = spy();
mySetTimeout(zero, 0);
mySetTimeout(missing);
expect(zero.calls.length + missing.calls.length, "calls in the same tick").toBe(0);
await clock.tick(20);
expect(zero.calls.length, "calls with delay 0").toBe(1);
expect(missing.calls.length, "calls with no delay").toBe(1);`,
    },
    {
      name: "mySetTimeout: two timers run in the order of their delays",
      part: "set",
      code: `
const order = [];
mySetTimeout(() => order.push("slow"), 200);
mySetTimeout(() => order.push("fast"), 50);
await clock.tick(300);
expect(order).toEqual(["fast", "slow"]);`,
    },
    {
      name: "mySetTimeout: does not use setTimeout or setInterval",
      part: "set",
      code: `
const realTimeout = setTimeout;
const realInterval = setInterval;
let used = "nothing";
try {
  setTimeout = () => {
    used = "setTimeout";
  };
  setInterval = () => {
    used = "setInterval";
  };
  const fn = spy();
  mySetTimeout(fn, 50);
  await clock.tick(100);
  expect(used, "timer function that was called").toBe("nothing");
  expect(fn.calls.length, "calls to the callback").toBe(1);
} finally {
  setTimeout = realTimeout;
  setInterval = realInterval;
}`,
    },
    {
      name: "myClearTimeout: edge case: cancelled before it fires",
      part: "clear",
      code: `
const fn = spy();
const timer = mySetTimeout(fn, 100);
await clock.tick(50);
myClearTimeout(timer);
await clock.tick(1000);
expect(fn.calls.length, "calls after cancelling").toBe(0);`,
    },
    {
      name: "myClearTimeout: cancels only the timer it was given",
      part: "clear",
      code: `
const cancelled = spy();
const kept = spy();
const timer = mySetTimeout(cancelled, 100);
mySetTimeout(kept, 100);
myClearTimeout(timer);
await clock.tick(200);
expect(cancelled.calls.length, "calls to the cancelled callback").toBe(0);
expect(kept.calls.length, "calls to the other callback").toBe(1);`,
    },
    {
      name: "myClearTimeout: edge case: cancelled after it fired",
      part: "clear",
      code: `
const fn = spy();
const timer = mySetTimeout(fn, 20);
await clock.tick(100);
myClearTimeout(timer);
myClearTimeout(timer);
await clock.tick(100);
expect(fn.calls.length, "calls to the callback").toBe(1);`,
    },
  ],
  complexity: "One check per frame, about 60 per second, until the time has passed.",
  idea: "مفيش `setTimeout`، فبنسأل كل frame: الوقت عدّى؟ لو آه ننادي الـ callback، ولو لأ نطلب frame تاني. والـ handle اللي بنرجّعه فيه رقم آخر frame علشان نقدر نلغيه.",
  followUps: [
    {
      question: "Why is it less exact than setTimeout?",
      answer:
        "It only checks once per frame, so it can be about 16 ms late. And frames stop while the tab is hidden.",
    },
    {
      question: "Why return an object and not a number?",
      answer:
        "The frame id changes on every frame. The object always holds the latest one, so cancel still works.",
    },
  ],
};
