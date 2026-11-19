import type { ReactProblem } from "../types";
import { importOrders, line } from "./react-helpers";

export const reactDebounceSearch: ReactProblem = {
  id: "react-debounce-search",
  kind: "react",
  group: "react",
  title: "Debounce with React (search input)",
  difficulty: "medium",
  tag: "reported",
  statement: "Build a search input that calls the API only after the user stops typing.",
  askFirst: ["What delay?", "Should an old request be cancelled?", "Minimum number of characters?"],
  edgeCases: [
    "Component unmounts before the timer fires",
    "An old response arrives after a new one",
    "Empty query",
  ],
  parts: [
    {
      id: "use-debounce",
      title: "useDebounce hook",
      signature: "useDebounce(value, delay)",
      steps: [
        line('import { useState, useEffect } from "react";', {
          coach:
            "نبدأ يا إسلام بالـ hook. محتاجين اتنين من React: واحد يشيل القيمة المتأخرة، وواحد يشغّل التايمر ويمسحه.",
          accept: importOrders(["useState", "useEffect"]),
          hint1: '`useState` و `useEffect` من `"react"`. الترتيب مش مهم.',
          explain: "I need state for the delayed value and an effect for the timer.",
        }),
        line("\nfunction useDebounce(value, delay = 300) {", {
          coach:
            "عرّف الـ hook: بياخد القيمة اللي بتتغير بسرعة، والمدة اللي نستناها. ولو المدة متبعتتش خلّيها 300.",
          hint1: "دالة اسمها `useDebounce` بتاخد `value` و `delay` بقيمة افتراضية 300.",
          explain: "useDebounce takes a value and a delay, 300 milliseconds by default.",
        }),
        line("  const [debounced, setDebounced] = useState(value);", {
          coach:
            "جواه state بتشيل النسخة المتأخرة من القيمة. بدايتها هي القيمة نفسها. سمّيها `debounced`.",
          hint1: "`debounced` و `setDebounced` من `useState` ببداية `value`.",
          explain: "The state holds the delayed copy of the value.",
        }),
        line("  useEffect(() => {", {
          coach: "افتح effect هيشتغل مع كل تغيير في القيمة.",
          hint1: "`useEffect` وجواها arrow من غير parameters، وافتح قوسها.",
          explain: "An effect runs every time the value changes.",
        }),
        line("    const id = setTimeout(() => setDebounced(value), delay);", {
          coach:
            "جوه الـ effect: تايمر بعد المدة يحدّث النسخة المتأخرة بالقيمة الجديدة. واحفظ رقم التايمر في `id`.",
          hint1: "`const id` بيساوي `setTimeout` بـ arrow بتنادي `setDebounced(value)`، والمدة `delay`.",
          explain: "A timer copies the value into the state after the delay.",
        }),
        line("    return () => clearTimeout(id);", {
          coach:
            "وده السطر اللي بيعمل الـ debounce فعلًا: الـ cleanup بيمسح التايمر. فكل حرف جديد بيلغي تايمر الحرف اللي قبله.",
          hint1: "`return` لـ arrow بتنادي `clearTimeout` على `id`.",
          explain: "The cleanup clears the timer. This is the debounce: every change cancels the last timer.",
        }),
        line("  }, [value, delay]);", {
          coach: "اقفل الـ effect وخلّيه يشتغل تاني لما القيمة أو المدة تتغير.",
          hint1: "قوس القفل، فاصلة، و array فيها `value` و `delay`.",
          explain: "The effect depends on the value and the delay.",
        }),
        line("  return debounced;\n}", {
          coach: "رجّع النسخة المتأخرة واقفل الـ hook. سطرين.",
          hint1: "`return` للـ state اللي اسمها `debounced`، وبعدها `}`.",
          explain: "The hook returns the delayed value.",
        }),
      ],
    },
    {
      id: "search",
      title: "Search component",
      signature: "Search()",
      steps: [
        line("export default function Search() {", {
          coach: "دلوقتي المكوّن اللي بيستخدم الـ hook: دالة اسمها `Search`، وهي الـ default export.",
          hint1: "`export default function` وبعدها `Search` بأقواس فاضية.",
          explain: "Search is the component that uses the hook.",
        }),
        line('  const [text, setText] = useState("");', {
          coach: "الـ state الأولى: النص اللي المستخدم بيكتبه. بيتحدث مع كل حرف.",
          hint1: "`text` و `setText` من `useState` ببداية نص فاضي.",
          explain: "text changes on every key press.",
        }),
        line("  const query = useDebounce(text, 400);", {
          coach:
            "والقيمة اللي هنبحث بيها فعلًا: نسخة من النص بتتأخر 400 milliseconds. سمّيها `query`.",
          hint1: "`const query` بيساوي `useDebounce` بـ `text` و 400.",
          explain: "query is the text, delayed by 400 milliseconds.",
        }),
        line("\n  useEffect(() => {", {
          coach: "نداء الـ API مكانه effect بيشتغل لما القيمة المتأخرة تتغير. افتحه.",
          hint1: "`useEffect` وجواها arrow من غير parameters، وافتح قوسها.",
          explain: "The request is made in an effect.",
        }),
        line("    if (!query) return;", {
          coach: "الـ edge case: لو مفيش نص بحث، متبعتش طلب.",
          hint1: "`if` على عكس `query`، و `return` في نفس السطر.",
          explain: "An empty query makes no request.",
        }),
        line("    const controller = new AbortController();", {
          coach:
            "جهّز الأداة اللي هنلغي بيها الطلب لو المستخدم كتب حاجة جديدة قبل ما الرد يوصل.",
          hint1: "`const controller` بيساوي `new AbortController()`.",
          explain: "An AbortController lets me cancel the request.",
        }),
        line('    fetch("/api/search?q=" + encodeURIComponent(query), { signal: controller.signal })', {
          coach:
            "ابعت الطلب للعنوان `/api/search?q=` وبعده نص البحث بعد ما يتأمّن للـ URL. واربط الطلب بالـ controller. السطر ده من غير semicolon، لأن السلسلة هتكمل تحته.",
          hint1:
            "`fetch` بالنص زائد `encodeURIComponent(query)`، وتاني argument هو object فيه `signal` بقيمة `controller.signal`.",
          explain: "I call the API with the encoded query, and I pass the signal.",
        }),
        line("      .then((r) => r.json())", {
          coach: "أول حلقة في السلسلة: حوّل الرد لـ JSON.",
          hint1: "`.then` بـ arrow بتاخد `r` وبترجّع `r.json()`.",
          explain: "I read the response as JSON.",
        }),
        line("      .then(console.log)", {
          coach: "تاني حلقة: اطبع النتيجة في الـ console. ابعت دالة الطباعة نفسها من غير arrow.",
          hint1: "`.then` وجواها `console.log` من غير أقواس نداء.",
          explain: "I log the result.",
        }),
        line("      .catch(() => {});", {
          coach:
            "وآخر حلقة: امسك أي خطأ ومتعملش حاجة. الإلغاء نفسه بيطلع كخطأ، ومش عايزينه يظهر في الـ console.",
          hint1: "`.catch` بـ arrow فاضية: أقواس فاضية وجسم فاضي.",
          explain: "I ignore errors. An aborted request rejects, and that is expected.",
        }),
        line("    return () => controller.abort();", {
          coach:
            "الـ cleanup: الغي الطلب القديم. كده رد قديم وبطيء عمره ما هييجي بعد رد أجدد منه.",
          hint1: "`return` لـ arrow بتنادي `controller.abort()`.",
          explain: "The cleanup aborts the old request, so an old response cannot arrive after a new one.",
        }),
        line("  }, [query]);", {
          coach: "اقفل الـ effect. بيشتغل تاني بس لما القيمة المتأخرة تتغير، مش مع كل حرف.",
          hint1: "قوس القفل، فاصلة، و array فيها `query`.",
          explain: "The effect runs only when the delayed query changes.",
        }),
        line(
          '\n  return <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search" />;',
          {
            coach:
              "ارسم الـ input في سطر واحد: قيمته من الـ state السريعة، وكل تغيير بيحدّثها، وجواه نص إرشادي `Search`.",
            hint1:
              '`return` لـ `input` بـ `value={text}` و `onChange` بتنادي `setText` بـ `e.target.value` و `placeholder="Search"`.',
            explain: "The input is controlled by text, not by query.",
          },
        ),
        line("}", {
          coach: "اقفل المكوّن.",
          hint1: "قوس قفل واحد.",
          explain: "That is the whole component.",
        }),
      ],
    },
  ],
  preview: { console: true },
  checks: [
    "Type 'ap' fast: one result is logged, some time after you stop.",
    "Type more letters before the delay ends: still only one log, for the last text.",
    "Clear the input: nothing new is logged.",
    "Type a word that matches nothing: an empty array is logged.",
  ],
  complexity: "One timer per keystroke, cleared on the next one.",
  idea: "الـ cleanup بتاع الـ `useEffect` هو اللي بيعمل الـ debounce: كل تغيير بيمسح التايمر القديم. والـ `AbortController` بيمنع رد قديم يكتب فوق الجديد.",
  followUps: [
    {
      question: "Why abort the request?",
      answer: "To avoid a race: an old slow response must not replace a newer one.",
    },
    {
      question: "Hook or a plain debounce function?",
      answer: "The hook is simpler in React. A plain function must be kept stable with useRef or useMemo.",
    },
  ],
};
