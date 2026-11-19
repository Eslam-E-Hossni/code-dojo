import type { OutputProblem } from "../types";

export const varInLoop: OutputProblem = {
  id: "var-in-loop",
  kind: "output",
  group: "output",
  title: "var in a loop with setTimeout",
  difficulty: "easy",
  tag: "likely",
  statement: "Say what this code prints, in order, and why the two loops are different.",
  askFirst: ["Is it one script, run from the top?", "Is the delay really 0 in both loops?"],
  edgeCases: [
    "The loop ends before the first timer runs",
    "var has one variable for the whole loop, let has a new one every round",
  ],
  code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("var", i), 0);
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("let", j), 0);
}

console.log("loops done");`,
  output: [
    {
      text: "loops done",
      why: "Both loops are sync. They only create six timers. No timer can run before the script ends.",
    },
    {
      text: "var 3",
      why: "var makes one variable i for the whole loop. When the timers run, the loop is over and i is 3.",
    },
    { text: "var 3", why: "The second callback reads the same i. It is still 3." },
    { text: "var 3", why: "The third callback reads the same i again." },
    {
      text: "let 0",
      why: "let makes a new j for every round of the loop. This callback closed over the j of round 0.",
    },
    { text: "let 1", why: "This callback has its own j, from round 1." },
    { text: "let 2", why: "This callback has its own j, from round 2." },
  ],
  complexity:
    "No complexity. The rule: a closure keeps the variable, not the value. var has one variable, let has one per round.",
  idea: "الـ callback مش بيحفظ قيمة `i`، هو بيحفظ المتغير نفسه. مع `var` فيه متغير واحد بس، ولما التايمر يشتغل بيكون بقى 3. مع `let` كل لفة ليها متغير جديد.",
  followUps: [
    {
      question: "How do you fix the var loop without let?",
      answer:
        "I wrap the body in a function that takes i as a parameter, an IIFE. Or I pass i as the third argument of setTimeout.",
    },
    {
      question: "Why 3 and not 2?",
      answer: "The loop stops when i < 3 is false. That happens when i is 3.",
    },
    {
      question: "Why do all the var lines come before the let lines?",
      answer: "All six timers have the same delay, so they run in the order they were created.",
    },
  ],
};
