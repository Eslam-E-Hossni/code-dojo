import type { CodeProblem } from "../types";

export const currying: CodeProblem = {
  id: "currying",
  kind: "code",
  group: "most-repeated",
  title: "Currying: add(3)(4)",
  difficulty: "medium",
  tag: "reported",
  statement: "Make add(3)(4) return 7. Then make it work for any number of calls.",
  examples: [
    "add(3)(4); // 7",
    "sum(1)(2)(3)(); // 6",
    "",
    "const addThree = curry((a, b, c) => a + b + c);",
    "addThree(1)(2)(3); // 6",
  ],
  askFirst: [
    "Is it always two calls, or any number?",
    "How do I know the chain is finished: an empty call?",
  ],
  edgeCases: ["Called with no argument", "More arguments than the function needs"],
  parts: [
    {
      id: "add",
      title: "Two calls: add(3)(4)",
      signature: "add(a)(b)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: `add(3)(4)` معناها إن `add` نفسها بتاخد رقم واحد بس. اكتب تعريفها.",
          expected: "function add(a) {",
          hint1: "دالة اسمها `add` وبتاخد `a`.",
          hint2: "function ___(_) {",
          explain: "add takes the first number.",
        },
        {
          coach: "وبترجّع إيه؟ دالة تانية مستنية الرقم التاني.",
          expected: "  return function (b) {",
          accept: ["return (b) => {"],
          hint1: "`return function` بتاخد `b`.",
          hint2: "return ________ (_) {",
          explain: "It returns a second function that waits for the second number.",
        },
        {
          coach: "الدالة الجوانية لسه شايفة `a` بسبب الـ closure. رجّع المجموع.",
          expected: "    return a + b;",
          hint1: "`return` ومجموع `a` و `b`.",
          hint2: "return _ + _;",
          explain: "The inner function still sees a through the closure, so it returns the sum.",
        },
        {
          coach: "اقفل الدالة الجوانية ومعاها semicolon، وبعدها اقفل `add`. سطرين.",
          expected: "  };\n}",
          hint1: "سطر فيه قوس قفل ومعاه semicolon، وسطر فيه قوس قفل بس.",
          hint2: "_;\n_",
          explain: "I close both functions.",
        },
      ],
    },
    {
      id: "sum",
      title: "Any number of calls: sum(1)(2)(3)()",
      signature: "sum(a)(b)()",
      steps: [
        {
          coach:
            "دلوقتي نخليها تشتغل لأي عدد من النداءات، والنداء الفاضي في الآخر هو اللي بيرجّع الناتج. نفس البداية باسم جديد.",
          expected: "function sum(a) {",
          hint1: "دالة اسمها `sum` وبتاخد `a`.",
          hint2: "function ___(_) {",
          explain: "sum takes the total so far.",
        },
        {
          coach: "وبرضه بترجّع دالة مستنية القيمة اللي بعدها.",
          expected: "  return function (b) {",
          accept: ["return (b) => {"],
          hint1: "`return function` بتاخد `b`.",
          hint2: "return ________ (_) {",
          explain: "It returns a function that takes the next number.",
        },
        {
          coach: "لو النداء جه فاضي، يبقى السلسلة خلصت: رجّع اللي اتجمّع لحد دلوقتي.",
          expected: "    if (b === undefined) return a;",
          hint1: "`if` بتسأل `b` بيساوي `undefined`، ولو آه `return a`.",
          hint2: "if (_ === _________) return _;",
          explain: "An empty call means the chain is finished, so I return the total.",
        },
        {
          coach:
            "ولو فيه رقم، نادي `sum` تاني بالمجموع الجديد. كده بترجع دالة مستنية اللي بعده.",
          expected: "    return sum(a + b);",
          hint1: "`return` ونداء `sum` على `a + b`.",
          hint2: "return ___(_ + _);",
          explain:
            "Otherwise I call sum again with the new total, which gives back a function for the next call.",
        },
        {
          coach: "اقفل الدالة الجوانية ومعاها semicolon، وبعدها اقفل `sum`. سطرين.",
          expected: "  };\n}",
          hint1: "سطر فيه قوس قفل ومعاه semicolon، وسطر فيه قوس قفل بس.",
          hint2: "_;\n_",
          explain: "I close both functions.",
        },
      ],
    },
    {
      id: "curry",
      title: "Generic curry(fn)",
      signature: "curry(fn)",
      steps: [
        {
          coach:
            "آخر جزء يا إسلام: `curry` عامة بتحوّل أي دالة. بتاخد الدالة الأصلية.",
          expected: "function curry(fn) {",
          hint1: "دالة اسمها `curry` وبتاخد `fn`.",
          hint2: "function _____(__) {",
          explain: "curry takes any function.",
        },
        {
          coach:
            "نرجّع دالة ليها اسم، علشان هننادي نفسها تاني من جوه. وتاخد أي عدد من القيم.",
          expected: "  return function curried(...args) {",
          hint1: "`return function` اسمها `curried` ومعاها rest parameter اسمه `args`.",
          hint2: "return function _______(...____) {",
          explain: "I return a named function, because it has to call itself later.",
        },
        {
          coach:
            "السؤال: اتجمّع عندنا قيم كفاية؟ `fn.length` هو عدد الـ parameters اللي الدالة الأصلية مستنياها.",
          expected: "    if (args.length >= fn.length) {",
          hint1: "قارن `args.length` بـ `fn.length` بأكبر من أو يساوي.",
          hint2: "if (____.______ >= __.______) {",
          explain: "fn.length is the number of parameters fn declares. If I have that many arguments,",
        },
        {
          coach: "لو كفاية، نادي الدالة الأصلية بيهم واقفل الـ `if`. سطرين.",
          expected: "      return fn.apply(this, args);\n    }",
          accept: ["return fn.call(this, ...args);\n}"],
          hint1: "`return` ومعاها `fn.apply` بـ `this` و `args`، وبعدها قوس القفل.",
          hint2: "return __.apply(____, ____);\n}",
          explain: "I call the original function with them.",
        },
        {
          coach:
            "ولو لسه ناقص، رجّع arrow بتاخد الباقي، وتنادي `curried` بالقديم والجديد مع بعض.",
          expected: "    return (...next) => curried.apply(this, [...args, ...next]);",
          hint1:
            "`return` arrow بتاخد `...next`، وبتنادي `curried.apply` بـ `this` و array فيها `args` وبعدها `next`.",
          hint2: "return (...____) => _______.apply(____, [...____, ...____]);",
          explain:
            "Otherwise I return a function that takes more arguments and calls curried with the old and the new ones together.",
        },
        {
          coach: "اقفل `curried` ومعاها semicolon، وبعدها اقفل `curry`. سطرين.",
          expected: "  };\n}",
          hint1: "سطر فيه قوس قفل ومعاه semicolon، وسطر فيه قوس قفل بس.",
          hint2: "_;\n_",
          explain: "I close both functions.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "add: add(3)(4) returns 7",
      part: "add",
      code: `expect(add(3)(4)).toBe(7);`,
    },
    {
      name: "add: the first call returns a function",
      part: "add",
      code: `expect(typeof add(3), "typeof add(3)").toBe("function");`,
    },
    {
      name: "add: negative numbers and zero",
      part: "add",
      code: `
expect(add(-1)(1)).toBe(0);
expect(add(0)(0)).toBe(0);
expect(add(-2)(-3)).toBe(-5);`,
    },
    {
      name: "add: the first call can be used many times",
      part: "add",
      code: `
const addFive = add(5);
expect(addFive(1)).toBe(6);
expect(addFive(10)).toBe(15);`,
    },
    {
      name: "sum: sum(1)(2)(3)() returns 6",
      part: "sum",
      code: `expect(sum(1)(2)(3)()).toBe(6);`,
    },
    {
      name: "sum: edge case: one number, then the empty call",
      part: "sum",
      code: `expect(sum(5)()).toBe(5);`,
    },
    {
      name: "sum: a long chain and negative numbers",
      part: "sum",
      code: `
expect(sum(1)(1)(1)(1)(1)(1)()).toBe(6);
expect(sum(-2)(2)(-5)()).toBe(-5);`,
    },
    {
      name: "sum: zero is a number, not the end of the chain",
      part: "sum",
      code: `expect(sum(1)(0)(2)()).toBe(3);`,
    },
    {
      name: "sum: a chain can go on from the middle more than once",
      part: "sum",
      code: `
const three = sum(1)(2);
expect(three(3)()).toBe(6);
expect(three(10)()).toBe(13);`,
    },
    {
      name: "curry: one argument at a time",
      part: "curry",
      code: `
const addThree = curry((a, b, c) => a + b + c);
expect(addThree(1)(2)(3)).toBe(6);`,
    },
    {
      name: "curry: the arguments can be grouped in any way",
      part: "curry",
      code: `
const addThree = curry((a, b, c) => a + b + c);
expect(addThree(1, 2)(3)).toBe(6);
expect(addThree(1)(2, 3)).toBe(6);
expect(addThree(1, 2, 3)).toBe(6);`,
    },
    {
      name: "curry: does not call fn before it has all the arguments",
      part: "curry",
      code: `
const calls = [];
const record = curry((a, b, c) => {
  calls.push([a, b, c]);
  return "done";
});
const waiting = record("a")("b");
expect(calls, "calls after two arguments").toEqual([]);
expect(waiting("c")).toBe("done");
expect(calls, "calls after three arguments").toEqual([["a", "b", "c"]]);`,
    },
    {
      name: "curry: edge case: called with no argument",
      part: "curry",
      code: `
const addThree = curry((a, b, c) => a + b + c);
expect(addThree()(1)()(2)(3)).toBe(6);`,
    },
    {
      name: "curry: edge case: more arguments than the function needs",
      part: "curry",
      code: `
const received = [];
const addTwo = curry(function (a, b) {
  received.push(arguments.length);
  return a + b;
});
expect(addTwo(1, 2, 99)).toBe(3);
expect(received, "number of arguments fn got").toEqual([3]);`,
    },
    {
      name: "curry: a partly filled function can be used many times",
      part: "curry",
      code: `
const addThree = curry((a, b, c) => a + b + c);
const addOne = addThree(1);
expect(addOne(2)(3)).toBe(6);
expect(addOne(10)(20)).toBe(31);`,
    },
    {
      name: "curry: a function with no parameters is called at once",
      part: "curry",
      code: `expect(curry(() => "now")()).toBe("now");`,
    },
  ],
  complexity: "O(1) per call.",
  idea: "الدالة بترجّع دالة، والـ closure فاكر الرقم الأول.",
  followUps: [
    {
      question: "What is fn.length?",
      answer:
        "The number of parameters the function declares. curry uses it to know when to call fn.",
    },
  ],
};
