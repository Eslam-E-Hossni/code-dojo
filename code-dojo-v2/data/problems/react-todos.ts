import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "add-button",
    name: "the Add button adds the item, with a checkbox that is not checked and a Delete button",
    code: `
const user = userEvent.setup();
render(<Todos />);
expect(screen.queryAllByRole("listitem")).toHaveLength(0);
await user.type(screen.getByLabelText("New todo"), "milk");
await user.click(screen.getByRole("button", { name: "Add" }));
const items = screen.getAllByRole("listitem");
expect(items).toHaveLength(1);
expect(items[0]).toHaveTextContent("milk");
expect(within(items[0]).getByRole("checkbox")).not.toBeChecked();
expect(within(items[0]).getByRole("button", { name: "Delete" })).toBeInTheDocument();`,
  },
  {
    id: "add-enter",
    name: "Enter in the input adds the item",
    code: `
const user = userEvent.setup();
render(<Todos />);
await user.type(screen.getByLabelText("New todo"), "bread");
await user.keyboard("{Enter}");
const items = screen.getAllByRole("listitem");
expect(items).toHaveLength(1);
expect(items[0]).toHaveTextContent("bread");`,
  },
  {
    id: "clears-input",
    name: "the input is cleared after adding, and the next item goes below the first",
    code: `
const user = userEvent.setup();
render(<Todos />);
await user.type(screen.getByLabelText("New todo"), "milk");
await user.click(screen.getByRole("button", { name: "Add" }));
expect(screen.getByLabelText("New todo")).toHaveValue("");
await user.type(screen.getByLabelText("New todo"), "bread");
await user.keyboard("{Enter}");
expect(screen.getByLabelText("New todo")).toHaveValue("");
const items = screen.getAllByRole("listitem");
expect(items).toHaveLength(2);
expect(items[0]).toHaveTextContent("milk");
expect(items[1]).toHaveTextContent("bread");`,
  },
  {
    id: "empty-or-spaces",
    name: "edge case: empty text or only spaces add nothing",
    code: `
const user = userEvent.setup();
render(<Todos />);
await user.click(screen.getByRole("button", { name: "Add" }));
expect(screen.queryAllByRole("listitem")).toHaveLength(0);
await user.click(screen.getByLabelText("New todo"));
await user.keyboard("{Enter}");
expect(screen.queryAllByRole("listitem")).toHaveLength(0);
await user.type(screen.getByLabelText("New todo"), "   ");
await user.keyboard("{Enter}");
expect(screen.queryAllByRole("listitem")).toHaveLength(0);
await user.click(screen.getByRole("button", { name: "Add" }));
expect(screen.queryAllByRole("listitem")).toHaveLength(0);`,
  },
  {
    id: "toggle-one",
    name: "the checkbox marks one item as done, and only that item",
    code: `
const user = userEvent.setup();
render(<Todos />);
for (const text of ["milk", "bread", "eggs"]) {
  await user.type(screen.getByLabelText("New todo"), text);
  await user.click(screen.getByRole("button", { name: "Add" }));
}
const checked = () => screen.getAllByRole("checkbox").map((box) => box.checked);
expect(checked()).toEqual([false, false, false]);
await user.click(screen.getAllByRole("checkbox")[1]);
expect(checked()).toEqual([false, true, false]);
await user.click(screen.getAllByRole("checkbox")[2]);
expect(checked()).toEqual([false, true, true]);
await user.click(screen.getAllByRole("checkbox")[1]);
expect(checked()).toEqual([false, false, true]);`,
  },
  {
    id: "delete-right-item",
    name: "Delete removes the right item: the middle one, the last one, the first one, and then the only one left",
    code: `
const user = userEvent.setup();
render(<Todos />);
for (const text of ["milk", "bread", "eggs", "rice"]) {
  await user.type(screen.getByLabelText("New todo"), text);
  await user.click(screen.getByRole("button", { name: "Add" }));
}
const deleteAt = (i) => user.click(within(screen.getAllByRole("listitem")[i]).getByRole("button", { name: "Delete" }));
const expectItems = (texts) => {
  const items = screen.queryAllByRole("listitem");
  expect(items).toHaveLength(texts.length);
  texts.forEach((text, i) => expect(items[i]).toHaveTextContent(text));
};
expectItems(["milk", "bread", "eggs", "rice"]);
await deleteAt(1);
expectItems(["milk", "eggs", "rice"]);
await deleteAt(2);
expectItems(["milk", "eggs"]);
await deleteAt(0);
expectItems(["eggs"]);
await deleteAt(0);
expectItems([]);`,
  },
  {
    id: "delete-keeps-checkboxes",
    name: "edge case: deleting the middle of three keeps the checkbox state of the other two",
    code: `
const user = userEvent.setup();
render(<Todos />);
for (const text of ["milk", "bread", "eggs"]) {
  await user.type(screen.getByLabelText("New todo"), text);
  await user.click(screen.getByRole("button", { name: "Add" }));
}
const checked = () => screen.getAllByRole("checkbox").map((box) => box.checked);
await user.click(screen.getAllByRole("checkbox")[0]);
await user.click(screen.getAllByRole("checkbox")[2]);
expect(checked()).toEqual([true, false, true]);
await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "Delete" }));
const items = screen.getAllByRole("listitem");
expect(items).toHaveLength(2);
expect(items[0]).toHaveTextContent("milk");
expect(items[1]).toHaveTextContent("eggs");
expect(checked()).toEqual([true, true]);
await user.click(screen.getAllByRole("checkbox")[0]);
expect(checked()).toEqual([false, true]);`,
  },
  {
    id: "same-text",
    name: "edge case: two items with the same text are two items",
    code: `
const user = userEvent.setup();
render(<Todos />);
for (const text of ["same", "same"]) {
  await user.type(screen.getByLabelText("New todo"), text);
  await user.click(screen.getByRole("button", { name: "Add" }));
}
expect(screen.getAllByRole("listitem")).toHaveLength(2);
await user.click(screen.getAllByRole("checkbox")[1]);
expect(screen.getAllByRole("checkbox").map((box) => box.checked)).toEqual([false, true]);
await user.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Delete" }));
const items = screen.getAllByRole("listitem");
expect(items).toHaveLength(1);
expect(items[0]).toHaveTextContent("same");
expect(within(items[0]).getByRole("checkbox")).toBeChecked();`,
  },
  {
    id: "delete-does-not-add",
    name: "Delete does not send the form: the text in the input stays there and is not added",
    code: `
const user = userEvent.setup();
render(<Todos />);
await user.type(screen.getByLabelText("New todo"), "milk");
await user.click(screen.getByRole("button", { name: "Add" }));
await user.type(screen.getByLabelText("New todo"), "not added");
await user.click(screen.getByRole("button", { name: "Delete" }));
expect(screen.queryAllByRole("listitem")).toHaveLength(0);
expect(screen.getByLabelText("New todo")).toHaveValue("not added");`,
  },
  {
    id: "no-page-reload",
    name: "sending the form never reloads the page, also when the text is empty",
    code: `
const user = userEvent.setup();
let pageReloads = 0;
// This runs after the component saw the event. If nobody stopped the event, the browser would reload the page.
const watch = (event) => {
  if (event.defaultPrevented) return;
  pageReloads++;
  event.preventDefault();
};
document.addEventListener("submit", watch);
try {
  render(<Todos />);
  await user.click(screen.getByRole("button", { name: "Add" }));
  await user.type(screen.getByLabelText("New todo"), "milk");
  await user.click(screen.getByRole("button", { name: "Add" }));
  await user.type(screen.getByLabelText("New todo"), "bread");
  await user.keyboard("{Enter}");
} finally {
  document.removeEventListener("submit", watch);
}
expect(screen.getAllByRole("listitem")).toHaveLength(2);
expect({ pageReloads }).toEqual({ pageReloads: 0 });`,
  },
  {
    id: "strict-mode",
    name: "edge case: inside React.StrictMode, where React calls an updater twice, add, mark and delete still work",
    code: `
const user = userEvent.setup();
render(
  <React.StrictMode>
    <Todos />
  </React.StrictMode>,
);
await user.type(screen.getByLabelText("New todo"), "milk");
await user.click(screen.getByRole("button", { name: "Add" }));
await user.type(screen.getByLabelText("New todo"), "bread");
await user.keyboard("{Enter}");
expect(screen.getAllByRole("listitem")).toHaveLength(2);
await user.click(screen.getAllByRole("checkbox")[0]);
expect(screen.getAllByRole("checkbox").map((box) => box.checked)).toEqual([true, false]);
await user.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Delete" }));
const items = screen.getAllByRole("listitem");
expect(items).toHaveLength(1);
expect(items[0]).toHaveTextContent("bread");
expect(within(items[0]).getByRole("checkbox")).not.toBeChecked();`,
  },
];

