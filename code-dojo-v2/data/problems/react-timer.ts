import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "starts-at-zero",
    name: "shows 00:00 at first, and does not count before Start is clicked",
    code: `
jest.useFakeTimers();
render(<Timer />);
expect(screen.getByText("00:00")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(5000); });
expect(screen.getByText("00:00")).toBeInTheDocument();`,
  },
  {
    id: "three-buttons",
    name: "has the three buttons, and only Pause is disabled at first",
    code: `
render(<Timer />);
expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();`,
  },
  {
    id: "counts-seconds",
    name: "Start counts one second at a time",
    code: `
jest.useFakeTimers();
render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(999); });
expect(screen.getByText("00:00")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1); });
expect(screen.getByText("00:01")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("00:02")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("00:03")).toBeInTheDocument();`,
  },
  {
    id: "buttons-while-running",
    name: "while it runs, Start is disabled and Pause is enabled",
    code: `
jest.useFakeTimers();
render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
expect(screen.getByRole("button", { name: "Pause" })).toBeEnabled();
expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();`,
  },
  {
    id: "pause-stops",
    name: "Pause stops the time",
    code: `
jest.useFakeTimers();
render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(3000); });
fireEvent.click(screen.getByRole("button", { name: "Pause" }));
expect(screen.getByText("00:03")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(5000); });
expect(screen.getByText("00:03")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();`,
  },
  {
    id: "goes-on",
    name: "Start after Pause goes on from the same time",
    code: `
jest.useFakeTimers();
render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(3000); });
fireEvent.click(screen.getByRole("button", { name: "Pause" }));
act(() => { jest.advanceTimersByTime(5000); });
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("00:04")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(2000); });
expect(screen.getByText("00:06")).toBeInTheDocument();`,
  },
  {
    id: "two-digits",
    name: "shows minutes and seconds with two digits each",
    code: `
jest.useFakeTimers();
render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(59000); });
expect(screen.getByText("00:59")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(1000); });
expect(screen.getByText("01:00")).toBeInTheDocument();
act(() => { jest.advanceTimersByTime(5000); });
expect(screen.getByText("01:05")).toBeInTheDocument();`,
  },
  {
    id: "reset-while-running",
    name: "Reset while it runs stops it and shows 00:00",
    code: `
jest.useFakeTimers();
render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(3000); });
expect(screen.getByText("00:03")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Reset" }));
expect(screen.getByText("00:00")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
act(() => { jest.advanceTimersByTime(3000); });
expect(screen.getByText("00:00")).toBeInTheDocument();`,
  },
  {
    id: "reset-while-paused",
    name: "Reset while it is paused shows 00:00, and Start then counts from zero",
    code: `
jest.useFakeTimers();
render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(4000); });
fireEvent.click(screen.getByRole("button", { name: "Pause" }));
fireEvent.click(screen.getByRole("button", { name: "Reset" }));
expect(screen.getByText("00:00")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(2000); });
expect(screen.getByText("00:02")).toBeInTheDocument();`,
  },
  {
    id: "one-interval",
    name: "edge case: Start clicked twice, or Start and Pause many times, never counts faster",
    code: `
jest.useFakeTimers();
render(<Timer />);
const start = screen.getByRole("button", { name: "Start" });
const pause = screen.getByRole("button", { name: "Pause" });
for (let i = 0; i < 4; i++) {
  fireEvent.click(start);
  fireEvent.click(start);
  fireEvent.click(pause);
}
fireEvent.click(start);
fireEvent.click(start);
act(() => { jest.advanceTimersByTime(3000); });
expect(screen.getByText("00:03")).toBeInTheDocument();`,
  },
  {
    id: "unmount-clears",
    name: "edge case: unmount while it runs clears the interval",
    code: `
jest.useFakeTimers();
const { unmount } = render(<Timer />);
fireEvent.click(screen.getByRole("button", { name: "Start" }));
act(() => { jest.advanceTimersByTime(2000); });
expect(screen.getByText("00:02")).toBeInTheDocument();
unmount();
expect(jest.getTimerCount()).toBe(0);`,
  },
];

