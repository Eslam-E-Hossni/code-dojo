import type { ReactProblem } from "../types";
import { closing, importOrders, line } from "./react-helpers";

export const reactTimer: ReactProblem = {
  id: "react-timer",
  kind: "react",
  group: "react",
  title: "React Timer: Start / Pause / Reset",
  difficulty: "medium",
  tag: "reported",
  statement: "Build a timer with three buttons: Start, Pause and Reset.",
  askFirst: [
    "Count up or count down?",
    "Seconds only, or minutes and seconds?",
    "What should Reset do while it is running?",
  ],
  edgeCases: [
    "Start clicked twice: must not create two intervals",
    "Component unmounts while running: clear the interval",
    "Countdown reaches 0: stop",
  ],
  parts: [
    {
      id: "main",
      title: "Timer",
      signature: "Timer()",
      steps: [
        line('import { useState, useRef, useEffect } from "react";', {
          coach:
            "نبدأ يا إسلام: التايمر محتاج تلات hooks. واحد للقيم اللي بتظهر على الشاشة، وواحد يشيل رقم الـ interval من غير ما يعمل render، وواحد يشغّل الـ interval ويمسحه. هاتهم من React.",
          accept: importOrders(["useState", "useRef", "useEffect"]),
          hint1: '`useState` و `useRef` و `useEffect` من `"react"`. الترتيب مش مهم.',
          explain: "I need state for the screen, a ref for the interval id, and an effect to start and stop it.",
        }),
        line("\nexport default function Timer() {", {
          coach: "عرّف المكوّن: دالة اسمها `Timer` من غير props، وهي الـ default export.",
          hint1: "`export default function` وبعدها `Timer` بأقواس فاضية.",
          explain: "Timer is a function component with no props.",
        }),
        line("  const [seconds, setSeconds] = useState(0);", {
          coach:
            "أول state: عدد الثواني اللي عدّت. هنخزّن الثواني بس، والدقايق هنحسبها منها وقت العرض.",
          hint1: "`seconds` و `setSeconds` من `useState` ببداية 0.",
          explain: "I store only the seconds. The minutes are computed from them.",
        }),
        line("  const [running, setRunning] = useState(false);", {
          coach: "تاني state: التايمر شغال دلوقتي ولا واقف؟ ده اللي الزراير هتغيّره. والبداية واقف.",
          hint1: "`running` و `setRunning` من `useState` ببداية `false`.",
          explain: "A second state says if the timer is running.",
        }),
        line("  const intervalRef = useRef(null);", {
          coach:
            "رقم الـ interval لازم نفتكره علشان نمسحه بعدين، بس تغييره ملوش لازمة يعمل render. يبقى مكانه ref مش state.",
          hint1: "`intervalRef` بيساوي `useRef` ببداية `null`.",
          explain: "The interval id goes in a ref, because changing it must not re-render.",
        }),
        line("\n  useEffect(() => {", {
          coach: "الـ interval حاجة برّه React، فتشغيله ومسحه مكانهم effect. افتح الـ effect.",
          hint1: "`useEffect` وجواها arrow من غير parameters، وافتح قوسها.",
          explain: "The interval lives outside React, so I sync it in an effect.",
        }),
        line("    if (!running) return;", {
          coach: "لو التايمر واقف، الـ effect ملوش شغل. اخرج بدري.",
          hint1: "`if` على عكس `running`، و `return` في نفس السطر.",
          explain: "If it is not running, the effect does nothing.",
        }),
        line("    intervalRef.current = setInterval(() => {", {
          coach:
            "لو شغال: ابدأ interval وخزّن رقمه في الـ ref. الـ callback هيتكتب في السطر الجاي، فافتح قوسه بس.",
          hint1: "`intervalRef.current` بيساوي `setInterval` وجواها arrow مفتوحة.",
          explain: "I start the interval and keep its id in the ref.",
        }),
        line("      setSeconds((s) => s + 1);", {
          coach:
            "كل تكّة زوّد ثانية. خد بالك: الـ callback ده closure وشايف قيمة قديمة، فلازم تستخدم الشكل اللي بياخد القيمة السابقة.",
          hint1: "`setSeconds` بـ updater: بياخد `s` ويرجّع `s + 1`.",
          explain: "I use the updater form, because the callback is a closure and would see an old value.",
        }),
        line("    }, 1000);", {
          coach: "اقفل الـ callback وحدّد إن التكّة كل ثانية.",
          hint1: "قوس القفل، فاصلة، وبعدها 1000 بالـ milliseconds.",
          explain: "It ticks every 1000 milliseconds.",
        }),
        line("    return () => clearInterval(intervalRef.current);", {
          coach:
            "أهم سطر: الـ cleanup. دالة React بتناديها لما `running` تتغير أو المكوّن يتشال من الصفحة، وشغلتها توقّف الـ interval.",
          hint1: "`return` لـ arrow بتنادي `clearInterval` على `intervalRef.current`.",
          explain: "The cleanup clears the interval when running changes or the component unmounts.",
        }),
        line("  }, [running]);", {
          coach: "اقفل الـ effect وقول له يشتغل تاني إمتى: بس لما حالة التشغيل تتغير.",
          hint1: "قوس القفل، فاصلة، و array فيها `running`.",
          explain: "The effect runs again only when running changes.",
        }),
        line("\n  const reset = () => {", {
          coach: "زرار Reset هيعمل حاجتين مع بعض، فاعمله دالة لوحدها اسمها `reset`.",
          hint1: "`const reset` بيساوي arrow من غير parameters، وافتح قوسها.",
          explain: "Reset does two things, so it gets its own handler.",
        }),
        line("    setRunning(false);", {
          coach: "أول حاجة: وقّف التايمر. وده لوحده هيخلّي الـ cleanup يمسح الـ interval.",
          hint1: "`setRunning` بـ `false`.",
          explain: "First I stop it. The effect cleanup clears the interval.",
        }),
        line("    setSeconds(0);\n  };", {
          coach: "وتاني حاجة: رجّع الثواني لصفر. واقفل الدالة. سطرين.",
          hint1: "`setSeconds` بـ 0، وفي السطر اللي بعده `};`.",
          explain: "Then I set the seconds back to zero.",
        }),
        line('\n  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");', {
          coach:
            "العرض: الدقايق مش state، دي قيمة محسوبة من الثواني. اقسم على 60 وقرّب لتحت، وحوّلها لنص من خانتين بصفر على الشمال. سمّيها `mm`.",
          hint1: '`Math.floor` على `seconds / 60`، جوه `String`، وبعدها `padStart` بـ 2 و `"0"`.',
          explain: "Minutes are computed, not stored. padStart makes them two digits.",
        }),
        line('  const ss = String(seconds % 60).padStart(2, "0");', {
          coach: "ونفس الفكرة للثواني اللي فاضلة بعد الدقايق. سمّيها `ss`.",
          hint1: "باقي القسمة `seconds % 60` جوه `String`، وبعدها نفس الـ `padStart`.",
          explain: "The seconds part is the remainder after the minutes.",
        }),
        line("\n  return (\n    <div>", {
          coach: "ابدأ الـ JSX: افتح قوس الـ return، وافتح `div` يلمّ كل حاجة. سطرين.",
          hint1: "`return (` وفي السطر اللي بعده `<div>`.",
          explain: "Now the JSX, inside one parent element.",
        }),
        line("      <h1>{mm}:{ss}</h1>", {
          coach: "اعرض الوقت في عنوان كبير: الدقايق، نقطتين، الثواني.",
          hint1: "`h1` جواه `mm` بين `{ }` وبعدها `:` وبعدها `ss` بين `{ }`.",
          explain: "I show the minutes and the seconds.",
        }),
        line("      <button onClick={() => setRunning(true)} disabled={running}>Start</button>", {
          coach:
            "زرار نصّه `Start` بيشغّل التايمر. واقفله طول ما التايمر شغال، علشان الضغط مرتين ميعملش لخبطة.",
          accept: ["<button disabled={running} onClick={() => setRunning(true)}>Start</button>"],
          hint1: "`onClick` فيه arrow بتنادي `setRunning` بـ `true`، وبعده `disabled` بقيمة `running`.",
          explain: "Start sets running to true. It is disabled while running, so it cannot start twice.",
        }),
        line("      <button onClick={() => setRunning(false)} disabled={!running}>Pause</button>", {
          coach: "زرار نصّه `Pause` بيعمل العكس: بيوقّف، ومقفول طول ما التايمر واقف.",
          accept: ["<button disabled={!running} onClick={() => setRunning(false)}>Pause</button>"],
          hint1: "`onClick` بتنادي `setRunning` بـ `false`، و `disabled` بعكس `running`.",
          explain: "Pause sets running to false. It is disabled when the timer is stopped.",
        }),
        line("      <button onClick={reset}>Reset</button>", {
          coach:
            "وزرار نصّه `Reset` بيستخدم الدالة اللي كتبتها فوق. ابعت الدالة نفسها، من غير ما تناديها.",
          hint1: "`onClick` بقيمة `reset` من غير أقواس نداء.",
          explain: "Reset uses the handler. I pass the function, I do not call it.",
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
    "It shows 00:00 at first, and Pause is disabled.",
    "Start: it counts one second at a time, and Start becomes disabled.",
    "Pause: it stops. Start again: it goes on from the same time.",
    "Reset while it is running: it stops and shows 00:00.",
    "Start and Pause many times: it never counts faster than one per second.",
  ],
  complexity: "Each tick is O(1). One interval at most.",
  idea: "أهم تلات حاجات: الـ interval ID في `useRef`، والـ cleanup في الـ `useEffect`، واستخدام الـ updater function علشان متاخدش قيمة قديمة.",
  followUps: [
    {
      question: "Why the updater form setSeconds(s => s + 1)?",
      answer:
        "Because the interval callback is a closure. Without the updater it would always see the first value.",
    },
    {
      question: "Why useRef for the interval id?",
      answer: "Changing it must not cause a re-render, and I need the same value in the cleanup.",
    },
    {
      question: "How do you make it a countdown?",
      answer: "Start from a number, subtract 1 each tick, and set running to false when it reaches 0.",
    },
    {
      question: "Is setInterval exact?",
      answer:
        "No, it can drift. For an exact timer I save the start time and compute the difference from Date.now().",
    },
  ],
};
