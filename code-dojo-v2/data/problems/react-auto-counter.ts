import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "starts-at-zero",
    name: "shows Count: 0 at first, and does not move before a button is clicked",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
expect(screen.getByText("Count: 0")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(5000); });
expect(screen.getByText("Count: 0")).toBeInTheDocument();`,
  },
  {
    id: "three-buttons",
    name: "has the three buttons: Auto +, Auto - and Stop",
    code: `
render(<AutoCounter />);
expect(screen.getByRole("button", { name: "Auto +" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Auto -" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();`,
  },
  {
    id: "auto-plus",
    name: "Auto + goes up by one every second",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
fireEvent.click(screen.getByRole("button", { name: "Auto +" }));
act(() => { jest.advanceTimersByTime(999); });
expect(screen.getByText("Count: 0")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1); });
expect(screen.getByText("Count: 1")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("Count: 2")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("Count: 3")).toBeInTheDocument();`,
  },
  {
    id: "auto-minus",
    name: "Auto - goes down by one every second, also below zero",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
fireEvent.click(screen.getByRole("button", { name: "Auto -" }));
act(() => { jest.advanceTimersByTime(999); });
expect(screen.getByText("Count: 0")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1); });
expect(screen.getByText("Count: -1")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(2000); });
expect(screen.getByText("Count: -3")).toBeInTheDocument();`,
  },
  {
    id: "stop",
    name: "Stop keeps the count where it is",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
fireEvent.click(screen.getByRole("button", { name: "Auto +" }));
act(() => { jest.advanceTimersByTime(3000); });
fireEvent.click(screen.getByRole("button", { name: "Stop" }));
expect(screen.getByText("Count: 3")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(5000); });
expect(screen.getByText("Count: 3")).toBeInTheDocument();`,
  },
  {
    id: "goes-on",
    name: "Auto + after Stop goes on from the same count",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
fireEvent.click(screen.getByRole("button", { name: "Auto +" }));
act(() => { jest.advanceTimersByTime(3000); });
fireEvent.click(screen.getByRole("button", { name: "Stop" }));
act(() => { jest.advanceTimersByTime(5000); });
fireEvent.click(screen.getByRole("button", { name: "Auto +" }));
act(() => { jest.advanceTimersByTime(2000); });
expect(screen.getByText("Count: 5")).toBeInTheDocument();`,
  },
  {
    id: "change-direction",
    name: "Auto - while it goes up turns it around, from the same count",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
fireEvent.click(screen.getByRole("button", { name: "Auto +" }));
act(() => { jest.advanceTimersByTime(3000); });
expect(screen.getByText("Count: 3")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Auto -" }));
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("Count: 2")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(4000); });
expect(screen.getByText("Count: -2")).toBeInTheDocument();`,
  },
  {
    id: "stop-at-zero",
    name: "edge case: Stop when nothing is running changes nothing",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
fireEvent.click(screen.getByRole("button", { name: "Stop" }));
fireEvent.click(screen.getByRole("button", { name: "Stop" }));
act(() => { jest.advanceTimersByTime(3000); });
expect(screen.getByText("Count: 0")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Auto +" }));
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("Count: 1")).toBeInTheDocument();`,
  },
  {
    id: "one-interval",
    name: "edge case: Auto + clicked many times does not count faster",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
const plus = screen.getByRole("button", { name: "Auto +" });
for (let i = 0; i < 5; i++) fireEvent.click(plus);
act(() => { jest.advanceTimersByTime(4000); });
expect(screen.getByText("Count: 4")).toBeInTheDocument();
fireEvent.click(plus);
fireEvent.click(plus);
act(() => { jest.advanceTimersByTime(2000); });
expect(screen.getByText("Count: 6")).toBeInTheDocument();`,
  },
  {
    id: "back-and-forth",
    name: "edge case: changing the direction many times leaves one interval",
    code: `
jest.useFakeTimers();
render(<AutoCounter />);
const plus = screen.getByRole("button", { name: "Auto +" });
const minus = screen.getByRole("button", { name: "Auto -" });
fireEvent.click(plus);
fireEvent.click(minus);
fireEvent.click(plus);
fireEvent.click(minus);
act(() => { jest.advanceTimersByTime(3000); });
expect(screen.getByText("Count: -3")).toBeInTheDocument();`,
  },
  {
    id: "unmount-clears",
    name: "edge case: unmount while it runs clears the interval",
    code: `
jest.useFakeTimers();
const { unmount } = render(<AutoCounter />);
fireEvent.click(screen.getByRole("button", { name: "Auto +" }));
act(() => { jest.advanceTimersByTime(2000); });
expect(screen.getByText("Count: 2")).toBeInTheDocument();
unmount();
expect(jest.getTimerCount()).toBe(0);`,
  },
];

export const reactAutoCounter: CodeProblem = {
  id: "react-auto-counter",
  kind: "code",
  group: "react",
  title: "Counter with setInterval and clearInterval",
  difficulty: "medium",
  tag: "reported",
  language: "jsx",
  api: ["AutoCounter"],
  plainLoops: false,
  statement: "Build a counter that goes up or down automatically, and can be stopped.",
  askFirst: ["How fast: every second?", "Can it go below zero?"],
  edgeCases: ["Clicking a button twice: two intervals", "Unmount while it is running"],
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: {},
    screen: [
      'The text "Count: " with the number after it, starting at "Count: 0"',
      'A count below zero has a minus sign: "Count: -2"',
      'Three buttons with the names "Auto +", "Auto -" and "Stop"',
    ],
    tryIt: [
      "It shows Count: 0 and does not move at first.",
      "Auto +: it goes up by one every second.",
      "Auto -: it goes down by one every second, also below zero.",
      "Stop: it stays where it is.",
      "Click Auto + many times: it still goes up by one per second, not faster.",
    ],
  },
  parts: [
    {
      id: "main",
      title: "AutoCounter",
      signature: "AutoCounter()",
      steps: [
        line('import { useEffect, useRef, useState } from "react";', {
          coach:
            "Let's start, Islam. This counter moves by itself, so we need three hooks: one to start and stop an interval, one to keep its id, and one for the values on the page.",
          hint1: 'Import `useEffect`, `useRef` and `useState` from `"react"`. The order does not matter.',
          explain: "I import useEffect for the interval, useRef for its id, and useState for what the screen shows.",
        }),
        line("export default function AutoCounter() {", {
          coach: "Now the component itself. The preview and the tests import it, so it must be the default export.",
          hint1: "`export default function`, with the name `AutoCounter` and no props.",
          explain: "AutoCounter is a function component with no props, and it is the default export.",
        }),
        line("  const [count, setCount] = useState(0);", {
          coach: "The page shows a number that changes, so that number is state. It starts at zero.",
          hint1: "Call `useState` with 0, and take the value and its setter out of the array it gives back.",
          explain: "The count is state, and it starts at 0.",
        }),
        line("  const [step, setStep] = useState(0); // 1, -1, or 0 for stopped", {
          coach:
            "We also need to know which way the counter moves, and if it moves at all. One number can say both: how much to add on each tick, where zero means stopped.",
          hint1: "A second `useState` that starts at 0. Later its value will be 1, minus 1, or 0 again.",
          explain: "One state value gives the direction and also says if the counter is running, because 0 means stopped.",
        }),
        line("  const intervalRef = useRef(null);", {
          coach:
            "We must remember the interval id to clear it later. A change of that id should not render the component again, so it does not belong in state.",
          hint1: "Call `useRef` with `null`. A ref keeps a value between renders and never causes a render.",
          explain: "The ref will hold the interval id, and it starts as null.",
          accept: ["  const intervalRef = useRef();"],
        }),
        line("  useEffect(() => {", {
          coach:
            "An interval lives outside React, so starting and stopping it is a side effect. We open the hook that runs side effects after a render.",
          hint1: "Call `useEffect` and give it an arrow function with no parameters. Leave its body open.",
          explain: "The interval is started and stopped inside an effect.",
        }),
        line("    if (step === 0) return;", {
          coach: "The effect also runs after the first render, when the counter is still stopped. In that case there must be no interval.",
          hint1: "An `if` that compares `step` with 0, and a `return` with no value on the same line.",
          explain: "If the step is 0, the counter is stopped, so the effect returns early and starts no interval.",
          accept: ["    if (!step) return;"],
        }),
        line("    intervalRef.current = setInterval(() => {", {
          coach:
            "From here the counter should move, so we need something that runs again and again. We keep the id that it gives back, because the cleanup needs it later.",
          hint1: "Assign the result of `setInterval` to the `current` of `intervalRef`. Give it an arrow function and leave it open.",
          explain: "setInterval starts the repeated callback, and its id goes into the current property of the ref.",
        }),
        line("      setCount((c) => c + step);", {
          coach:
            "Each tick moves the count by `step`, up or down. The callback is a closure and it keeps the `count` of the render that made it, so we cannot read that value here.",
          hint1: "Give `setCount` a function that takes the old value and returns it plus `step`.",
          explain: "The updater form gives me the latest count, and I add the step to it, which is 1 or minus 1.",
        }),
        line("    }, 1000);", {
          coach: "We close the callback and say how often it runs. One tick is one second.",
          hint1: "Close the arrow function, then a comma, then the time in milliseconds, then close the call.",
          explain: "The second argument of setInterval is 1000 milliseconds, so the count changes once every second.",
        }),
        line("    return () => clearInterval(intervalRef.current);", {
          coach:
            "Now the cleanup. React calls it before the effect runs again and when the component unmounts, and that is what keeps us from having two intervals at the same time.",
          hint1: "Return an arrow function from the effect. Inside it, call `clearInterval` with the id that `intervalRef` holds.",
          explain: "The effect returns a function that calls clearInterval with the saved id, so the old interval is gone before a new one starts.",
          accept: ["    return () => {\n      clearInterval(intervalRef.current);\n    };"],
        }),
        line("  }, [step]);", {
          coach:
            "We close the effect and tell React when to run it again. The callback reads `step`, so the interval must be made again each time `step` changes.",
          hint1: "Close the arrow function, then a comma, then the dependency array with `step` in it.",
          explain: "The dependency array holds the step, so the effect runs again every time the step changes.",
        }),
        line("  return (\n    <div>", {
          coach: "Now the markup: a component gives back one root element, so we open a wrapper for everything. Two lines.",
          hint1: "`return` with an opening parenthesis, then an opening `div` tag on the next line.",
          explain: "I return one root element that wraps the text and the buttons.",
        }),
        line('      <p aria-live="polite">Count: {count}</p>', {
          coach: "First we show the number. It changes without a click, so a screen reader should say the new value each time.",
          hint1: 'A `p` with the text Count: and then `count` in braces. The attribute `aria-live="polite"` makes a screen reader read the change.',
          explain: "The paragraph shows the count, and aria-live tells a screen reader to read each change.",
          accept: ["      <p>Count: {count}</p>"],
        }),
        line("      <button onClick={() => setStep(1)}>Auto +</button>", {
          coach:
            'The "Auto +" button makes the counter go up by itself. The button does not touch the interval: it only says which way to go.',
          hint1: "A `button` with the text Auto +. Its `onClick` calls `setStep` with 1.",
          explain: "The Auto plus button sets the step to 1, so the effect starts an interval that counts up.",
        }),
        line("      <button onClick={() => setStep(-1)}>Auto -</button>", {
          coach: 'The "Auto -" button is the same idea in the other direction: the counter goes down by itself.',
          hint1: "The same `button` as before, with `Auto -` as its text and minus 1 for `setStep`.",
          explain: "The Auto minus button sets the step to minus 1, so the effect runs again and the count goes down.",
        }),
        line("      <button onClick={() => setStep(0)}>Stop</button>", {
          coach: 'The "Stop" button stops the counter. Zero is our value for stopped, so that is all it has to set.',
          hint1: "A `button` with the text Stop. Its `onClick` calls `setStep` with 0.",
          explain: "Stop sets the step to 0, so the cleanup clears the interval and the effect starts no new one.",
        }),
        line("    </div>\n  );\n}", {
          coach: "Last, we close the wrapper, then the return, and then the component. Three lines.",
          hint1: "A closing `div` tag, then a closing parenthesis with a semicolon, then a closing brace.",
          explain: "The wrapper ends first, then the return, and then AutoCounter.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1) per tick.",
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
