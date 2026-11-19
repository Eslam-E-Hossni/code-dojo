import type { ReactProblem } from "../types";
import { importOrders, line } from "./react-helpers";

/** A hook draws nothing, so the preview adds a small page that uses it. */
const DEMO = `// ---- Demo: only for the preview. It is not part of the answer. ----
export default function Demo() {
  const [url, setUrl] = useState("/api/users");
  const { data, error, loading } = useFetch(url);

  return (
    <div>
      <div className="dojo-stage-bar">
        Fetch:
        <button onClick={() => setUrl("/api/users")}>/api/users</button>
        <button onClick={() => setUrl("/api/empty")}>/api/empty</button>
        <button onClick={() => setUrl("/api/broken")}>/api/broken</button>
      </div>
      <p>url: {url}</p>
      <p>loading: {String(loading)}</p>
      <p>error: {error ? error.message : "null"}</p>
      <pre>data: {JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}`;

export const reactUseFetch: ReactProblem = {
  id: "react-use-fetch",
  kind: "react",
  group: "react",
  title: "React: useFetch hook",
  difficulty: "medium",
  tag: "likely",
  statement: "Write a custom hook that fetches a URL and returns data, loading and error.",
  askFirst: ["Should it refetch when the URL changes?", "Should it cancel the old request?"],
  edgeCases: ["URL changes fast: race between responses", "HTTP error status", "Unmount before the response"],
  parts: [
    {
      id: "main",
      title: "useFetch",
      signature: "useFetch(url)",
      steps: [
        line('import { useState, useEffect } from "react";', {
          coach:
            "نبدأ يا إسلام: الـ hook ده محتاج state للنتيجة والحالة، و effect يبعت الطلب. هاتهم من React.",
          accept: importOrders(["useState", "useEffect"]),
          hint1: '`useState` و `useEffect` من `"react"`. الترتيب مش مهم.',
          explain: "I need state for the result and an effect for the request.",
        }),
        line("\nfunction useFetch(url) {", {
          coach: "عرّف الـ hook: دالة اسمها `useFetch` بتاخد العنوان اللي هنجيب منه.",
          hint1: "`function` اسمها `useFetch` بتاخد `url`.",
          explain: "useFetch takes the URL.",
        }),
        line("  const [data, setData] = useState(null);", {
          coach: "أول state: البيانات اللي هترجع. لسه مفيش حاجة، فبدايتها `null`.",
          hint1: "`data` و `setData` من `useState` ببداية `null`.",
          explain: "data starts as null.",
        }),
        line("  const [error, setError] = useState(null);", {
          coach: "تاني state: الخطأ لو حصل. برضه بدايته `null`.",
          hint1: "`error` و `setError` من `useState` ببداية `null`.",
          explain: "error starts as null.",
        }),
        line("  const [loading, setLoading] = useState(true);", {
          coach: "تالت state: لسه بنحمّل ولا خلصنا؟ الطلب بيبدأ أول ما الـ hook يشتغل، فالبداية بنحمّل.",
          hint1: "`loading` و `setLoading` من `useState` ببداية `true`.",
          explain: "loading starts as true, because the request starts at once.",
        }),
        line("\n  useEffect(() => {", {
          coach: "الطلب نفسه مكانه effect. افتحه.",
          hint1: "`useEffect` وجواها arrow من غير parameters، وافتح قوسها.",
          explain: "The request is made in an effect.",
        }),
        line("    const controller = new AbortController();", {
          coach: "جهّز الأداة اللي هنلغي بيها الطلب لو العنوان اتغير أو المكوّن اتشال.",
          hint1: "`const controller` بيساوي `new AbortController()`.",
          explain: "An AbortController lets me cancel the request.",
        }),
        line("    setLoading(true);", {
          coach: "ده طلب جديد، فرجّع حالة التحميل. مهم لما العنوان يتغير بعد أول مرة.",
          hint1: "`setLoading` بـ `true`.",
          explain: "A new request starts, so loading is true again.",
        }),
        line("    setError(null);", {
          coach: "وامسح أي خطأ قديم من الطلب اللي فات.",
          hint1: "`setError` بـ `null`.",
          explain: "I clear the error of the last request.",
        }),
        line("    fetch(url, { signal: controller.signal })", {
          coach:
            "ابعت الطلب واربطه بالـ controller. السطر ده من غير semicolon، لأن السلسلة هتكمل تحته.",
          hint1: "`fetch` بـ `url`، وتاني argument هو object فيه `signal` بقيمة `controller.signal`.",
          explain: "I call fetch and pass the signal.",
        }),
        line("      .then((res) => {", {
          coach: "أول حلقة: استقبل الرد. جواها سطرين، فافتح قوس.",
          hint1: "`.then` بـ arrow بتاخد `res`، وافتح قوسها.",
          explain: "The first then gets the response.",
        }),
        line('        if (!res.ok) throw new Error("HTTP " + res.status);', {
          coach:
            "خد بالك: `fetch` مبيرميش خطأ مع 404 أو 500. لازم إنت تتأكد إن الرد سليم، ولو لأ ارمي خطأ رسالته `HTTP` وبعدها مسافة ورقم الحالة.",
          hint1: '`if` على عكس `res.ok`، و `throw new Error` بالنص `"HTTP "` زائد `res.status`.',
          explain: "fetch does not reject on a 404, so I check res.ok and throw myself.",
        }),
        line("        return res.json();\n      })", {
          coach: "لو الرد سليم رجّعه كـ JSON، واقفل الحلقة. سطرين، ومن غير semicolon في الآخر.",
          hint1: "`return` لـ `res.json()`، وفي السطر اللي بعده `})`.",
          explain: "If it is fine, I return the JSON.",
        }),
        line("      .then(setData)", {
          coach: "تاني حلقة: خزّن البيانات. ابعت دالة الـ state نفسها من غير arrow.",
          hint1: "`.then` وجواها `setData` من غير أقواس نداء.",
          explain: "The parsed data goes into state.",
        }),
        line("      .catch((err) => {", {
          coach: "تالت حلقة: امسك الخطأ. افتح قوس.",
          hint1: "`.catch` بـ arrow بتاخد `err`، وافتح قوسها.",
          explain: "catch handles a failed request.",
        }),
        line('        if (err.name !== "AbortError") setError(err);\n      })', {
          coach:
            "الإلغاء اللي إحنا عملناه بيوصل هنا كخطأ اسمه `AbortError`، وده مش خطأ حقيقي. خزّن الخطأ بس لو مش هو. واقفل الحلقة. سطرين.",
          hint1: '`if` بتقارن `err.name` بـ `"AbortError"` بـ `!==`، وبعدها `setError(err)`. وفي السطر اللي بعده `})`.',
          explain: "An abort is not a real error, so I skip it. Any other error goes into state.",
        }),
        line("      .finally(() => setLoading(false));", {
          coach: "آخر حلقة، بتشتغل سواء نجح أو فشل: خلّص حالة التحميل. وهنا السلسلة بتخلص.",
          hint1: "`.finally` بـ arrow بتنادي `setLoading(false)`.",
          explain: "finally runs in both cases and turns loading off.",
        }),
        line("    return () => controller.abort();", {
          coach:
            "الـ cleanup: الغي الطلب. ده اللي بيحل الـ race لما العنوان يتغير بسرعة، وبيمنع تحديث state بعد ما المكوّن يتشال.",
          hint1: "`return` لـ arrow بتنادي `controller.abort()`.",
          explain: "The cleanup aborts the request. That solves the race and the update after unmount.",
        }),
        line("  }, [url]);", {
          coach: "اقفل الـ effect وخلّيه يشتغل تاني كل ما العنوان يتغير.",
          hint1: "قوس القفل، فاصلة، و array فيها `url`.",
          explain: "The effect runs again when the URL changes.",
        }),
        line("\n  return { data, error, loading };\n}", {
          coach: "رجّع التلات قيم في object واحد، واقفل الـ hook. سطرين.",
          hint1: "`return` لـ object فيه `data` و `error` و `loading`، وبعدها `}`.",
          explain: "The hook returns data, error and loading.",
        }),
      ],
    },
  ],
  preview: { tail: DEMO },
  checks: [
    "/api/users: loading is true first, then data shows five users.",
    "/api/empty: data is an empty array, and error is null.",
    "/api/broken: error shows HTTP 404.",
    "After an error, /api/users works again and the error is cleared.",
    "Click two URLs fast: the data on screen belongs to the last URL.",
  ],
  complexity: "One request per URL change.",
  idea: "نفس فكرة الجدول، بس جوه hook. الـ `AbortController` في الـ cleanup هو اللي بيحل الـ race.",
  followUps: [
    {
      question: "What problem does the abort solve?",
      answer: "A race condition: an old response replacing a newer one, and a state update after unmount.",
    },
    {
      question: "When the URL changes fast, loading can be false for a moment. Why, and how do you fix it?",
      answer:
        "The aborted request still runs its finally, and that sets loading to false while the new request is waiting. I turn loading off only when the request was not aborted: I check controller.signal.aborted first.",
    },
    {
      question: "How would you add caching?",
      answer: "I keep a Map from URL to data outside the hook, and I return the cached value before fetching.",
    },
  ],
};
