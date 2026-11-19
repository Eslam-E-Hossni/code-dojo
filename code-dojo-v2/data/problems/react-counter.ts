import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "starts-at-zero",
    name: "shows Count: 0 at first",
    code: `
render(<Counter />);
expect(screen.getByText("Count: 0")).toBeInTheDocument();`,
  },
  {
    id: "three-buttons",
    name: "has the three buttons: -, + and Reset",
    code: `
render(<Counter />);
expect(screen.getByRole("button", { name: "-" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();`,
  },
  {
    id: "plus",
    name: "plus adds 1",
    code: `
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole("button", { name: "+" }));
expect(screen.getByText("Count: 1")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "+" }));
expect(screen.getByText("Count: 2")).toBeInTheDocument();`,
  },
  {
    id: "minus",
    name: "minus takes 1 away",
    code: `
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole("button", { name: "+" }));
await user.click(screen.getByRole("button", { name: "+" }));
await user.click(screen.getByRole("button", { name: "-" }));
expect(screen.getByText("Count: 1")).toBeInTheDocument();`,
  },
  {
    id: "below-zero",
    name: "edge case: the count can go below zero",
    code: `
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole("button", { name: "-" }));
await user.click(screen.getByRole("button", { name: "-" }));
expect(screen.getByText("Count: -2")).toBeInTheDocument();`,
  },
  {
    id: "reset",
    name: "Reset goes back to 0",
    code: `
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole("button", { name: "+" }));
await user.click(screen.getByRole("button", { name: "+" }));
await user.click(screen.getByRole("button", { name: "+" }));
await user.click(screen.getByRole("button", { name: "Reset" }));
expect(screen.getByText("Count: 0")).toBeInTheDocument();`,
  },
  {
    id: "reset-at-zero",
    name: "edge case: Reset when the count is already 0",
    code: `
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole("button", { name: "Reset" }));
expect(screen.getByText("Count: 0")).toBeInTheDocument();`,
  },
  {
    id: "fast-clicks",
    name: "edge case: fast clicks all count",
    code: `
render(<Counter />);
const plus = screen.getByRole("button", { name: "+" });
for (let i = 0; i < 25; i++) fireEvent.click(plus);
expect(screen.getByText("Count: 25")).toBeInTheDocument();`,
  },
  {
    id: "own-state",
    name: "two counters do not share their count",
    code: `
const user = userEvent.setup();
render(
  <>
    <Counter />
    <Counter />
  </>,
);
await user.click(screen.getAllByRole("button", { name: "+" })[0]);
expect(screen.getByText("Count: 1")).toBeInTheDocument();
expect(screen.getByText("Count: 0")).toBeInTheDocument();`,
  },
];

export const reactCounter: CodeProblem = {
  id: "react-counter",
  kind: "code",
  group: "react",
  title: "React Counter",
  difficulty: "easy",
  tag: "reported",
  language: "jsx",
  api: ["Counter"],
  plainLoops: false,
  statement: "Build a counter with three buttons: minus, plus and Reset.",
  askFirst: ["Can the count go below zero?", "Is the step always 1?", "What value does Reset go back to?"],
  edgeCases: ["Fast clicks: every click must count", "Negative numbers", "Reset when the count is already 0"],
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: {},
    screen: ['The text "Count: " with the number after it, starting at "Count: 0"', 'Three buttons with the names "-", "+" and "Reset"'],
    tryIt: [
      "It starts at 0.",
      "Plus adds 1 and minus takes 1 away.",
      "The count can go below zero.",
      "Reset goes back to 0.",
      "Click plus fast many times: every click counts.",
    ],
  },
  parts: [
    {
      id: "main",
      title: "Counter",
      signature: "Counter()",
      steps: [
        line('import { useState } from "react";', {
          coach: "Let's start, Islam. The number on the page changes, so we need the hook that keeps a value between renders.",
          hint1: 'Import `useState` from `"react"`.',
          explain: "I import useState, because the count is state.",
        }),
        line("export default function Counter() {", {
          coach: "We need the component itself. The preview and the tests import it, so it must be the default export.",
          hint1: "`export default function`, with the name `Counter` and no props.",
          explain: "Counter is a function component with no props, and it is the default export.",
        }),
        line("  const [count, setCount] = useState(0);", {
          coach: "The component needs one value that lives through every render: the count. It starts at zero.",
          hint1: "Call `useState` with 0, and take the value and its setter out of the array it gives back.",
          explain: "The count is the only state, and it starts at 0.",
        }),
        line("  return (\n    <div>", {
          coach: "Now the markup: a component gives back one root element, so we open a wrapper for everything. Two lines.",
          hint1: "`return` with an opening parenthesis, then an opening `div` tag on the next line.",
          explain: "I return one root element that wraps the text and the buttons.",
        }),
        line('      <p aria-live="polite">Count: {count}</p>', {
          coach: "First we show the number. A screen reader should also say the new value each time it changes.",
          hint1: 'A `p` with the text Count: and then `count` in braces. The attribute `aria-live="polite"` makes a screen reader read the change.',
          explain: "The paragraph shows the count, and aria-live tells a screen reader to read each change.",
          accept: ["      <p>Count: {count}</p>"],
        }),
        line("      <button onClick={() => setCount((c) => c - 1)}>-</button>", {
          coach:
            "The first button takes one away. The new value depends on the old one, so we let React hand us the latest value and do not read `count` ourselves.",
          hint1: "A `button` with `onClick`. Give `setCount` a function that takes the old value and returns it minus 1.",
          explain: "The minus button uses the updater form, so every click works on the latest value.",
          accept: ["      <button onClick={() => setCount(count - 1)}>-</button>"],
        }),
        line("      <button onClick={() => setCount((c) => c + 1)}>+</button>", {
          coach: "The second button is the same idea, and it adds one.",
          hint1: "The same `button` as before, with a function that returns the old value plus 1.",
          explain: "The plus button adds 1 to the latest value in the same way.",
          accept: ["      <button onClick={() => setCount(count + 1)}>+</button>"],
        }),
        line("      <button onClick={() => setCount(0)}>Reset</button>", {
          coach: "The last button goes back to the start. This time the new value does not depend on the old one.",
          hint1: "A `button` whose `onClick` calls `setCount` with 0.",
          explain: "Reset sets the count to 0 directly, because the old value does not matter.",
        }),
        line("    </div>\n  );\n}", {
          coach: "Last, we close the wrapper, then the return, and then the component. Three lines.",
          hint1: "A closing `div` tag, then a closing parenthesis with a semicolon, then a closing brace.",
          explain: "The wrapper ends first, then the return, and then Counter.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1) per click. One state value.",
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
