import type { CodeProblem } from "../types";

export const fibonacci: CodeProblem = {
  id: "fibonacci",
  kind: "code",
  group: "algorithms",
  title: "Fibonacci",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Return the n-th Fibonacci number, where fibonacci(0) is 0 and fibonacci(1) is 1. Every next number is the sum of the two before it.",
  examples: ["fibonacci(10); // 55", "// 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55"],
  askFirst: [
    "Does the sequence start from 0 or from 1?",
    "Do you want the n-th number, or the whole sequence?",
    "How large can n be?",
  ],
  edgeCases: ["n is 0", "n is 1", "A large n: plain recursion is far too slow"],
  parts: [
    {
      id: "main",
      title: "fibonacci",
      signature: "fibonacci(n)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد ترتيب الرقم المطلوب. اكتب تعريفها.",
          expected: "function fibonacci(n) {",
          hint1: "دالة اسمها `fibonacci` وبتاخد `n`.",
          hint2: "function _________(_) {",
          explain: "fibonacci takes the position n.",
        },
        {
          coach: "أول رقمين معروفين: صفر وواحد، وهما نفس قيمة `n`. رجّعهم على طول.",
          expected: "  if (n < 2) return n;",
          accept: ["if (n <= 1) return n;"],
          hint1: "`if` بتسأل `n` أصغر من 2، ولو آه `return n`.",
          hint2: "if (_ < 2) return _;",
          explain: "The first two numbers are 0 and 1, the same as n, so I return n.",
        },
        {
          coach: "مش هنستخدم recursion علشان هي بطيئة جدًا. هنمشي بمتغيرين بس. الأول الرقم اللي قبل الحالي.",
          expected: "  let prev = 0;",
          hint1: "`let` اسمه `prev` وقيمته صفر.",
          hint2: "let ____ = 0;",
          explain: "I use a loop with two variables. prev is the number before,",
        },
        {
          coach: "والتاني الرقم الحالي.",
          expected: "  let current = 1;",
          hint1: "`let` اسمه `current` وقيمته 1.",
          hint2: "let _______ = 1;",
          explain: "and current is the number now.",
        },
        {
          coach: "لف من 2 لحد `n`، و `n` داخلة.",
          expected: "  for (let i = 2; i <= n; i++) {",
          accept: ["for (let i = 2; i <= n; i += 1) {", "for (let i = 2; i <= n; ++i) {"],
          hint1: "`for` بعدّاد `i` يبدأ من 2، وشرطها أصغر من أو يساوي `n`.",
          hint2: "for (let _ = 2; _ <= _; _++) {",
          explain: "I loop from 2 to n.",
        },
        {
          coach: "الرقم اللي جاي هو مجموع الاتنين اللي معانا. احفظه في متغير مؤقت.",
          expected: "    const next = prev + current;",
          hint1: "`const` اسمه `next` وقيمته `prev + current`.",
          hint2: "const ____ = ____ + _______;",
          explain: "The next number is the sum of the two.",
        },
        {
          coach: "دلوقتي حرّك الاتنين خطوة. الحالي يبقى هو السابق. لازم السطر ده الأول.",
          expected: "    prev = current;",
          hint1: "`prev` بيساوي `current`.",
          hint2: "____ = _______;",
          explain: "Then both move one step: current becomes prev,",
        },
        {
          coach: "واللي حسبناه يبقى هو الحالي. واقفل الـ loop. سطرين.",
          expected: "    current = next;\n  }",
          hint1: "`current` بيساوي `next`، وبعدها قوس القفل.",
          hint2: "_______ = ____;\n}",
          explain: "and next becomes current.",
        },
        {
          coach: "لما الـ loop تخلص، الحالي هو الرقم المطلوب. رجّعه واقفل الدالة. سطرين.",
          expected: "  return current;\n}",
          hint1: "`return current`، وبعدها قوس قفل الدالة.",
          hint2: "return _______;\n}",
          explain: "After the loop, current is the n-th number.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "edge case: n is 0",
      code: `expect(fibonacci(0)).toBe(0);`,
    },
    {
      name: "edge case: n is 1",
      code: `expect(fibonacci(1)).toBe(1);`,
    },
    {
      name: "the first numbers of the sequence",
      code: `
const expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
for (let n = 0; n < expected.length; n++) {
  expect(fibonacci(n), "fibonacci(" + n + ")").toBe(expected[n]);
}`,
    },
    {
      name: "fibonacci(2) is 1, not 2",
      code: `expect(fibonacci(2)).toBe(1);`,
    },
    {
      name: "larger numbers",
      code: `
expect(fibonacci(20)).toBe(6765);
expect(fibonacci(30)).toBe(832040);`,
    },
    {
      name: "edge case: a large n is fast",
      code: `
expect(fibonacci(50)).toBe(12586269025);
expect(fibonacci(70)).toBe(190392490709135);`,
    },
    {
      name: "every number is the sum of the two before it",
      code: `
for (let n = 2; n < 40; n++) {
  expect(fibonacci(n), "fibonacci(" + n + ")").toBe(fibonacci(n - 1) + fibonacci(n - 2));
}`,
    },
  ],
  complexity: "Time: O(n). Space: O(1). Plain recursion is O(2ⁿ).",
  idea: "متغيرين بس: السابق والحالي. كل لفة بنحسب اللي جاي ونحرّك الاتنين خطوة. من غير recursion ومن غير array.",
  followUps: [
    {
      question: "Why not plain recursion?",
      answer: "fibonacci(n) calls itself twice, so the same values are computed again and again. It grows like 2 to the power n.",
    },
    {
      question: "How do you fix the recursive version?",
      answer: "With memoization: I save each result in a cache, so every n is computed once.",
    },
  ],
};
