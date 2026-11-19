import type { OutputProblem } from "../types";

export const valueVsReference: OutputProblem = {
  id: "value-vs-reference",
  kind: "output",
  group: "output",
  title: "Value vs reference",
  difficulty: "medium",
  tag: "likely",
  statement: "Say what each console.log prints, and which lines change the original object.",
  askFirst: ["Is it one script, run from the top?", "Does the spread copy the nested objects too?"],
  edgeCases: [
    "Two names for the same object",
    "A spread copies only the first level",
    "A parameter that gets a new object inside the function",
    "Comparing two arrays with ===",
  ],
  code: `let a = 1;
let b = a;
b = 2;
console.log(a, b);

const box = { color: "red" };
const same = box;
same.color = "blue";
console.log(box.color);

const copy = { ...box };
copy.color = "green";
console.log(box.color, copy.color);

const shelf = { top: { color: "white" } };
const shallow = { ...shelf };
shallow.top.color = "black";
console.log(shelf.top.color);

function paint(item) {
  item.color = "gold";
  item = { color: "pink" };
  return item.color;
}
console.log(paint(box), box.color);

console.log([1, 2] === [1, 2], box === same);`,
  output: [
    {
      text: "1 2",
      why: "A number is copied by value. b gets its own copy of 1, so changing b does not touch a.",
    },
    {
      text: "blue",
      why: "An object is not copied on assignment. box and same hold a reference to the same object, so a change through one name shows through the other.",
    },
    {
      text: "blue green",
      why: "The spread makes a new object with the same first-level values. Changing copy.color changes only the copy.",
    },
    {
      text: "black",
      why: "The spread is a shallow copy. shelf.top and shallow.top are still the same inner object, so the change shows in both.",
    },
    {
      text: "pink gold",
      why: "The function gets a copy of the reference. The first line changes the caller's object. The second line only points the local name at a new object, so box is not replaced.",
    },
    {
      text: "false true",
      why: "=== on objects and arrays compares references, not content. Two array literals are two objects. box and same are one object.",
    },
  ],
  complexity:
    "No complexity. The rule: primitives are copied by value, and objects are shared by reference. A spread copies one level only.",
  followUps: [
    {
      question: "Is JavaScript pass by value or pass by reference?",
      answer:
        "Always pass by value. For an object the value is a reference, so the function can change the object, but it cannot replace the caller's variable.",
    },
    {
      question: "How do I make a deep copy?",
      answer:
        "With structuredClone, or with my own recursive deepClone. JSON.parse(JSON.stringify(x)) loses dates, undefined and functions.",
    },
    {
      question: "Why does this matter in React?",
      answer:
        "React compares state by reference. If I change an object in place, the reference is the same and the component may not render again, so I create a new object.",
    },
  ],
};
