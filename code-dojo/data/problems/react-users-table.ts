import type { ReactProblem } from "../types";
import { importOrders, line } from "./react-helpers";

/**
 * The preview has no real server. Three buttons choose what the API
 * answers, so every state of the table can be seen.
 */
const STAGE = `import { useState } from "react";

const SCENARIOS = ["data", "empty", "error"];

export function Stage({ Solution }) {
  const [scenario, setScenario] = useState("data");
  const [round, setRound] = useState(0);

  function choose(name) {
    window.__dojoScenario = name;
    setScenario(name);
    // A new key mounts the component again, so it fetches again.
    setRound((n) => n + 1);
  }

  return (
    <>
      <div className="dojo-stage-bar">
        The API answers with:
        {SCENARIOS.map((name) => (
          <button key={name} onClick={() => choose(name)} aria-pressed={scenario === name}>
            {name}
          </button>
        ))}
      </div>
      <Solution key={round} />
    </>
  );
}
`;

export const reactUsersTable: ReactProblem = {
  id: "react-users-table",
  kind: "react",
  group: "react",
  title: "Fetch data and show it in a table",
  difficulty: "medium",
  tag: "reported",
  statement: "Call an API and show the result in an HTML table.",
  askFirst: ["Which fields should I show?", "Do you want loading and error states?", "Is there pagination?"],
  edgeCases: [
    "Request fails or returns a non-200 status",
    "Empty list",
    "Component unmounts before the response",
  ],
  parts: [
    {
      id: "main",
      title: "UsersTable",
      signature: "UsersTable()",
      steps: [
        line('import { useEffect, useState } from "react";', {
          coach:
            "نبدأ يا إسلام: محتاجين effect يجيب البيانات، و state تشيل النتيجة والحالة. هاتهم من React.",
          accept: importOrders(["useEffect", "useState"]),
          hint1: '`useEffect` و `useState` من `"react"`. الترتيب مش مهم.',
          explain: "I need an effect for the request and state for the result.",
        }),
        line("\nexport default function UsersTable() {", {
          coach: "عرّف المكوّن: دالة اسمها `UsersTable` من غير props، وهي الـ default export.",
          hint1: "`export default function` وبعدها `UsersTable` بأقواس فاضية.",
          explain: "UsersTable is a function component with no props.",
        }),
        line("  const [users, setUsers] = useState([]);", {
          coach: "أول state: قايمة المستخدمين. بتبدأ فاضية.",
          hint1: "`users` و `setUsers` من `useState` ببداية array فاضية.",
          explain: "The users are state, and the list starts empty.",
        }),
        line('  const [status, setStatus] = useState("loading"); // loading | error | done', {
          coach:
            "تاني state: حالة الطلب في قيمة واحدة بدل كذا boolean ممكن يتلخبطوا مع بعض. بتبدأ `loading`، وبعدين هتبقى `error` أو `done`.",
          hint1: '`status` و `setStatus` من `useState` ببداية `"loading"`.',
          explain: "One status value, loading, error or done. Two booleans could be true together by mistake.",
        }),
        line("\n  useEffect(() => {", {
          coach: "جلب البيانات مكانه effect بيشتغل مرة واحدة أول ما المكوّن يظهر. افتحه.",
          hint1: "`useEffect` وجواها arrow من غير parameters، وافتح قوسها.",
          explain: "The request is made in an effect.",
        }),
        line("    const controller = new AbortController();", {
          coach: "جهّز الأداة اللي هنلغي بيها الطلب لو المكوّن اتشال قبل ما الرد يوصل.",
          hint1: "`const controller` بيساوي `new AbortController()`.",
          explain: "An AbortController lets me cancel the request on unmount.",
        }),
        line("\n    async function load() {", {
          coach:
            "دالة الـ effect نفسها مينفعش تبقى async. فاعمل جواها دالة async اسمها `load` علشان نستخدم `await`.",
          hint1: "`async function` اسمها `load` بأقواس فاضية.",
          explain: "The effect callback cannot be async, so I write an async function inside it.",
        }),
        line("      try {", {
          coach: "الطلب ممكن يفشل، فحطّه جوه try.",
          hint1: "كلمة `try` وبعدها قوس مفتوح.",
          explain: "The request can fail, so it goes in a try block.",
        }),
        line('        const res = await fetch("https://jsonplaceholder.typicode.com/users", {', {
          coach:
            "ابعت الطلب للعنوان `https://jsonplaceholder.typicode.com/users` واستنى الرد في متغير اسمه `res`. الـ options هتتكتب في السطر الجاي، فافتح قوسها بس.",
          hint1: "`const res` بيساوي `await fetch` بالعنوان كنص، وبعده فاصلة وقوس `{` مفتوح.",
          explain: "I fetch the users and wait for the response.",
        }),
        line("          signal: controller.signal,\n        });", {
          coach: "جوه الـ options اربط الطلب بالـ controller. واقفل النداء. سطرين.",
          accept: ["signal: controller.signal\n});"],
          hint1: "`signal` بقيمة `controller.signal`، وفي السطر اللي بعده `});`.",
          explain: "I pass the signal, so the request can be aborted.",
        }),
        line('        if (!res.ok) throw new Error("HTTP " + res.status);', {
          coach:
            "خد بالك: `fetch` مبيرميش خطأ مع 404 أو 500. اتأكد إن الرد سليم، ولو لأ ارمي خطأ رسالته `HTTP` وبعدها مسافة ورقم الحالة.",
          hint1: '`if` على عكس `res.ok`، و `throw new Error` بالنص `"HTTP "` زائد `res.status`.',
          explain: "fetch does not reject on a 404, so I check res.ok and throw myself.",
        }),
        line("        setUsers(await res.json());", {
          coach: "لو الرد سليم: حوّله لـ JSON وخزّنه في القايمة، في سطر واحد.",
          hint1: "`setUsers` وجواها `await res.json()`.",
          explain: "I parse the JSON and store the users.",
        }),
        line('        setStatus("done");', {
          coach: "وغيّر الحالة لإننا خلصنا.",
          hint1: '`setStatus` بـ `"done"`.',
          explain: "Then the status is done.",
        }),
        line("      } catch (err) {", {
          coach: "اقفل الـ try وامسك الخطأ في متغير اسمه `err`.",
          hint1: "قوس القفل، وبعده `catch` بتاخد `err`، وقوس مفتوح.",
          explain: "catch handles a failed request.",
        }),
        line('        if (err.name !== "AbortError") setStatus("error");', {
          coach:
            "الإلغاء اللي إحنا عملناه بيوصل هنا كخطأ اسمه `AbortError`، وده مش فشل حقيقي. غيّر الحالة لـ `error` بس لو مش هو.",
          hint1: '`if` بتقارن `err.name` بـ `"AbortError"` بـ `!==`، وبعدها `setStatus("error")`.',
          explain: "An abort is not a real error. Any other error sets the status to error.",
        }),
        line("      }\n    }", {
          coach: "اقفل الـ catch، وبعده اقفل الدالة. سطرين.",
          hint1: "قوس قفل، وفي السطر اللي بعده قوس قفل تاني.",
          explain: "I close the catch and the function.",
        }),
        line("\n    load();", {
          coach: "الدالة لسه متعرّفة بس. ناديها علشان الطلب يبدأ.",
          hint1: "نداء `load` بأقواس فاضية.",
          explain: "I call the function to start the request.",
        }),
        line("    return () => controller.abort();", {
          coach: "الـ cleanup: الغي الطلب لو المكوّن اتشال قبل الرد.",
          hint1: "`return` لـ arrow بتنادي `controller.abort()`.",
          explain: "The cleanup aborts the request if the component unmounts.",
        }),
        line("  }, []);", {
          coach: "اقفل الـ effect. مفيش حاجة بيعتمد عليها، فيشتغل مرة واحدة بس.",
          hint1: "قوس القفل، فاصلة، و array فاضية.",
          explain: "An empty array: the effect runs once, on mount.",
        }),
        line('\n  if (status === "loading") return <p>Loading...</p>;', {
          coach:
            "قبل الجدول اعرض الحالات واحدة واحدة. الأولى: لسه بنحمّل. رجّع فقرة نصّها `Loading...`.",
          hint1: '`if` بتقارن `status` بـ `"loading"`، و `return` لـ `p` في نفس السطر.',
          explain: "While loading, I show a loading text.",
        }),
        line('  if (status === "error") return <p role="alert">Could not load users.</p>;', {
          coach:
            "التانية: حصل خطأ. رجّع فقرة نصّها `Could not load users.` وخلّي قارئ الشاشة يعلن عنها كتنبيه.",
          hint1: '`if` بتقارن `status` بـ `"error"`، و `return` لـ `p` بـ `role="alert"`.',
          explain: "On error, I show a message with role alert.",
        }),
        line("  if (users.length === 0) return <p>No users.</p>;", {
          coach: "التالتة: الطلب نجح بس القايمة فاضية. رجّع فقرة نصّها `No users.`.",
          hint1: "`if` بتقارن `users.length` بـ 0، و `return` لـ `p`.",
          explain: "An empty list gets its own message.",
        }),
        line("\n  return (\n    <table>", {
          coach: "ولو عدّينا كل ده، ارسم الجدول. افتح قوس الـ return وافتح `table`. سطرين.",
          hint1: "`return (` وفي السطر اللي بعده `<table>`.",
          explain: "Now the table, for the data case.",
        }),
        line("      <caption>Users</caption>", {
          coach: "اديله عنوان يوصف محتواه علشان الـ accessibility، نصّه `Users`.",
          hint1: "العنصر `caption` وجواه النص.",
          explain: "A caption names the table.",
        }),
        line("      <thead>\n        <tr>", {
          coach: "افتح راس الجدول، وجواه صف. سطرين.",
          hint1: "`<thead>` وفي السطر اللي بعده `<tr>`.",
          explain: "The header row.",
        }),
        line('          <th scope="col">Name</th>', {
          coach: "أول خانة في الراس نصّها `Name`. وقول إنها عنوان لعمود.",
          hint1: '`th` بـ `scope="col"`.',
          explain: "A header cell for the name column.",
        }),
        line('          <th scope="col">Email</th>', {
          coach: "وتاني خانة نصّها `Email` بنفس الطريقة.",
          hint1: '`th` بـ `scope="col"` وجواها `Email`.',
          explain: "A header cell for the email column.",
        }),
        line("        </tr>\n      </thead>", {
          coach: "اقفل الصف والراس. سطرين.",
          hint1: "`</tr>` وفي السطر اللي بعده `</thead>`.",
          explain: "I close the header.",
        }),
        line("      <tbody>", {
          coach: "افتح جسم الجدول.",
          hint1: "tag الفتح بتاع `tbody`.",
          explain: "The body of the table.",
        }),
        line("        {users.map((u) => (", {
          coach: "لِف على المستخدمين وارسم صف لكل واحد. افتح قوس الـ JSX وقوس الـ map.",
          hint1: "قوس `{` وبعده `users.map` بـ arrow بتاخد `u` وبترجّع قوس مفتوح `(`.",
          explain: "I render one row for every user.",
        }),
        line("          <tr key={u.id}>", {
          coach: "كل صف لازم ياخد key ثابت: الـ id بتاع المستخدم.",
          hint1: "`tr` بـ `key` بقيمة `u.id`.",
          explain: "The key is the user id.",
        }),
        line("            <td>{u.name}</td>", {
          coach: "أول خانة: الاسم.",
          hint1: "`td` جواها `u.name` بين `{ }`.",
          explain: "The name cell.",
        }),
        line("            <td>{u.email}</td>", {
          coach: "وتاني خانة: الإيميل.",
          hint1: "`td` جواها `u.email` بين `{ }`.",
          explain: "The email cell.",
        }),
        line("          </tr>\n        ))}", {
          coach: "اقفل الصف، وبعده أقواس الـ map والـ JSX. سطرين.",
          hint1: "`</tr>` وفي السطر اللي بعده `))}`.",
          explain: "I close the row and the map.",
        }),
        line("      </tbody>\n    </table>\n  );\n}", {
          coach: "اقفل جسم الجدول، والجدول، وقوس الـ return، وقوس الدالة. أربع سطور.",
          hint1: "`</tbody>` وبعدين `</table>` وبعدين `);` وبعدين `}`.",
          explain: "I close the body, the table, the return and the component.",
        }),
      ],
    },
  ],
  preview: { stage: STAGE },
  checks: [
    "data: Loading... shows first, then a table with five users.",
    "The table has a caption and two column headers.",
    "empty: it shows No users.",
    "error: it shows Could not load users.",
    "Switch fast between the three: the screen always matches the last choice.",
  ],
  complexity: "One request. Render is O(n) rows.",
  idea: "أربع حالات لازم تظهر: loading و error و empty و data. والـ `res.ok` مهم لأن `fetch` مبيرميش خطأ مع 404.",
  followUps: [
    {
      question: "Why check res.ok?",
      answer: "fetch only rejects on a network error. A 404 or 500 still resolves.",
    },
    {
      question: "Why status as one value?",
      answer: "Two booleans can be true together by mistake.",
    },
  ],
};
