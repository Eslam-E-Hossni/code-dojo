import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "reverses-word",
    name: "reverses a word",
    code: `expect(reverse("hello")).toBe("olleh");`,
  },
  {
    id: "empty",
    name: "edge case: empty string",
    code: `expect(reverse("")).toBe("");`,
  },
  {
    id: "one-character",
    name: "edge case: one character",
    code: `expect(reverse("a")).toBe("a");`,
  },
  {
    id: "spaces-case",
    name: "keeps spaces and case as they are",
    code: `expect(reverse("Ab c")).toBe("c bA");`,
  },
  {
    id: "digits-symbols",
    name: "digits and symbols",
    code: `expect(reverse("a1!b2?")).toBe("?2b!1a");`,
  },
  {
    id: "palindrome",
    name: "a palindrome stays the same",
    code: `expect(reverse("racecar")).toBe("racecar");`,
  },
  {
    id: "twice",
    name: "reversing twice gives the original",
    code: `expect(reverse(reverse("Code Dojo"))).toBe("Code Dojo");`,
  },
];

export const reverseString: CodeProblem = {
  id: "reverse-string",
  kind: "code",
  group: "algorithms",
  title: "Reverse a string",
  difficulty: "easy",
  tag: "reported",
  language: "js",
  api: ["reverse"],
  plainLoops: true,
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
        line("function reverse(str) {", {
          coach: "Let's start, Islam. We need a function that takes the string.",
          hint1: "Declare a function called `reverse` with one parameter.",
          explain: "reverse takes the string.",
        }),
        line('  let out = "";', {
          coach: "We will build the reversed text one character at a time, so we need an empty place to start from.",
          hint1: "Declare it with `let`, because it will grow, and start with an empty string.",
          explain: "I start the result as an empty string.",
        }),
        line("  for (let i = str.length - 1; i >= 0; i--) out += str[i];", {
          coach:
            "We walk from the last character to the first, and we put each character at the end of the result. The whole loop fits on one line.",
          hint1: "A `for` loop that counts down from the last index to 0, with one `+=` as its body.",
          explain: "I loop from the last character to the first and add each one to the result.",
        }),
        line("  return out;\n}", {
          coach:
            "The result now holds all the characters in the opposite order, so we give it back and close the function. Two lines.",
          hint1: "`return` the result string, then close the function.",
          explain: "At the end I return the reversed string.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(n).",
  followUps: [
    {
      question: "How do you check a palindrome?",
      answer: "Two pointers from both ends, comparing until they meet.",
    },
  ],
};
