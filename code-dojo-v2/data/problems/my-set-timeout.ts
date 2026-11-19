import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "set-waits",
    name: "mySetTimeout: does not call the callback before the delay",
    part: "set",
    code: `
const fn = spy();
mySetTimeout(fn, 100);
expect(fn.calls.length, "calls right away").toBe(0);
await clock.tick(96);
expect(fn.calls.length, "calls after 96 ms").toBe(0);`,
  },
  {
    id: "set-fires",
    name: "mySetTimeout: calls the callback once the delay has passed",
    part: "set",
    code: `
const fn = spy();
mySetTimeout(fn, 100);
await clock.tick(120);
expect(fn.calls.length, "calls after 120 ms").toBe(1);`,
  },
  {
    id: "set-once",
    name: "mySetTimeout: calls it only once",
    part: "set",
    code: `
const fn = spy();
mySetTimeout(fn, 50);
await clock.tick(2000);
expect(fn.calls.length, "calls after 2 seconds").toBe(1);`,
  },
  {
    id: "set-arguments",
    name: "mySetTimeout: passes the extra arguments",
    part: "set",
    code: `
const fn = spy();
mySetTimeout(fn, 30, 1, "two", [3]);
await clock.tick(60);
expect(fn.calls, "calls to the callback").toEqual([[1, "two", [3]]]);`,
  },
  {
    id: "set-zero-delay",
    name: "mySetTimeout: edge case: delay is 0 or missing",
    part: "set",
    code: `
const zero = spy();
const missing = spy();
mySetTimeout(zero, 0);
mySetTimeout(missing);
expect(zero.calls.length + missing.calls.length, "calls in the same tick").toBe(0);
await clock.tick(20);
expect(zero.calls.length, "calls with delay 0").toBe(1);
expect(missing.calls.length, "calls with no delay").toBe(1);`,
  },
  {
    id: "set-order",
    name: "mySetTimeout: two timers run in the order of their delays",
    part: "set",
    code: `
const order = [];
mySetTimeout(() => order.push("slow"), 200);
mySetTimeout(() => order.push("fast"), 50);
await clock.tick(300);
expect(order).toEqual(["fast", "slow"]);`,
  },
  {
    id: "set-no-real-timer",
    name: "mySetTimeout: does not use setTimeout or setInterval",
    part: "set",
    code: `
const realTimeout = setTimeout;
const realInterval = setInterval;
let used = "nothing";
try {
  setTimeout = () => {
    used = "setTimeout";
  };
  setInterval = () => {
    used = "setInterval";
  };
  const fn = spy();
  mySetTimeout(fn, 50);
  await clock.tick(100);
  expect(used, "timer function that was called").toBe("nothing");
  expect(fn.calls.length, "calls to the callback").toBe(1);
} finally {
  setTimeout = realTimeout;
  setInterval = realInterval;
}`,
  },
  {
    id: "clear-before",
    name: "myClearTimeout: edge case: cancelled before it fires",
    part: "clear",
    code: `
const fn = spy();
const timer = mySetTimeout(fn, 100);
await clock.tick(50);
myClearTimeout(timer);
await clock.tick(1000);
expect(fn.calls.length, "calls after cancelling").toBe(0);`,
  },
  {
    id: "clear-only-own",
    name: "myClearTimeout: cancels only the timer it was given",
    part: "clear",
    code: `
const cancelled = spy();
const kept = spy();
const timer = mySetTimeout(cancelled, 100);
mySetTimeout(kept, 100);
myClearTimeout(timer);
await clock.tick(200);
expect(cancelled.calls.length, "calls to the cancelled callback").toBe(0);
expect(kept.calls.length, "calls to the other callback").toBe(1);`,
  },
  {
    id: "clear-after",
    name: "myClearTimeout: edge case: cancelled after it fired",
    part: "clear",
    code: `
const fn = spy();
const timer = mySetTimeout(fn, 20);
await clock.tick(100);
myClearTimeout(timer);
myClearTimeout(timer);
await clock.tick(100);
expect(fn.calls.length, "calls to the callback").toBe(1);`,
  },
];

function idsOf(part: string): string[] {
  const out: string[] = [];
  for (const test of tests) {
    if (test.part === part) out.push(test.id);
  }
  return out;
}

