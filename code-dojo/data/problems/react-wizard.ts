import type { ReactProblem } from "../types";
import { line } from "./react-helpers";

/** The form gets its onSubmit from outside. The preview shows what it was called with. */
const STAGE = `import { useState } from "react";

export function Stage({ Solution }) {
  const [sent, setSent] = useState(null);

  return (
    <>
      <Solution onSubmit={setSent} />
      <p className="dojo-stage-note">
        {sent ? "onSubmit was called with: " + JSON.stringify(sent) : "onSubmit was not called yet."}
      </p>
    </>
  );
}
`;

export const reactWizard: ReactProblem = {
  id: "react-wizard",
  kind: "react",
  group: "react",
  title: "Multi-step form with validation",
  difficulty: "hard",
  tag: "likely",
  statement: "Build a form with several steps, Next and Back, and validation on each step.",
  askFirst: [
    "How many steps and which fields?",
    "Validate on Next, or while typing?",
    "Should the data be kept when going back?",
  ],
  edgeCases: [
    "Next with invalid data: stay and show the error",
    "Back must keep the values",
    "Submit only on the last step",
  ],
  parts: [
    {
      id: "main",
      title: "Wizard",
      signature: "Wizard({ onSubmit })",
      steps: [
        line('import { useState } from "react";', {
          coach: "نبدأ يا إسلام: الفورم كله state. هات الـ hook بتاعها من React.",
          hint1: '`import` بأقواس `{ }` جواها `useState`، من `"react"`.',
          explain: "I import useState. The whole form is state.",
        }),
        line("\nconst steps = [", {
          coach:
            "الفكرة الأساسية: الخطوات مش مكتوبة جوه الـ JSX، دي config في array برّه المكوّن. كده إضافة خطوة جديدة تبقى سطر واحد. افتح array اسمها `steps`.",
          hint1: "`const steps` بيساوي قوس array مفتوح.",
          explain: "The steps are config data in an array, outside the component.",
        }),
        line('  { field: "name", label: "Name", check: (v) => (v.trim() ? "" : "Name is required") },', {
          coach:
            "أول خطوة: object فيه اسم الحقل `name`، والعنوان اللي يظهر `Name`، ودالة فحص بتاخد القيمة وترجّع نص فاضي لو سليمة، أو الرسالة `Name is required` لو فاضية.",
          hint1:
            "object فيه `field` و `label` و `check`. الـ `check` arrow بتاخد `v` وبترجّع ternary على `v.trim()`. والسطر بيخلص بفاصلة.",
          explain: "Each step has a field, a label and a check function. The check returns an error message, or an empty string.",
        }),
        line('  { field: "email", label: "Email", check: (v) => (v.includes("@") ? "" : "Email is not valid") },', {
          coach:
            "تاني خطوة بنفس الشكل: الحقل `email`، والعنوان `Email`، والفحص إن القيمة فيها علامة `@`، والرسالة `Email is not valid`.",
          accept: [
            '{ field: "email", label: "Email", check: (v) => (v.includes("@") ? "" : "Email is not valid") }',
          ],
          hint1: 'نفس السطر اللي فات، بس الشرط `v.includes("@")`.',
          explain: "The email step checks that the value has an at sign.",
        }),
        line("];", {
          coach: "اقفل الـ array.",
          hint1: "قوس الـ array وبعده semicolon.",
          explain: "That is the config.",
        }),
        line("\nexport default function Wizard({ onSubmit }) {", {
          coach:
            "عرّف المكوّن: دالة اسمها `Wizard` وهي الـ default export. بتاخد prop واحدة: الدالة اللي هتتنادى بكل القيم في الآخر.",
          hint1: "`export default function` اسمها `Wizard`، وبتاخد `onSubmit` بالـ destructuring.",
          explain: "Wizard takes one prop, onSubmit.",
        }),
        line("  const [index, setIndex] = useState(0);", {
          coach: "أول state: رقم الخطوة الحالية. بنبدأ من أول خطوة.",
          hint1: "`index` و `setIndex` من `useState` ببداية 0.",
          explain: "index is the current step.",
        }),
        line('  const [values, setValues] = useState({ name: "", email: "" });', {
          coach:
            "تاني state: قيم كل الحقول في object واحد. كده لما المستخدم يرجع لورا يلاقي اللي كتبه، والإرسال يبعت كله مرة واحدة.",
          hint1: "`values` و `setValues` من `useState` ببداية object فيه `name` و `email` بنصوص فاضية.",
          explain: "All values live in one object, so they survive when the user goes back.",
        }),
        line('  const [error, setError] = useState("");', {
          coach: "تالت state: رسالة الخطأ الحالية. نص فاضي معناه مفيش خطأ.",
          hint1: "`error` و `setError` من `useState` ببداية نص فاضي.",
          explain: "error holds the current message. Empty means no error.",
        }),
        line("\n  const step = steps[index];", {
          coach: "دلوقتي قيم محسوبة مش state. الأولى: الـ config بتاع الخطوة الحالية. سمّيها `step`.",
          hint1: "`const step` بيساوي `steps` عند `index`.",
          explain: "step is computed from index. It is not stored.",
        }),
        line("  const isLast = index === steps.length - 1;", {
          coach: "والتانية: هل إحنا في آخر خطوة؟ سمّيها `isLast`.",
          hint1: "`const isLast` بيساوي مقارنة `index` بـ `steps.length - 1` بـ `===`.",
          explain: "isLast says if this is the last step.",
        }),
        line("\n  function next(e) {", {
          coach:
            "دالة واحدة للزرار الأساسي، سواء Next أو Submit. بتتنادى لما الفورم يتبعت، فبتستقبل الـ event. سمّيها `next`.",
          hint1: "`function` اسمها `next` بتاخد `e`.",
          explain: "next is the submit handler for every step.",
        }),
        line("    e.preventDefault();", {
          coach: "امنع المتصفح إنه يعمل reload.",
          hint1: "الـ method اللي اسمها `preventDefault` على `e`.",
          explain: "I stop the browser from reloading the page.",
        }),
        line("    const message = step.check(values[step.field]);", {
          coach:
            "افحص قيمة الحقل الحالي بدالة الفحص بتاعة الخطوة، وخزّن الناتج في `message`.",
          hint1: "`const message` بيساوي `step.check` على `values[step.field]`.",
          explain: "I validate the current field with the check of this step.",
        }),
        line("    if (message) return setError(message);", {
          coach:
            "الـ edge case: لو فيه رسالة يبقى القيمة غلط. اعرض الرسالة واخرج من غير ما تتحرك من الخطوة. في سطر واحد.",
          hint1: "`if` على `message`، و `return` لنداء `setError(message)`.",
          explain: "With an error I show the message and stay on this step.",
        }),
        line('    setError("");', {
          coach: "لو وصلنا هنا يبقى القيمة سليمة. امسح أي خطأ قديم.",
          hint1: "`setError` بنص فاضي.",
          explain: "The value is fine, so I clear the error.",
        }),
        line("    if (isLast) onSubmit(values);", {
          coach: "لو دي آخر خطوة: ابعت كل القيم للـ prop.",
          hint1: "`if` على `isLast`، وبعدها نداء `onSubmit` بـ `values`.",
          explain: "On the last step I submit all the values.",
        }),
        line("    else setIndex(index + 1);\n  }", {
          coach: "غير كده: روح للخطوة اللي بعدها. واقفل الدالة. سطرين.",
          hint1: "`else` وبعدها `setIndex` بـ `index + 1`، وفي السطر اللي بعده `}`.",
          explain: "Otherwise I go to the next step.",
        }),
        line("\n  return (\n    <form onSubmit={next}>", {
          coach:
            "ابدأ الـ JSX: افتح قوس الـ return، وخلّي الأب فورم حقيقي بيتبعت للدالة اللي كتبتها. سطرين.",
          hint1: "`return (` وفي السطر اللي بعده `form` بـ `onSubmit` بقيمة `next`.",
          explain: "A real form, so Enter moves to the next step.",
        }),
        line("      <p>Step {index + 1} of {steps.length}</p>", {
          coach:
            "عرّف المستخدم هو فين: فقرة نصّها `Step` وبعدها رقم الخطوة بالعدّ من واحد، وبعدها `of` وعدد الخطوات.",
          hint1: "`p` جواها `Step` وبعده `{index + 1}` وبعده `of` وبعده `{steps.length}`.",
          explain: "I show which step this is.",
        }),
        line("      <label htmlFor={step.field}>{step.label}</label>", {
          coach: "label للحقل الحالي: مربوط باسم الحقل، ونصّه العنوان اللي في الـ config.",
          hint1: "`label` بـ `htmlFor` بقيمة `step.field`، وجواها `step.label` بين `{ }`.",
          explain: "The label comes from the config and is linked to the input.",
        }),
        line("      <input", {
          coach: "الـ input ليه كذا خاصية، فهنكتبه على كذا سطر. افتح الـ tag بس.",
          hint1: "علامة `<` وبعدها `input`، من غير قفل.",
          explain: "One input is reused for every step.",
        }),
        line("        id={step.field}", {
          coach: "أول خاصية: الـ id، ولازم يطابق اللي في الـ label.",
          hint1: "`id` بقيمة `step.field`.",
          explain: "The id matches the label.",
        }),
        line("        value={values[step.field]}", {
          coach: "تاني خاصية: القيمة، من الـ object عند اسم الحقل الحالي.",
          hint1: "`value` بقيمة `values[step.field]`.",
          explain: "The value comes from the values object.",
        }),
        line("        onChange={(e) => setValues({ ...values, [step.field]: e.target.value })}", {
          coach:
            "تالت خاصية: مع كل تغيير اعمل object جديد فيه كل القيم القديمة، وغيّر الحقل الحالي بس. اسم الحقل متغير، فهتحتاج computed key.",
          hint1:
            "`onChange` بـ arrow بتاخد `e` وبتنادي `setValues` بـ `{ ...values, [step.field]: e.target.value }`.",
          explain: "On change I copy the values and replace only the current field.",
        }),
        line('        aria-invalid={error ? "true" : "false"}', {
          coach:
            "رابع خاصية للـ accessibility: قول لقارئ الشاشة إن القيمة غلط لما يكون فيه خطأ. القيمة نص: `true` أو `false`.",
          hint1: '`aria-invalid` بقيمة ternary على `error`: `"true"` أو `"false"`.',
          explain: "aria-invalid tells a screen reader that the value is wrong.",
        }),
        line("      />", {
          coach: "اقفل الـ input.",
          hint1: "`/>`.",
          explain: "I close the input.",
        }),
        line('      {error && <p role="alert">{error}</p>}', {
          coach:
            "لو فيه رسالة خطأ اعرضها في فقرة، وخلّي قارئ الشاشة يعلن عنها كتنبيه. ولو مفيش متعرضش حاجة.",
          hint1: '`{error && ...}` وجواها `p` بـ `role="alert"` فيها `{error}`.',
          explain: "The error shows only when there is one, with role alert.",
        }),
        line("      {index > 0 && (", {
          coach: "زرار الرجوع يظهر بس لو مش في أول خطوة. افتح الشرط وقوس.",
          hint1: "`{index > 0 && (`.",
          explain: "Back is shown from the second step on.",
        }),
        line(
          '        <button type="button" onClick={() => { setError(""); setIndex(index - 1); }}>Back</button>',
          {
            coach:
              "الزرار نفسه نصّه `Back`. نوعه لازم يتحدد علشان ميبعتش الفورم. ولما يتضغط يمسح الخطأ ويرجع خطوة، والقيم بتفضل زي ما هي.",
            hint1:
              '`button` بـ `type="button"` و `onClick` فيه arrow بجسم فيه نداءين: `setError("")` وبعده `setIndex(index - 1)`.',
            explain: "Back clears the error and goes one step back. The values stay.",
          },
        ),
        line("      )}", {
          coach: "اقفل قوس الشرط.",
          hint1: "`)}`.",
          explain: "I close the condition.",
        }),
        line('      <button type="submit">{isLast ? "Submit" : "Next"}</button>', {
          coach:
            "والزرار الأساسي بيبعت الفورم، ونصّه بيتغير: `Submit` في آخر خطوة، و `Next` قبل كده.",
          hint1: '`button` بـ `type="submit"`، وجواه ternary على `isLast`.',
          explain: "The main button is a submit button. Its text depends on the step.",
        }),
        line("    </form>\n  );\n}", {
          coach: "اقفل الفورم، وقوس الـ return، وقوس الدالة. تلات سطور.",
          hint1: "`</form>` وبعدين `);` وبعدين `}`.",
          explain: "I close the form, the return and the component.",
        }),
      ],
    },
  ],
  preview: { stage: STAGE },
  checks: [
    "Step 1 of 2 shows first, with no Back button.",
    "Next with an empty name: it stays on step 1 and shows Name is required.",
    "With a name, Next goes to step 2, and the button says Submit.",
    "Submit with a wrong email: it stays and shows Email is not valid.",
    "Back goes to step 1, the name is still there, and the error is gone.",
    "With a valid email, Submit calls onSubmit with both values.",
  ],
  complexity: "O(1) per step.",
  idea: "الفكرة: الخطوات في array من الـ config، والقيم كلها في object واحد علشان Back يحافظ عليها.",
  followUps: [
    {
      question: "Why keep all values in one object?",
      answer: "So the data survives when the user goes back, and the submit sends everything at once.",
    },
    {
      question: "How do you add a third step?",
      answer: "One more object in the steps array, and one more key in the first values. The component does not change.",
    },
    {
      question: "How would you validate while typing?",
      answer: "I run the check of the step in onChange, and I show the error after the first blur.",
    },
  ],
};
