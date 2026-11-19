import type { ReactProblem } from "../types";
import { line } from "./react-helpers";

export const reactTodos: ReactProblem = {
  id: "react-todos",
  kind: "react",
  group: "react",
  title: "List component: add and delete items",
  difficulty: "medium",
  tag: "reported",
  statement: "Build a list where the user can add an item, delete an item, and mark an item as done.",
  askFirst: ["Should empty text be allowed?", "Are duplicates allowed?", "Do I need edit or toggle too?"],
  edgeCases: [
    "Empty or spaces-only input",
    "Deleting the last item",
    "Using the index as key breaks after a delete",
  ],
  parts: [
    {
      id: "main",
      title: "Todos",
      signature: "Todos()",
      steps: [
        line('import { useState } from "react";', {
          coach: "نبدأ يا إسلام: القايمة والنص اللي بيتكتب الاتنين state. هات الـ hook بتاعها من React.",
          hint1: '`import` بأقواس `{ }` جواها `useState`، من `"react"`.',
          explain: "I import useState for the list and for the input text.",
        }),
        line("\nexport default function Todos() {", {
          coach: "عرّف المكوّن: دالة اسمها `Todos` من غير props، وهي الـ default export.",
          hint1: "`export default function` وبعدها `Todos` بأقواس فاضية.",
          explain: "Todos is a function component with no props.",
        }),
        line("  const [todos, setTodos] = useState([]);", {
          coach: "أول state: القايمة نفسها. بتبدأ فاضية.",
          hint1: "`todos` و `setTodos` من `useState` ببداية array فاضية.",
          explain: "The list is state, and it starts empty.",
        }),
        line('  const [text, setText] = useState("");', {
          coach: "تاني state: النص اللي المستخدم بيكتبه في الـ input. كده الـ input يبقى controlled.",
          hint1: "`text` و `setText` من `useState` ببداية نص فاضي.",
          explain: "The input is controlled, so its text is state too.",
        }),
        line("\n  const add = (e) => {", {
          coach:
            "دالة الإضافة. هتتنادى لما الفورم يتبعت، فهتستقبل الـ event. سمّيها `add`.",
          hint1: "`const add` بيساوي arrow بتاخد `e`، وافتح قوسها.",
          explain: "add is the submit handler of the form.",
        }),
        line("    e.preventDefault();", {
          coach: "أول حاجة: امنع المتصفح إنه يعمل reload للصفحة لما الفورم يتبعت.",
          hint1: "الـ method اللي اسمها `preventDefault` على `e`.",
          explain: "I stop the browser from reloading the page on submit.",
        }),
        line("    if (!text.trim()) return;", {
          coach: "الـ edge case: لو النص فاضي أو مسافات بس، متضيفش حاجة واخرج.",
          hint1: "`if` على عكس `text.trim()`، و `return` في نفس السطر.",
          explain: "Empty or spaces-only text is not added.",
        }),
        line("    setTodos((list) => [...list, { id: crypto.randomUUID(), text, done: false }]);", {
          coach:
            "ضيف العنصر: array جديدة فيها كل القديم وبعده object فيه id ثابت وفريد، والنص، وإنه لسه مخلصش. متعدّلش الـ array القديمة.",
          hint1:
            "`setTodos` بـ updater بياخد `list` ويرجّع `[...list, { ... }]`. الـ object فيه `id` من `crypto.randomUUID()` و `text` و `done: false`.",
          explain: "I make a new array with the old items and one new item. Each item gets a stable id.",
        }),
        line('    setText("");\n  };', {
          coach: "وبعد الإضافة فضّي الـ input علشان يكتب اللي بعده. واقفل الدالة. سطرين.",
          hint1: "`setText` بنص فاضي، وفي السطر اللي بعده `};`.",
          explain: "Then I clear the input.",
        }),
        line("  const toggle = (id) =>", {
          coach:
            "دالة تعليم العنصر إنه خلص أو لأ. بتاخد الـ id، وهترجّع ناتج سطر واحد هنكتبه تحتها، فمن غير قوس.",
          hint1: "`const toggle` بيساوي arrow بتاخد `id`، والسطر بيخلص عند السهم.",
          explain: "toggle takes the id of the item.",
        }),
        line("    setTodos((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));", {
          coach:
            "لِف على القايمة واعمل array جديدة: العنصر اللي الـ id بتاعه مطابق يتنسخ ويتعكس فيه `done`، والباقي يرجع زي ما هو. هنا `map` مسموح لأنه في React وبيرجّع array جديدة.",
          hint1:
            "`setTodos` بـ updater بيرجّع `list.map`. جوه الـ map شرط ternary: لو `t.id === id` رجّع `{ ...t, done: !t.done }`، غير كده `t`.",
          explain: "I map to a new array. Only the matching item is copied with done flipped.",
        }),
        line("  const remove = (id) => setTodos((list) => list.filter((t) => t.id !== id));", {
          coach:
            "دالة المسح في سطر واحد: array جديدة فيها كل العناصر ما عدا اللي الـ id بتاعه مطابق.",
          hint1: "`const remove` arrow بتاخد `id` وبتنادي `setTodos` بـ updater بيرجّع `list.filter` بشرط `t.id !== id`.",
          explain: "remove filters the item out and returns a new array.",
        }),
        line("\n  return (\n    <form onSubmit={add}>", {
          coach:
            "ابدأ الـ JSX: افتح قوس الـ return، وخلّي الأب فورم حقيقي بيتبعت لدالة الإضافة. كده Enter في الـ input بيضيف من غير كود زيادة. سطرين.",
          hint1: "`return (` وفي السطر اللي بعده `form` بـ `onSubmit` بقيمة `add`.",
          explain: "A real form, so pressing Enter adds the item.",
        }),
        line('      <label htmlFor="new">New todo</label>', {
          coach:
            "كل input لازم يكون ليه label علشان الـ accessibility. اعمل label نصّه `New todo` ومربوط بـ input الـ id بتاعه `new`.",
          hint1: '`label` بـ `htmlFor` بقيمة `"new"`، وجواها النص.',
          explain: "The input has a real label, linked by id.",
        }),
        line('      <input id="new" value={text} onChange={(e) => setText(e.target.value)} />', {
          coach:
            "الـ input نفسه: نفس الـ id اللي في الـ label، وقيمته من الـ state، وكل تغيير بيحدّث الـ state.",
          hint1: '`input` بـ `id="new"` و `value={text}` و `onChange` بتنادي `setText` بـ `e.target.value`. واقفله بـ `/>`.',
          explain: "The input reads its value from state and writes every change back.",
        }),
        line('      <button type="submit">Add</button>', {
          coach: "زرار نصّه `Add` بيبعت الفورم.",
          hint1: '`button` بـ `type="submit"`.',
          explain: "A submit button sends the form.",
        }),
        line("      <ul>", {
          coach: "افتح القايمة اللي هتعرض العناصر.",
          hint1: "tag الفتح بتاع `ul`.",
          explain: "The items go in a list element.",
        }),
        line("        {todos.map((t) => (", {
          coach: "جوه القايمة لِف على العناصر وارسم كل واحد. افتح قوس الـ JSX وقوس الـ map.",
          hint1: "قوس `{` وبعده `todos.map` بـ arrow بتاخد `t` وبترجّع قوس مفتوح `(`.",
          explain: "I render one row for every item.",
        }),
        line("          <li key={t.id}>", {
          coach:
            "كل عنصر في `li`، ولازم ياخد key. استخدم الـ id الثابت مش الـ index، علشان المسح ميلخبطش React.",
          hint1: "`li` بـ `key` بقيمة `t.id`.",
          explain: "The key is the stable id, not the index.",
        }),
        line('            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />', {
          coach: "checkbox بيعرض العنصر خلص ولا لأ، وأي ضغطة عليه بتنادي دالة التعليم بالـ id.",
          hint1: '`input` بـ `type="checkbox"` و `checked={t.done}` و `onChange` بتنادي `toggle(t.id)`. واقفله بـ `/>`.',
          explain: "A checkbox shows done and calls toggle.",
        }),
        line("            {t.text}", {
          coach: "وبعده نص العنصر.",
          hint1: "`t.text` بين `{ }`.",
          explain: "Then the text of the item.",
        }),
        line('            <button type="button" onClick={() => remove(t.id)}>Delete</button>', {
          coach:
            "وزرار نصّه `Delete` بيمسح العنصر. خد بالك: إحنا جوه فورم، فلازم تحدد نوعه علشان ميبعتش الفورم.",
          hint1: '`button` بـ `type="button"` و `onClick` بتنادي `remove(t.id)`.',
          explain: "Delete has type button, so it does not submit the form.",
        }),
        line("          </li>\n        ))}", {
          coach: "اقفل الـ `li`، وبعده أقواس الـ map والـ JSX. سطرين.",
          hint1: "`</li>` وفي السطر اللي بعده `))}`.",
          explain: "I close the row and the map.",
        }),
        line("      </ul>\n    </form>\n  );\n}", {
          coach: "اقفل القايمة، والفورم، وقوس الـ return، وقوس الدالة. أربع سطور.",
          hint1: "`</ul>` وبعدين `</form>` وبعدين `);` وبعدين `}`.",
          explain: "I close the list, the form, the return and the component.",
        }),
      ],
    },
  ],
  preview: {},
  checks: [
    "Type a text and press Enter: the item is added and the input is cleared.",
    "The Add button does the same.",
    "Empty text or only spaces: nothing is added.",
    "The checkbox marks one item as done, and only that item.",
    "Delete removes the right item, also when it is the last one.",
    "Add three items and delete the middle one: the other two keep their checkbox state.",
  ],
  complexity: "Add is O(1) plus the copy. Delete is O(n).",
  idea: "هنا `map` و `filter` جوه React عادي لأنهم بيرجّعوا array جديدة ومبيعدّلوش الـ state. المهم: id ثابت للـ key، وفورم بـ label.",
  followUps: [
    {
      question: "Why not the index as the key?",
      answer: "After a delete the indexes shift, so React matches the wrong items.",
    },
    {
      question: "Why a new array and not push?",
      answer: "React compares references. A mutated array is the same reference, so it may not re-render.",
    },
  ],
};