export const mySetTimeout: CodeProblem = {
  id: "my-set-timeout",
  kind: "code",
  group: "most-repeated",
  title: "setTimeout without setTimeout",
  difficulty: "medium",
  tag: "likely",
  language: "js",
  api: ["mySetTimeout", "myClearTimeout"],
  plainLoops: true,
  statement:
    "Write mySetTimeout(callback, delay, ...args) without using setTimeout or setInterval. Use requestAnimationFrame. Then write myClearTimeout to cancel it.",
  examples: [
    'const timer = mySetTimeout(() => console.log("one second later"), 1000);',
    "myClearTimeout(timer); // nothing is printed",
  ],
  askFirst: [
    "Can I use Date.now() or performance.now()?",
    "Must it be exact, or is one frame late fine?",
    "What should mySetTimeout return?",
  ],
  edgeCases: [
    "delay is 0 or missing",
    "Cancelled before it fires",
    "Cancelled after it fired",
    "A hidden tab: requestAnimationFrame pauses there",
  ],
  parts: [
    {
      id: "set",
      title: "mySetTimeout",
      signature: "mySetTimeout(callback, delay, ...args)",
      steps: [
        line("function mySetTimeout(callback, delay = 0, ...args) {", {
          coach:
            "Let's start, Islam. We need the same shape as the real function: a callback, a delay that is zero when it is missing, and any extra arguments.",
          hint1: "Declare `mySetTimeout` with three parameters: the callback, `delay` with a default value, and a rest parameter.",
          explain: "mySetTimeout takes a callback, a delay that defaults to 0, and extra arguments.",
        }),
        line("  const start = Date.now();", {
          coach: "We have no timer, so we must measure the time by ourselves. For that we need to know when we started.",
          hint1: "`Date.now` gives the current time in milliseconds. Keep it in a variable.",
          explain: "I save the time of the call, so every later check can measure from it.",
        }),
        line("  const timer = { frame: 0 };", {
          coach:
            "The caller needs a handle, something to cancel with later. A plain number would not work, because the frame id changes on every frame.",
          hint1: "An object with one property, `frame`, that starts at 0.",
          explain: "The handle is an object, so it can always hold the latest frame id.",
        }),
        line("  function check() {", {
          coach: "Now we need a function that runs on every frame and asks if the time is over.",
          hint1: "Declare an inner function called `check` with no parameters.",
          explain: "check is the function that I will give to requestAnimationFrame.",
        }),
        line("    if (Date.now() - start >= delay) {", {
          coach: "Inside it we ask the question: has the time since the start reached the delay?",
          hint1: "Subtract `start` from the current time, and check that the result is at least `delay`.",
          explain: "I subtract the start time from the current time and compare the result with the delay.",
        }),
        line("      callback(...args);", {
          coach: "If it has, the wait is over, and the callback runs with the extra arguments.",
          hint1: "Call `callback` and spread `args` into the call.",
          explain: "I call the callback and spread the extra arguments into the call.",
        }),
        line("    } else {", {
          coach: "The other case: the time is not over yet.",
          hint1: "Close the `if` block and open an `else` block on the same line.",
          explain: "Otherwise the delay has not passed yet.",
        }),
        line("      timer.frame = requestAnimationFrame(check);", {
          coach: "Then we must look again on the next frame. We save the id of that frame in the handle, so a cancel can find it.",
          hint1:
            "`requestAnimationFrame` takes the function to run on the next frame and returns an id. Keep that id in `timer.frame`.",
          explain: "requestAnimationFrame runs check again on the next frame, and I keep the new id in the handle.",
        }),
        line("    }\n  }", {
          coach: "We close the else, and then the inner function. Two lines.",
          hint1: "Two closing braces, each on its own line.",
          explain: "The else ends first, and then the inner function ends.",
        }),
        line("  timer.frame = requestAnimationFrame(check);", {
          coach: "The inner function exists now, but nothing has run it yet. We ask for the first frame and save its id in the same place.",
          hint1: "The same line as the one inside `check`, but this time outside it.",
          explain: "The first request for a frame starts the loop.",
        }),
        line("  return timer;\n}", {
          coach: "The work of this function is done, so we give the handle back and close the function. Two lines.",
          hint1: "`return` the handle object, then close the function.",
          explain: "I return the handle, so the caller can cancel later.",
          checks: idsOf("set"),
        }),
      ],
    },
    {
      id: "clear",
      title: "myClearTimeout",
      signature: "myClearTimeout(timer)",
      steps: [
        line("function myClearTimeout(timer) {", {
          coach: "Now the function that cancels. It takes the handle that the first function gave back.",
          hint1: "Declare a function called `myClearTimeout` with one parameter.",
          explain: "myClearTimeout takes the handle that mySetTimeout returned.",
        }),
        line("  cancelAnimationFrame(timer.frame);\n}", {
          coach: "The handle holds the id of the frame that is waiting now, so we cancel that frame and close the function. Two lines.",
          hint1: "Give the latest frame id, `timer.frame`, to `cancelAnimationFrame`. Then close the function.",
          explain: "Cancelling the waiting frame stops the loop, so the callback is never called.",
          checks: idsOf("clear"),
        }),
      ],
    },
  ],
  tests,
  complexity: "One check per frame, about 60 per second, until the time has passed.",
  followUps: [
    {
      question: "Why is it less exact than setTimeout?",
      answer: "It only checks once per frame, so it can be about 16 ms late. And frames stop while the tab is hidden.",
    },
    {
      question: "Why return an object and not a number?",
      answer: "The frame id changes on every frame. The object always holds the latest one, so cancel still works.",
    },
  ],
};
