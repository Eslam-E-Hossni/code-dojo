import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "largest-sum",
    name: "finds the largest sum of a contiguous part",
    code: `expect(maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4])).toBe(6);`,
  },
  {
    id: "all-negative",
    name: "edge case: all negative numbers",
    code: `
expect(maxSubarray([-3, -1, -2])).toBe(-1);
expect(maxSubarray([-5, -4])).toBe(-4);`,
  },
  {
    id: "one-item",
    name: "edge case: one item",
    code: `
expect(maxSubarray([7])).toBe(7);
expect(maxSubarray([-7])).toBe(-7);`,
  },
  {
    id: "all-positive",
    name: "all positive numbers: the whole array",
    code: `expect(maxSubarray([1, 2, 3, 4])).toBe(10);`,
  },
  {
    id: "big-negative-splits",
    name: "a big negative number splits the array",
    code: `
expect(maxSubarray([5, -9, 6])).toBe(6);
expect(maxSubarray([6, -9, 5])).toBe(6);`,
  },
  {
    id: "small-negative-kept",
    name: "a small negative number in the middle is worth keeping",
    code: `expect(maxSubarray([4, -1, 5])).toBe(8);`,
  },
  {
    id: "zeroes",
    name: "zeroes",
    code: `
expect(maxSubarray([0, 0, 0])).toBe(0);
expect(maxSubarray([-1, 0, -2])).toBe(0);`,
  },
  {
    id: "best-at-end",
    name: "the best part is at the end",
    code: `expect(maxSubarray([-1, -2, 3, 4])).toBe(7);`,
  },
];

export const maxSubarray: CodeProblem = {
  id: "max-subarray",
  kind: "code",
  group: "algorithms",
  title: "Maximum subarray (Kadane)",
  difficulty: "medium",
  tag: "likely",
  language: "js",
  api: ["maxSubarray"],
  plainLoops: true,
  statement: "Find the largest sum of a contiguous part of the array.",
  examples: ["maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]); // 6"],
  askFirst: ["Is the array ever empty?", "Do you want the sum, or the part itself?"],
  edgeCases: ["All negative numbers: the answer is the largest one", "One item"],
  parts: [
    {
      id: "main",
      title: "maxSubarray",
      signature: "maxSubarray(nums)",
      steps: [
        line("function maxSubarray(nums) {", {
          coach: "Let's start, Islam. We need a function that takes the array of numbers.",
          hint1: "Declare a function called `maxSubarray` with one parameter.",
          explain: "maxSubarray takes the array of numbers.",
        }),
        line("  let best = nums[0];", {
          coach:
            "We need to remember the largest sum we found so far. Starting it from 0 would be wrong when every number is negative.",
          hint1: "Declare it with `let` and give it the first item of `nums`.",
          explain: "best is the largest sum found so far, and it starts with the first item.",
        }),
        line("  let current = nums[0];", {
          coach: "We also need a running sum for the part we are in right now. It starts with the first item too.",
          hint1: "A second `let`, with the same start value.",
          explain: "current is the largest sum of a part that ends at this position.",
        }),
        line("  for (let i = 1; i < nums.length; i++) {", {
          coach: "The first item is already counted, so we go over the other items one by one.",
          hint1: "A plain `for` loop over `nums` that starts at index 1.",
          explain: "I loop from the second item to the end.",
        }),
        line("    current = nums[i] > current + nums[i] ? nums[i] : current + nums[i];", {
          coach:
            "This is the main idea of the solution. At each number we decide: continue the part before it, or start again from this number.",
          hint1:
            "Use a ternary. Compare `nums[i]` alone with `current` plus `nums[i]`, and keep the larger one in `current`.",
          explain:
            "At each number I keep the larger of two sums: the number alone, or the number added to the part before it.",
        }),
        line("    if (current > best) best = current;\n  }", {
          coach:
            "If the current sum is larger than the largest sum we know, we save it, and then we close the loop. Two lines.",
          hint1: "An `if` that compares `current` with `best`, with the update on the same line. Then a closing brace.",
          explain: "I update best when current is larger.",
        }),
        line("  return best;\n}", {
          coach: "Every item is checked, so we give back the largest sum and close the function. Two lines.",
          hint1: "`return` the largest sum, then close the function.",
          explain: "At the end I return best.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(1).",
  followUps: [
    {
      question: "What is the brute force?",
      answer: "Two loops over every start and end: O(n²).",
    },
  ],
};
