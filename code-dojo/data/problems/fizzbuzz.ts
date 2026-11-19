import type { CodeProblem } from "../types";

export const fizzBuzz: CodeProblem = {
  id: "fizzbuzz",
  kind: "code",
  group: "algorithms",
  title: "FizzBuzz",
  difficulty: "easy",
  tag: "likely",
  statement:
    'Return an array for the numbers 1 to n: "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself otherwise.',
  examples: ['fizzBuzz(5); // [1, 2, "Fizz", 4, "Buzz"]'],
  askFirst: [
    "Should I print the values or return them?",
    "Does it start from 1, and is n included?",
    "Should the plain numbers be numbers or strings?",
  ],
  edgeCases: ["n is 0: empty array", "n is 1", "15 must be FizzBuzz, not Fizz"],
  parts: [
    {
      id: "main",
      title: "fizzBuzz",
      signature: "fizzBuzz(n)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد آخر رقم. اكتب تعريفها.",
          expected: "function fizzBuzz(n) {",
          hint1: "دالة اسمها `fizzBuzz` وبتاخد `n`.",
          hint2: "function ________(_) {",
          explain: "fizzBuzz takes the last number.",
        },
        {
          coach: "هنجمّع الناتج في array.",
          expected: "  const result = [];",
          hint1: "`const` اسمه `result` وقيمته array فاضية.",
          hint2: "const ______ = [];",
          explain: "I collect the answers in an array.",
        },
        {
          coach: "لف من واحد لحد `n`، و `n` نفسها داخلة.",
          expected: "  for (let i = 1; i <= n; i++) {",
          accept: ["for (let i = 1; i <= n; i += 1) {", "for (let i = 1; i <= n; ++i) {"],
          hint1: "`for` بعدّاد `i` يبدأ من 1، وشرطها أصغر من أو يساوي `n`.",
          hint2: "for (let _ = 1; _ <= _; _++) {",
          explain: "I loop from 1 to n, and n is included.",
        },
        {
          coach:
            "الترتيب هنا هو كل حاجة. لازم نسأل الأول على اللي بيقبل القسمة على الاتنين، يعني على 15. لو سألت على 3 الأول، الـ 15 هتتمسك غلط.",
          expected: "    if (i % 15 === 0) {",
          accept: ["if (i % 3 === 0 && i % 5 === 0) {"],
          hint1: "`if` بتسأل باقي قسمة `i` على 15 بيساوي صفر.",
          hint2: "if (_ % 15 === 0) {",
          explain: "The order matters. I check multiples of both first, which means multiples of 15,",
        },
        {
          coach: "لو آه، ضيف الكلمة الكاملة.",
          expected: '      result.push("FizzBuzz");',
          hint1: "`result.push` للنص FizzBuzz.",
          hint2: '______.push("________");',
          explain: "and push FizzBuzz.",
        },
        {
          coach: "بعدها اسأل على القسمة على 3.",
          expected: "    } else if (i % 3 === 0) {",
          hint1: "اقفل وافتح `else if` بتسأل باقي قسمة `i` على 3 بيساوي صفر.",
          hint2: "} else if (_ % 3 === 0) {",
          explain: "Then multiples of 3:",
        },
        {
          coach: "ضيف Fizz.",
          expected: '      result.push("Fizz");',
          hint1: "`result.push` للنص Fizz.",
          hint2: '______.push("____");',
          explain: "I push Fizz.",
        },
        {
          coach: "وبعدها القسمة على 5.",
          expected: "    } else if (i % 5 === 0) {",
          hint1: "اقفل وافتح `else if` بتسأل باقي قسمة `i` على 5 بيساوي صفر.",
          hint2: "} else if (_ % 5 === 0) {",
          explain: "Then multiples of 5:",
        },
        {
          coach: "ضيف Buzz.",
          expected: '      result.push("Buzz");',
          hint1: "`result.push` للنص Buzz.",
          hint2: '______.push("____");',
          explain: "I push Buzz.",
        },
        {
          coach: "ولو ولا واحدة من دول؟",
          expected: "    } else {",
          hint1: "اقفل وافتح `else` في نفس السطر.",
          hint2: "} ____ {",
          explain: "Otherwise",
        },
        {
          coach: "ضيف الرقم نفسه. واقفل الـ `else` واقفل الـ loop. تلات سطور.",
          expected: "      result.push(i);\n    }\n  }",
          hint1: "`result.push` للرقم `i`، وبعدها قوسين قفل.",
          hint2: "______.push(_);\n}\n}",
          explain: "I push the number itself.",
        },
        {
          coach: "رجّع الناتج واقفل الدالة. سطرين.",
          expected: "  return result;\n}",
          hint1: "`return result`، وبعدها قوس قفل الدالة.",
          hint2: "return ______;\n}",
          explain: "At the end I return the array.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "the first five",
      code: `expect(fizzBuzz(5)).toEqual([1, 2, "Fizz", 4, "Buzz"]);`,
    },
    {
      name: "edge case: 15 is FizzBuzz, not Fizz",
      code: `
const result = fizzBuzz(15);
expect(result[14], "the 15th item").toBe("FizzBuzz");
expect(result).toEqual([1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz", 11, "Fizz", 13, 14, "FizzBuzz"]);`,
    },
    {
      name: "edge case: n is 0",
      code: `expect(fizzBuzz(0)).toEqual([]);`,
    },
    {
      name: "edge case: n is 1",
      code: `expect(fizzBuzz(1)).toEqual([1]);`,
    },
    {
      name: "n itself is included",
      code: `
expect(fizzBuzz(3)).toEqual([1, 2, "Fizz"]);
expect(fizzBuzz(10).length).toBe(10);`,
    },
    {
      name: "every multiple of 15 up to 60 is FizzBuzz",
      code: `
const result = fizzBuzz(60);
expect([result[14], result[29], result[44], result[59]]).toEqual(["FizzBuzz", "FizzBuzz", "FizzBuzz", "FizzBuzz"]);`,
    },
    {
      name: "plain numbers stay numbers",
      code: `
const result = fizzBuzz(2);
expect(typeof result[0], "typeof the first item").toBe("number");
expect(typeof result[1], "typeof the second item").toBe("number");`,
    },
  ],
  complexity: "Time: O(n). Space: O(n) for the result.",
  idea: "الترتيب هو كل حاجة: اسأل على 15 الأول، بعدين 3، بعدين 5، وفي الآخر الرقم نفسه.",
  followUps: [
    {
      question: "Why check 15 first?",
      answer: "15 is also a multiple of 3. If I check 3 first, 15 becomes Fizz and never reaches the FizzBuzz branch.",
    },
    {
      question: "How would you do it without checking 15?",
      answer: "Build a string: add Fizz for 3, add Buzz for 5, and push the string, or the number if the string is empty.",
    },
  ],
};
