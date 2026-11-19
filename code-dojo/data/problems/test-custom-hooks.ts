import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const USE_COUNTER = `import { useState } from "react";

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);

  const increment = () => setCount((c) => c + 1);
  const reset = () => setCount(initial);

  return { count, increment, reset };
}
`;

const USE_DEBOUNCE = `import { useEffect, useState } from "react";

export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
`;

const RENDER_DEBOUNCE =
  '    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {\n      initialProps: { value: "a" },\n    });';

export const testCustomHooks: TestingProblem = {
  id: "test-custom-hooks",
  kind: "test",
  group: "testing",
  title: "Custom hooks: useCounter, useDebounce",
  difficulty: "hard",
  tag: "likely",
  statement:
    "Write tests for two custom hooks. useCounter(initial): it starts with the initial value, increment adds one, reset goes back to the initial value. useDebounce(value, delay): it keeps the old value until the delay is over, and a new value starts the wait again.",
  askFirst: [
    "A hook cannot be called outside a component. How do I call it in a test?",
    "How do I trigger a state change, and how do I pass a new prop?",
    "Does the hook use a timer?",
  ],
  edgeCases: [
    "An initial value that is not zero",
    "reset after a change",
    "The value just before the delay ends",
    "The value changing twice before the delay ends",
  ],
  testFile: "/hooks.test.js",
  subject: { "/useCounter.js": USE_COUNTER, "/useDebounce.js": USE_DEBOUNCE },
  buggy: [
    buggy(
      "counter-ignores-initial",
      "/useCounter.js",
      swap(USE_COUNTER, "useState(initial)", "useState(0)"),
      "useCounter always starts at 0 and ignores the initial value.",
      "اختبارك بيجرّب الـ hook من غير قيمة بداية، أو بقيمة صفر. جرّب قيمة بداية تانية.",
    ),
    buggy(
      "counter-adds-two",
      "/useCounter.js",
      swap(USE_COUNTER, "setCount((c) => c + 1)", "setCount((c) => c + 2)"),
      "increment adds 2.",
      "اختبارك مش بيتأكد من القيمة بالظبط بعد الزيادة.",
    ),
    buggy(
      "counter-resets-to-zero",
      "/useCounter.js",
      swap(USE_COUNTER, "setCount(initial)", "setCount(0)"),
      "reset goes to 0, not to the initial value.",
      "اختبارك بيجرّب reset مع قيمة بداية صفر، فمش باين الفرق. جرّبه مع قيمة بداية غير الصفر.",
    ),
    buggy(
      "debounce-no-delay",
      "/useDebounce.js",
      swap(USE_DEBOUNCE, "  return debounced;", "  return value;"),
      "useDebounce returns the new value at once.",
      "اختبارك مش بيتأكد إن القيمة القديمة فضلت زي ما هي قبل ما المدة تعدّي.",
    ),
    buggy(
      "debounce-no-cleanup",
      "/useDebounce.js",
      swap(USE_DEBOUNCE, "    return () => clearTimeout(id);\n", ""),
      "useDebounce never clears the old timer, so an old value can still arrive.",
      "مجرّبتش إن القيمة تتغير مرتين قبل ما المدة تخلص. المفروض الانتظار يبدأ من الأول.",
    ),
  ],
  parts: [
    {
      id: "use-counter",
      title: "useCounter",
      signature: 'describe("useCounter")',
      steps: [
        tline('import { renderHook, act } from "@testing-library/react";', {
          coach:
            "نبدأ يا إسلام: الـ hook مينفعش يتنادى برّه component. React Testing Library فيها دالة بتعمل component صغير وتنادي الـ hook جواه. هاتها، ومعاها `act`.",
          accept: ['import { act, renderHook } from "@testing-library/react";'],
          hint1: '`renderHook` و `act`، من `"@testing-library/react"`.',
          explain: "A hook only works inside a component. renderHook makes a tiny component and calls the hook in it.",
        }),
        tline('import { useCounter } from "./useCounter";\nimport { useDebounce } from "./useDebounce";', {
          coach: "وهات الاتنين hooks اللي هنختبرهم. سطرين.",
          hint1: '`useCounter` من `"./useCounter"`، و `useDebounce` من `"./useDebounce"`. الاتنين named imports.',
          explain: "I import the two hooks under test.",
        }),
        tline('\ndescribe("useCounter", () => {', {
          coach: "افتح مجموعة الـ hook الأول: `useCounter`.",
          hint1: "`describe` بالاسم، وبعده arrow function.",
          explain: "The group for useCounter.",
        }),
        tline('  it("starts with the initial value", () => {', {
          coach: "أول اختبار: قيمة البداية. سمّيه `starts with the initial value`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The first test: the initial value.",
        }),
        tline("    const { result } = renderHook(() => useCounter(5));", {
          coach:
            "نادي الـ hook بقيمة بداية 5، مش صفر، علشان نتأكد إنه بيستخدم القيمة فعلًا. الدالة بترجّع object فيه `result`.",
          hint1: "`renderHook` بياخد arrow function بتنادي `useCounter(5)`. خد `result` بالـ destructuring.",
          explain: "renderHook returns result. What the hook returned last is in result.current.",
        }),
        tline("    expect(result.current.count).toBe(5);\n  });", {
          coach:
            "آخر حاجة الـ hook رجّعها موجودة في `result.current`. اتأكد إن `count` بـ 5. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `result.current.count`، وبعدها `toBe(5)`.",
          explain: "The hook starts with the value I gave it.",
        }),
        tline('\n  it("adds one", () => {', {
          coach: "تاني اختبار: الزيادة. سمّيه `adds one`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The second test: increment.",
        }),
        tline("    const { result } = renderHook(() => useCounter(5));", {
          coach: "نفس التجهيز: الـ hook بقيمة بداية 5.",
          hint1: "`renderHook` بـ arrow function بتنادي `useCounter(5)`.",
          explain: "Arrange: the hook with 5.",
        }),
        tline("    act(() => {\n      result.current.increment();\n    });", {
          coach:
            "نادي `increment`. دي بتغيّر state، وأي تغيير state في اختبار لازم يبقى جوه `act`، علشان React تعمل الـ render قبل ما نكمّل. تلات سطور.",
          hint1: "`act` وجواها arrow function بتنادي `result.current.increment()`.",
          explain: "Calling the function changes state, so it goes inside act.",
        }),
        tline("    expect(result.current.count).toBe(6);\n  });", {
          coach: "اتأكد إن القيمة بقت 6. اقرا `result.current` من جديد، متخزّنوش في متغير قبلها. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `result.current.count`، وبعدها `toBe(6)`.",
          explain: "I read result.current again after act. It now holds the new value.",
        }),
        tline('\n  it("goes back to the initial value on reset", () => {', {
          coach: "تالت اختبار: reset. سمّيه `goes back to the initial value on reset`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The third test: reset.",
        }),
        tline("    const { result } = renderHook(() => useCounter(5));", {
          coach: "الـ hook بقيمة بداية 5. مهم إنها مش صفر: لو صفر مش هنعرف reset رجع للبداية ولا لصفر.",
          hint1: "`renderHook` بـ arrow function بتنادي `useCounter(5)`.",
          explain: "An initial value that is not zero, so reset to 0 and reset to initial look different.",
        }),
        tline("    act(() => {\n      result.current.increment();\n    });", {
          coach: "غيّر القيمة الأول: نادي `increment` جوه `act`. تلات سطور.",
          hint1: "`act` فيها `result.current.increment()`.",
          explain: "First I change the count.",
        }),
        tline("    act(() => {\n      result.current.reset();\n    });", {
          coach: "وبعدين نادي `reset`، برضه جوه `act`. تلات سطور.",
          hint1: "`act` فيها `result.current.reset()`.",
          explain: "Then I reset it.",
        }),
        tline("    expect(result.current.count).toBe(5);\n  });\n});", {
          coach: "اتأكد إن القيمة رجعت 5. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`expect` على `result.current.count`، وبعدها `toBe(5)`. وبعده `});` مرتين.",
          explain: "The count is back at the initial value.",
        }),
      ],
    },
    {
      id: "use-debounce",
      title: "useDebounce",
      signature: 'describe("useDebounce")',
      steps: [
        tline('describe("useDebounce", () => {', {
          coach: "مجموعة الـ hook التاني: `useDebounce`.",
          hint1: "`describe` بالاسم، وبعده arrow function.",
          explain: "The group for useDebounce.",
        }),
        tline("  beforeEach(() => {\n    jest.useFakeTimers();\n  });", {
          coach:
            "الـ hook ده فيه `setTimeout`، فمحتاجين التايمرات الوهمية. حطّها جوه المجموعة دي بس، علشان اختبارات `useCounter` متتأثرش. تلات سطور.",
          hint1: "`beforeEach` وجواها `jest.useFakeTimers()`.",
          explain: "This hook uses a timer, so this group runs with fake timers.",
        }),
        tline("\n  afterEach(() => {\n    jest.useRealTimers();\n  });", {
          coach: "وبعد كل اختبار رجّع التايمرات الحقيقية. تلات سطور.",
          hint1: "`afterEach` وجواها `jest.useRealTimers()`.",
          explain: "And the real timers come back after each test.",
        }),
        tline('\n  it("keeps the old value until the delay is over", () => {', {
          coach: "أول اختبار: القيمة القديمة بتفضل لحد ما المدة تخلص. سمّيه `keeps the old value until the delay is over`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The first test: the old value stays during the delay.",
        }),
        tline(RENDER_DEBOUNCE, {
          coach:
            "عايزين نغيّر القيمة اللي داخلة للـ hook بعدين. فخلّي الدالة تاخد props وتنادي `useDebounce` بـ `value` ومدة 300، واديها props البداية: `value` بـ `a`. وخد `result` و `rerender`. تلات سطور.",
          hint1:
            "`renderHook` بياخد دالة بتستقبل `{ value }`، وتاني argument هو object فيه `initialProps`. خد `result` و `rerender` بالـ destructuring.",
          explain: "The hook gets its value from props, so I can change the props later with rerender.",
        }),
        tline('    rerender({ value: "ab" });', {
          coach: "غيّر القيمة لـ `ab`. ده زي ما المستخدم كتب حرف جديد.",
          hint1: "`rerender` بـ object فيه `value` الجديدة.",
          explain: "rerender calls the hook again with new props.",
        }),
        tline('    expect(result.current).toBe("a");', {
          coach: "لسه مفيش وقت عدّى. اتأكد إن الـ hook لسه مرجّع القيمة القديمة `a`.",
          hint1: "`expect` على `result.current`، وبعدها `toBe` بـ `a`.",
          explain: "No time has passed, so the hook still gives the old value.",
        }),
        tline("    act(() => {\n      jest.advanceTimersByTime(300);\n    });", {
          coach: "قدّم الوقت 300، جوه `act` لأن التايمر هيغيّر state. تلات سطور.",
          hint1: "`act` فيها `jest.advanceTimersByTime(300)`.",
          explain: "The delay passes, inside act because the timer changes state.",
        }),
        tline('    expect(result.current).toBe("ab");\n  });', {
          coach: "ودلوقتي اتأكد إن القيمة الجديدة `ab` وصلت. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `result.current`، وبعدها `toBe` بـ `ab`.",
          explain: "Now the hook gives the new value.",
        }),
        tline('\n  it("starts the wait again when the value changes", () => {', {
          coach: "تاني اختبار: لو القيمة اتغيرت تاني قبل ما المدة تخلص، الانتظار يبدأ من الأول. سمّيه `starts the wait again when the value changes`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The second test: a new value restarts the wait.",
        }),
        tline(RENDER_DEBOUNCE, {
          coach: "نفس التجهيز: الـ hook بـ props، والبداية `a`. تلات سطور.",
          hint1: "`renderHook` بدالة بتاخد `{ value }`، و `initialProps` فيها `value` بـ `a`.",
          explain: "Arrange again.",
        }),
        tline('    rerender({ value: "ab" });\n    act(() => {\n      jest.advanceTimersByTime(200);\n    });', {
          coach: "غيّر القيمة لـ `ab`، وقدّم الوقت 200 بس. أربع سطور.",
          hint1: "`rerender` بالقيمة `ab`، وبعدها `act` فيها `jest.advanceTimersByTime(200)`.",
          explain: "First change, then 200 ms.",
        }),
        tline('    rerender({ value: "abc" });\n    act(() => {\n      jest.advanceTimersByTime(200);\n    });', {
          coach: "غيّرها تاني لـ `abc`، وقدّم 200 كمان. كده عدّى 400 من أول تغيير، بس 200 بس من آخر تغيير. أربع سطور.",
          hint1: "`rerender` بالقيمة `abc`، وبعدها `act` فيها `jest.advanceTimersByTime(200)`.",
          explain: "Second change, then 200 ms more: 400 ms since the first change, but only 200 since the last.",
        }),
        tline('    expect(result.current).toBe("a");', {
          coach: "المفروض مفيش قيمة وصلت لسه. اتأكد إنها لسه `a`. لو التايمر القديم ما اتمسحش هتلاقيها `ab`.",
          hint1: "`expect` على `result.current`، وبعدها `toBe` بـ `a`.",
          explain: "Nothing arrived yet. If the old timer was not cleared, this would be the middle value.",
        }),
        tline('    act(() => {\n      jest.advanceTimersByTime(100);\n    });\n    expect(result.current).toBe("abc");\n  });\n});', {
          coach:
            "قدّم الـ 100 اللي فاضلين، واتأكد إن آخر قيمة `abc` هي اللي وصلت. واقفل الاختبار والمجموعة. ست سطور.",
          hint1: "`act` فيها `jest.advanceTimersByTime(100)`، وبعدها `expect` على `result.current` بـ `abc`، وبعده `});` مرتين.",
          explain: "After the rest of the delay, the last value arrives.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: renderHook to call the hook, result.current to read it, act for every state change, rerender for new props.",
  idea: "`renderHook` بينادي الـ hook جوه component وهمي. النتيجة دايمًا في `result.current`، وأي تغيير state جوه `act`، و `rerender` لما تحب تبعت props جديدة.",
  interview:
    "I test a custom hook with renderHook. I read the value from result.current, wrap every state change in act, and use rerender to pass new props.",
  followUps: [
    {
      question: "What does renderHook do?",
      answer: "It calls the hook inside a small test component.",
      how: "It renders that component and keeps the last return value of the hook in result.current.",
      example: "const { result } = renderHook(() => useCounter(5)); result.current.count is 5.",
    },
    {
      question: "Why read result.current again after act?",
      answer: "Every render gives a new return value.",
      how: "result is one stable object, and its current property is replaced on each render. A copy made earlier is old.",
      example: "act(() => { result.current.increment(); }); then read result.current.count.",
    },
    {
      question: "How do you change the input of a hook?",
      answer: "With initialProps and rerender.",
      how: "The callback of renderHook receives props. rerender calls it again with new props, like a parent that re-renders.",
      example: 'rerender({ value: "ab" })',
    },
  ],
};
