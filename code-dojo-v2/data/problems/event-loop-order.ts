import type { OutputProblem } from "../types";

export const eventLoopOrder: OutputProblem = {
  id: "event-loop-order",
  kind: "output",
  group: "output",
  title: "Print order: microtasks and macrotasks",
  difficulty: "medium",
  tag: "reported",
  statement: "Say what this code prints, in order, and why.",
  askFirst: ["Is it one script, run from the top?"],
  edgeCases: ["A timer created inside a promise callback", "Code before the first await runs sync"],
  code: `console.log("start");

setTimeout(() => console.log("timeout"), 0);

Promise.resolve()
  .then(() => {
    console.log("promise 1");
    setTimeout(() => console.log("timeout inside promise"), 0);
  })
  .then(() => console.log("promise 2"));

(async function () {
  console.log("async start");
  await null;
  console.log("after await");
})();

console.log("end");`,
  output: [
    { text: "start", why: "Sync code. It is the first line of the script." },
    {
      text: "async start",
      why: "An async function runs like a normal function until its first await. So this is still sync.",
    },
    { text: "end", why: "The last sync line. Only now the call stack is empty." },
    {
      text: "promise 1",
      why: "The stack is empty, so the microtasks run. This then was queued first.",
    },
    {
      text: "after await",
      why: "The code after await is a microtask too. It was queued second, right after the first then.",
    },
    {
      text: "promise 2",
      why: "The second then is queued only when the first then finishes. By then 'after await' was already waiting.",
    },
    {
      text: "timeout",
      why: "Timers are macrotasks. They run only when the microtask queue is empty. This timer was created first.",
    },
    {
      text: "timeout inside promise",
      why: "This timer was created later, inside a microtask. So it is behind the first timer.",
    },
  ],
  complexity: "No complexity. The rule: sync, then all microtasks, then one macrotask.",
  followUps: [
    {
      question: "Why is 'promise 2' after 'after await'?",
      answer:
        "The second then is queued only when the first then finishes. 'after await' was already in the queue.",
    },
    {
      question: "What changes if the first timer has a delay of 10 instead of 0?",
      answer:
        "Then 'timeout inside promise' prints before 'timeout'. Timers run in order of their time, and 0 ms comes first.",
    },
  ],
};
