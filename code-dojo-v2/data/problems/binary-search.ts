import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "finds-middle",
    name: "finds a number in the middle",
    code: `
expect(binarySearch([1, 3, 5, 7, 9], 7)).toBe(3);
expect(binarySearch([1, 3, 5, 7, 9], 5)).toBe(2);`,
  },
  {
    id: "first-or-last",
    name: "edge case: the target is the first or the last item",
    code: `
expect(binarySearch([1, 3, 5, 7, 9], 1)).toBe(0);
expect(binarySearch([1, 3, 5, 7, 9], 9)).toBe(4);`,
  },
  {
    id: "between-items",
    name: "returns -1 when the number is between two items",
    code: `expect(binarySearch([1, 3, 5, 7, 9], 4)).toBe(-1);`,
  },
  {
    id: "out-of-range",
    name: "edge case: the target is smaller or larger than everything",
    code: `
expect(binarySearch([1, 3, 5], 0)).toBe(-1);
expect(binarySearch([1, 3, 5], 6)).toBe(-1);`,
  },
  {
    id: "empty-array",
    name: "edge case: empty array",
    code: `expect(binarySearch([], 3)).toBe(-1);`,
  },
  {
    id: "one-item",
    name: "edge case: one item",
    code: `
expect(binarySearch([4], 4)).toBe(0);
expect(binarySearch([4], 5)).toBe(-1);`,
  },
  {
    id: "even-and-negative",
    name: "even length and negative numbers",
    code: `
expect(binarySearch([-9, -4, 0, 2], -4)).toBe(1);
expect(binarySearch([-9, -4, 0, 2], 2)).toBe(3);
expect(binarySearch([-9, -4, 0, 2], -9)).toBe(0);`,
  },
  {
    id: "every-item",
    name: "finds every item of a larger array",
    code: `
const nums = [];
for (let i = 0; i < 101; i++) nums.push(i * 3);
for (let i = 0; i < nums.length; i++) {
  expect(binarySearch(nums, nums[i]), "index of " + nums[i]).toBe(i);
}`,
  },
  {
    id: "few-reads",
    name: "does not check every item: about 20 looks for a million numbers",
    code: `
const nums = [];
for (let i = 0; i < 1000000; i++) nums.push(i);
let reads = 0;
const counted = new Proxy(nums, {
  get(target, key) {
    if (typeof key === "string" && key !== "length") reads++;
    return target[key];
  },
});
expect(binarySearch(counted, 765432)).toBe(765432);
expect(reads <= 60, "items read: " + reads + ", allowed: 60").toBe(true);`,
  },
];

export const binarySearch: CodeProblem = {
  id: "binary-search",
  kind: "code",
  group: "algorithms",
  title: "Binary search",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["binarySearch"],
  plainLoops: true,
  statement:
    "The array is sorted from small to large. Return the index of the target, or -1 if it is not there. Do not check every item.",
  examples: ["binarySearch([1, 3, 5, 7, 9], 7); // 3", "binarySearch([1, 3, 5, 7, 9], 4); // -1"],
  askFirst: [
    "Is the array always sorted, and in which direction?",
    "What should I return when the target is not found?",
    "Can there be duplicates? Which index do you want then?",
  ],
  edgeCases: [
    "Empty array",
    "One item",
    "The target is the first or the last item",
    "The target is smaller or larger than everything",
  ],
  parts: [
    {
      id: "main",
      title: "binarySearch",
      signature: "binarySearch(nums, target)",
      steps: [
        line("function binarySearch(nums, target) {", {
          coach: "Let's start, Islam. We need a function that takes the sorted array and the number we look for.",
          hint1: "Declare a function called `binarySearch` with two parameters: the array and the target.",
          explain: "binarySearch takes a sorted array and the target.",
        }),
        line("  let left = 0;", {
          coach:
            "We mark the part of the array that we still search with two pointers. The first pointer starts at the first item.",
          hint1: "Declare it with `let`, because it will move. The first index is 0.",
          explain: "left is the first index of the part I am still searching.",
        }),
        line("  let right = nums.length - 1;", {
          coach: "The second pointer starts at the last item.",
          hint1: "The last index is the `length` of `nums` minus 1.",
          explain: "right is the last index of that part.",
        }),
        line("  while (left <= right) {", {
          coach:
            "We search as long as the part still has items. A part with one item is not empty yet, so we must still check it.",
          hint1: "A `while` loop that compares the two pointers with `<=`.",
          explain: "The loop runs while left is less than or equal to right, so a part of one item is still checked.",
        }),
        line("    const mid = Math.floor((left + right) / 2);", {
          // The form that cannot overflow in languages with fixed-size integers. It gives the same index.
          accept: ["    const mid = left + Math.floor((right - left) / 2);"],
          coach: "We look at the middle of the part. An index must be a whole number, so we round it down.",
          hint1: "Take the average of `left` and `right`, and round it down with `Math.floor`.",
          explain: "mid is the index halfway between left and right, rounded down.",
        }),
        line("    if (nums[mid] === target) return mid;", {
          coach: "First we check if the middle item is already the one we look for. Then the search is over.",
          hint1: "Compare the item at `mid` with `target`, and `return` the index on the same line.",
          explain: "If the middle item is the target, I return its index.",
        }),
        line("    if (nums[mid] < target) {", {
          coach:
            "If not, we must choose a half. The array is sorted, so comparing the middle item with the target tells us which half to keep.",
          hint1: "An `if` that asks if the item at `mid` is less than `target`.",
          explain: "If the middle item is smaller, the target can only be on the right.",
        }),
        line("      left = mid + 1;", {
          coach:
            "The target is on the right, so we throw away the whole left half. The middle is already checked, so it goes away with that half.",
          hint1: "Move `left` to one index after `mid`.",
          explain: "I move left to one place after the middle, which drops the left half.",
        }),
        line("    } else {", {
          coach: "The other case: the middle item is larger than the target.",
          hint1: "Close the `if` block and open an `else` block on the same line.",
          explain: "Otherwise the target can only be on the left.",
        }),
        line("      right = mid - 1;\n    }\n  }", {
          coach:
            "We throw away the right half in the same way, and then we close the else and the loop. Three lines.",
          hint1: "Move `right` to one index before `mid`, then two closing braces.",
          explain: "I move right to one place before the middle, which drops the right half.",
        }),
        line("  return -1;\n}", {
          coach:
            "The loop can end without an answer, and the task asks for a fixed value in that case, so we give it back and close the function. Two lines.",
          hint1: "`return` -1, then close the function.",
          explain: "If the part becomes empty, the target is not there, and I return -1.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(log n), because every step throws away half of what is left. Space: O(1).",
  followUps: [
    {
      question: "Why left <= right and not left < right?",
      answer: "When one item is left, left equals right. With < the loop would stop before checking it.",
    },
    {
      question: "Why mid + 1 and mid - 1, not just mid?",
      answer:
        "The middle was already checked. Without the plus or minus one, the range may never shrink and the loop never ends.",
    },
  ],
};
