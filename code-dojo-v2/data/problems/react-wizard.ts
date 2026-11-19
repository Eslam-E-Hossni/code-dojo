import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

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

const tests: TestCase[] = [
  {
    id: "first-screen",
    name: "starts on step 1, with the Name input and a Next button, and with no Back button",
    code: `
render(<Wizard onSubmit={jest.fn()} />);
expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
expect(screen.getByLabelText("Name")).toHaveValue("");
expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
expect(screen.queryByText("Name is required")).not.toBeInTheDocument();`,
  },
  {
    id: "name-required",
    name: "edge case: Next with an empty name, or with only spaces, stays on step 1 and shows Name is required",
    code: `
const user = userEvent.setup();
render(<Wizard onSubmit={jest.fn()} />);
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.getByText("Name is required")).toBeInTheDocument();
expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
expect(screen.getByLabelText("Name")).toBeInTheDocument();
await user.type(screen.getByLabelText("Name"), "   ");
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.getByText("Name is required")).toBeInTheDocument();
expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();`,
  },
  {
    id: "next-step",
    name: "with a name, Next goes to step 2, and the button says Submit",
    code: `
const user = userEvent.setup();
render(<Wizard onSubmit={jest.fn()} />);
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
expect(screen.getByLabelText("Email")).toHaveValue("");
expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();`,
  },
  {
    id: "error-goes-away",
    name: "after an error, a valid name goes to step 2 and the error is gone",
    code: `
const user = userEvent.setup();
render(<Wizard onSubmit={jest.fn()} />);
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.getByText("Name is required")).toBeInTheDocument();
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
expect(screen.queryByText("Name is required")).not.toBeInTheDocument();`,
  },
  {
    id: "enter-key",
    name: "Enter in the input works like the Next and the Submit button",
    code: `
const user = userEvent.setup();
const onSubmit = jest.fn();
render(<Wizard onSubmit={onSubmit} />);
await user.type(screen.getByLabelText("Name"), "Sara");
await user.keyboard("{Enter}");
expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
await user.type(screen.getByLabelText("Email"), "sara@example.com");
await user.keyboard("{Enter}");
expect(onSubmit).toHaveBeenCalledTimes(1);
expect(onSubmit).toHaveBeenCalledWith({ name: "Sara", email: "sara@example.com" });`,
  },
  {
    id: "email-not-valid",
    name: "edge case: Submit with a wrong email stays on step 2 and shows Email is not valid",
    code: `
const user = userEvent.setup();
render(<Wizard onSubmit={jest.fn()} />);
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(screen.getByText("Email is not valid")).toBeInTheDocument();
expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
await user.type(screen.getByLabelText("Email"), "sara.example.com");
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(screen.getByText("Email is not valid")).toBeInTheDocument();
expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
expect(screen.getByLabelText("Email")).toHaveValue("sara.example.com");`,
  },
  {
    id: "back-keeps-values",
    name: "Back goes to step 1, the typed values are still there, and the error is gone",
    code: `
const user = userEvent.setup();
render(<Wizard onSubmit={jest.fn()} />);
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
await user.type(screen.getByLabelText("Email"), "wrong");
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(screen.getByText("Email is not valid")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Back" }));
expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
expect(screen.getByLabelText("Name")).toHaveValue("Sara");
expect(screen.queryByText("Email is not valid")).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
expect(screen.getByLabelText("Email")).toHaveValue("wrong");`,
  },
  {
    id: "submit-values",
    name: "with a valid email, Submit calls onSubmit once, with both values",
    code: `
const user = userEvent.setup();
const onSubmit = jest.fn();
render(<Wizard onSubmit={onSubmit} />);
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
expect(onSubmit).not.toHaveBeenCalled();
await user.type(screen.getByLabelText("Email"), "sara@example.com");
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(onSubmit).toHaveBeenCalledTimes(1);
expect(onSubmit).toHaveBeenCalledWith({ name: "Sara", email: "sara@example.com" });
expect(screen.queryByText("Email is not valid")).not.toBeInTheDocument();`,
  },
  {
    id: "no-submit-when-not-valid",
    name: "edge case: onSubmit is not called while a step is not valid",
    code: `
const user = userEvent.setup();
const onSubmit = jest.fn();
render(<Wizard onSubmit={onSubmit} />);
await user.click(screen.getByRole("button", { name: "Next" }));
expect(onSubmit).not.toHaveBeenCalled();
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(onSubmit).not.toHaveBeenCalled();
await user.type(screen.getByLabelText("Email"), "no at sign");
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(onSubmit).not.toHaveBeenCalled();
await user.clear(screen.getByLabelText("Email"));
await user.type(screen.getByLabelText("Email"), "sara@example.com");
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(onSubmit).toHaveBeenCalledTimes(1);`,
  },
  {
    id: "back-does-not-submit",
    name: "Back does not send the form: onSubmit is not called",
    code: `
const user = userEvent.setup();
const onSubmit = jest.fn();
render(<Wizard onSubmit={onSubmit} />);
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
await user.type(screen.getByLabelText("Email"), "sara@example.com");
await user.click(screen.getByRole("button", { name: "Back" }));
expect(onSubmit).not.toHaveBeenCalled();
expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
expect(screen.getByLabelText("Name")).toHaveValue("Sara");`,
  },
  {
    id: "error-for-screen-readers",
    name: "the error has role alert, and the input has aria-invalid only while the error shows",
    code: `
const user = userEvent.setup();
render(<Wizard onSubmit={jest.fn()} />);
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid", "true");
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
await user.type(screen.getByLabelText("Name"), "Sara");
await user.click(screen.getByRole("button", { name: "Next" }));
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid", "true");
await user.click(screen.getByRole("button", { name: "Submit" }));
expect(screen.getByRole("alert")).toHaveTextContent("Email is not valid");
expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");`,
  },
];

