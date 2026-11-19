import type { CodeProblem } from "../types";

export const arraySum: CodeProblem = {
  id: "array-sum",
  kind: "code",
  group: "polyfills",
  title: "Add a method to Array.prototype: sum",
  difficulty: "medium",
  tag: "polyfill",
  statement: "Add your own method to all arrays: sum(), which returns the total of the numbers.",
  examples: ["[1, 2, 3].sum(); // 6"],
  askFirst: ["Which method do you want?", "Should it be safe if it already exists?"],
  edgeCases: [
    "Empty array",
    "The method shows up in for...in if it is enumerable",
    "The method already exists",
  ],
  parts: [
    {
      id: "main",
      title: "sum",
      signature: "Array.prototype.sum()",
      steps: [
        {
          coach:
            "نبدأ يا إسلام بالأمان: منضيفش الـ method لو هي موجودة أصلًا، علشان منبوّظش حاجة حد تاني عملها.",
          expected: "if (!Array.prototype.sum) {",
          hint1: "`if` بتنفي `Array.prototype.sum`.",
          hint2: "if (!Array._________.___) {",
          explain: "First I check that sum does not exist yet, so I do not replace someone else's method.",
        },
        {
          coach:
            "مش هنضيفها بـ assignment عادي، علشان هتظهر في `for...in`. استخدم الطريقة اللي بتتحكم في خصائص الـ property. بتاخد الـ object، واسم الـ property كنص، و object فيه الإعدادات.",
          expected: '  Object.defineProperty(Array.prototype, "sum", {',
          hint1: "`Object.defineProperty` بـ `Array.prototype` وبعده النص sum، وبعده object مفتوح.",
          hint2: 'Object.______________(Array._________, "___", {',
          explain: "I use Object.defineProperty, so I can control how the property behaves.",
        },
        {
          coach: "أول إعداد هو القيمة نفسها: دالة عادية مش arrow، علشان `this` تبقى الـ array.",
          expected: "    value: function () {",
          accept: ["value() {"],
          hint1: "المفتاح `value` وقيمته `function` من غير parameters.",
          hint2: "_____: ________ () {",
          explain: "The value is a regular function, so this is the array.",
        },
        {
          coach: "جوه الدالة: متغير للمجموع يبدأ بصفر. ده اللي بيخلّي الـ array الفاضية ترجّع صفر.",
          expected: "      let total = 0;",
          hint1: "`let` اسمه `total` وقيمته صفر.",
          hint2: "let _____ = 0;",
          explain: "The total starts at 0, which is also the answer for an empty array.",
        },
        {
          coach: "لف على `this` وزوّد كل عنصر على المجموع. الـ loop كلها في سطر واحد.",
          expected: "      for (let i = 0; i < this.length; i++) total += this[i];",
          accept: [
            "for (let i = 0; i < this.length; i++) { total += this[i]; }",
            "for (let i = 0; i < this.length; i += 1) total += this[i];",
            "for (let i = 0; i < this.length; ++i) total += this[i];",
          ],
          hint1: "`for` بعدّاد `i` لحد `this.length`، وجسمها `total += this[i]`.",
          hint2: "for (let _ = 0; _ < this.______; _++) _____ += this[_];",
          explain: "I loop over this and add every item.",
        },
        {
          coach: "رجّع المجموع.",
          expected: "      return total;",
          hint1: "`return` والمتغير اللي فيه المجموع.",
          hint2: "return _____;",
          explain: "Then I return the total.",
        },
        {
          coach: "اقفل الدالة، ومعاها فاصلة علشان لسه فيه إعداد تاني.",
          expected: "    },",
          accept: ["}"],
          hint1: "قوس قفل وبعده فاصلة.",
          hint2: "_,",
          explain: "That is the function.",
        },
        {
          coach: "الإعداد التاني هو اللي بيخبّيها من `for...in`.",
          expected: "    enumerable: false,",
          accept: ["enumerable: false"],
          hint1: "المفتاح `enumerable` وقيمته `false`.",
          hint2: "__________: _____,",
          explain: "enumerable false keeps the method out of for...in loops.",
        },
        {
          coach: "اقفل الـ object وقوس `defineProperty`، وبعدها اقفل الـ `if`. سطرين.",
          expected: "  });\n}",
          hint1: "سطر فيه قوس مجعّد وقوس عادي و semicolon، وسطر فيه قوس الـ `if`.",
          hint2: "_);\n_",
          explain: "I close the call and the if.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "returns the total of the numbers",
      code: `expect([1, 2, 3].sum()).toBe(6);`,
    },
    {
      name: "edge case: empty array",
      code: `expect([].sum()).toBe(0);`,
    },
    {
      name: "one item",
      code: `expect([7].sum()).toBe(7);`,
    },
    {
      name: "negative numbers and decimals",
      code: `
expect([-1, -2, 3].sum()).toBe(0);
expect([0.5, 0.25].sum()).toBe(0.75);`,
    },
    {
      name: "is available on every array",
      code: `
expect(typeof [].sum, "typeof [].sum").toBe("function");
expect(new Array(3).fill(2).sum()).toBe(6);`,
    },
    {
      name: "does not change the array",
      code: `
const numbers = [1, 2, 3];
numbers.sum();
expect(numbers).toEqual([1, 2, 3]);`,
    },
    {
      name: "edge case: the method does not show up in for...in",
      code: `
const keys = [];
for (const key in ["a", "b"]) keys.push(key);
expect(keys, "keys of a for...in over an array").toEqual(["0", "1"]);`,
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
