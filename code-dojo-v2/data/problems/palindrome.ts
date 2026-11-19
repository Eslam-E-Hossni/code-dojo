import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "palindrome-true",
    name: "a palindrome returns true",
    code: `
expect(isPalindrome("racecar")).toBe(true);
expect(isPalindrome("level")).toBe(true);`,
  },
  {
    id: "word-false",
    name: "a normal word returns false",
    code: `
expect(isPalindrome("hello")).toBe(false);
expect(isPalindrome("abca")).toBe(false);`,
  },
  {
    id: "empty",
    name: "edge case: empty string",
    code: `expect(isPalindrome("")).toBe(true);`,
  },
  {
    id: "one-character",
    name: "edge case: one character",
    code: `expect(isPalindrome("a")).toBe(true);`,
  },
  {
    id: "even-odd",
    name: "edge case: even and odd length",
    code: `
expect(isPalindrome("abba")).toBe(true);
expect(isPalindrome("aba")).toBe(true);
expect(isPalindrome("ab")).toBe(false);
expect(isPalindrome("aa")).toBe(true);`,
  },
  {
    id: "middle-difference",
    name: "a difference in the middle is found",
    code: `
expect(isPalindrome("abcdxba")).toBe(false);
expect(isPalindrome("abccba")).toBe(true);
expect(isPalindrome("abcxba")).toBe(false);`,
  },
  {
    id: "case",
    name: "edge case: upper and lower case are different characters",
    code: `expect(isPalindrome("Aa")).toBe(false);`,
  },
  {
    id: "boolean",
    name: "returns a boolean",
    code: `
expect(typeof isPalindrome("aba"), "typeof the result").toBe("boolean");
expect(typeof isPalindrome("ab"), "typeof the result").toBe("boolean");`,
  },
];

export const palindrome: CodeProblem = {
  id: "palindrome",
  kind: "code",
  group: "algorithms",
  title: "Palindrome",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["isPalindrome"],
  plainLoops: true,
  statement: "Return true if the string reads the same from both ends.",
  examples: ['isPalindrome("racecar"); // true', 'isPalindrome("hello"); // false'],
  askFirst: ["Should I ignore case, spaces and punctuation?", "Is an empty string a palindrome?"],
  edgeCases: ["Empty string: true", "One character: true", "Even and odd length", "Upper and lower case are different"],
  parts: [
    {
      id: "main",
      title: "isPalindrome",
      signature: "isPalindrome(str)",
      steps: [
        line("function isPalindrome(str) {", {
          coach: "Let's start, Islam. We need a function that takes the string and answers true or false.",
          hint1: "Declare a function called `isPalindrome` with one parameter.",
          explain: "isPalindrome takes the string.",
        }),
        line("  let left = 0;", {
          coach:
            "We will not reverse the string. We use two pointers that walk toward each other, and the first one begins at the front.",
          hint1: "Declare it with `let` and start it at index 0.",
          explain: "The left pointer starts at the first character.",
        }),
        line("  let right = str.length - 1;", {
          coach: "We need the second pointer at the other end of the string.",
          hint1: "The last index is the `length` of `str` minus 1.",
          explain: "The right pointer starts at the last character.",
        }),
        line("  while (left < right) {", {
          coach: "We keep comparing as long as the two pointers have not met.",
          hint1: "A `while` loop that runs while `left` is smaller than `right`.",
          explain: "The loop runs until the two pointers meet in the middle.",
        }),
        line("    if (str[left] !== str[right]) return false;", {
          coach: "If the two characters are different, the string is not a palindrome, and we can stop here.",
          hint1: "Compare the two characters with `!==`. If they differ, `return` `false` on the same line.",
          explain: "If the two characters differ, it is not a palindrome, so I return false.",
        }),
        line("    left++;", {
          coach: "The characters match, so we move the left pointer one step toward the middle.",
          hint1: "Add one to `left`.",
          explain: "Otherwise I move the left pointer one step in.",
        }),
        line("    right--;\n  }", {
          coach: "We also move the right pointer one step toward the middle, and then we close the loop. Two lines.",
          hint1: "Subtract one from `right`, then close the block.",
          explain: "I move the right pointer one step in as well.",
        }),
        line("  return true;\n}", {
          coach:
            "If the loop ends and no difference was found, the string is a palindrome, so the answer is true, and we close the function. Two lines.",
          hint1: "`return` the value `true`, then close the function.",
          explain: "If the pointers meet with no difference, it is a palindrome.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(1), because nothing is copied.",
  followUps: [
    {
      question: "How would you ignore case, spaces and punctuation?",
      answer: "Inside the loop I skip characters that are not letters or digits, and I compare in lower case.",
    },
    {
      question: "Why not reverse the string and compare?",
      answer: "It works, but it builds a second string. Two pointers need no extra space and can stop early.",
    },
  ],
};