export const reactTimer: CodeProblem = {
  id: "react-timer",
  kind: "code",
  group: "react",
  title: "React Timer: Start / Pause / Reset",
  difficulty: "medium",
  tag: "reported",
  language: "jsx",
  api: ["Timer"],
  plainLoops: false,
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
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: {},
    screen: [
      'The time in one element, like "00:00" at first and "01:05" after 65 seconds',
      'Three buttons with the names "Start", "Pause" and "Reset"',
      '"Start" is disabled while the timer runs, and "Pause" is disabled while it is stopped',
    ],
    tryIt: [
      "It shows 00:00 at first, and Pause is disabled.",
      "Start: it counts one second at a time, and Start becomes disabled.",
      "Pause: it stops. Start again: it goes on from the same time.",
      "Reset while it is running: it stops and shows 00:00.",
      "Start and Pause many times: it never counts faster than one per second.",
    ],
  },
  parts: [
    {
      id: "main",
      title: "Timer",
      signature: "Timer()",
      steps: [
        line('import { useState, useRef, useEffect } from "react";', {
          coach:
            "Let's start, Islam. A timer has values on the page, an interval id to remember, and an interval to start and stop, so we need one hook for each of these jobs.",
          hint1: 'Import `useState`, `useRef` and `useEffect` from `"react"`. The order does not matter.',
          explain: "I import useState for what the screen shows, useRef for the interval id, and useEffect to start and stop the interval.",
        }),
        line("export default function Timer() {", {
          coach: "Now the component itself. The preview and the tests import it, so it must be the default export.",
          hint1: "`export default function`, with the name `Timer` and no props.",
          explain: "Timer is a function component with no props, and it is the default export.",
        }),
        line("  const [seconds, setSeconds] = useState(0);", {
          coach:
            "The page shows the time that has passed, so we keep it in state. We store only the seconds, because the minutes can be computed from them.",
          hint1: "Call `useState` with 0, and take the value and its setter out of the array it gives back.",
          explain: "The seconds are the only time value in state, and they start at 0.",
        }),
        line("  const [running, setRunning] = useState(false);", {
          coach: "We also need to know if the timer is running or stopped, because the buttons change that. At first it is stopped.",
          hint1: "A second `useState`, this time with a boolean. The first value is `false`.",
          explain: "A second state value says if the timer is running, and it starts as false.",
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
          explain: "The effect is the place where I connect the interval to the state of the component.",
        }),
        line("    if (!running) return;", {
          coach: "The effect also runs after the first render, when the timer is still stopped. In that case there must be no interval.",
          hint1: "An `if` with the opposite of `running`, and a `return` with no value on the same line.",
          explain: "If the timer is not running, the effect returns early and starts no interval.",
        }),
        line("    intervalRef.current = setInterval(() => {", {
          coach:
            "From here the timer is running, so we need something that runs again and again. We keep the id that it gives back, because the cleanup needs it later.",
          hint1: "Assign the result of `setInterval` to the `current` of `intervalRef`. Give it an arrow function and leave it open.",
          explain: "setInterval starts the repeated callback, and its id goes into the current property of the ref.",
        }),
        line("      setSeconds((s) => s + 1);", {
          coach:
            "Each tick adds one second. The callback is a closure and it keeps the `seconds` of the render that made it, so we cannot read that value here.",
          hint1: "Give `setSeconds` a function that takes the old value and returns it plus 1.",
          explain: "The updater form gives me the latest seconds, and I return that value plus 1.",
        }),
        line("    }, 1000);", {
          coach: "We close the callback and say how often it runs. One tick is one second.",
          hint1: "Close the arrow function, then a comma, then the time in milliseconds, then close the call.",
          explain: "The second argument of setInterval is 1000 milliseconds, so the callback runs once every second.",
        }),
        line("    return () => clearInterval(intervalRef.current);", {
          coach:
            "This is the line interviewers look for: the cleanup. React calls it when `running` changes and when the component unmounts, and it must stop the interval.",
          hint1: "Return an arrow function from the effect. Inside it, call `clearInterval` with the id that `intervalRef` holds.",
          explain: "The effect returns a function that calls clearInterval with the saved id, and React runs it as the cleanup.",
          accept: ["    return () => {\n      clearInterval(intervalRef.current);\n    };"],
        }),
        line("  }, [running]);", {
          coach: "We close the effect and tell React when to run it again. Only a change of `running` should start or stop the interval.",
          hint1: "Close the arrow function, then a comma, then the dependency array with `running` in it.",
          explain: "The dependency array holds the running flag, so the effect runs again only when that flag changes.",
        }),
        line("  const reset = () => {", {
          coach: "The Reset button must stop the timer and also clear the time. That is too much to write inside the markup, so we give it a function with a name.",
          hint1: "A `const` called `reset` that holds an arrow function with no parameters. Leave its body open.",
          explain: "This arrow function is the click handler that the Reset button will use.",
        }),
        line("    setRunning(false);", {
          coach: "Inside the handler, the timer must stop first. We do not touch the interval here, because the effect reacts to the state by itself.",
          hint1: "Call `setRunning` with `false`.",
          explain: "Setting the running flag to false stops the timer, because the cleanup of the effect then clears the interval.",
        }),
        line("    setSeconds(0);\n  };", {
          coach: "Reset also means that the page shows zero again, and after that the handler is done. Two lines.",
          hint1: "Call `setSeconds` with 0. On the next line, a closing brace and a semicolon.",
          explain: "I set the seconds back to 0 and close the handler.",
        }),
        line('  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");', {
          coach:
            "Now the display. The minutes are not state: we compute them from `seconds` on every render, as whole minutes, and as text that always has two digits.",
          hint1: 'Divide `seconds` by 60 and round down with `Math.floor`. Wrap the result in `String`, then call `padStart` with 2 and `"0"`.',
          explain: "Math.floor gives the whole minutes, String makes them text, and padStart puts a zero in front when there is only one digit.",
          accept: ['  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");'],
        }),
        line('  const ss = String(seconds % 60).padStart(2, "0");', {
          coach: "The seconds part is what is left after the whole minutes. It needs the same two digits.",
          hint1: "The remainder operator `%` with 60 gives the part under one minute. Then `String` and `padStart` as on the line before.",
          explain: "The remainder after dividing by 60 is the seconds part, and padStart makes it two digits as well.",
          accept: ['  const ss = (seconds % 60).toString().padStart(2, "0");'],
        }),
        line("  return (\n    <div>", {
          coach: "Now the markup: a component gives back one root element, so we open a wrapper for everything. Two lines.",
          hint1: "`return` with an opening parenthesis, then an opening `div` tag on the next line.",
          explain: "I return one root element that wraps the time and the buttons.",
        }),
        line("      <h1>{mm}:{ss}</h1>", {
          coach: "The time is the main thing on the page, so we show it as a heading: the minutes, a colon, then the seconds.",
          hint1: "An `h1` with `mm` in braces, then a colon as plain text, then `ss` in braces.",
          explain: "The heading renders the minutes, a colon and the seconds, so the page shows a text like 03:07.",
        }),
        line("      <button onClick={() => setRunning(true)} disabled={running}>Start</button>", {
          coach:
            'The "Start" button starts the timer. While the timer runs, a click on it has no meaning, so the user should not be able to click it.',
          hint1: "A `button` with the text Start. Its `onClick` calls `setRunning` with `true`, and its `disabled` attribute gets `running`.",
          explain: "Start sets the running flag to true, and its disabled attribute follows that flag, so the button cannot be clicked twice.",
        }),
        line("      <button onClick={() => setRunning(false)} disabled={!running}>Pause</button>", {
          coach:
            'The "Pause" button does the opposite: it stops the timer. It is disabled when the timer is already stopped, because then there is nothing to pause.',
          hint1: "The same `button` as before, with the text Pause, with `false` for `setRunning`, and with the opposite of `running` for `disabled`.",
          explain: "Pause sets the running flag to false, and its disabled attribute is the opposite of that flag.",
        }),
        line("      <button onClick={reset}>Reset</button>", {
          coach:
            'The "Reset" button uses the handler we wrote above. React must get the function itself, so that it runs on the click and not during the render.',
          hint1: "A `button` with the text Reset. Give `onClick` the name `reset` with no parentheses after it.",
          explain: "Reset gets the handler as a value, so React calls it only when the button is clicked.",
          accept: ["      <button onClick={() => reset()}>Reset</button>"],
        }),
        line("    </div>\n  );\n}", {
          coach: "Last, we close the wrapper, then the return, and then the component. Three lines.",
          hint1: "A closing `div` tag, then a closing parenthesis with a semicolon, then a closing brace.",
          explain: "The wrapper ends first, then the return, and then Timer.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Each tick is O(1). One interval at most.",
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
