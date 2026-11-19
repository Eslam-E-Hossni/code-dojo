import type { CodeProblem } from "../types";

export const arrayReduce: CodeProblem = {
  id: "array-reduce",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Array.prototype.reduce",
  difficulty: "medium",
  tag: "polyfill",
  statement: "Write your own reduce, as Array.prototype.myReduce.",
  examples: ["[1, 2, 3].myReduce((acc, x) => acc + x, 0); // 6"],
  askFirst: [
    "Should reduce work without an initial value?",
    "Do I pass index and array to the callback?",
  ],
  edgeCases: [
    "reduce on an empty array with no initial value: TypeError",
    "Callback is not a function",
    "Holes in the array",
  ],
  parts: [
    {
      id: "main",
      title: "myReduce",
      signature: "Array.prototype.myReduce(callback, initialValue)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: method على كل الـ arrays بدالة عادية. بتاخد الـ callback وقيمة البداية، وقيمة البداية ممكن متتبعتش.",
          expected: "Array.prototype.myReduce = function (callback, initialValue) {",
          hint1: "`Array.prototype.myReduce` بيساوي `function` بتاخد `callback` و `initialValue`.",
          hint2: "Array._________.myReduce = function (________, ____________) {",
          explain: "I add myReduce to Array.prototype. It takes a callback and an optional initial value.",
        },
        {
          coach: "المتغير اللي هنجمّع فيه بيبدأ بقيمة البداية اللي جت.",
          expected: "  let acc = initialValue;",
          hint1: "`let` اسمه `acc` وقيمته `initialValue`.",
          hint2: "let ___ = ____________;",
          explain: "The accumulator starts as the initial value.",
        },
        {
          coach: "ومتغير تاني لمكان بداية الـ loop، علشان ممكن نبدأ من صفر أو من واحد.",
          expected: "  let start = 0;",
          hint1: "`let` اسمه `start` وقيمته صفر.",
          hint2: "let _____ = 0;",
          explain: "And the loop starts at index 0.",
        },
        {
          coach:
            "هل قيمة البداية اتبعتت أصلًا؟ متقارنش بـ `undefined` علشان ممكن حد يبعتها بنفسه. اسأل على عدد اللي اتبعت.",
          expected: "  if (arguments.length < 2) {",
          hint1: "`arguments.length` أقل من 2، يعني الـ callback بس اللي جه.",
          hint2: "if (_________.______ < 2) {",
          explain: "arguments.length tells me if an initial value was passed at all.",
        },
        {
          coach: "ولو مفيش قيمة بداية والـ array كمان فاضية؟ مفيش حاجة نبدأ بيها خالص.",
          expected: "    if (this.length === 0) {",
          hint1: "`if` بتسأل `this.length` بيساوي صفر.",
          hint2: "if (this.______ === 0) {",
          explain: "With no initial value and an empty array there is nothing to start from,",
        },
        {
          coach: "ارمي `TypeError` بنفس رسالة المتصفح، واقفل الـ `if` الجوانية. سطرين.",
          expected: '      throw new TypeError("Reduce of empty array with no initial value");\n    }',
          hint1: "`throw new TypeError` والرسالة: Reduce of empty array with no initial value.",
          hint2: 'throw new _________("Reduce of _____ array with no _______ value");\n}',
          explain: "so I throw a TypeError.",
        },
        {
          coach: "غير كده، أول عنصر هو اللي هيبقى قيمة البداية.",
          expected: "    acc = this[0];",
          hint1: "`acc` بيساوي `this[0]`.",
          hint2: "___ = this[_];",
          explain: "Otherwise the first item becomes the accumulator,",
        },
        {
          coach: "والـ loop تبدأ من العنصر التاني علشان الأول اتاخد. واقفل الـ `if`. سطرين.",
          expected: "    start = 1;\n  }",
          hint1: "`start` بيساوي 1، وبعدها قوس القفل.",
          hint2: "_____ = 1;\n}",
          explain: "and the loop starts at index 1.",
        },
        {
          coach: "دلوقتي الـ loop نفسها، من `start` لآخر الـ array.",
          expected: "  for (let i = start; i < this.length; i++) {",
          accept: ["for (let i = start; i < this.length; i += 1) {", "for (let i = start; i < this.length; ++i) {"],
          hint1: "`for` بعدّاد `i` يبدأ من `start` لحد `this.length`.",
          hint2: "for (let _ = _____; _ < this.______; _++) {",
          explain: "I loop from start to the end.",
        },
        {
          coach:
            "كل لفة: نادي الـ callback باللي اتجمّع والعنصر والـ index والـ array، واللي يرجع يبقى هو المجمّع الجديد. واقفل الـ loop. سطرين.",
          expected: "    acc = callback(acc, this[i], i, this);\n  }",
          hint1: "`acc` بيساوي `callback` بأربع قيم: `acc` و `this[i]` و `i` و `this`.",
          hint2: "___ = ________(___, this[_], _, ____);\n}",
          explain: "On every step the callback gets the accumulator and the item, and returns the new accumulator.",
        },
        {
          coach: "رجّع اللي اتجمّع واقفل الدالة، ومعاها semicolon. سطرين.",
          expected: "  return acc;\n};",
          hint1: "`return acc`، وبعدها قوس قفل ومعاه semicolon.",
          hint2: "return ___;\n_;",
          explain: "At the end I return the accumulator.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "reduces with an initial value",
      code: `
expect([1, 2, 3].myReduce((acc, x) => acc + x, 0)).toBe(6);
expect([1, 2, 3].myReduce((acc, x) => acc + x, 10)).toBe(16);`,
    },
    {
      name: "with no initial value, the first item is the start",
      code: `
const fn = spy((acc, x) => acc + x);
expect([5, 1, 2].myReduce(fn)).toBe(8);
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[0].slice(0, 3), "first call: acc, item, index").toEqual([5, 1, 1]);`,
    },
    {
      name: "passes the accumulator, the item, the index and the array",
      code: `
const fn = spy((acc, x) => acc + x);
const list = ["a", "b"];
list.myReduce(fn, "");
expect(fn.calls.length, "calls to the callback").toBe(2);
expect(fn.calls[0].slice(0, 3)).toEqual(["", "a", 0]);
expect(fn.calls[1].slice(0, 3)).toEqual(["a", "b", 1]);
expect(fn.calls[1][3], "fourth argument").toBe(list);`,
    },
    {
      name: "can build any kind of result",
      code: `
const counts = ["a", "b", "a"].myReduce((acc, letter) => {
  acc[letter] = (acc[letter] || 0) + 1;
  return acc;
}, {});
expect(counts).toEqual({ a: 2, b: 1 });`,
    },
    {
      name: "edge case: empty array with an initial value returns it",
      code: `
const fn = spy();
expect([].myReduce(fn, "start")).toBe("start");
expect(fn.calls.length, "calls to the callback").toBe(0);`,
    },
    {
      name: "edge case: empty array with no initial value throws a TypeError",
      code: `expect(() => [].myReduce((acc, x) => acc + x)).toThrow(TypeError);`,
    },
    {
      name: "edge case: one item and no initial value returns the item",
      code: `
const fn = spy();
expect([7].myReduce(fn)).toBe(7);
expect(fn.calls.length, "calls to the callback").toBe(0);`,
    },
    {
      name: "edge case: undefined passed as the initial value still counts",
      code: `
const result = [1, 2].myReduce((acc, x) => String(acc) + x, undefined);
expect(result).toBe("undefined12");`,
    },
    {
      name: "edge case: callback is not a function",
      code: `expect(() => [1, 2].myReduce("nope", 0)).toThrow(TypeError);`,
    },
  ],
  complexity: "O(n).",
  idea: "في `reduce`: لو مفيش initial value، أول عنصر هو البداية والـ loop تبدأ من واحد.",
  followUps: [
    {
      question: "What does reduce do with no initial value?",
      answer: "It uses the first item as the start and begins the loop at index 1.",
    },
  ],
};
