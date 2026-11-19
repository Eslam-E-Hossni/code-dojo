import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "anagrams-true",
    name: "two anagrams return true",
    code: `
expect(isAnagram("listen", "silent")).toBe(true);
expect(isAnagram("aabb", "abab")).toBe(true);`,
  },
  {
    id: "different-words",
    name: "different words return false",
    code: `expect(isAnagram("hello", "world")).toBe(false);`,
  },
  {
    id: "different-lengths",
    name: "edge case: different lengths",
    code: `
expect(isAnagram("abc", "ab")).toBe(false);
expect(isAnagram("a", "aa")).toBe(false);`,
  },
  {
    id: "different-counts",
    name: "edge case: same letters, different counts",
    code: `
expect(isAnagram("aab", "abb")).toBe(false);
expect(isAnagram("aaab", "abbb")).toBe(false);`,
  },
  {
    id: "empty",
    name: "edge case: two empty strings",
    code: `expect(isAnagram("", "")).toBe(true);`,
  },
  {
    id: "case",
    name: "edge case: upper and lower case are different characters",
    code: `expect(isAnagram("Listen", "silent")).toBe(false);`,
  },
  {
    id: "one-character",
    name: "one character",
    code: `
expect(isAnagram("a", "a")).toBe(true);
expect(isAnagram("a", "b")).toBe(false);`,
  },
  {
    id: "same-word",
    name: "the same word is an anagram of itself",
    code: `expect(isAnagram("dojo", "dojo")).toBe(true);`,
  },
  {
    id: "spaces-digits",
    name: "spaces and digits are characters too",
    code: `
expect(isAnagram("a b1", "1b a")).toBe(true);
expect(isAnagram("ab ", "ab1")).toBe(false);`,
  },
];

export const anagram: CodeProblem = {
  id: "anagram",
  kind: "code",
  group: "algorithms",
  title: "Anagram",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["isAnagram"],
  plainLoops: true,
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
        line("function isAnagram(a, b) {", {
          coach: "Let's start, Islam. We need a function that takes the two strings to compare.",
          hint1: "Declare a function called `isAnagram` with two parameters.",
          explain: "isAnagram takes the two strings.",
        }),
        line("  if (a.length !== b.length) return false;", {
          coach: "The fastest check comes first: two strings with different lengths can never be anagrams.",
          hint1: "Compare the two `length` values with `!==`. If they differ, `return` `false` on the same line.",
          explain: "If the lengths differ, the strings cannot be anagrams, so I return false.",
        }),
        line("  const counts = {};", {
          coach: "We will count how many times each character appears, so we need a place for the counts.",
          hint1: "An empty object works: the character is the key and the count is the value.",
          explain: "I count the characters in an object.",
        }),
        line("  for (let i = 0; i < a.length; i++) {", {
          coach: "We go over the first string, one character at a time.",
          hint1: "A plain `for` loop over `a`, from the first index to the last.",
          explain: "I loop over the first string.",
        }),
        line("    counts[a[i]] = (counts[a[i]] || 0) + 1;\n  }", {
          // ?? is not ||, but a count that is missing is undefined, so both give 0 here.
          accept: ["    counts[a[i]] = (counts[a[i]] ?? 0) + 1;\n  }"],
          coach:
            "We add one to the count of this character, starting from 0 if we never saw it before, and then we close the loop. Two lines.",
          hint1: "The first time, the key is `undefined`. Use `||` with 0 before you add 1, then close the block.",
          explain: "I add one to the count of each character, and the first time the count is undefined, so I start from 0.",
        }),
        line("  for (let i = 0; i < b.length; i++) {", {
          coach: "Now we go over the second string in the same way.",
          hint1: "The same `for` loop, this time over `b`.",
          explain: "Then I loop over the second string.",
        }),
        line("    if (!counts[b[i]]) return false;", {
          coach:
            "If this character was never counted, or its count is down to 0, the second string has an extra character, and we can stop here.",
          hint1: "Both `undefined` and 0 are falsy, so one `!` covers both cases. Then `return` `false` on the same line.",
          explain: "If a character is missing or already used up, the strings are not anagrams.",
        }),
        line("    counts[b[i]]--;\n  }", {
          coach:
            "If not, this character matches one from the first string, so we lower its count by one, and then we close the loop. Two lines.",
          hint1: "Subtract one from the count of `b[i]`, then close the block.",
          explain: "Otherwise I take one away from the count of that character.",
        }),
        line("  return true;\n}", {
          coach:
            "If the second loop ends and no character was extra, the strings are anagrams, so the answer is true, and we close the function. Two lines.",
          hint1: "`return` the value `true`, then close the function.",
          explain: "If every character matched, the strings are anagrams.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(k) for k different characters. Sorting both strings would be O(n log n).",
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
