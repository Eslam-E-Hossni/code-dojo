import type { OutputProblem } from "../types";

/**
 * Based on the "What is 'this' in each line?" snippet. The original prints
 * `this` itself, and that is `window` in one place and `undefined` in
 * another. Here the code is in strict mode and compares with `obj`, so it
 * prints the same lines everywhere.
 */
export const lostThis: OutputProblem = {
  id: "lost-this",
  kind: "output",
  group: "output",
  title: "What is 'this' in each line?",
  difficulty: "medium",
  tag: "reported",
  statement: "Read the snippet and say what each console.log prints. The code runs in strict mode.",
  askFirst: ["Is the code in strict mode or in a module?", "Does it run in a browser or in Node?"],
  edgeCases: ["Arrow function as a method", "A method passed as a callback"],
  code: `"use strict";

const obj = {
  foo: function () {
    return this;
  },
  arrow: () => this,
};

function bar() {
  return this;
}

const lost = obj.foo;

console.log(obj.foo() === obj);
console.log(bar());
console.log(lost());
console.log(obj.arrow() === obj);
console.log(lost.call(obj) === obj);`,
  output: [
    { text: "true", why: "foo is called as a method, obj.foo(). The object before the dot becomes 'this'." },
    {
      text: "undefined",
      why: "bar is called as a plain function. In strict mode 'this' is then undefined. Without strict mode it is the global object.",
    },
    {
      text: "undefined",
      why: "lost is the same function as obj.foo, but it is called without an object. So 'this' is lost. This is what happens when a method is passed as a callback.",
    },
    {
      text: "false",
      why: "An arrow function has no 'this' of its own. It takes it from the code around the object, and an object literal does not make a new scope. So it is not obj.",
    },
    { text: "true", why: "call sets 'this' by hand. So the same function sees obj again." },
  ],
  complexity: "No complexity here. The rule: 'this' depends on how the function is called.",
  idea: "القاعدة: `this` بتتحدد بطريقة النداء، مش بمكان كتابة الدالة. بص على اللي قبل النقطة لحظة النداء. والـ arrow function ملهاش `this` خالص، بتاخدها من برّه.",
  followUps: [
    {
      question: "What changes with an arrow function for foo?",
      answer: "It takes 'this' from outside the object, so it is not obj.",
    },
    {
      question: "How do you force 'this'?",
      answer: "With call, apply or bind.",
    },
    {
      question: "What is 'this' in name: this, written inside the object literal?",
      answer:
        "The outer 'this'. An object literal makes no new scope. In a browser script that is window, in a module it is undefined.",
    },
    {
      question: "How do you pass obj.foo as a callback and keep 'this'?",
      answer: "I pass obj.foo.bind(obj), or an arrow function that calls obj.foo().",
    },
  ],
};
