import type { OutputProblem } from "../types";

export const asyncAwaitOrder: OutputProblem = {
  id: "async-await-order",
  kind: "output",
  group: "output",
  title: "async / await order",
  difficulty: "medium",
  tag: "likely",
  statement: "Say what this code prints, in order, and why.",
  askFirst: ["Is it one script, run from the top?", "Does any function wait for a real timer?"],
  edgeCases: [
    "The function that is awaited still runs right away",
    "The code after await waits, even if the promise is already resolved",
  ],
  code: `async function second() {
  console.log("second");
}

async function first() {
  console.log("first: start");
  await second();
  console.log("first: end");
}

console.log("script start");

setTimeout(() => console.log("timeout"), 0);

first();

Promise.resolve().then(() => console.log("promise"));

console.log("script end");`,
  output: [
    { text: "script start", why: "The two functions above are only declared. This is the first line that runs." },
    {
      text: "first: start",
      why: "Calling an async function runs its body at once, until the first await.",
    },
    {
      text: "second",
      why: "await second() calls second first. Its body is sync, so it prints right away.",
    },
    {
      text: "script end",
      why: "At the await, first pauses and gives control back. The script goes on to its last line.",
    },
    {
      text: "first: end",
      why: "The rest of first is a microtask. It was queued at the await, before the then below.",
    },
    { text: "promise", why: "This then was queued after the await, so it is the second microtask." },
    { text: "timeout", why: "A timer is a macrotask. It runs after all the microtasks." },
  ],
  complexity:
    "No complexity. The rule: an async function is sync until the first await. Everything after an await is a microtask.",
  followUps: [
    {
      question: "What does an async function return?",
      answer: "Always a promise. A returned value becomes the resolved value, a thrown error becomes a rejection.",
    },
    {
      question: "Is 'second' printed before or after 'script end', and why?",
      answer: "Before. The call second() happens first, and only its result is awaited.",
    },
    {
      question: "How do you write first without async and await?",
      answer:
        "I log the start, then return second().then(() => console.log('first: end')). It is the same order.",
    },
  ],
};
