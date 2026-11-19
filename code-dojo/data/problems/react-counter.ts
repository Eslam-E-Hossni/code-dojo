import type { ReactProblem } from "../types";
import { closing, line } from "./react-helpers";

export const reactCounter: ReactProblem = {
  id: "react-counter",
  kind: "react",
  group: "react",
  title: "Counter",
  difficulty: "easy",
  tag: "likely",
  statement: "Build a counter with three buttons: minus, plus and Reset.",
  askFirst: ["Can the count go below zero?", "Is the step always 1?", "What value does Reset go back to?"],
  edgeCases: [
    "Fast clicks: every click must count",
    "Negative numbers",
    "Reset when the count is already 0",
  ],
  parts: [
    {
      id: "main",
      title: "Counter",
      signature: "Counter()",
      steps: [
        line('import { useState } from "react";', {
          coach:
            "نبدأ يا إسلام: المكوّن ده لازم يفتكر رقم بين كل render والتاني، يبقى محتاجين الـ hook بتاع الـ state. هاته من React.",
          hint1: '`import` بأقواس `{ }` جواها `useState`، من `"react"`.',
          explain: "I import useState, because the count must survive between renders.",
        }),
        line("\nexport default function Counter() {", {
          coach:
            "عرّف المكوّن نفسه: دالة اسمها `Counter` من غير props. وخليها الـ default export علشان الـ preview يلاقيها.",
          hint1: "`export default function` وبعدها الاسم `Counter` بأقواس فاضية.",
          explain: "The component is a function, and it is the default export.",
        }),
        line("  const [count, setCount] = useState(0);", {
          coach: "دلوقتي الـ state: قيمة العدّاد، والدالة اللي بتغيّرها. والبداية صفر.",
          hint1: "`const` مع array destructuring: `count` و `setCount`، من `useState` ببداية 0.",
          explain: "The count is state, and it starts at 0.",
        }),
        line("\n  return (\n    <div>", {
          coach:
            "ابدأ الـ JSX اللي المكوّن بيرجّعه: افتح قوس بعد الـ return، وافتح `div` يكون الأب الوحيد لكل العناصر. سطرين.",
          hint1: "`return (` وفي السطر اللي بعده `<div>`.",
          explain: "I return JSX, with one parent element around everything.",
        }),
        line('      <p aria-live="polite">Count: {count}</p>', {
          coach:
            "اعرض الرقم في فقرة، وقبله النص `Count:`. وزوّد خاصية تخلّي قارئ الشاشة ينطق الرقم الجديد كل ما يتغير، بهدوء ومن غير ما يقاطع.",
          hint1: '`p` فيها `aria-live` بقيمة `"polite"`، وجواها النص وبعده `count` بين `{ }`.',
          explain: "I show the count. aria-live tells a screen reader when it changes.",
        }),
        line("      <button onClick={() => setCount((c) => c - 1)}>-</button>", {
          coach:
            "زرار النقصان، ونصّه علامة ناقص. مهم: متقراش `count` مباشرة وإنت بتحدّث. استخدم الشكل اللي بياخد القيمة السابقة ويرجّع الجديدة، علشان الضغطات السريعة كلها تتحسب.",
          hint1: "`button` بـ `onClick` فيه arrow بتنادي `setCount` بـ updater: بياخد `c` ويرجّع `c - 1`.",
          explain: "The minus button uses the updater form, so fast clicks all count.",
        }),
        line("      <button onClick={() => setCount((c) => c + 1)}>+</button>", {
          coach: "ونفس الفكرة بالظبط لزرار الزيادة، ونصّه علامة زائد.",
          hint1: "زي السطر اللي فات، بس الـ updater بيرجّع `c + 1`.",
          explain: "The plus button adds one in the same way.",
        }),
        line("      <button onClick={() => setCount(0)}>Reset</button>", {
          coach:
            "وزرار نصّه `Reset` بيرجّع العدّاد لنقطة البداية. هنا القيمة الجديدة ثابتة ومش معتمدة على القديمة، فمش محتاج updater.",
          hint1: "`onClick` فيه arrow بتنادي `setCount` بـ 0 مباشرة.",
          explain: "Reset sets a fixed value, so it needs no updater.",
        }),
        line(closing("div"), {
          coach: "اقفل الـ `div`، وبعده قوس الـ return، وبعده قوس الدالة. تلات سطور.",
          hint1: "`</div>` وبعدين `);` وبعدين `}`.",
          explain: "I close the element, the return and the component.",
        }),
      ],
    },
  ],
  preview: {},
  checks: [
    "It starts at 0.",
    "Plus adds 1 and minus takes 1 away.",
    "The count can go below zero.",
    "Reset goes back to 0.",
    "Click plus fast many times: every click counts.",
  ],
  complexity: "O(1) per click. One state value.",
  idea: "الـ state هو المصدر الوحيد للرقم. وأي تحديث معتمد على القيمة القديمة يتكتب بالـ updater function.",
  followUps: [
    {
      question: "Why the updater form setCount(c => c + 1)?",
      answer:
        "If I call setCount(count + 1) twice in one handler, both calls read the same old count. The updater always gets the latest value.",
    },
    {
      question: "How would you add a minimum and a maximum?",
      answer: "I clamp inside the updater with Math.min and Math.max, and I disable the button at the limit.",
    },
    {
      question: "What happens to the count when the component unmounts?",
      answer: "It is lost. To keep it I lift the state to a parent, or I save it in localStorage.",
    },
  ],
};
