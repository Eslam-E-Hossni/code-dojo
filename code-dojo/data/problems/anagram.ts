import type { CodeProblem } from "../types";

export const anagram: CodeProblem = {
  id: "anagram",
  kind: "code",
  group: "algorithms",
  title: "Anagram",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Return true if the two strings are anagrams: the same characters, the same number of times, in any order. Do not sort.",
  examples: ['isAnagram("listen", "silent"); // true', 'isAnagram("aab", "abb"); // false'],
  askFirst: ["Should I ignore case and spaces?", "Can I sort the strings?"],
  edgeCases: [
    "Different lengths",
    "Same letters, different counts: aab and abb",
    "Two empty strings",
    "Upper and lower case are different",
  ],
  parts: [
    {
      id: "main",
      title: "isAnagram",
      signature: "isAnagram(a, b)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد النصين. اكتب تعريفها.",
          expected: "function isAnagram(a, b) {",
          hint1: "دالة اسمها `isAnagram` وبتاخد `a` و `b`.",
          hint2: "function _________(_, _) {",
          explain: "isAnagram takes the two strings.",
        },
        {
          coach: "أسرع اختبار: لو الطولين مختلفين مستحيل يبقوا anagram.",
          expected: "  if (a.length !== b.length) return false;",
          hint1: "`if` بتقارن `a.length` بـ `b.length` بـ `!==`، ولو مختلفين `return false`.",
          hint2: "if (_.______ !== _.______) return _____;",
          explain: "If the lengths differ, they cannot be anagrams.",
        },
        {
          coach: "هنعدّ كل حرف ظهر كام مرة. محتاجين object للعدّ.",
          expected: "  const counts = {};",
          hint1: "`const` اسمه `counts` وقيمته object فاضي.",
          hint2: "const ______ = {};",
          explain: "I count the characters in an object.",
        },
        {
          coach: "لف على النص الأول.",
          expected: "  for (let i = 0; i < a.length; i++) {",
          accept: ["for (let i = 0; i < a.length; i += 1) {", "for (let i = 0; i < a.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `a.length`.",
          hint2: "for (let _ = 0; _ < _.______; _++) {",
          explain: "I loop over the first string",
        },
        {
          coach:
            "زوّد عدّ الحرف واحد. أول مرة الحرف مش هيبقى موجود، فاستخدم `||` علشان نبدأ من صفر. واقفل الـ loop. سطرين.",
          expected: "    counts[a[i]] = (counts[a[i]] || 0) + 1;\n  }",
          hint1: "`counts[a[i]]` بيساوي نفسه أو صفر، بين قوسين، زائد واحد. وبعدها قوس القفل.",
          hint2: "______[_[_]] = (______[_[_]] || 0) + 1;\n}",
          explain: "and add one for each character. The first time the key is undefined, so I start from 0.",
        },
        {
          coach: "دلوقتي لف على النص التاني.",
          expected: "  for (let i = 0; i < b.length; i++) {",
          accept: ["for (let i = 0; i < b.length; i += 1) {", "for (let i = 0; i < b.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `b.length`.",
          hint2: "for (let _ = 0; _ < _.______; _++) {",
          explain: "Then I loop over the second string.",
        },
        {
          coach: "لو الحرف مش في العدّ، أو عدّه وصل صفر، يبقى زيادة في النص التاني.",
          expected: "    if (!counts[b[i]]) return false;",
          hint1: "`if` بتنفي `counts[b[i]]`، ولو آه `return false`.",
          hint2: "if (!______[_[_]]) return _____;",
          explain: "If a character is missing or already used up, they are not anagrams.",
        },
        {
          coach: "غير كده، استهلك واحد من عدّ الحرف ده، واقفل الـ loop. سطرين.",
          expected: "    counts[b[i]]--;\n  }",
          accept: ["counts[b[i]] -= 1;\n}"],
          hint1: "`counts[b[i]]` ناقص واحد، وبعدها قوس القفل.",
          hint2: "______[_[_]]--;\n}",
          explain: "Otherwise I use one of that character.",
        },
        {
          coach: "لو عدّينا النص التاني كله من غير مشكلة، يبقوا anagram. واقفل الدالة. سطرين.",
          expected: "  return true;\n}",
          hint1: "`return true`، وبعدها قوس قفل الدالة.",
          hint2: "return ____;\n}",
          explain: "If every character matched, they are anagrams.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "two anagrams return true",
      code: `
expect(isAnagram("listen", "silent")).toBe(true);
expect(isAnagram("aabb", "abab")).toBe(true);`,
    },
    {
      name: "different words return false",
      code: `expect(isAnagram("hello", "world")).toBe(false);`,
    },
    {
      name: "edge case: different lengths",
      code: `
expect(isAnagram("abc", "ab")).toBe(false);
expect(isAnagram("a", "aa")).toBe(false);`,
    },
    {
      name: "edge case: same letters, different counts",
      code: `
expect(isAnagram("aab", "abb")).toBe(false);
expect(isAnagram("aaab", "abbb")).toBe(false);`,
    },
    {
      name: "edge case: two empty strings",
      code: `expect(isAnagram("", "")).toBe(true);`,
    },
    {
      name: "edge case: upper and lower case are different characters",
      code: `expect(isAnagram("Listen", "silent")).toBe(false);`,
    },
    {
      name: "one character",
      code: `
expect(isAnagram("a", "a")).toBe(true);
expect(isAnagram("a", "b")).toBe(false);`,
    },
    {
      name: "the same word is an anagram of itself",
      code: `expect(isAnagram("dojo", "dojo")).toBe(true);`,
    },
    {
      name: "spaces and digits are characters too",
      code: `
expect(isAnagram("a b1", "1b a")).toBe(true);
expect(isAnagram("ab ", "ab1")).toBe(false);`,
    },
  ],
  complexity: "Time: O(n). Space: O(k) for k different characters. Sorting both strings would be O(n log n).",
  idea: "عدّ حروف النص الأول في object، وبعدين استهلك العدّ بحروف النص التاني. أي حرف ناقص أو زيادة يبقى `false`.",
  followUps: [
    {
      question: "What is the simple way?",
      answer: "Sort both strings and compare them. It is O(n log n), and counting is O(n).",
    },
    {
      question: "Why check the lengths first?",
      answer: "It is O(1), and it makes the second loop enough: with equal lengths, nothing can be left over.",
    },
  ],
};
