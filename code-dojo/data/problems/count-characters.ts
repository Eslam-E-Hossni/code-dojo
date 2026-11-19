import type { CodeProblem } from "../types";

export const countCharacters: CodeProblem = {
  id: "count-characters",
  kind: "code",
  group: "algorithms",
  title: "Count characters",
  difficulty: "easy",
  tag: "likely",
  statement: "Count how many times each character appears in a string. Return an object.",
  examples: ['countCharacters("hello"); // { h: 1, e: 1, l: 2, o: 1 }'],
  askFirst: [
    "Are upper and lower case the same letter?",
    "Do spaces and punctuation count?",
    "Should the result be an object or a Map?",
  ],
  edgeCases: ["Empty string", "One character", "Spaces count as characters", "Upper and lower case are different"],
  parts: [
    {
      id: "main",
      title: "countCharacters",
      signature: "countCharacters(str)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد النص. اكتب تعريفها.",
          expected: "function countCharacters(str) {",
          hint1: "دالة اسمها `countCharacters` وبتاخد `str`.",
          hint2: "function _______________(___) {",
          explain: "countCharacters takes the string.",
        },
        {
          coach: "الناتج object: المفتاح هو الحرف، والقيمة عدد مرات ظهوره.",
          expected: "  const counts = {};",
          hint1: "`const` اسمه `counts` وقيمته object فاضي.",
          hint2: "const ______ = {};",
          explain: "The result is an object: each character is a key, and its count is the value.",
        },
        {
          coach: "لف على النص حرف حرف.",
          expected: "  for (let i = 0; i < str.length; i++) {",
          accept: ["for (let i = 0; i < str.length; i += 1) {", "for (let i = 0; i < str.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `str.length`.",
          hint2: "for (let _ = 0; _ < ___.______; _++) {",
          explain: "I loop over the string.",
        },
        {
          coach: "خد الحرف الحالي في متغير.",
          expected: "    const ch = str[i];",
          hint1: "`const` اسمه `ch` وقيمته `str[i]`.",
          hint2: "const __ = ___[_];",
          explain: "I take the current character.",
        },
        {
          coach:
            "زوّد عدّه واحد. أول مرة الحرف مش هيبقى موجود في الـ object، فاستخدم `||` علشان نبدأ من صفر. واقفل الـ loop. سطرين.",
          expected: "    counts[ch] = (counts[ch] || 0) + 1;\n  }",
          hint1: "`counts[ch]` بيساوي نفسه أو صفر، بين قوسين، زائد واحد. وبعدها قوس القفل.",
          hint2: "______[__] = (______[__] || 0) + 1;\n}",
          explain: "I add one to its count. The first time the key is undefined, so I start from 0.",
        },
        {
          coach: "رجّع الـ object واقفل الدالة. سطرين.",
          expected: "  return counts;\n}",
          hint1: "`return counts`، وبعدها قوس قفل الدالة.",
          hint2: "return ______;\n}",
          explain: "At the end I return the counts.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "counts every character",
      code: `expect(countCharacters("hello")).toEqual({ h: 1, e: 1, l: 2, o: 1 });`,
    },
    {
      name: "edge case: empty string",
      code: `expect(countCharacters("")).toEqual({});`,
    },
    {
      name: "edge case: one character",
      code: `expect(countCharacters("a")).toEqual({ a: 1 });`,
    },
    {
      name: "the same character many times",
      code: `expect(countCharacters("aaaa")).toEqual({ a: 4 });`,
    },
    {
      name: "edge case: spaces count as characters",
      code: `expect(countCharacters("a b a")).toEqual({ a: 2, " ": 2, b: 1 });`,
    },
    {
      name: "edge case: upper and lower case are different characters",
      code: `expect(countCharacters("Aa")).toEqual({ A: 1, a: 1 });`,
    },
    {
      name: "digits and symbols",
      code: `expect(countCharacters("1+1=2!")).toEqual({ "1": 2, "+": 1, "=": 1, "2": 1, "!": 1 });`,
    },
    {
      name: "the counts add up to the length of the string",
      code: `
const text = "the quick brown fox";
const counts = countCharacters(text);
let total = 0;
for (const key of Object.keys(counts)) total += counts[key];
expect(total, "sum of all counts").toBe(text.length);`,
    },
  ],
  complexity: "Time: O(n). Space: O(k) for k different characters.",
  idea: "object المفتاح فيه الحرف والقيمة عدّه. وسطر `(counts[ch] || 0) + 1` هو اللي بيبدأ العدّ من صفر أول مرة.",
  followUps: [
    {
      question: "How would you find the most frequent character?",
      answer: "I loop over the counts and keep the key with the largest value.",
    },
    {
      question: "Why (counts[ch] || 0) + 1?",
      answer: "The first time, counts[ch] is undefined. undefined + 1 is NaN, so I use 0 instead.",
    },
  ],
};
