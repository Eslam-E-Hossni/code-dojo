import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const THEME = `import { createContext, useContext, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const toggle = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
`;

const THEME_TOGGLE = `import { useTheme } from "./theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return <button onClick={toggle}>Theme: {theme}</button>;
}
`;

export const testContext: TestingProblem = {
  id: "test-context",
  kind: "test",
  group: "testing",
  title: "Context: a custom render with a wrapper",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write the tests for ThemeToggle. It reads the theme from a context, so it only works inside ThemeProvider. Write a renderWithTheme helper that wraps what it renders in the provider. Cover three things: it shows the light theme first, one click switches to dark, and a second click switches back.",
  askFirst: [
    "Which providers does the component need around it?",
    "Should every test repeat the provider, or can one helper do it?",
    "Do I test the real provider, or a fake one?",
  ],
  edgeCases: ["The first value", "One click", "Two clicks: back to the start", "Rendering without the provider throws"],
  testFile: "/ThemeToggle.test.js",
  subject: { "/ThemeToggle.js": THEME_TOGGLE, "/theme.js": THEME },
  buggy: [
    buggy(
      "starts-dark",
      "/theme.js",
      swap(THEME, 'useState("light")', 'useState("dark")'),
      "The theme starts as dark.",
      "اختبارك مش بيتأكد من القيمة اللي بتظهر أول ما الـ component يتعرض.",
    ),
    buggy(
      "click-does-nothing",
      "/ThemeToggle.js",
      swap(THEME_TOGGLE, "<button onClick={toggle}>", "<button>"),
      "The button is not connected to toggle.",
      "اختبارك مش بيتأكد إن الـ theme اتغير بعد الضغط.",
    ),
    buggy(
      "one-way",
      "/theme.js",
      swap(THEME, '(current === "light" ? "dark" : "light")', '(current === "light" ? "dark" : "dark")'),
      "The theme can go to dark but never back to light.",
      "اختبارك بيجرّب ضغطة واحدة بس. جرّب ضغطتين، واتأكد إنه رجع زي الأول.",
    ),
  ],
  parts: [
    {
      id: "main",
      title: "ThemeToggle.test.js",
      signature: 'describe("ThemeToggle")',
      steps: [
        tline('import { render, screen } from "@testing-library/react";', {
          coach: "نبدأ يا إسلام بالـ imports المعتادة: اللي بيعرض، واللي بيدوّر.",
          accept: ['import { screen, render } from "@testing-library/react";'],
          hint1: '`render` و `screen`، من `"@testing-library/react"`.',
          explain: "render and screen come from React Testing Library.",
        }),
        tline('import userEvent from "@testing-library/user-event";\nimport "@testing-library/jest-dom";', {
          coach: "وبعده: المستخدم الوهمي، والـ matchers بتاعة الـ DOM. سطرين.",
          hint1: '`userEvent` من `"@testing-library/user-event"`، وبعده import من غير اسم لـ `"@testing-library/jest-dom"`.',
          explain: "user-event and jest-dom, as usual.",
        }),
        tline('import { ThemeProvider } from "./theme";\nimport ThemeToggle from "./ThemeToggle";', {
          coach:
            "الـ component ده بيقرا من context، فلوحده هيرمي خطأ. هات الـ provider الحقيقي من ملف `theme`، وبعده الـ component نفسه. سطرين.",
          hint1: '`ThemeProvider` كـ named import من `"./theme"`، و `ThemeToggle` كـ default import من `"./ThemeToggle"`.',
          explain: "The component needs the provider, so I import both.",
        }),
        tline("\nfunction renderWithTheme(ui) {", {
          coach:
            "بدل ما نكتب الـ provider في كل اختبار، هنعمل دالة مساعدة مرة واحدة. سمّيها `renderWithTheme`، وبتاخد الـ JSX اللي عايزين نعرضه في `ui`.",
          hint1: "`function` اسمها `renderWithTheme` بتاخد `ui`.",
          explain: "A helper, so the tests do not repeat the provider.",
        }),
        tline("  return render(ui, { wrapper: ThemeProvider });\n}", {
          coach:
            "جواها نادي `render` العادية، وقول لها تلِفّ اللي بتعرضه في الـ provider. `render` بتاخد options فيها خاصية للكلام ده. ورجّع الناتج، واقفل الدالة. سطرين.",
          hint1: "`return render` بـ `ui`، وتاني argument هو object فيه `wrapper` بقيمة `ThemeProvider`.",
          explain: "The wrapper option renders the component inside the provider.",
        }),
        tline('\ndescribe("ThemeToggle", () => {', {
          coach: "افتح مجموعة الاختبارات باسم الـ component: `ThemeToggle`.",
          hint1: "`describe` بالاسم `ThemeToggle`، وبعده arrow function.",
          explain: "One group for the component.",
        }),
        tline('  it("shows the light theme at first", () => {', {
          coach: "أول اختبار: القيمة الأولى. سمّيه `shows the light theme at first`. من غير ضغط، فمش async.",
          hint1: "`it` بالاسم، وبعده arrow function عادية.",
          explain: "The first test: the first value.",
        }),
        tline("    renderWithTheme(<ThemeToggle />);", {
          coach: "اعرض الـ component بالدالة المساعدة، مش بـ `render` العادية.",
          hint1: "`renderWithTheme` وجواها الـ component كـ JSX.",
          explain: "I render with the helper, so the provider is there.",
        }),
        tline('    expect(screen.getByRole("button", { name: "Theme: light" })).toBeInTheDocument();\n  });', {
          coach: "اتأكد إن فيه زرار اسمه `Theme: light`. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `screen.getByRole` بالـ role `button` والاسم، مع `toBeInTheDocument`.",
          explain: "The button shows the light theme.",
        }),
        tline('\n  it("switches to dark on click", async () => {', {
          coach: "تاني اختبار: ضغطة واحدة. سمّيه `switches to dark on click`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The second test: one click.",
        }),
        tline("    const user = userEvent.setup();\n    renderWithTheme(<ThemeToggle />);", {
          coach: "جهّز المستخدم الوهمي، واعرض بالدالة المساعدة. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `renderWithTheme`.",
          explain: "Arrange: a user and the component inside the provider.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "Theme: light" }));', {
          coach: "دوس على الزرار. دوّر عليه باسمه الحالي `Theme: light`.",
          hint1: "`user.click` على `screen.getByRole` بالـ role `button` والاسم `Theme: light`.",
          explain: "I click the button.",
        }),
        tline('    expect(screen.getByRole("button", { name: "Theme: dark" })).toBeInTheDocument();\n  });', {
          coach: "اتأكد إن اسم الزرار بقى `Theme: dark`. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `screen.getByRole` بالاسم `Theme: dark`، مع `toBeInTheDocument`.",
          explain: "The context changed, and the button shows it.",
        }),
        tline('\n  it("switches back to light on a second click", async () => {', {
          coach: "آخر اختبار: ضغطتين. سمّيه `switches back to light on a second click`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The last test: two clicks.",
        }),
        tline("    const user = userEvent.setup();\n    renderWithTheme(<ThemeToggle />);", {
          coach: "التجهيز المعتاد: المستخدم، والعرض بالدالة المساعدة. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `renderWithTheme`.",
          explain: "Arrange again.",
        }),
        tline('    await user.click(screen.getByRole("button"));\n    await user.click(screen.getByRole("button"));', {
          coach:
            "دوس على الزرار مرتين. اسمه بيتغير بعد كل ضغطة، وهو الزرار الوحيد على الشاشة، فدوّر عليه بالـ role بس. سطرين.",
          hint1: "`user.click` على `screen.getByRole(\"button\")` من غير اسم، مرتين.",
          explain: "Two clicks. It is the only button, so the role alone is enough.",
        }),
        tline('    expect(screen.getByRole("button", { name: "Theme: light" })).toBeInTheDocument();\n  });\n});', {
          coach: "اتأكد إن الاسم رجع `Theme: light`. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`expect` على `screen.getByRole` بالاسم `Theme: light`. وبعده `});` مرتين.",
          explain: "After two clicks the theme is light again.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: render the component with the real providers it needs. Put them in one helper with the wrapper option, and use that helper in every test.",
  idea: "أي component محتاج provider: اعمل دالة `renderWithX` مرة واحدة بتلِفّه بالـ provider الحقيقي عن طريق `wrapper`. كده الاختبارات تفضل قصيرة، وبتختبر الـ context الحقيقي مش نسخة مزيّفة.",
  interview:
    "A component that reads a context has to be rendered inside its provider. I write one custom render helper that passes the provider as the wrapper option, and every test uses that helper.",
  followUps: [
    {
      question: "What does the wrapper option do?",
      answer: "It renders the component inside another component.",
      how: "render takes a wrapper component and puts the UI under test as its children.",
      example: "render(<ThemeToggle />, { wrapper: ThemeProvider })",
    },
    {
      question: "Why a custom render helper?",
      answer: "So the providers are written once, not in every test.",
      how: "The helper calls render with the wrapper. When the app gets a new provider, only the helper changes.",
      example: "function renderWithTheme(ui) { return render(ui, { wrapper: ThemeProvider }); }",
    },
    {
      question: "Why use the real provider and not a mock?",
      answer: "The test then covers the component and the context together.",
      how: "The click goes through the real toggle function, so a bug in the provider also fails the test.",
      example: "If toggle can never go back to light, the two-click test fails.",
    },
  ],
};
