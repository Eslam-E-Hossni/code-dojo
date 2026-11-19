import type { CodeProblem } from "../types";

export const palindrome: CodeProblem = {
  id: "palindrome",
  kind: "code",
  group: "algorithms",
  title: "Palindrome",
  difficulty: "easy",
  tag: "likely",
  statement: "Return true if the string reads the same from both ends.",
  examples: ['isPalindrome("racecar"); // true', 'isPalindrome("hello"); // false'],
  askFirst: [
    "Should I ignore case, spaces and punctuation?",
    "Is an empty string a palindrome?",
  ],
  edgeCases: ["Empty string: true", "One character: true", "Even and odd length", "Upper and lower case are different"],
  parts: [
    {
      id: "main",
      title: "isPalindrome",
      signature: "isPalindrome(str)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد النص وبترجّع true أو false. اكتب تعريفها.",
          expected: "function isPalindrome(str) {",
          hint1: "دالة اسمها `isPalindrome` وبتاخد `str`.",
          hint2: "function ____________(___) {",
          explain: "isPalindrome takes the string.",
        },
        {
          coach: "مش هنعكس النص. هنستخدم مؤشرين: واحد بيبدأ من أول حرف.",
          expected: "  let left = 0;",
          hint1: "`let` اسمه `left` وقيمته صفر.",
          hint2: "let ____ = 0;",
          explain: "I use two pointers. One starts at the first character,",
        },
        {
          coach: "والتاني بيبدأ من آخر حرف.",
          expected: "  let right = str.length - 1;",
          hint1: "`let` اسمه `right` وقيمته `str.length - 1`.",
          hint2: "let _____ = ___.______ - 1;",
          explain: "and one at the last character.",
        },
        {
          coach: "نفضل نقارن طول ما المؤشرين لسه متقابلوش.",
          expected: "  while (left < right) {",
          hint1: "`while` وشرطها `left` أصغر من `right`.",
          hint2: "while (____ < _____) {",
          explain: "I go on while they have not met.",
        },
        {
          coach: "لو الحرفين مختلفين، خلاص مش palindrome. رجّع على طول.",
          expected: "    if (str[left] !== str[right]) return false;",
          hint1: "`if` بتقارن `str[left]` بـ `str[right]` بـ `!==`، ولو مختلفين `return false`.",
          hint2: "if (___[____] !== ___[_____]) return _____;",
          explain: "If the two characters differ, it is not a palindrome.",
        },
        {
          coach: "لو زي بعض، قرّب المؤشر الشمال خطوة لجوه.",
          expected: "    left++;",
          accept: ["left += 1;", "++left;"],
          hint1: "`left` زائد واحد.",
          hint2: "____++;",
          explain: "Otherwise I move the left pointer in,",
        },
        {
          coach: "وقرّب اليمين خطوة لجوه، واقفل الـ loop. سطرين.",
          expected: "    right--;\n  }",
          accept: ["right -= 1;\n}", "--right;\n}"],
          hint1: "`right` ناقص واحد، وبعدها قوس القفل.",
          hint2: "_____--;\n}",
          explain: "and the right pointer in.",
        },
        {
          coach: "لو الـ loop خلصت من غير ما نلاقي اختلاف، يبقى palindrome. واقفل الدالة. سطرين.",
          expected: "  return true;\n}",
          hint1: "`return true`، وبعدها قوس قفل الدالة.",
          hint2: "return ____;\n}",
          explain: "If the pointers meet with no difference, it is a palindrome.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "a palindrome returns true",
      code: `
expect(isPalindrome("racecar")).toBe(true);
expect(isPalindrome("level")).toBe(true);`,
    },
    {
      name: "a normal word returns false",
      code: `
expect(isPalindrome("hello")).toBe(false);
expect(isPalindrome("abca")).toBe(false);`,
    },
    {
      name: "edge case: empty string",
      code: `expect(isPalindrome("")).toBe(true);`,
    },
    {
      name: "edge case: one character",
      code: `expect(isPalindrome("a")).toBe(true);`,
    },
    {
      name: "edge case: even and odd length",
      code: `
expect(isPalindrome("abba")).toBe(true);
expect(isPalindrome("aba")).toBe(true);
expect(isPalindrome("ab")).toBe(false);
expect(isPalindrome("aa")).toBe(true);`,
    },
    {
      name: "a difference in the middle is found",
      code: `
expect(isPalindrome("abcdxba")).toBe(false);
expect(isPalindrome("abccba")).toBe(true);
expect(isPalindrome("abcxba")).toBe(false);`,
    },
    {
      name: "edge case: upper and lower case are different characters",
      code: `expect(isPalindrome("Aa")).toBe(false);`,
    },
    {
      name: "returns a boolean",
      code: `
expect(typeof isPalindrome("aba"), "typeof the result").toBe("boolean");
expect(typeof isPalindrome("ab"), "typeof the result").toBe("boolean");`,
    },
  ],
  complexity: "Time: O(n). Space: O(1), because nothing is copied.",
  idea: "مؤشرين من الطرفين بيقربوا لبعض. أول حرفين مختلفين يبقى `false`، ولو اتقابلوا يبقى `true`. من غير ما نعكس النص.",
  followUps: [
    {
      question: "How would you ignore case, spaces and punctuation?",
      answer:
        "Inside the loop I skip characters that are not letters or digits, and I compare in lower case.",
    },
    {
      question: "Why not reverse the string and compare?",
      answer: "It works, but it builds a second string. Two pointers need no extra space and can stop early.",
    },
  ],
};