export const reactTodos: CodeProblem = {
  id: "react-todos",
  kind: "code",
  group: "react",
  title: "List component: add and delete items",
  difficulty: "medium",
  tag: "reported",
  language: "jsx",
  api: ["Todos"],
  plainLoops: false,
  statement: "Build a list where the user can add an item, delete an item, and mark an item as done.",
  askFirst: ["Should empty text be allowed?", "Are duplicates allowed?", "Do I need edit or toggle too?"],
  edgeCases: ["Empty or spaces-only input", "Deleting the last item", "Using the index as key breaks after a delete"],
  react: {
    risky: ["state-mutation", "list-key", "index-key", "effect-cleanup"],
    preview: {},
    screen: [
      'A text input with the label "New todo", and a button with the name "Add"',
      "One list item (li) for each todo, in the order they were added, with the text of the todo in it",
      'In each list item: a checkbox, and a button with the name "Delete"',
    ],
    tryIt: [
      "Type a text and press Enter: the item is added and the input is cleared.",
      "The Add button does the same.",
      "Empty text or only spaces: nothing is added.",
      "The checkbox marks one item as done, and only that item.",
      "Delete removes the right item, also when it is the last one.",
      "Add three items and delete the middle one: the other two keep their checkbox state.",
    ],
  },
  parts: [
    {
      id: "main",
      title: "Todos",
      signature: "Todos()",
      steps: [
        line('import { useState } from "react";', {
          coach:
            "Let's start, Islam. The list and the text in the input both change on the page, so we need the hook that keeps a value between renders.",
          hint1: 'Import `useState` from `"react"`.',
          explain: "I import useState, because the list and the input text are both state.",
        }),
        line("export default function Todos() {", {
          coach: "We need the component itself. The preview and the tests import it, so it must be the default export.",
          hint1: "`export default function`, with the name `Todos` and no props.",
          explain: "Todos is a function component with no props, and it is the default export.",
        }),
        line("  const [todos, setTodos] = useState([]);", {
          coach: "The first thing the component must remember is the list of items. When the page opens there are no items yet.",
          hint1: "Call `useState` with an empty array, and take the value and its setter out of the array it gives back.",
          explain: "The list of items is state, and it starts as an empty array.",
        }),
        line('  const [text, setText] = useState("");', {
          coach:
            "The second thing is the text the user is typing. We keep it in state, so React always knows what is in the input and we can clear it later.",
          hint1: "Call `useState` again, this time with an empty string.",
          explain: "The input is controlled, so its text is state too.",
        }),
        line("  const add = (e) => {", {
          coach: "Now the handler that adds an item. It runs when the form is sent, so it gets the event.",
          hint1: "A `const` named `add` that holds an arrow function with one parameter, `e`. Open its body.",
          explain: "add is the submit handler of the form, so it takes the event.",
        }),
        line("    e.preventDefault();", {
          coach: "A browser reloads the page when a form is sent, and then our state is lost. We stop that first.",
          hint1: "The event has a method for this: `preventDefault`.",
          explain: "I stop the browser from reloading the page on submit.",
        }),
        line("    if (!text.trim()) return;", {
          coach: "Here is an edge case: the text can be empty, or only spaces. Then we add nothing and leave the handler.",
          hint1: "`trim` removes the spaces at both ends, and an empty string is falsy. So one `if` with a `return` on the same line is enough.",
          explain: "Empty text, or text of only spaces, is not added.",
        }),
        line("    setTodos((list) => [...list, { id: crypto.randomUUID(), text, done: false }]);", {
          coach:
            "Now we add the item. We never change the old array, so we make a new one from the old items plus one new object: a unique id that never changes, the text, and a flag for not done yet.",
          hint1:
            "Give `setTodos` a function that takes the old `list` and returns a new array: spread `list`, then an object with `id`, `text` and `done`. `crypto.randomUUID()` makes the id.",
          explain: "I make a new array with the old items and one new item that has its own stable id.",
        }),
        line('    setText("");\n  };', {
          coach: "The item is in the list now, so we empty the input for the next one, and then the handler ends. Two lines.",
          hint1: "Call `setText` with an empty string. Then close the arrow function with a brace and a semicolon.",
          explain: "After adding I clear the input, and the handler ends.",
        }),
        line("  const toggle = (id) =>", {
          coach:
            "Next, the handler that marks one item as done or not done: it must know which item, so it takes the id. Its body is one expression, and we write it on the next line.",
          hint1: "A `const` named `toggle` that holds an arrow function with one parameter, `id`. The line ends after the arrow.",
          explain: "toggle takes the id of the item to change.",
        }),
        line("    setTodos((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));", {
          coach:
            "Again we build a new array and change nothing in place. Only the item with this `id` becomes a copy with the opposite `done`, and every other item stays the same object.",
          hint1:
            "Give `setTodos` a function that returns `list.map`. Inside it, a ternary: when `t.id` is our `id`, return a copy of `t` with `done` set to `!t.done`, and if not, return `t`.",
          explain: "I map to a new array, and only the matching item is copied with done flipped.",
        }),
        line("  const remove = (id) => setTodos((list) => list.filter((t) => t.id !== id));", {
          coach: "The last handler deletes one item. We need a new array with every item except the one with this `id`.",
          hint1: "An arrow function named `remove` that takes `id` and calls `setTodos`. `filter` keeps the items that have another id.",
          explain: "remove filters the item out, and filter returns a new array.",
        }),
        line("  return (\n    <form onSubmit={add}>", {
          coach:
            "Now the markup: the root is a real form that runs `add`, because then Enter in the input adds the item with no extra code. Two lines.",
          hint1: "`return` with an opening parenthesis, then an opening `form` tag with `onSubmit` set to `add`.",
          explain: "The root is a real form, so pressing Enter in the input adds the item.",
        }),
        line('      <label htmlFor="new">New todo</label>', {
          coach:
            "Every input needs a label, so a screen reader can say what the field is for. We write the label first and link it to the input by an id.",
          hint1: 'A `label` with the text New todo. In JSX the attribute that links it to an input is `htmlFor`, and here its value is `"new"`.',
          explain: "The input has a real label, and htmlFor links it to the input by id.",
        }),
        line('      <input id="new" value={text} onChange={(e) => setText(e.target.value)} />', {
          coach:
            "Now the input itself. It carries the id that the label points to, it shows the text from state, and every change must write the new text back to state.",
          hint1: 'An `input` with `id="new"`, with `value` from `text`, and with an `onChange` that gives `e.target.value` to `setText`.',
          explain: "The input reads its value from state and writes every change back to state.",
        }),
        line('      <button type="submit">Add</button>', {
          coach: "The user also needs a button to add the item. It must send the form, so a click and Enter run the same handler.",
          hint1: 'A `button` with `type="submit"` and the text Add.',
          explain: "The Add button is a submit button, so a click sends the form.",
        }),
        line("      <ul>", {
          coach:
            "Below the input and the button we show the items. They are a list, so we use the list element, and a screen reader can then say how many items there are.",
          hint1: "An opening `ul` tag.",
          explain: "The items go inside a ul, which is the element for a list.",
        }),
        line("        {todos.map((t) => (", {
          coach:
            "Inside the list we need one row for every item. A loop statement does not work inside JSX, so we need an expression that gives back an array of elements.",
          hint1: "Open a brace, then call `map` on `todos` with an arrow function that takes `t`. End the line with an opening parenthesis for the JSX.",
          explain: "I map over the items and render one row for each of them.",
        }),
        line("          <li key={t.id}>", {
          coach:
            "Each row is a list item, and React needs a `key` to follow each row between renders. Items can be deleted, so the position is not a safe key, and we use the stable id.",
          hint1: "An opening `li` tag with `key` set to `t.id`.",
          explain: "The key is the stable id and not the index, so React still matches the rows after a delete.",
        }),
        line('            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />', {
          coach:
            "The row starts with a checkbox that shows if the item is done. It reads from state, and a click changes the state through our handler.",
          hint1: 'An `input` with `type="checkbox"`, with `checked` from `t.done`, and with an `onChange` that calls `toggle` with `t.id`.',
          explain: "The checkbox shows done from state, and a change calls toggle with the id of its item.",
        }),
        line("            {t.text}", {
          coach: "Next to the checkbox the user must read what the item says.",
          hint1: "Braces put a JavaScript value into JSX. Here the value is the `text` of `t`.",
          explain: "The braces put the text of the item into the row.",
        }),
        line('            <button type="button" onClick={() => remove(t.id)}>Delete</button>', {
          coach:
            "Each row also needs a button that deletes its item. We are inside a form, where a button sends the form by default, so we must say that this one does not.",
          hint1: 'A `button` with `type="button"` and the text Delete. Its `onClick` calls `remove` with `t.id`.',
          explain: "Delete has type button, so a click removes the item and does not submit the form.",
        }),
        line("          </li>\n        ))}", {
          coach: "The row is complete, so we close the list item and then the `map` call. Two lines.",
          hint1: "A closing `li` tag. Then, on the next line, two closing parentheses and a closing brace.",
          explain: "The row ends here, and after it the map call.",
        }),
        line("      </ul>\n    </form>\n  );\n}", {
          coach: "Last, we close what is still open: the list, the form, the return, and the component. Four lines.",
          hint1: "A closing `ul` tag, a closing `form` tag, a closing parenthesis with a semicolon, and a closing brace.",
          explain: "The list ends first, then the form, then the return, and then Todos.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Add is O(1) plus the copy. Delete is O(n).",
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
