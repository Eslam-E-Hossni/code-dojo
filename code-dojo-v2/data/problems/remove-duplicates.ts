import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "removes-duplicates",
    name: "removes the duplicates",
    code: `expect(removeDuplicates([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);`,
  },
  {
    id: "keeps-first",
    name: "keeps the first time each value appears, in order",
    code: `expect(removeDuplicates([3, 1, 3, 2, 1, 2, 4])).toEqual([3, 1, 2, 4]);`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array",
    code: `expect(removeDuplicates([])).toEqual([]);`,
  },
  {
    id: "no-duplicates",
    name: "edge case: no duplicates",
    code: `expect(removeDuplicates([1, 2, 3])).toEqual([1, 2, 3]);`,
  },
  {
    id: "all-equal",
    name: "edge case: all items equal",
    code: `expect(removeDuplicates([7, 7, 7, 7])).toEqual([7]);`,
  },
  {
    id: "number-or-string",
    name: "edge case: the number 1 and the string '1' are different",
    code: `expect(removeDuplicates([1, "1", 1, "1"])).toEqual([1, "1"]);`,
  },
  {
    id: "strings-negatives-zero",
    name: "works with strings, negative numbers and zero",
    code: `
expect(removeDuplicates(["a", "b", "a"])).toEqual(["a", "b"]);
expect(removeDuplicates([0, -1, 0, -1, 1])).toEqual([0, -1, 1]);`,
  },
  {
    id: "new-array",
    name: "returns a new array and does not change the input",
    code: `
const input = [1, 1, 2];
const result = removeDuplicates(input);
expect(result, "the returned array").not.toBe(input);
expect(input, "the input after the call").toEqual([1, 1, 2]);`,
  },
  {
    id: "large-array",
    name: "is fast on a large array",
    code: `
const input = [];
for (let i = 0; i < 20000; i++) input.push(i % 5000);
expect(removeDuplicates(input).length).toBe(5000);`,
  },
];

export const removeDuplicates: CodeProblem = {
  id: "remove-duplicates",
  kind: "code",
  group: "algorithms",
  title: "Remove duplicates from an array",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["removeDuplicates"],
  plainLoops: true,
  statement: "Return a new array without the duplicates, keeping the first time each value appears.",
  examples: ["removeDuplicates([1, 2, 2, 3, 1]); // [1, 2, 3]"],
  askFirst: [
    "Should I keep the first one or the last one?",
    "Return a new array, or change the input?",
    "Is the array sorted?",
  ],
  edgeCases: [
    "Empty array",
    "No duplicates",
    "All items equal",
    "The number 1 and the string '1' are different",
  ],
  parts: [
    {
      id: "main",
      title: "removeDuplicates",
      signature: "removeDuplicates(arr)",
      steps: [
        line("function removeDuplicates(arr) {", {
          coach: "Let's start, Islam. We need a function that takes the array.",
          hint1: "Declare a function called `removeDuplicates` with one parameter.",
          explain: "removeDuplicates takes the array.",
        }),
        line("  const seen = new Set();", {
          coach:
            "For every value we must know quickly if we saw it before. We need a place that remembers the values and answers this question in one step.",
          hint1: "Use a `Set`. It can tell in O(1) if it holds a value.",
          explain: "A Set remembers the values I have already seen, and it answers in O(1).",
        }),
        line("  const result = [];", {
          coach:
            "We must not change the input. So the values we keep go into a new array, in the same order as before.",
          hint1: "Create an empty array and keep it in a variable.",
          explain: "The result is a new array, so the input is not changed and the order is kept.",
        }),
        line("  for (let i = 0; i < arr.length; i++) {", {
          coach: "We look at every item of the array, from the first to the last.",
          hint1: "A plain `for` loop over `arr`, from the first index to the last.",
          explain: "I loop over the array in order.",
        }),
        line("    if (!seen.has(arr[i])) {", {
          coach: "We only care about a value the first time it appears, so we ask if this one is new.",
          hint1: "A `Set` can tell if it holds a value with `has`. Put `!` in front to ask for the opposite.",
          explain: "I check that I have not seen this value before.",
        }),
        line("      seen.add(arr[i]);", {
          coach: "The value is new. We remember it, so the next copy of it is skipped.",
          hint1: "A `Set` saves a value with `add`.",
          explain: "I add the value to the Set, so I know it the next time.",
        }),
        line("      result.push(arr[i]);\n    }\n  }", {
          coach: "The new value also goes into the output, and then we close the if and the loop. Three lines.",
          hint1: "`push` the item into `result`, then two closing braces.",
          explain: "I push the value into the result.",
        }),
        line("  return result;\n}", {
          coach: "Every item is checked, so we give the new array back and close the function. Two lines.",
          hint1: "`return` the result array, then close the function.",
          explain: "At the end I return the result.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(n). Checking with a loop inside a loop would be O(n²).",
  followUps: [
    {
      question: "What is the shortest way in real code?",
      answer: "[...new Set(arr)]. A Set keeps insertion order, so the result is the same.",
    },
    {
      question: "What if the array is sorted?",
      answer: "Then duplicates are next to each other. I compare each item with the one before it, with no extra Set.",
    },
  ],
};
