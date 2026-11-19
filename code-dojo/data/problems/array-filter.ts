import type { CodeProblem } from "../types";

export const arrayFilter: CodeProblem = {
  id: "array-filter",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.filter",
  difficulty: "easy",
  tag: "polyfill",
  statement: "Write your own filter, as Array.prototype.myFilter.",
  examples: ["[1, 2, 3, 4].myFilter((x) => x % 2 === 0); // [2, 4]"],
  askFirst: ["Do I pass index and array to the callback?", "Do I need to support thisArg?"],
  edgeCases: ["Callback is not a function", "Holes in the array", "Nothing passes: return an empty array"],
  parts: [
    {
      id: "main",
      title: "myFilter",
      signature: "Array.prototype.myFilter(callback, thisArg)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: method جديدة على كل الـ arrays، بدالة عادية علشان `this`. بتاخد الـ callback وقيمة اختيارية لـ `this`.",
          expected: "Array.prototype.myFilter = function (callback, thisArg) {",
          hint1: "`Array.prototype.myFilter` بيساوي `function` بتاخد `callback` و `thisArg`.",
          hint2: "Array._________.myFilter = function (________, _______) {",
          explain: "I add myFilter to Array.prototype with a regular function, so this is the array.",
        },
        {
          coach: "الناتج هنا مش بنفس الطول، فنبدأ بـ array فاضية ونضيف فيها اللي ينجح بس.",
          expected: "  const result = [];",
          hint1: "`const` اسمه `result` وقيمته array فاضية.",
          hint2: "const ______ = [];",
          explain: "The result starts as an empty array.",
        },
        {
          coach: "لف على `this` من الأول للآخر.",
          expected: "  for (let i = 0; i < this.length; i++) {",
          accept: ["for (let i = 0; i < this.length; i += 1) {", "for (let i = 0; i < this.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `this.length`.",
          hint2: "for (let _ = 0; _ < this.______; _++) {",
          explain: "I loop over this, which is the array.",
        },
        {
          coach:
            "شرطين في `if` واحدة: الـ index موجود فعلًا، والـ callback رجّع حاجة truthy لما اتنادى بالعنصر والـ index والـ array.",
          expected: "    if (i in this && callback.call(thisArg, this[i], i, this)) {",
          hint1: "`i in this` وبعدها `&&` وبعدها `callback.call` بـ `thisArg` و `this[i]` و `i` و `this`.",
          hint2: "if (_ in ____ && ________.call(_______, this[_], _, ____)) {",
          explain: "For every index that exists, I call the callback. If it returns a truthy value,",
        },
        {
          coach: "لو الشرطين اتحققوا، ضيف العنصر نفسه في الناتج.",
          expected: "      result.push(this[i]);",
          hint1: "`result.push` للعنصر `this[i]`.",
          hint2: "______.push(this[_]);",
          explain: "I push the item into the result.",
        },
        {
          coach: "اقفل الـ `if` واقفل الـ loop. سطرين.",
          expected: "    }\n  }",
          hint1: "قوسين قفل، كل واحد في سطر.",
          hint2: "_\n_",
          explain: "I close the if and the loop.",
        },
        {
          coach: "رجّع الناتج واقفل الدالة، ومعاها semicolon علشان ده assignment. سطرين.",
          expected: "  return result;\n};",
          hint1: "`return result`، وبعدها قوس قفل ومعاه semicolon.",
          hint2: "return ______;\n_;",
          explain: "At the end I return the result.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "keeps the items the callback accepts",
      code: `expect([1, 2, 3, 4].myFilter((x) => x % 2 === 0)).toEqual([2, 4]);`,
    },
    {
      name: "passes the item, the index and the array to the callback",
      code: `
const fn = spy(() => true);
const list = ["a", "b"];
list.myFilter(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[1][0]).toBe("b");
expect(fn.calls[1][1]).toBe(1);
expect(fn.calls[1][2], "third argument").toBe(list);`,
    },
    {
      name: "uses thisArg as this",
      code: `
const fn = spy(() => true);
const context = { name: "context" };
[1].myFilter(fn, context);
expect(fn.thisValues[0], "this inside the callback").toBe(context);`,
    },
    {
      name: "any truthy value keeps the item, any falsy value drops it",
      code: `
const answers = [1, 0, "yes", "", {}, null, undefined, NaN];
const kept = ["a", "b", "c", "d", "e", "f", "g", "h"].myFilter((item, i) => answers[i]);
expect(kept).toEqual(["a", "c", "e"]);`,
    },
    {
      name: "returns a new array and does not change the original",
      code: `
const original = [1, 2, 3];
const result = original.myFilter(() => true);
expect(result).toEqual([1, 2, 3]);
expect(result, "the result").not.toBe(original);
expect(original, "the original after the call").toEqual([1, 2, 3]);`,
    },
    {
      name: "edge case: nothing passes",
      code: `expect([1, 2, 3].myFilter(() => false)).toEqual([]);`,
    },
    {
      name: "edge case: empty array",
      code: `
const fn = spy(() => true);
expect([].myFilter(fn)).toEqual([]);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
    },
    {
      name: "edge case: holes in the array are skipped",
      code: `
const fn = spy(() => true);
const result = [1, , 3].myFilter(fn);
expect(result).toEqual([1, 3]);
expect(fn.calls.length, "calls to the callback").toBe(2);`,
    },
    {
      name: "edge case: callback is not a function",
      code: `expect(() => [1, 2].myFilter("nope")).toThrow(TypeError);`,
    },
  ],
  complexity: "O(n).",
  idea: "نفس شكل `myMap`، بس الناتج array فاضية بنضيف فيها العنصر نفسه لما الـ callback يرجّع truthy.",
  followUps: [
    {
      question: "What is the difference from map?",
      answer:
        "map keeps the length and stores what the callback returns. filter keeps the item itself, only when the callback returns a truthy value.",
    },
  ],
};
