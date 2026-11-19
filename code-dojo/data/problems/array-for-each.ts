import type { CodeProblem } from "../types";

export const arrayForEach: CodeProblem = {
  id: "array-for-each",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.forEach",
  difficulty: "easy",
  tag: "polyfill",
  statement: "Write your own forEach, as Array.prototype.myForEach.",
  examples: ['["a", "b"].myForEach((item, i) => console.log(i, item)); // 0 "a", then 1 "b"'],
  askFirst: [
    "Do I pass index and array to the callback?",
    "Do I need to support thisArg?",
    "What should it return?",
  ],
  edgeCases: ["Empty array", "Callback is not a function", "Holes in the array"],
  parts: [
    {
      id: "main",
      title: "myForEach",
      signature: "Array.prototype.myForEach(callback, thisArg)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: نفس بداية `myMap`. method على كل الـ arrays بدالة عادية، بتاخد الـ callback وقيمة اختيارية لـ `this`.",
          expected: "Array.prototype.myForEach = function (callback, thisArg) {",
          hint1: "`Array.prototype.myForEach` بيساوي `function` بتاخد `callback` و `thisArg`.",
          hint2: "Array._________.myForEach = function (________, _______) {",
          explain: "I add myForEach to Array.prototype with a regular function, so this is the array.",
        },
        {
          coach: "اتأكد الأول إن اللي جه دالة.",
          expected: '  if (typeof callback !== "function") {',
          hint1: "`if` بتقارن `typeof callback` بكلمة function كنص، بـ `!==`.",
          hint2: 'if (typeof ________ !== "________") {',
          explain: "First I check that the callback is a function.",
        },
        {
          coach: "لو مش دالة، ارمي `TypeError` واقفل الـ `if`. سطرين.",
          expected: '    throw new TypeError(callback + " is not a function");\n  }',
          hint1:
            "`throw new TypeError`، والرسالة هي `callback` زائد نص بيبدأ بمسافة: is not a function.",
          hint2: 'throw new _________(________ + " is not a ________");\n}',
          explain: "If it is not, I throw a TypeError.",
        },
        {
          coach: "لف على `this`. مفيش array ناتج المرة دي.",
          expected: "  for (let i = 0; i < this.length; i++) {",
          accept: ["for (let i = 0; i < this.length; i += 1) {", "for (let i = 0; i < this.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `this.length`.",
          hint2: "for (let _ = 0; _ < this.______; _++) {",
          explain: "I loop over this, which is the array. There is no result array.",
        },
        {
          coach: "عدّي الأماكن الفاضية زي الـ method الأصلية.",
          expected: "    if (i in this) {",
          hint1: "استخدم `in`: هل `i` موجود جوه `this`؟",
          hint2: "if (_ in ____) {",
          explain: "I skip holes.",
        },
        {
          coach: "نادي الـ callback بالعنصر والـ index والـ array وبالـ `thisArg`. ومتحفظش الناتج في حاجة.",
          expected: "      callback.call(thisArg, this[i], i, this);",
          hint1: "`callback.call` بـ `thisArg` وبعده `this[i]` و `i` و `this`.",
          hint2: "________.call(_______, this[_], _, ____);",
          explain: "I call the callback with the item, the index and the array. I do not keep what it returns.",
        },
        {
          coach:
            "اقفل الـ `if` والـ loop والدالة. مفيش `return` علشان الـ method دي بترجّع `undefined`. تلات سطور.",
          expected: "    }\n  }\n};",
          hint1: "قوسين قفل، وبعدهم قوس قفل ومعاه semicolon.",
          hint2: "_\n_\n_;",
          explain: "There is no return, so the result is undefined.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "calls the callback for every item, in order",
      code: `
const seen = [];
[10, 20, 30].myForEach((x) => seen.push(x));
expect(seen).toEqual([10, 20, 30]);`,
    },
    {
      name: "passes the item, the index and the array to the callback",
      code: `
const fn = spy();
const list = ["a", "b"];
list.myForEach(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[1][0]).toBe("b");
expect(fn.calls[1][1]).toBe(1);
expect(fn.calls[1][2], "third argument").toBe(list);`,
    },
    {
      name: "uses thisArg as this",
      code: `
const fn = spy();
const context = { name: "context" };
[1].myForEach(fn, context);
expect(fn.thisValues[0], "this inside the callback").toBe(context);`,
    },
    {
      name: "returns undefined",
      code: `expect([1, 2].myForEach((x) => x * 2)).toBe(undefined);`,
    },
    {
      name: "does not change the array",
      code: `
const original = [1, 2, 3];
original.myForEach((x) => x * 2);
expect(original).toEqual([1, 2, 3]);`,
    },
    {
      name: "edge case: empty array",
      code: `
const fn = spy();
[].myForEach(fn);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
    },
    {
      name: "edge case: holes in the array are skipped",
      code: `
const fn = spy();
[1, , 3].myForEach(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[1][1], "index of the second call").toBe(2);`,
    },
    {
      name: "edge case: callback is not a function",
      code: `
expect(() => [1].myForEach("nope")).toThrow(TypeError);
expect(() => [].myForEach()).toThrow(TypeError);`,
    },
  ],
  complexity: "O(n).",
  idea: "هي `myMap` من غير array ناتج ومن غير `return`. بننادي الـ callback وخلاص.",
  followUps: [
    {
      question: "Can you stop a forEach in the middle?",
      answer: "No. break does not work inside the callback. For that I use a plain for loop.",
    },
    {
      question: "What does forEach return?",
      answer: "Always undefined, so it cannot be chained like map or filter.",
    },
  ],
};
