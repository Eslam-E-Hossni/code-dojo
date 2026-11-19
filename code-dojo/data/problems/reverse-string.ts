import type { CodeProblem } from "../types";

export const reverseString: CodeProblem = {
  id: "reverse-string",
  kind: "code",
  group: "algorithms",
  title: "Reverse a string",
  difficulty: "easy",
  tag: "reported",
  statement: "Reverse a string without reverse().",
  examples: ['reverse("hello"); // "olleh"'],
  askFirst: ["Should I keep spaces and case as they are?"],
  edgeCases: ["Empty string", "One character", "Emoji: some are two code units"],
  parts: [
    {
      id: "main",
      title: "reverse",
      signature: "reverse(str)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد النص. اكتب تعريفها.",
          expected: "function reverse(str) {",
          hint1: "دالة اسمها `reverse` وبتاخد `str`.",
          hint2: "function _______(___) {",
          explain: "reverse takes the string.",
        },
        {
          coach: "هنبني النص المعكوس حرف حرف، فنبدأ بنص فاضي.",
          expected: '  let out = "";',
          hint1: "`let` اسمه `out` وقيمته نص فاضي.",
          hint2: 'let ___ = "";',
          explain: "I build the result in an empty string.",
        },
        {
          coach: "لف من آخر حرف لأول حرف، وزوّد كل حرف على الناتج. الـ loop كلها في سطر واحد.",
          expected: "  for (let i = str.length - 1; i >= 0; i--) out += str[i];",
          accept: [
            "for (let i = str.length - 1; i >= 0; i--) { out += str[i]; }",
            "for (let i = str.length - 1; i >= 0; i -= 1) out += str[i];",
            "for (let i = str.length - 1; i >= 0; --i) out += str[i];",
          ],
          hint1: "`for` تبدأ من `str.length - 1` وتنزل لحد صفر، وجسمها `out += str[i]`.",
          hint2: "for (let _ = ___.______ - 1; _ >= 0; _--) ___ += ___[_];",
          explain: "I loop from the last character to the first and add each one.",
        },
        {
          coach: "رجّع الناتج واقفل الدالة. سطرين.",
          expected: "  return out;\n}",
          hint1: "`return out`، وبعدها قوس قفل الدالة.",
          hint2: "return ___;\n}",
          explain: "Then I return the result.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "reverses a word",
      code: `expect(reverse("hello")).toBe("olleh");`,
    },
    {
      name: "edge case: empty string",
      code: `expect(reverse("")).toBe("");`,
    },
    {
      name: "edge case: one character",
      code: `expect(reverse("a")).toBe("a");`,
    },
    {
      name: "keeps spaces and case as they are",
      code: `expect(reverse("Ab c")).toBe("c bA");`,
    },
    {
      name: "digits and symbols",
      code: `expect(reverse("a1!b2?")).toBe("?2b!1a");`,
    },
    {
      name: "a palindrome stays the same",
      code: `expect(reverse("racecar")).toBe("racecar");`,
    },
    {
      name: "reversing twice gives the original",
      code: `expect(reverse(reverse("Code Dojo"))).toBe("Code Dojo");`,
    },
  ],
  complexity: "Time: O(n). Space: O(n).",
  idea: "loop من الآخر للأول. لو سألك عن الـ emoji قول إنك هتلف بـ `for...of` علشان بيمشي على الحروف الكاملة.",
  followUps: [
    {
      question: "How do you check a palindrome?",
      answer: "Two pointers from both ends, comparing until they meet.",
    },
  ],
};
