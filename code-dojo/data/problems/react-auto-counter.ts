import type { ReactProblem } from "../types";
import { closing, importOrders, line } from "./react-helpers";

export const reactAutoCounter: ReactProblem = {
  id: "react-auto-counter",
  kind: "react",
  group: "react",
  title: "Counter with setInterval and clearInterval",
  difficulty: "medium",
  tag: "reported",
  statement: "Build a counter that goes up or down automatically, and can be stopped.",
  askFirst: ["How fast: every second?", "Can it go below zero?"],
  edgeCases: ["Clicking a button twice: two intervals", "Unmount while it is running"],
  parts: [
    {
      id: "main",
      title: "AutoCounter",
      signature: "AutoCounter()",
      steps: [
        line('import { useEffect, useRef, useState } from "react";', {
          coach:
            "نبدأ يا إسلام: العدّاد ده بيتحرك لوحده، فمحتاجين تلات hooks: واحد يشغّل الـ interval ويمسحه، وواحد يشيل رقمه، وواحد للقيم اللي على الشاشة. هاتهم من React.",
          accept: importOrders(["useEffect", "useRef", "useState"]),
          hint1: '`useEffect` و `useRef` و `useState` من `"react"`. الترتيب مش مهم.',
          explain: "I need an effect for the interval, a ref for its id, and state for the screen.",
        }),
        line("\nexport default function AutoCounter() {", {
          coach: "عرّف المكوّن: دالة اسمها `AutoCounter` من غير props، وهي الـ default export.",
          hint1: "`export default function` وبعدها `AutoCounter` بأقواس فاضية.",
          explain: "AutoCounter is a function component with no props.",
        }),
        line("  const [count, setCount] = useState(0);", {
          coach: "أول state: قيمة العدّاد نفسها، وبدايتها صفر.",
          hint1: "`count` و `setCount` من `useState` ببداية 0.",
          explain: "The count is state, and it starts at 0.",
        }),
        line("  const [step, setStep] = useState(0); // 1, -1, or 0 for stopped", {
          coach:
            "تاني state هو مقدار التغيير في كل تكّة: 1 للزيادة، سالب 1 للنقصان، وصفر معناه واقف. قيمة واحدة بتقول الاتجاه وبتقول شغال ولا لأ. ابدأ واقف.",
          hint1: "`step` و `setStep` من `useState` ببداية 0.",
          explain: "One value, step, says the direction and also if it is running. Zero means stopped.",
        }),
        line("  const intervalRef = useRef(null);", {
          coach: "ورقم الـ interval نشيله في ref، لأن تغييره ملوش لازمة يعمل render.",
          hint1: "`intervalRef` بيساوي `useRef` ببداية `null`.",
          explain: "The interval id goes in a ref, because changing it must not re-render.",
        }),
        line("\n  useEffect(() => {", {
          coach: "افتح الـ effect اللي هيشغّل الـ interval ويمسحه.",
          hint1: "`useEffect` وجواها arrow من غير parameters، وافتح قوسها.",
          explain: "The interval is started and stopped in an effect.",
        }),
        line("    if (step === 0) return;", {
          coach: "لو العدّاد واقف، يعني مقدار التغيير صفر، الـ effect ملوش شغل. اخرج بدري.",
          hint1: "`if` بتقارن `step` بـ 0 بـ `===`، و `return` في نفس السطر.",
          explain: "If step is zero, the counter is stopped and the effect does nothing.",
        }),
        line("    intervalRef.current = setInterval(() => {", {
          coach: "غير كده: ابدأ interval وخزّن رقمه في الـ ref. افتح قوس الـ callback بس.",
          hint1: "`intervalRef.current` بيساوي `setInterval` وجواها arrow مفتوحة.",
          explain: "I start the interval and keep its id in the ref.",
        }),
        line("      setCount((c) => c + step);", {
          coach:
            "كل تكّة غيّر العدّاد بمقدار التغيير، سواء موجب أو سالب. واستخدم الشكل اللي بياخد القيمة السابقة، لأن الـ callback شايف قيمة قديمة للعدّاد.",
          hint1: "`setCount` بـ updater: بياخد `c` ويرجّع `c + step`.",
          explain: "Each tick adds step to the count. The updater form avoids a stale value.",
        }),
        line("    }, 1000);", {
          coach: "اقفل الـ callback، والتكّة كل ثانية.",
          hint1: "قوس القفل، فاصلة، وبعدها 1000.",
          explain: "It ticks every second.",
        }),
        line("    return () => clearInterval(intervalRef.current);", {
          coach:
            "الـ cleanup: دالة بتوقّف الـ interval. React بتناديها قبل ما الـ effect يشتغل تاني، وده اللي بيمنع وجود اتنين intervals مع بعض.",
          hint1: "`return` لـ arrow بتنادي `clearInterval` على `intervalRef.current`.",
          explain: "The cleanup clears the old interval before a new one starts, so there is never a second one.",
        }),
        line("  }, [step]);", {
          coach: "اقفل الـ effect وخلّيه يشتغل تاني كل ما مقدار التغيير يتغير.",
          hint1: "قوس القفل، فاصلة، و array فيها `step`.",
          explain: "The effect runs again every time step changes.",
        }),
        line("\n  return (\n    <div>", {
          coach: "ابدأ الـ JSX: افتح قوس الـ return، وافتح `div` يلمّ كل حاجة. سطرين.",
          hint1: "`return (` وفي السطر اللي بعده `<div>`.",
          explain: "Now the JSX, inside one parent element.",
        }),
        line('      <p aria-live="polite">Count: {count}</p>', {
          coach:
            "اعرض العدّاد في فقرة، وقبله النص `Count:`. وزوّد الخاصية اللي بتخلّي قارئ الشاشة ينطق الرقم لما يتغير، بهدوء.",
          hint1: '`p` فيها `aria-live` بقيمة `"polite"`، وجواها النص وبعده `count` بين `{ }`.',
          explain: "I show the count. aria-live tells a screen reader when it changes.",
        }),
        line("      <button onClick={() => setStep(1)}>Auto +</button>", {
          coach: "زرار نصّه `Auto +` بيخلّي العدّاد يزيد لوحده: بيحط مقدار التغيير بواحد.",
          hint1: "`onClick` فيه arrow بتنادي `setStep` بـ 1.",
          explain: "Auto plus sets step to 1.",
        }),
        line("      <button onClick={() => setStep(-1)}>Auto -</button>", {
          coach: "وزرار نصّه `Auto -` بيخلّيه ينقص لوحده.",
          hint1: "`onClick` بتنادي `setStep` بسالب 1.",
          explain: "Auto minus sets step to minus 1.",
        }),
        line("      <button onClick={() => setStep(0)}>Stop</button>", {
          coach: "وزرار نصّه `Stop` بيوقّفه: يرجّع مقدار التغيير لصفر.",
          hint1: "`onClick` بتنادي `setStep` بـ 0.",
          explain: "Stop sets step to 0, and the cleanup clears the interval.",
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
    "It shows Count: 0 and does not move at first.",
    "Auto +: it goes up by one every second.",
    "Auto -: it goes down by one every second, also below zero.",
    "Stop: it stays where it is.",
    "Click Auto + many times: it still goes up by one per second, not faster.",
  ],
  complexity: "O(1) per tick.",
  idea: "نفس فكرة الـ Timer: الـ effect بيعمل الـ interval، والـ cleanup بيمسحه كل ما `step` تتغير.",
  followUps: [
    {
      question: "Why is there never a second interval?",
      answer: "When step changes, the cleanup clears the old interval before the new effect runs.",
    },
    {
      question: "What happens when Auto + is clicked while it is already going up?",
      answer: "Nothing. step is already 1, so the state does not change and the effect does not run again.",
    },
    {
      question: "Why is step in the dependency array?",
      answer: "The callback reads step. With an empty array it would keep the first value, 0, forever.",
    },
  ],
};
