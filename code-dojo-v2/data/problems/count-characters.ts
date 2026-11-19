import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "counts-every",
    name: "counts every character",
    code: `expect(countCharacters("hello")).toEqual({ h: 1, e: 1, l: 2, o: 1 });`,
  },
  {
    id: "empty-string",
    name: "edge case: empty string",
    code: `expect(countCharacters("")).toEqual({});`,
  },
  {
    id: "one-character",
    name: "edge case: one character",
    code: `expect(countCharacters("a")).toEqual({ a: 1 });`,
  },
  {
    id: "same-character",
    name: "the same character many times",
    code: `expect(countCharacters("aaaa")).toEqual({ a: 4 });`,
  },
  {
    id: "spaces",
    name: "edge case: spaces count as characters",
    code: `expect(countCharacters("a b a")).toEqual({ a: 2, " ": 2, b: 1 });`,
  },
  {
    id: "upper-and-lower",
    name: "edge case: upper and lower case are different characters",
    code: `expect(countCharacters("Aa")).toEqual({ A: 1, a: 1 });`,
  },
  {
    id: "digits-and-symbols",
    name: "digits and symbols",
    code: `expect(countCharacters("1+1=2!")).toEqual({ "1": 2, "+": 1, "=": 1, "2": 1, "!": 1 });`,
  },
  {
    id: "counts-add-up",
    name: "the counts add up to the length of the string",
    code: `
const text = "the quick brown fox";
const counts = countCharacters(text);
let total = 0;
for (const key of Object.keys(counts)) total += counts[key];
expect(total, "sum of all counts").toBe(text.length);`,
  },
];

export const countCharacters: CodeProblem = {
  id: "count-characters",
  kind: "code",
  group: "algorithms",
  title: "Count characters",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["countCharacters"],
  plainLoops: true,
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
        line("function countCharacters(str) {", {
          coach: "Let's start, Islam. We need a function that takes the string.",
          hint1: "Declare a function called `countCharacters` with one parameter.",
          explain: "countCharacters takes the string.",
        }),
        line("  const counts = {};", {
          coach:
            "We need a place that holds one number for each character, so we can find the number by the character.",
          hint1: "An empty object is enough. Its keys will be the characters.",
          explain: "The result is an object where each character is a key and its count is the value.",
        }),
        line("  for (let i = 0; i < str.length; i++) {", {
          coach: "We read the string one character at a time.",
          hint1: "A plain `for` loop over `str`, from the first index to the last.",
          explain: "I loop over every index of the string.",
        }),
        line("    const ch = str[i];", {
          coach: "We use the current character more than once in the next line, so we give it a short name.",
          hint1: "Read the character at index `i` and keep it in a `const`.",
          explain: "I keep the current character in a variable.",
        }),
        line("    counts[ch] = (counts[ch] || 0) + 1;\n  }", {
          // ?? is not ||, but a count that is missing is undefined, so both give 0 here.
          accept: ["    counts[ch] = (counts[ch] ?? 0) + 1;\n  }"],
          coach:
            "We add one to the count of this character, where a new character starts from 0, and then we close the loop. Two lines.",
          hint1:
            "Use `||` to get 0 when the key is not there yet, add 1, and save it under the same key. Then a closing brace.",
          explain: "The first time the key is undefined, so I use 0, and then I add one to the count.",
        }),
        line("  return counts;\n}", {
          coach: "The whole string is counted, so we give the object back and close the function. Two lines.",
          hint1: "`return` the object, then close the function.",
          explain: "At the end I return the counts.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(k) for k different characters.",
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
