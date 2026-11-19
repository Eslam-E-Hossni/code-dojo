import type { OutputProblem } from "../types";

export const hoistingTdz: OutputProblem = {
  id: "hoisting-tdz",
  kind: "output",
  group: "output",
  title: "Hoisting and the TDZ",
  difficulty: "medium",
  tag: "likely",
  statement: "Say what each console.log prints, and why some lines do not throw.",
  askFirst: ["Is it one script, run from the top?", "Is every variable declared in this same scope?"],
  edgeCases: [
    "Reading a var before its line",
    "Reading a let before its line: the temporal dead zone",
    "A function declaration and a function expression are hoisted differently",
  ],
  code: `console.log(a);
var a = 1;
console.log(a);

try {
  console.log(b);
} catch (error) {
  console.log(error.name);
}
let b = 2;

console.log(typeof declared);
console.log(typeof expressed);

function declared() {}
var expressed = function () {};

console.log(typeof expressed);`,
  output: [
    {
      text: "undefined",
      why: "The declaration var a is hoisted to the top, but not the value. So a exists and is undefined.",
    },
    { text: "1", why: "Now the line a = 1 has run." },
    {
      text: "ReferenceError",
      why: "let b is hoisted too, but it cannot be read before its line. That gap is the temporal dead zone, and reading in it throws.",
    },
    {
      text: "function",
      why: "A function declaration is hoisted with its body. It can be used before its line.",
    },
    {
      text: "undefined",
      why: "expressed is a var. Only the name is hoisted. The function is assigned later, so for now it is undefined.",
    },
    { text: "function", why: "Now the assignment has run, so expressed holds the function." },
  ],
  complexity:
    "No complexity. The rule: declarations are hoisted. var starts as undefined, let and const cannot be read before their line, and a function declaration is ready from the top.",
  idea: "كل التعريفات بتطلع لفوق، بس كل نوع بيطلع بشكل: `var` بيطلع بقيمة undefined، و `let` و `const` بيطلعوا من غير قيمة وممنوع تلمسهم قبل سطرهم، والـ function declaration بتطلع كاملة.",
  followUps: [
    {
      question: "Is let hoisted?",
      answer:
        "Yes. The name is known from the start of the block, but reading it before its line throws a ReferenceError.",
    },
    {
      question: "What does typeof b print inside the temporal dead zone?",
      answer:
        "It throws a ReferenceError too. typeof is safe only for a name that is not declared at all.",
    },
    {
      question: "What happens if you call expressed() before its line?",
      answer: "TypeError: expressed is not a function. It is still undefined at that point.",
    },
  ],
};
