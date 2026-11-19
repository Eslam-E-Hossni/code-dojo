import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const COUNTER = `import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c - 1)}>-</button>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
`;

export const testCounter: TestingProblem = {
  id: "test-counter",
  kind: "test",
  group: "testing",
  title: "Component basics: Counter",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Write the tests for the Counter component. Cover four things: it starts at 0, the plus button adds one, the minus button takes one away, and Reset goes back to 0.",
  askFirst: [
    "Which behaviours matter to the user here?",
    "Should I test through the screen, like a user, or through the state?",
    "Can the count go below zero?",
  ],
  edgeCases: ["The first render, before any click", "A negative count", "Reset after the count has changed"],
  testFile: "/Counter.test.js",
  subject: { "/Counter.js": COUNTER },
  buggy: [
    buggy(
      "starts-at-one",
      "/Counter.js",
      swap(COUNTER, "useState(0)", "useState(1)"),
      "The counter starts at 1, not at 0.",
      "اختبارك مش بيتأكد من القيمة اللي بتظهر أول ما الـ component يتعرض، قبل أي ضغطة.",
    ),
    buggy(
      "plus-does-nothing",
      "/Counter.js",
      swap(COUNTER, "setCount((c) => c + 1)", "setCount((c) => c)"),
      "The plus button does not change the count.",
      "اختبارك مش بيتأكد إن الرقم بيزيد بعد الضغط على زرار الزيادة.",
    ),
    buggy(
      "plus-adds-two",
      "/Counter.js",
      swap(COUNTER, "setCount((c) => c + 1)", "setCount((c) => c + 2)"),
      "The plus button adds 2 on every click.",
      "اختبارك بيتأكد إن الرقم اتغير، بس مش بيتأكد إنه زاد واحد بالظبط.",
    ),
    buggy(
      "minus-adds",
      "/Counter.js",
      swap(COUNTER, "setCount((c) => c - 1)", "setCount((c) => c + 1)"),
      "The minus button adds one, the same as plus.",
      "مفيش اختبار لزرار النقصان، أو الاختبار مش بيتأكد إن الرقم بينقص.",
    ),
    buggy(
      "reset-does-nothing",
      "/Counter.js",
      swap(COUNTER, "onClick={() => setCount(0)}", "onClick={() => setCount((c) => c)}"),
      "The Reset button does nothing.",
      "مفيش اختبار بيغيّر الرقم الأول وبعدين يتأكد إن Reset رجّعه لصفر.",
    ),
  ],
  parts: [
    {
      id: "main",
      title: "Counter.test.js",
      signature: 'describe("Counter")',
      steps: [
        tline('import { render, screen } from "@testing-library/react";', {
          coach:
            "نبدأ يا إسلام: محتاجين حاجتين من React Testing Library. واحدة بتعرض الـ component على شاشة وهمية، وواحدة بندوّر بيها في الشاشة دي.",
          accept: ['import { screen, render } from "@testing-library/react";'],
          hint1: '`render` و `screen`، من `"@testing-library/react"`.',
          explain: "render puts the component on a test screen, and screen is how I look for things on it.",
        }),
        tline('import userEvent from "@testing-library/user-event";', {
          coach: "وهات المكتبة اللي بتعمل مستخدم وهمي يدوس ويكتب. دي default import.",
          hint1: 'الاسم `userEvent`، من `"@testing-library/user-event"`.',
          explain: "user-event acts like a real user: it clicks and types.",
        }),
        tline('import "@testing-library/jest-dom";', {
          coach:
            "وهات الـ matchers الزيادة بتاعة الـ DOM، زي إن عنصر موجود في الصفحة. ده import من غير اسم، بيتنفّذ وخلاص.",
          hint1: 'كلمة `import` وبعدها اسم المكتبة بس: `"@testing-library/jest-dom"`.',
          explain: "jest-dom adds matchers for the DOM, like toBeInTheDocument.",
        }),
        tline('import Counter from "./Counter";', {
          coach: "وآخر import: الـ component اللي هنختبره، من الملف اللي في التاب التاني.",
          hint1: '`Counter` كـ default import من `"./Counter"`.',
          explain: "I import the component under test.",
        }),
        tline('\ndescribe("Counter", () => {', {
          coach: "افتح مجموعة اختبارات باسم الـ component: `Counter`.",
          hint1: "`describe` بياخد اسم المجموعة، وبعده arrow function فيها الاختبارات.",
          explain: "describe groups the tests of one component.",
        }),
        tline('  it("starts at zero", () => {', {
          coach:
            "أول اختبار: القيمة اللي بتظهر أول ما الـ component يتعرض. سمّيه `starts at zero`. مفيش ضغط هنا، فمش محتاج async.",
          hint1: "`it` بياخد اسم الاختبار، وبعده arrow function عادية.",
          explain: "The first test checks what the user sees before any click.",
        }),
        tline("    render(<Counter />);", {
          coach: "اعرض الـ component على الشاشة الوهمية.",
          hint1: "`render` وجواها الـ component كـ JSX.",
          explain: "I render the component.",
        }),
        tline('    expect(screen.getByText("Count: 0")).toBeInTheDocument();\n  });', {
          coach: "اتأكد إن النص `Count: 0` موجود على الشاشة. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `screen.getByText` بالنص، وبعدها الـ matcher `toBeInTheDocument`. وفي السطر اللي بعده `});`.",
          explain: "I assert on the text the user sees, not on the state inside.",
        }),
        tline('\n  it("adds one when plus is clicked", async () => {', {
          coach:
            "تاني اختبار: زرار الزيادة. سمّيه `adds one when plus is clicked`. فيه ضغط، والضغط بياخد وقت، فالدالة لازم تبقى async.",
          hint1: "زي الاختبار اللي فات، بس قبل الأقواس كلمة `async`.",
          explain: "This test clicks, so it is async.",
        }),
        tline("    const user = userEvent.setup();", {
          coach: "أول حاجة يا إسلام: محتاجين مستخدم وهمي يدوس ويكتب.",
          hint1: "من مكتبة user-event، وفيه دالة بتجهّزه.",
          explain: "I create a user that will click and type like a real person.",
        }),
        tline("    render(<Counter />);", {
          coach: "اعرض الـ component على الشاشة الوهمية.",
          hint1: "`render` وجواها الـ component كـ JSX.",
          explain: "I render the component.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "+" }));', {
          coach: "دوّر على زرار الزيادة زي ما المستخدم بيشوفه: بالـ role والاسم.",
          hint1: "getByRole مع name، ومتنساش await.",
          explain: "I find the button by its role and name, the way a user or a screen reader does, and I click it.",
        }),
        tline('    expect(screen.getByText("Count: 1")).toBeInTheDocument();\n  });', {
          coach: "اتأكد إن الرقم اتغير على الشاشة. واقفل الاختبار. سطرين.",
          hint1: "نفس شكل التأكد في أول اختبار، بس النص دلوقتي `Count: 1`.",
          explain: "After the click, the screen shows the new count.",
        }),
        tline('\n  it("takes one away when minus is clicked", async () => {', {
          coach: "تالت اختبار: زرار النقصان. سمّيه `takes one away when minus is clicked`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The third test is for the minus button.",
        }),
        tline("    const user = userEvent.setup();\n    render(<Counter />);", {
          coach: "نفس التجهيز: المستخدم الوهمي، وبعده اعرض الـ component. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `render`.",
          explain: "Every test sets up its own user and its own render.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "-" }));', {
          coach: "دوس على زرار النقصان. دوّر عليه بالـ role والاسم.",
          hint1: "نفس سطر الضغط، بس الاسم علامة ناقص.",
          explain: "I click the minus button.",
        }),
        tline('    expect(screen.getByText("Count: -1")).toBeInTheDocument();\n  });', {
          coach: "العدّاد بدأ من صفر ونقص واحد. اتأكد من النص الجديد، واقفل الاختبار. سطرين.",
          hint1: "النص هنا `Count: -1`.",
          explain: "The count went below zero, and the screen shows it.",
        }),
        tline('\n  it("goes back to zero on Reset", async () => {', {
          coach: "آخر اختبار: زرار Reset. سمّيه `goes back to zero on Reset`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The last test is for Reset.",
        }),
        tline("    const user = userEvent.setup();\n    render(<Counter />);", {
          coach: "التجهيز المعتاد: المستخدم الوهمي، والعرض. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `render`.",
          explain: "Again a fresh user and a fresh render.",
        }),
        tline(
          '    await user.click(screen.getByRole("button", { name: "+" }));\n    await user.click(screen.getByRole("button", { name: "+" }));',
          {
            coach:
              "لو دوست Reset والرقم لسه صفر، الاختبار هيعدّي حتى لو الزرار بايظ. فحرّك الرقم الأول: دوس على زرار الزيادة مرتين. سطرين.",
            hint1: "سطر الضغط على `+`، مرتين.",
            explain: "I change the count first. Without that, the test would pass even if Reset did nothing.",
          },
        ),
        tline('    await user.click(screen.getByRole("button", { name: "Reset" }));', {
          coach: "دلوقتي دوس على زرار Reset.",
          hint1: "نفس سطر الضغط، بالاسم `Reset`.",
          explain: "I click Reset.",
        }),
        tline('    expect(screen.getByText("Count: 0")).toBeInTheDocument();\n  });\n});', {
          coach: "اتأكد إن العدّاد رجع لصفر. واقفل الاختبار، وبعده المجموعة. تلات سطور.",
          hint1: "التأكد بالنص `Count: 0`، وبعده `});` مرتين.",
          explain: "The count is back at zero.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: test what the user sees and does. Render, find by role or text, act with user-event, then assert on the screen.",
  idea: "كل اختبار تلات حركات: جهّز (render)، اعمل اللي المستخدم بيعمله (`user.click`)، واتأكد من اللي ظاهر على الشاشة. متختبرش الـ state من جوه.",
  interview:
    "With React Testing Library I render the component, find elements the way a user does, by role and name, act with user-event, and assert on what is on the screen.",
  followUps: [
    {
      question: "Why userEvent and not fireEvent?",
      answer: "userEvent acts like a real user. fireEvent only sends one DOM event.",
      how: "A click with userEvent also moves the pointer, focuses the element, and fires the events in the real order.",
      example: 'await user.click(button) fires pointerdown, mousedown, focus, mouseup and click. fireEvent.click(button) fires only click.',
    },
    {
      question: "Why find the button with getByRole?",
      answer: "It finds the element the way a user or a screen reader does.",
      how: "The query uses the role and the accessible name. If the button stops being a real button, the test fails.",
      example: 'screen.getByRole("button", { name: "+" })',
    },
    {
      question: "Why is the test async?",
      answer: "Every userEvent action returns a promise.",
      how: "I await the action, so the assertion runs after React has updated the screen.",
      example: 'await user.click(...); then expect(screen.getByText("Count: 1"))',
    },
  ],
};
