import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const DEBOUNCE = `export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
`;

const TIMER = `import { useEffect, useState } from "react";

export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div>
      <p>Seconds: {seconds}</p>
      <button onClick={() => setRunning(true)}>Start</button>
      <button onClick={() => setRunning(false)}>Pause</button>
    </div>
  );
}
`;

const TIMER_SETUP =
  "    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });\n    render(<Timer />);";

export const testTimers: TestingProblem = {
  id: "test-timers",
  kind: "test",
  group: "testing",
  title: "Timers: debounce, then the Timer component",
  difficulty: "hard",
  tag: "likely",
  statement:
    "Write tests that control time. debounce(fn, delay): fn is not called before the delay, and after many fast calls it is called once with the last arguments. Timer: after Start it counts one per second, and after Pause it stops. Use fake timers, so no test really waits.",
  askFirst: [
    "Does the code use setTimeout or setInterval? Then the test should control time, not wait.",
    "What exactly happens at the edge: 299 ms and 300 ms?",
    "Does user-event itself use timers?",
  ],
  edgeCases: [
    "Just before the delay is over",
    "A second call before the first one fired",
    "Time passing after Pause",
    "Real timers must come back after every test",
  ],
  testFile: "/timers.test.js",
  subject: { "/debounce.js": DEBOUNCE, "/Timer.js": TIMER },
  buggy: [
    buggy(
      "debounce-calls-at-once",
      "/debounce.js",
      swap(DEBOUNCE, "    clearTimeout(timer);\n", "    fn.apply(this, args);\n    clearTimeout(timer);\n"),
      "debounce also calls fn at once, without waiting.",
      "اختبارك مش بيتأكد إن الدالة ما اتنادتش قبل ما المدة تعدّي.",
    ),
    buggy(
      "debounce-never-clears",
      "/debounce.js",
      swap(DEBOUNCE, "    clearTimeout(timer);\n", ""),
      "debounce never cancels the old timer, so every call fires.",
      "مجرّبتش نداءين ورا بعض بسرعة. المفروض الدالة تتنادى مرة واحدة بس، مش مرة لكل نداء.",
    ),
    buggy(
      "debounce-first-arguments",
      "/debounce.js",
      swap(DEBOUNCE, "    clearTimeout(timer);\n    timer = setTimeout", "    if (timer) return;\n    timer = setTimeout"),
      "debounce keeps the first call and ignores the later ones.",
      "اختبارك بيتأكد إن الدالة اتنادت مرة واحدة، بس مش بيتأكد إنها اتنادت بآخر قيمة.",
    ),
    buggy(
      "timer-counts-double",
      "/Timer.js",
      swap(TIMER, "setSeconds((s) => s + 1)", "setSeconds((s) => s + 2)"),
      "The timer adds 2 every second.",
      "اختبارك مش بيتأكد من الرقم بالظبط بعد عدد معيّن من الثواني.",
    ),
    buggy(
      "timer-pause-broken",
      "/Timer.js",
      swap(TIMER, "<button onClick={() => setRunning(false)}>Pause</button>", "<button>Pause</button>"),
      "The Pause button does nothing.",
      "مفيش اختبار بيتأكد إن العدّاد وقف بعد Pause، حتى لو الوقت كمّل.",
    ),
  ],
  parts: [
    {
      id: "debounce",
      title: "debounce",
      signature: 'describe("debounce")',
      steps: [
        tline('import { render, screen, act } from "@testing-library/react";', {
          coach:
            "نبدأ يا إسلام: الملف ده فيه اختبارات لدالة ولـ component. من React Testing Library هات المعتادين، ومعاهم الأداة اللي بتقول لـ React «فيه تحديثات جاية، خلّصها قبل ما أكمّل».",
          accept: [
            'import { render, act, screen } from "@testing-library/react";',
            'import { screen, render, act } from "@testing-library/react";',
            'import { screen, act, render } from "@testing-library/react";',
            'import { act, render, screen } from "@testing-library/react";',
            'import { act, screen, render } from "@testing-library/react";',
          ],
          hint1: '`render` و `screen` و `act`، من `"@testing-library/react"`.',
          explain: "act tells React to finish its updates before the test goes on.",
        }),
        tline('import userEvent from "@testing-library/user-event";\nimport "@testing-library/jest-dom";', {
          coach: "وبعده: المستخدم الوهمي، والـ matchers بتاعة الـ DOM. سطرين.",
          hint1: '`userEvent` من `"@testing-library/user-event"`، وبعده import من غير اسم لـ `"@testing-library/jest-dom"`.',
          explain: "user-event and jest-dom, as usual.",
        }),
        tline('import { debounce } from "./debounce";\nimport Timer from "./Timer";', {
          coach: "وهات الحاجتين اللي هنختبرهم: الدالة `debounce` والـ component `Timer`. سطرين.",
          hint1: '`debounce` كـ named import من `"./debounce"`، و `Timer` كـ default import من `"./Timer"`.',
          explain: "I import the function and the component under test.",
        }),
        tline("\nbeforeEach(() => {\n  jest.useFakeTimers();\n});", {
          coach:
            "الكود اللي فيه `setTimeout` مينفعش نستناه بجد، الاختبار هيبقى بطيء. قبل كل اختبار بدّل التايمرات بتايمرات وهمية إحنا اللي بنحرّكها. تلات سطور.",
          hint1: "`beforeEach` وجواها نداء `jest.useFakeTimers()`.",
          explain: "Fake timers replace setTimeout and setInterval, so the test moves time by hand and never waits.",
        }),
        tline("\nafterEach(() => {\n  jest.useRealTimers();\n});", {
          coach: "وبعد كل اختبار رجّع التايمرات الحقيقية، علشان اللي بعده يبدأ نضيف. تلات سطور.",
          hint1: "`afterEach` وجواها نداء `jest.useRealTimers()`.",
          explain: "After each test I put the real timers back.",
        }),
        tline('\ndescribe("debounce", () => {', {
          coach: "افتح مجموعة اختبارات الدالة: `debounce`.",
          hint1: "`describe` بالاسم، وبعده arrow function.",
          explain: "The group for the debounce function.",
        }),
        tline('  it("waits for the delay before it calls the function", () => {', {
          coach:
            "أول اختبار: الدالة مبتتناداش غير بعد المدة. سمّيه `waits for the delay before it calls the function`. مفيش await هنا: الوقت بنحرّكه بإيدينا.",
          hint1: "`it` بالاسم، وبعده arrow function عادية.",
          explain: "The first test: nothing happens before the delay.",
        }),
        tline("    const fn = jest.fn();\n    const debounced = debounce(fn, 300);", {
          coach:
            "جهّز دالة وهمية اسمها `fn`، ولِفّها بـ `debounce` بمدة 300، وخزّن الناتج في `debounced`. سطرين.",
          hint1: "`jest.fn()` في `fn`، وبعدها `debounce(fn, 300)` في `debounced`.",
          explain: "Arrange: a mock function, wrapped with a 300 ms debounce.",
        }),
        tline('    debounced("a");', {
          coach: "نادي الدالة مرة واحدة بالقيمة `a`.",
          hint1: "نداء `debounced` بالنص `a`.",
          explain: "Act: one call.",
        }),
        tline("    expect(fn).not.toHaveBeenCalled();", {
          coach: "لسه مفيش وقت عدّى. اتأكد إن الدالة الأصلية ما اتنادتش.",
          hint1: "`expect` على `fn`، وبعدها `not.toHaveBeenCalled`.",
          explain: "No time has passed, so the function was not called.",
        }),
        tline("    jest.advanceTimersByTime(300);", {
          coach: "دلوقتي قدّم الوقت الوهمي 300 milliseconds.",
          hint1: "الدالة في `jest` اللي بتقدّم الوقت: `advanceTimersByTime`.",
          explain: "I move the fake clock forward by 300 ms.",
        }),
        tline("    expect(fn).toHaveBeenCalledTimes(1);\n  });", {
          coach: "واتأكد إن الدالة اتنادت مرة واحدة. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `fn`، وبعدها `toHaveBeenCalledTimes(1)`.",
          explain: "After the delay it was called once.",
        }),
        tline('\n  it("calls once, with the last arguments, after many fast calls", () => {', {
          coach:
            "تاني اختبار هو فكرة الـ debounce نفسها: نداءات سريعة ورا بعض. سمّيه `calls once, with the last arguments, after many fast calls`.",
          hint1: "`it` بالاسم، وبعده arrow function عادية.",
          explain: "The second test is the point of debounce: many fast calls.",
        }),
        tline("    const fn = jest.fn();\n    const debounced = debounce(fn, 300);", {
          coach: "نفس التجهيز: الدالة الوهمية، والـ debounce بمدة 300. سطرين.",
          hint1: "`jest.fn()` في `fn`، وبعدها `debounce(fn, 300)` في `debounced`.",
          explain: "Arrange again.",
        }),
        tline('    debounced("a");\n    jest.advanceTimersByTime(200);', {
          coach: "نادي بالقيمة `a`، وقدّم الوقت 200 بس، يعني قبل ما المدة تخلص. سطرين.",
          hint1: "نداء `debounced` بـ `a`، وبعده `jest.advanceTimersByTime(200)`.",
          explain: "A first call, then 200 ms. The delay is not over yet.",
        }),
        tline('    debounced("b");\n    jest.advanceTimersByTime(300);', {
          coach: "نادي تاني بالقيمة `b`. المفروض ده يلغي الأول. وقدّم الوقت 300 كاملة. سطرين.",
          hint1: "نداء `debounced` بـ `b`، وبعده `jest.advanceTimersByTime(300)`.",
          explain: "A second call restarts the wait. Then the full delay passes.",
        }),
        tline('    expect(fn).toHaveBeenCalledTimes(1);\n    expect(fn).toHaveBeenCalledWith("b");\n  });\n});', {
          coach:
            "اتأكد من حاجتين: الدالة اتنادت مرة واحدة بس، واتنادت بآخر قيمة `b`. واقفل الاختبار والمجموعة. أربع سطور.",
          hint1: "`toHaveBeenCalledTimes(1)`، وبعده `toHaveBeenCalledWith` بـ `b`. وبعده `});` مرتين.",
          explain: "It ran once, and with the last arguments.",
        }),
      ],
    },
    {
      id: "timer",
      title: "Timer",
      signature: 'describe("Timer")',
      steps: [
        tline('describe("Timer", () => {', {
          coach: "دلوقتي مجموعة الـ component: `Timer`.",
          hint1: "`describe` بالاسم، وبعده arrow function.",
          explain: "The group for the Timer component.",
        }),
        tline('  it("counts the seconds after Start", async () => {', {
          coach: "أول اختبار: بعد Start العدّاد بيزيد كل ثانية. سمّيه `counts the seconds after Start`. فيه ضغط، فلازم async.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The first Timer test: it counts after Start.",
        }),
        tline("    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });", {
          coach:
            "خد بالك: المستخدم الوهمي نفسه بيستخدم تايمرات بين الحركات. مع التايمرات الوهمية هيفضل مستني للأبد. لازم تقول له يحرّك الوقت بدالة Jest.",
          hint1: "`userEvent.setup` بياخد object فيه `advanceTimers` بقيمة `jest.advanceTimersByTime`.",
          explain: "user-event waits between actions with timers. With fake timers I must tell it how to move time, or it hangs.",
        }),
        tline("    render(<Timer />);", {
          coach: "اعرض الـ component.",
          hint1: "`render` وجواها الـ component.",
          explain: "I render the Timer.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "Start" }));', {
          coach: "دوس على زرار Start.",
          hint1: "`user.click` على `screen.getByRole` بالـ role `button` والاسم `Start`.",
          explain: "I click Start.",
        }),
        tline("    act(() => {\n      jest.advanceTimersByTime(3000);\n    });", {
          coach:
            "قدّم الوقت 3 ثواني. كل تكّة هتغيّر الـ state، فلازم تلِفّ ده في `act` علشان React تخلّص التحديثات قبل ما نتأكد. تلات سطور.",
          hint1: "`act` وجواها arrow function بتنادي `jest.advanceTimersByTime(3000)`.",
          explain: "Moving time changes state, so it goes inside act. Then React has updated the screen.",
        }),
        tline('    expect(screen.getByText("Seconds: 3")).toBeInTheDocument();\n  });', {
          coach: "اتأكد إن الشاشة بتقول `Seconds: 3`. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `screen.getByText` بالنص، مع `toBeInTheDocument`.",
          explain: "After three seconds the screen shows 3.",
        }),
        tline('\n  it("stops counting after Pause", async () => {', {
          coach: "تاني اختبار: بعد Pause العدّاد بيقف. سمّيه `stops counting after Pause`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The second Timer test: Pause stops it.",
        }),
        tline(TIMER_SETUP, {
          coach: "نفس التجهيز: المستخدم الوهمي اللي بيحرّك الوقت، وعرض الـ component. سطرين.",
          hint1: "`userEvent.setup` بـ `advanceTimers`، وبعدها `render`.",
          explain: "Arrange: the user that can move time, and the Timer.",
        }),
        tline(
          '    await user.click(screen.getByRole("button", { name: "Start" }));\n    act(() => {\n      jest.advanceTimersByTime(2000);\n    });',
          {
            coach: "دوس Start، وقدّم الوقت ثانيتين جوه `act`. أربع سطور.",
            hint1: "`user.click` على `Start`، وبعدها `act` فيها `jest.advanceTimersByTime(2000)`.",
            explain: "Start, then two seconds pass.",
          },
        ),
        tline('    await user.click(screen.getByRole("button", { name: "Pause" }));', {
          coach: "دوس على زرار Pause.",
          hint1: "`user.click` على الزرار اللي اسمه `Pause`.",
          explain: "I click Pause.",
        }),
        tline("    act(() => {\n      jest.advanceTimersByTime(5000);\n    });", {
          coach: "ودي الحركة اللي بتثبت إن التايمر وقف فعلًا: قدّم الوقت 5 ثواني كمان. تلات سطور.",
          hint1: "`act` فيها `jest.advanceTimersByTime(5000)`.",
          explain: "More time passes. This is what proves the timer really stopped.",
        }),
        tline('    expect(screen.getByText("Seconds: 2")).toBeInTheDocument();\n  });\n});', {
          coach: "اتأكد إن الرقم فضل `Seconds: 2` زي ما كان. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`expect` على `screen.getByText` بالنص `Seconds: 2`. وبعده `});` مرتين.",
          explain: "The count did not move after Pause.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: never wait for real time in a test. Fake the timers, move the clock yourself, and wrap state changes in act.",
  idea: "مع أي كود فيه تايمر: `jest.useFakeTimers()` قبل الاختبار، و `advanceTimersByTime` علشان تحرّك الوقت، و `useRealTimers` بعده. ولو التحريك بيغيّر state يبقى جوه `act`. والمستخدم الوهمي محتاج `advanceTimers`.",
  interview:
    "For code with timers I use jest.useFakeTimers and move time with advanceTimersByTime, so the test does not wait. In a component I wrap that in act, and I give user-event the advanceTimers option so it does not hang.",
  followUps: [
    {
      question: "What do fake timers do?",
      answer: "They replace setTimeout and setInterval with versions the test controls.",
      how: "Callbacks are kept in a list. advanceTimersByTime moves a fake clock and runs the callbacks that are due.",
      example: "jest.useFakeTimers(); jest.advanceTimersByTime(300);",
    },
    {
      question: "Why does userEvent need advanceTimers with fake timers?",
      answer: "user-event waits a little between its events, with a timer.",
      how: "With fake timers that wait never ends by itself. The option tells user-event how to move the fake clock.",
      example: "userEvent.setup({ advanceTimers: jest.advanceTimersByTime })",
    },
    {
      question: "Why act around advanceTimersByTime?",
      answer: "The timer callback changes React state.",
      how: "act lets React apply the state changes and re-render before the next line of the test runs.",
      example: "act(() => { jest.advanceTimersByTime(3000); });",
    },
  ],
};