export const reactWizard: CodeProblem = {
  id: "react-wizard",
  kind: "code",
  group: "react",
  title: "Multi-step form with validation",
  difficulty: "hard",
  tag: "likely",
  language: "jsx",
  api: ["Wizard"],
  plainLoops: false,
  statement: "Build a form with several steps, Next and Back, and validation on each step.",
  askFirst: ["How many steps and which fields?", "Validate on Next, or while typing?", "Should the data be kept when going back?"],
  edgeCases: ["Next with invalid data: stay and show the error", "Back must keep the values", "Submit only on the last step"],
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: { stage: STAGE },
    screen: [
      'The text "Step 1 of 2" on the first step and "Step 2 of 2" on the second',
      'One text input: with the label "Name" on step 1, and with the label "Email" on step 2',
      'Step 1 has the button "Next". Step 2 has the buttons "Back" and "Submit"',
      'The error messages "Name is required" and "Email is not valid", in an element with role="alert"',
      'aria-invalid="true" on the input while an error shows',
    ],
    tryIt: [
      "Step 1 of 2 shows first, with no Back button.",
      "Next with an empty name: it stays on step 1 and shows Name is required.",
      "With a name, Next goes to step 2, and the button says Submit.",
      "Submit with a wrong email: it stays and shows Email is not valid.",
      "Back goes to step 1, the name is still there, and the error is gone.",
      "With a valid email, Submit calls onSubmit with both values.",
    ],
  },
  parts: [
    {
      id: "main",
      title: "Wizard",
      signature: "Wizard({ onSubmit })",
      steps: [
        line('import { useState } from "react";', {
          coach:
            "Let's start, Islam. The current step, the typed values and the error all change on the page, so we need the hook that keeps a value between renders.",
          hint1: 'Import `useState` from `"react"`.',
          explain: "I import useState, because the whole form lives in state.",
        }),
        line("const steps = [", {
          coach:
            "The main idea: the steps are data, and they live outside the component, so one piece of markup can serve every step. Adding a step later is then one more entry, so we open a list for them.",
          hint1: "A `const` named `steps` that holds an array. This line only opens the array.",
          explain: "The steps are config data in an array, outside the component.",
        }),
        line('  { field: "name", label: "Name", check: (v) => (v.trim() ? "" : "Name is required") },', {
          coach:
            "The first step asks for the name. Its entry holds three things: the key of the value, the label to show, and a function that checks the value and returns an error message, or an empty string when it is fine.",
          hint1:
            'An object with `field`, `label` and `check`. `check` is an arrow function that takes `v` and uses a ternary on `v.trim()`. The message is "Name is required".',
          explain: "Each step has a field, a label and a check function, and check returns an error message or an empty string.",
        }),
        line('  { field: "email", label: "Email", check: (v) => (v.includes("@") ? "" : "Email is not valid") },', {
          coach: "The second step asks for the email, with the same three things. Here the value is fine when it has an at sign in it.",
          hint1: 'The same shape as the line before. The test is `v.includes("@")`, and the message is "Email is not valid".',
          explain: "The email step checks that the value has an at sign.",
        }),
        line("];", {
          coach: "That is every step, so we close the list.",
          hint1: "A closing bracket and a semicolon.",
          explain: "The array of steps ends here.",
        }),
        line("export default function Wizard({ onSubmit }) {", {
          coach:
            "Now the component. The parent decides what happens with the finished data, so it passes a callback as a prop, and the preview and the tests need the component as the default export.",
          hint1: "`export default function` with the name `Wizard`. Take `onSubmit` out of the props, in the parameter list.",
          explain: "Wizard is the default export, and it takes one prop, the onSubmit callback.",
        }),
        line("  const [index, setIndex] = useState(0);", {
          coach: "The component must remember which step the user is on. We keep the position in the list of steps, and it starts at the first one.",
          hint1: "Call `useState` with 0. Name the value `index` and the setter `setIndex`.",
          explain: "index is the position of the current step, and it starts at 0.",
        }),
        line('  const [values, setValues] = useState({ name: "", email: "" });', {
          coach:
            "It must also remember what the user typed in every step. We keep all of it in one object, so nothing is lost when the user goes back, and the end can send it all in one call.",
          hint1: "Call `useState` with an object that has `name` and `email`, both as empty strings.",
          explain: "All the values live in one object, so they survive when the user goes back.",
        }),
        line('  const [error, setError] = useState("");', {
          coach: "The third piece of state is the error message to show. When it is empty, there is no error.",
          hint1: "Call `useState` with an empty string. Name the value `error` and the setter `setError`.",
          explain: "error holds the current message, and an empty string means no error.",
        }),
        line("  const step = steps[index];", {
          coach: "Some values we can work out from state, so we do not store them. The first one is the config of the step we are on.",
          hint1: "Read from `steps` at `index`, and keep the result in a `const` named `step`.",
          explain: "step is computed from index on every render, so it is not stored in state.",
        }),
        line("  const isLast = index === steps.length - 1;", {
          coach: "The second computed value answers one question: is this the last step? The button text and the submit both depend on it.",
          hint1: "Compare `index` with the last position, which is `steps.length` minus 1. Keep the result in a `const` named `isLast`.",
          explain: "isLast is true when the current step is the last one.",
        }),
        line("  function next(e) {", {
          coach: "Now one handler for the main button, on every step. It runs when the form is sent, so it gets the event.",
          hint1: "A `function` declaration named `next` with one parameter, `e`.",
          explain: "next is the submit handler of the form, for every step.",
        }),
        line("    e.preventDefault();", {
          coach: "A browser reloads the page when a form is sent, and then our state is lost. We stop that first.",
          hint1: "The event has a method for this: `preventDefault`.",
          explain: "I stop the browser from reloading the page on submit.",
        }),
        line("    const message = step.check(values[step.field]);", {
          coach: "Before we move we must validate. We run the check of this step on the value of this step, and we keep the answer.",
          hint1:
            "The step has its own `check` function. Give it the value of this step, which is in `values` under the key `step.field`, and keep the result in `message`.",
          explain: "I validate the current value with the check function of this step.",
        }),
        line("    if (message) return setError(message);", {
          coach: "Here is the edge case: the value is not valid. Then we show the message and leave the handler, so the user stays on this step.",
          hint1: "An `if` on `message`. On the same line, `return` the call to `setError`.",
          explain: "With an error I show the message and return, so the form stays on this step.",
        }),
        line('    setError("");', {
          coach: "If we get here, the value is fine. An old error can still be on the page, so we remove it.",
          hint1: "Call `setError` with an empty string.",
          explain: "The value is valid, so I clear any old error.",
        }),
        line("    if (isLast) onSubmit(values);", {
          coach: "Now there are two ways to go on. On the last step the form is finished, so we hand all the values to the parent.",
          hint1: "An `if` on `isLast` that calls `onSubmit` with `values`.",
          explain: "On the last step I call onSubmit with all the values.",
        }),
        line("    else setIndex(index + 1);\n  }", {
          coach: "On any other step we move one step forward, and then the handler ends. Two lines.",
          hint1: "An `else` that calls `setIndex` with `index` plus 1. Then a closing brace on the next line.",
          explain: "If it is not the last step, the index goes up by 1 and the next step shows.",
        }),
        line("  return (\n    <form onSubmit={next}>", {
          coach:
            "Now the markup: the root is a real form that runs `next`, because then Enter in the input works like the main button. Two lines.",
          hint1: "`return` with an opening parenthesis, then an opening `form` tag with `onSubmit` set to `next`.",
          explain: "The root is a real form, so pressing Enter moves to the next step.",
        }),
        line("      <p>Step {index + 1} of {steps.length}</p>", {
          coach: "The user should know where they are in the form. We show the number of this step, counted from 1, and how many steps there are.",
          hint1: "A `p` with the words Step and of. After Step comes `index` plus 1 in braces, and after of comes `steps.length` in braces.",
          explain: "The paragraph shows which step this is, for example Step 1 of 2.",
        }),
        line("      <label htmlFor={step.field}>{step.label}</label>", {
          coach:
            "The input needs a label, so a screen reader can say what the field is for. Its text and its link to the input both come from the config of this step.",
          hint1: "A `label` with `htmlFor` set to `step.field`. Its text is `step.label` in braces.",
          explain: "The label text comes from the config, and htmlFor links it to the input.",
        }),
        line("      <input", {
          coach: "One input serves every step. It has several attributes, so we write one on each line and start with only the opening of the tag.",
          hint1: "An opening angle bracket and the tag name `input`, with nothing after it.",
          explain: "One input is used again for every step.",
        }),
        line("        id={step.field}", {
          coach: "The label points to an id, so the input must carry the same one.",
          hint1: "The `id` attribute, set to `step.field`.",
          explain: "The id is the same as the htmlFor of the label, so the two are linked.",
        }),
        line("        value={values[step.field]}", {
          coach: "The input must show what the user typed for this step, also after Back. So it reads from our object of values.",
          hint1: "The `value` attribute. Read from `values` with the key `step.field`.",
          explain: "The input shows the value of the current field from the values object.",
        }),
        line("        onChange={(e) => setValues({ ...values, [step.field]: e.target.value })}", {
          coach:
            "Each change must save the new text. We make a new object with all the old values and replace only the field of this step, and the name of that field is in a variable.",
          hint1: "`onChange` calls `setValues` with a new object: spread `values`, then the computed key `[step.field]` with `e.target.value`.",
          explain: "On every change I copy the values and replace only the current field, with a computed key.",
        }),
        line('        aria-invalid={error ? "true" : "false"}', {
          coach: "A screen reader does not see a red message. So the input itself must say when its value is wrong.",
          hint1: 'The attribute is `aria-invalid`. A ternary on `error` gives `"true"` or `"false"`.',
          explain: "aria-invalid tells a screen reader that the value of the input is wrong.",
        }),
        line("      />", {
          coach: "The input has all its attributes, and it has no children. So we close the tag right here.",
          hint1: "A slash and a closing angle bracket.",
          explain: "The input tag closes itself, because an input has no children.",
        }),
        line('      {error && <p role="alert">{error}</p>}', {
          coach: "The user must also see the message. We show it only when there is one, in a way that makes a screen reader read it immediately.",
          hint1: 'Braces with `error`, then `&&`, then a `p` that shows `error`. The attribute `role="alert"` makes a screen reader read it.',
          explain: "The error paragraph shows only when there is a message, and role alert makes a screen reader read it.",
        }),
        line("      {index > 0 && (", {
          coach: "The user can go back, but not from the first step. So the Back button shows only after the first step.",
          hint1: "Braces with the test that `index` is more than 0. Then `&&` and an opening parenthesis.",
          explain: "The Back button shows from the second step on.",
        }),
        line('        <button type="button" onClick={() => { setError(""); setIndex(index - 1); }}>Back</button>', {
          coach:
            "Now the Back button itself: it must not send the form. A click removes the error and moves one step back, and the typed values stay as they are.",
          hint1:
            'A `button` with `type="button"` and the text Back. Its `onClick` is an arrow function with a body of two calls: `setError` with an empty string, then `setIndex` with `index` minus 1.',
          explain: "Back has type button so it does not submit, and it clears the error and goes one step back.",
        }),
        line("      )}", {
          coach: "The button is written, so we close the condition around it.",
          hint1: "A closing parenthesis and a closing brace.",
          explain: "The condition around the Back button ends here.",
        }),
        line('      <button type="submit">{isLast ? "Submit" : "Next"}</button>', {
          coach:
            "Then comes the main button, which sends the form. Its text must tell the user what a click does: finish on the last step, or go forward before that.",
          hint1: 'A `button` with `type="submit"`. Its text is a ternary on `isLast`: `"Submit"` or `"Next"`.',
          explain: "The main button is a submit button, and it says Submit on the last step and Next before it.",
        }),
        line("    </form>\n  );\n}", {
          coach: "Last, we close what is still open: the form, the return, and the component. Three lines.",
          hint1: "A closing `form` tag, then a closing parenthesis with a semicolon, then a closing brace.",
          explain: "The form ends first, then the return, and then Wizard.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1) per step.",
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
