import type { ReactProblem } from "../types";
import { importOrders, line } from "./react-helpers";

/** The three pieces need a tree to live in. The preview adds it. */
const DEMO = `// ---- Demo: only for the preview. It is not part of the answer. ----
function Page() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: dark ? "#05070a" : "#f4f1ea",
        color: dark ? "#e9edf3" : "#1b222d",
      }}
    >
      <p>This box reads the same context. Theme: {theme}</p>
      <ThemeButton />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  );
}`;

export const reactUseContext: ReactProblem = {
  id: "react-use-context",
  kind: "react",
  group: "react",
  title: "Write code with useContext",
  difficulty: "medium",
  tag: "reported",
  statement: "Create a context, provide a value, and read it in a child component.",
  askFirst: ["What should the context hold: a theme, a user?", "Should the child be able to change the value?"],
  edgeCases: [
    "Hook used outside the provider",
    "Value object recreated on every render: all readers re-render",
  ],
  parts: [
    {
      id: "provider",
      title: "Context and provider",
      signature: "ThemeProvider({ children })",
      steps: [
        line('import { createContext, useContext, useState, useMemo } from "react";', {
          coach:
            "نبدأ يا إسلام: محتاجين أربع حاجات من React. واحدة تعمل الـ context، وواحدة تقراه، وواحدة للـ state، وواحدة تثبّت قيمة بين الـ renders.",
          accept: importOrders(["createContext", "useContext", "useState", "useMemo"]),
          hint1: '`createContext` و `useContext` و `useState` و `useMemo` من `"react"`. الترتيب مش مهم.',
          explain: "I import createContext, useContext, useState and useMemo.",
        }),
        line("\nconst ThemeContext = createContext(null);", {
          coach:
            "الخطوة الأولى: اعمل الـ context نفسه برّه أي مكوّن، وسمّيه `ThemeContext`. خلّي قيمته الافتراضية `null` علشان نعرف بعدين لو حد استخدمه من غير provider.",
          hint1: "`const ThemeContext` بيساوي `createContext` بـ `null`.",
          explain: "I create the context. The default is null, so I can detect a missing provider.",
        }),
        line("\nexport function ThemeProvider({ children }) {", {
          coach:
            "الخطوة التانية: مكوّن الـ provider. بياخد اللي جواه كـ prop علشان يلفّ أي جزء من الشجرة. واعمله export.",
          hint1: "`export function` اسمها `ThemeProvider`، وبتاخد `children` بالـ destructuring.",
          explain: "ThemeProvider wraps its children.",
        }),
        line('  const [theme, setTheme] = useState("light");', {
          coach: "الـ state اللي هنشاركها: اسم الـ theme. بدايته `light`.",
          hint1: '`theme` و `setTheme` من `useState` ببداية `"light"`.',
          explain: "The theme is state inside the provider.",
        }),
        line("  const value = useMemo(", {
          coach:
            "القيمة اللي هتتبعت هي object. لو اتعمل جديد في كل render، كل اللي بيقروا الـ context هيعملوا render على الفاضي. فثبّتها. افتح النداء بس، والباقي في السطور الجاية.",
          hint1: "`const value` بيساوي `useMemo` وافتح قوسها.",
          explain: "I memoize the value object, so readers do not re-render for nothing.",
        }),
        line('    () => ({ theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) }),', {
          coach:
            "أول argument: دالة بترجّع الـ object. فيه الـ theme، ودالة اسمها `toggle` بتقلبه بين `light` و `dark` باستخدام القيمة السابقة.",
          hint1:
            "arrow بترجّع `({ theme, toggle: ... })`. والـ `toggle` arrow بتنادي `setTheme` بـ updater فيه ternary على `t === \"light\"`. والسطر بيخلص بفاصلة.",
          explain: "The value has the theme and a toggle function that flips it.",
        }),
        line("    [theme]\n  );", {
          coach:
            "تاني argument: القيمة تتحسب من جديد بس لما الـ theme يتغير. واقفل النداء. سطرين.",
          accept: ["[theme],\n);"],
          hint1: "array فيها `theme`، وفي السطر اللي بعده `);`.",
          explain: "The value is rebuilt only when the theme changes.",
        }),
        line("  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;", {
          coach:
            "ارسم الـ provider بتاع الـ context، واديله القيمة، وحط جواه اللي اتبعت للمكوّن. كله في سطر واحد.",
          hint1: "`return` لـ `ThemeContext.Provider` بـ `value={value}`، وجواه `{children}`.",
          explain: "The provider gives the value to everything inside it.",
        }),
        line("}", {
          coach: "اقفل المكوّن.",
          hint1: "قوس قفل واحد.",
          explain: "That is the provider.",
        }),
      ],
    },
    {
      id: "hook",
      title: "useTheme hook",
      signature: "useTheme()",
      steps: [
        line("export function useTheme() {", {
          coach:
            "دلوقتي custom hook صغير يقرا الـ context، علشان باقي الكود ميتعاملش مع الـ context مباشرة. اعمله export.",
          hint1: "`export function` اسمها `useTheme` بأقواس فاضية.",
          explain: "A custom hook hides the context from the components.",
        }),
        line("  const ctx = useContext(ThemeContext);", {
          coach: "اقرا قيمة الـ context وخزّنها في متغير اسمه `ctx`.",
          hint1: "`const ctx` بيساوي `useContext` بـ `ThemeContext`.",
          explain: "useContext reads the nearest provider value.",
        }),
        line('  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");', {
          coach:
            "الـ edge case: لو مفيش provider فوقنا، القيمة هتبقى `null`. ارمي خطأ واضح رسالته: `useTheme must be used inside ThemeProvider`.",
          hint1: "`if` على عكس `ctx`، و `throw new Error` بالرسالة.",
          explain: "Outside the provider the value is null, so I throw a clear error.",
        }),
        line("  return ctx;\n}", {
          coach: "رجّع القيمة واقفل الـ hook. سطرين.",
          hint1: "`return ctx;` وبعدها `}`.",
          explain: "The hook returns the context value.",
        }),
      ],
    },
    {
      id: "child",
      title: "ThemeButton: read the context",
      signature: "ThemeButton()",
      steps: [
        line("function ThemeButton() {", {
          coach: "الخطوة التالتة: مكوّن ابن بيقرا الـ context. دالة عادية اسمها `ThemeButton`.",
          hint1: "`function` اسمها `ThemeButton` بأقواس فاضية.",
          explain: "ThemeButton is a child that reads the context.",
        }),
        line("  const { theme, toggle } = useTheme();", {
          coach: "خد الـ theme ودالة التبديل من الـ hook اللي كتبته.",
          hint1: "object destructuring: `theme` و `toggle` من `useTheme()`.",
          explain: "It takes the theme and the toggle from the hook.",
        }),
        line("  return <button onClick={toggle}>Current: {theme}</button>;", {
          coach:
            "ارسم زرار بيبدّل الـ theme لما يتضغط، ونصّه `Current:` وبعده اسم الـ theme الحالي.",
          hint1: "`return` لـ `button` بـ `onClick={toggle}`، وجواه النص وبعده `{theme}`.",
          explain: "The button shows the theme and toggles it on click.",
        }),
        line("}", {
          coach: "اقفل المكوّن.",
          hint1: "قوس قفل واحد.",
          explain: "That is the child component.",
        }),
      ],
    },
  ],
  preview: { tail: DEMO },
  checks: [
    "The button shows Current: light at first.",
    "Click it: the button and the box around it both change to dark.",
    "Click again: both go back to light.",
    "The button and the box always show the same theme.",
  ],
  complexity: "Reading context is O(1). Every reader re-renders when the value changes.",
  idea: "تلات خطوات: `createContext`، بعدين Provider بقيمة، بعدين `useContext` في الابن. والـ custom hook بيدّي رسالة خطأ واضحة.",
  followUps: [
    {
      question: "Why useMemo on the value?",
      answer: "So the value object is the same between renders, and readers don't re-render for nothing.",
    },
    {
      question: "When would you not use context?",
      answer: "For state that changes very often. Then I use a store with selectors.",
    },
  ],
};
