import type { CodeProblem } from "../types";

export const arrayMap: CodeProblem = {
  id: "array-map",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.map",
  difficulty: "medium",
  tag: "polyfill",
  statement: "Add your own map to all arrays, as Array.prototype.myMap.",
  examples: ["[1, 2, 3].myMap((x) => x * 2); // [2, 4, 6]"],
  askFirst: [
    "Do I pass the index and the array to the callback?",
    "Do I need to support thisArg?",
    "Should holes in the array be skipped?",
  ],
  edgeCases: ["Empty array", "Callback is not a function", "Holes in the array"],
  parts: [
    {
      id: "main",
      title: "myMap",
      signature: "Array.prototype.myMap(callback, thisArg)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: هنضيف method على كل الـ arrays. لازم دالة عادية مش arrow علشان `this` تبقى الـ array نفسها. بتاخد الـ callback وقيمة اختيارية لـ `this`.",
          expected: "Array.prototype.myMap = function (callback, thisArg) {",
          hint1: "`Array.prototype.myMap` بيساوي `function` بتاخد `callback` و `thisArg`.",
          hint2: "Array._________.myMap = function (________, _______) {",
          explain: "I add myMap to Array.prototype with a regular function, so this is the array.",
        },
        {
          coach: "قبل أي حاجة: لو اللي جه مش دالة، مينفعش نكمّل. اسأل على نوعه.",
          expected: '  if (typeof callback !== "function") {',
          hint1: "`if` بتقارن `typeof callback` بكلمة function كنص، بـ `!==`.",
          hint2: 'if (typeof ________ !== "________") {',
          explain: "First I check that the callback is a function.",
        },
        {
          coach: "لو مش دالة، ارمي `TypeError` برسالة زي بتاعة المتصفح، واقفل الـ `if`. سطرين.",
          expected: '    throw new TypeError(callback + " is not a function");\n  }',
          hint1:
            "`throw new TypeError`، والرسالة هي `callback` زائد نص بيبدأ بمسافة: is not a function.",
          hint2: 'throw new _________(________ + " is not a ________");\n}',
          explain: "If it is not, I throw a TypeError, like the real map.",
        },
        {
          coach: "جهّز array الناتج بنفس طول الأصلية. كده الأماكن الفاضية هتفضل فاضية.",
          expected: "  const result = new Array(this.length);",
          hint1: "`const` اسمه `result` وقيمته `new Array` بطول `this.length`.",
          hint2: "const ______ = new _____(this.______);",
          explain: "The result is a new array with the same length, so holes stay holes.",
        },
        {
          coach: "لف على الـ array اللي اتنادت عليها الـ method، يعني `this`.",
          expected: "  for (let i = 0; i < this.length; i++) {",
          accept: ["for (let i = 0; i < this.length; i += 1) {", "for (let i = 0; i < this.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `this.length`.",
          hint2: "for (let _ = 0; _ < this.______; _++) {",
          explain: "I loop over this, which is the array.",
        },
        {
          coach: "الـ array ممكن يبقى فيها أماكن فاضية. اتأكد إن الـ index ده موجود فعلًا قبل ما تنادي.",
          expected: "    if (i in this) {",
          hint1: "استخدم `in`: هل `i` موجود جوه `this`؟",
          hint2: "if (_ in ____) {",
          explain: "I skip holes: the callback runs only for indexes that exist.",
        },
        {
          coach:
            "نادي الـ callback بالتلاتة: العنصر والـ index والـ array، وبالـ `thisArg`. وحط الناتج في نفس المكان.",
          expected: "      result[i] = callback.call(thisArg, this[i], i, this);",
          hint1: "`result[i]` بيساوي `callback.call` بـ `thisArg` وبعده `this[i]` و `i` و `this`.",
          hint2: "______[_] = ________.call(_______, this[_], _, ____);",
          explain:
            "I call the callback with the item, the index and the array, and store what it returns at the same index.",
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
          explain: "At the end I return the new array.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "maps every item",
      code: `expect([1, 2, 3].myMap((x) => x * 2)).toEqual([2, 4, 6]);`,
    },
    {
      name: "passes the item, the index and the array to the callback",
      code: `
const fn = spy((x) => x);
const list = ["a", "b"];
list.myMap(fn);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[0][0]).toBe("a");
expect(fn.calls[0][1]).toBe(0);
expect(fn.calls[0][2], "third argument").toBe(list);
expect(fn.calls[1][1]).toBe(1);`,
    },
    {
      name: "uses thisArg as this",
      code: `
const fn = spy();
const context = { name: "context" };
[1].myMap(fn, context);
expect(fn.thisValues[0], "this inside the callback").toBe(context);`,
    },
    {
      name: "returns a new array and does not change the original",
      code: `
const original = [1, 2, 3];
const result = original.myMap((x) => x + 1);
expect(result, "the result").not.toBe(original);
expect(original, "the original after the call").toEqual([1, 2, 3]);`,
    },
    {
      name: "keeps undefined results",
      code: `expect([1, 2].myMap(() => undefined)).toEqual([undefined, undefined]);`,
    },
    {
      name: "edge case: empty array",
      code: `
const fn = spy();
expect([].myMap(fn)).toEqual([]);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
    },
    {
      name: "edge case: callback is not a function",
      code: `
expect(() => [1].myMap("nope")).toThrow(TypeError);
expect(() => [1].myMap()).toThrow(TypeError);`,
    },
    {
      name: "edge case: holes in the array stay holes",
      code: `
const fn = spy((x) => x * 2);
const sparse = [1, , 3];
const result = sparse.myMap(fn);
expect(result.length, "length of the result").toBe(3);
expect(1 in result, "index 1 exists in the result").toBe(false);
expect(result[0]).toBe(2);
expect(result[2]).toBe(6);
expect(fn.calls.length, "calls to the callback").toBe(2);`,
    },
    {
      name: "gives the same result as the real map",
      code: `
const words = ["a", "bb", "", "dddd"];
expect(words.myMap((word, i) => word.length + i)).toEqual(words.map((word, i) => word.length + i));`,
    },
  ],
  complexity: "O(n).",
  idea: "استخدم `function` عادية مش arrow علشان `this` تبقى الـ array. وقول إن تعديل الـ prototypes الجاهزة مش ممارسة كويسة في كود حقيقي.",
  followUps: [
    {
      question: "Why not an arrow function?",
      answer: "An arrow has no own 'this', so 'this' would not be the array.",
    },
    {
      question: "Why is it a bad idea in real code?",
      answer: "It affects all code and can clash with future language features.",
    },
  ],
};
