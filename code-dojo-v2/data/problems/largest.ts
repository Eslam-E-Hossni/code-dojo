import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "finds-largest",
    name: "finds the largest number",
    code: `expect(largest([3, 9, 2])).toBe(9);`,
  },
  {
    id: "any-position",
    name: "works wherever the largest number is",
    code: `
expect(largest([9, 3, 2])).toBe(9);
expect(largest([2, 3, 9])).toBe(9);
expect(largest([1, 100, 50, 99])).toBe(100);`,
  },
  {
    id: "empty",
    name: "edge case: empty array",
    code: `expect(largest([])).toBe(null);`,
  },
  {
    id: "all-negative",
    name: "edge case: all negative numbers",
    code: `
expect(largest([-5, -2, -9])).toBe(-2);
expect(largest([-1])).toBe(-1);`,
  },
  {
    id: "one-item",
    name: "one item",
    code: `expect(largest([7])).toBe(7);`,
  },
  {
    id: "duplicates-zero",
    name: "duplicates and zero",
    code: `
expect(largest([4, 4, 4])).toBe(4);
expect(largest([0, -1, 0])).toBe(0);`,
  },
  {
    id: "keeps-array",
    name: "does not change the array",
    code: `
const nums = [3, 1, 2];
largest(nums);
expect(nums).toEqual([3, 1, 2]);`,
  },
];

export const largest: CodeProblem = {
  id: "largest",
  kind: "code",
  group: "algorithms",
  title: "Largest number in an array",
  difficulty: "easy",
  tag: "reported",
  language: "js",
  api: ["largest"],
  plainLoops: true,
  statement: "Return the largest number, without Math.max.",
  examples: ["largest([3, 9, 2]); // 9"],
  askFirst: ["What should I return for an empty array?"],
  edgeCases: ["Empty array", "All negative numbers: don't start max at 0"],
  parts: [
    {
      id: "main",
      title: "largest",
      signature: "largest(nums)",
      steps: [
        line("function largest(nums) {", {
          coach: "Let's start, Islam. We need a function that takes the array of numbers.",
          hint1: "Declare a function called `largest` with one parameter.",
          explain: "largest takes the numbers.",
        }),
        line("  if (nums.length === 0) return null;", {
          coach:
            "First we handle the empty case. With no numbers there is no largest one, so we leave early with an empty answer.",
          hint1: "Check if the `length` of `nums` is 0. If it is, `return` `null` on the same line.",
          explain: "An empty array has no largest number, so I return null.",
        }),
        line("  let max = nums[0];", {
          coach:
            "We need a variable that holds the largest number so far. It must start from a real item of the array, because a start value of 0 is wrong when all the numbers are negative.",
          hint1: "Declare it with `let`, because it will change, and start with the first item of `nums`.",
          explain: "I start with the first item, not with 0, so negative numbers work.",
        }),
        line("  for (let i = 1; i < nums.length; i++) {", {
          coach: "Now we compare the other items with it. The first item is already in our variable, so we skip it.",
          hint1: "A plain `for` loop over `nums` that starts at index 1.",
          explain: "I loop from the second item to the end.",
        }),
        line("    if (nums[i] > max) max = nums[i];\n  }", {
          coach:
            "If the current item is larger than the one we hold, it takes its place, and then we close the loop. Two lines.",
          hint1: "An `if` with `>` on one line: compare the item with `max`, and assign it when it is larger. Then close the block.",
          explain: "When an item is larger than max, it becomes the new max.",
        }),
        line("  return max;\n}", {
          coach: "Every item was compared, so we give back the number we hold and close the function. Two lines.",
          hint1: "`return` the variable that holds the largest number, then close the function.",
          explain: "At the end I return max.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(1).",
  followUps: [
    {
      question: "Why not start max at 0?",
      answer: "If all the numbers are negative, 0 would win, and 0 is not in the array.",
    },
  ],
};
