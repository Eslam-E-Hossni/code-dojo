import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "finds-pair",
    name: "finds the pair",
    code: `expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);`,
  },
  {
    id: "pair-anywhere",
    name: "the pair can be anywhere in the array",
    code: `
expect(twoSum([1, 5, 8, 3, 9], 12)).toEqual([3, 4]);
expect(twoSum([10, 1, 2, 30], 40)).toEqual([0, 3]);`,
  },
  {
    id: "not-same-element",
    name: "does not use the same element twice",
    code: `expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);`,
  },
  {
    id: "no-pair",
    name: "edge case: no pair exists",
    code: `
expect(twoSum([1, 2, 3], 100)).toEqual([]);
expect(twoSum([5], 10)).toEqual([]);`,
  },
  {
    id: "duplicates",
    name: "edge case: duplicates",
    code: `expect(twoSum([3, 3], 6)).toEqual([0, 1]);`,
  },
  {
    id: "negatives-zero",
    name: "edge case: negative numbers and zero",
    code: `
expect(twoSum([-3, 4, 3, 90], 0)).toEqual([0, 2]);
expect(twoSum([0, 4, 3, 0], 0)).toEqual([0, 3]);
expect(twoSum([-1, -2, -3, -4], -7)).toEqual([2, 3]);`,
  },
  {
    id: "empty",
    name: "edge case: empty array",
    code: `expect(twoSum([], 5)).toEqual([]);`,
  },
  {
    id: "keeps-array",
    name: "does not change the array",
    code: `
const nums = [4, 1, 3];
twoSum(nums, 4);
expect(nums).toEqual([4, 1, 3]);`,
  },
];

export const twoSum: CodeProblem = {
  id: "two-sum",
  kind: "code",
  group: "algorithms",
  title: "Two Sum",
  difficulty: "easy",
  tag: "reported",
  language: "js",
  api: ["twoSum"],
  plainLoops: true,
  statement: "Return the indexes of the two numbers that add up to the target.",
  examples: ["twoSum([2, 7, 11, 15], 9); // [0, 1]"],
  askFirst: ["Is there always exactly one answer?", "Can I use the same element twice?", "Is the array sorted?"],
  edgeCases: ["No pair exists", "Duplicates: [3, 3] with target 6", "Negative numbers"],
  parts: [
    {
      id: "main",
      title: "twoSum",
      signature: "twoSum(nums, target)",
      steps: [
        line("function twoSum(nums, target) {", {
          coach: "Let's start, Islam. We need a function that takes the list of numbers and the sum we are looking for.",
          hint1: "Declare a function called `twoSum` with two parameters: the numbers and the target.",
          explain: "twoSum takes the numbers and the target.",
        }),
        line("  const seen = new Map();", {
          coach:
            "A loop inside a loop would be slow. We need a place to remember every number we have passed and where it was.",
          hint1: "Use a `Map`: the number is the key and its index is the value.",
          explain: "I keep a Map from each number I have seen to its index.",
        }),
        line("  for (let i = 0; i < nums.length; i++) {", {
          coach: "We go over the numbers only one time, and we need the index of each one for the answer.",
          hint1: "A plain `for` loop over `nums` with a counter, from the first index to the last.",
          explain: "I loop over the numbers once.",
        }),
        line("    const need = target - nums[i];", {
          coach: "For the current number, we ask which other number would complete the sum. We compute it and keep it.",
          hint1: "Subtract the current number from `target`, and keep the answer in a variable.",
          explain: "For each number I compute the number I need to reach the target.",
        }),
        line("    if (seen.has(need)) {", {
          coach: "Now we ask: did we already pass that other number?",
          hint1: "A `Map` can tell you if it holds a key. The method is `has`.",
          explain: "I check if the number I need is already in the Map.",
        }),
        line("      return [seen.get(need), i];\n    }", {
          coach: "If we did, the pair is found, so we give back the two indexes and close the if. Two lines.",
          hint1: "`return` an array of two indexes. The first comes from the `Map` with `get`, the second is `i`.",
          explain: "I return the saved index of the number I need and the current index.",
        }),
        line("    seen.set(nums[i], i);\n  }", {
          coach:
            "If not, this number may complete a later pair, so we remember it with its index, and we close the loop. Two lines.",
          hint1: "A `Map` saves a value with `set`: the number is the key and `i` is the value. Then close the block.",
          explain: "I save the current number with its index after the check, so I never use the same element twice.",
        }),
        line("  return [];\n}", {
          coach:
            "If the loop ends without a pair, we give back a result that means nothing was found, and we close the function. Two lines.",
          hint1: "`return` an empty array, then close the function.",
          explain: "If the loop ends with no pair, I return an empty array.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(n). The brute force is O(n²).",
  followUps: [
    {
      question: "What if the array is sorted?",
      answer: "Two pointers: one at the start, one at the end. O(n) time and O(1) space.",
    },
  ],
};
