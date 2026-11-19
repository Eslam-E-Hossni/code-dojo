import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "finds-second",
    name: "finds the second largest",
    code: `expect(secondLargest([5, 1, 9, 9, 3])).toBe(5);`,
  },
  {
    id: "any-position",
    name: "works wherever the two numbers are",
    code: `
expect(secondLargest([1, 2])).toBe(1);
expect(secondLargest([2, 1])).toBe(1);
expect(secondLargest([3, 8, 1, 7])).toBe(7);
expect(secondLargest([8, 7, 3, 1])).toBe(7);
expect(secondLargest([1, 3, 7, 8])).toBe(7);`,
  },
  {
    id: "duplicate-largest",
    name: "a duplicate of the largest does not count as second",
    code: `
expect(secondLargest([9, 9, 5])).toBe(5);
expect(secondLargest([5, 9, 9])).toBe(5);`,
  },
  {
    id: "fewer-than-two",
    name: "edge case: fewer than two items",
    code: `
expect(secondLargest([])).toBe(null);
expect(secondLargest([7])).toBe(null);`,
  },
  {
    id: "all-equal",
    name: "edge case: all items equal",
    code: `expect(secondLargest([4, 4, 4])).toBe(null);`,
  },
  {
    id: "negatives",
    name: "edge case: negative numbers",
    code: `
expect(secondLargest([-5, -2, -9])).toBe(-5);
expect(secondLargest([-1, 0])).toBe(-1);`,
  },
  {
    id: "keeps-array",
    name: "does not sort or change the array",
    code: `
const nums = [3, 1, 2];
secondLargest(nums);
expect(nums).toEqual([3, 1, 2]);`,
  },
];

export const secondLargest: CodeProblem = {
  id: "second-largest",
  kind: "code",
  group: "algorithms",
  title: "Second largest number",
  difficulty: "easy",
  tag: "reported",
  language: "js",
  api: ["secondLargest"],
  plainLoops: true,
  statement: "Return the second largest number in an array, without sorting.",
  examples: ["secondLargest([5, 1, 9, 9, 3]); // 5"],
  askFirst: [
    "Do duplicates count? In [9, 9, 5] is the answer 5 or 9?",
    "What should I return if there is no second largest?",
  ],
  edgeCases: ["Fewer than two items", "All items equal", "Negative numbers"],
  parts: [
    {
      id: "main",
      title: "secondLargest",
      signature: "secondLargest(nums)",
      steps: [
        line("function secondLargest(nums) {", {
          coach: "Let's start, Islam. We need a function that takes the array of numbers.",
          hint1: "Declare a function called `secondLargest` with one parameter.",
          explain: "secondLargest takes the numbers.",
        }),
        line("  let largest = -Infinity;", {
          coach:
            "We need only two variables. The first holds the largest number so far, and it starts lower than any number in the array, so the first number we see replaces it.",
          hint1: "Declare it with `let` and start it at `-Infinity`.",
          explain: "The largest number starts at minus Infinity, so negative numbers work.",
        }),
        line("  let second = -Infinity;", {
          coach: "The other variable holds the number that comes right after the largest. It starts the same way.",
          hint1: "Another `let`, with the same start value as `largest`.",
          explain: "The second largest also starts at minus Infinity.",
        }),
        line("  for (const n of nums) {", {
          coach: "We go over the numbers one time. We only need the values here, not the indexes.",
          hint1: "Use `for...of` over `nums`.",
          explain: "I loop over the numbers once.",
        }),
        line("    if (n > largest) {", {
          coach: "The first case: is this number larger than the largest one we hold?",
          hint1: "An `if` that compares `n` with `largest`, using `>`.",
          explain: "I check if the number is larger than the largest.",
        }),
        line("      second = largest;", {
          coach:
            "We found a new largest, so the old one moves down one place. This must happen first, before the old value is lost.",
          hint1: "Copy the old value of `largest` into `second`.",
          explain: "The old largest moves down to second.",
        }),
        line("      largest = n;", {
          coach: "Then the new number takes the top place.",
          hint1: "Assign `n` to `largest`.",
          explain: "This number becomes the new largest.",
        }),
        line("    } else if (n > second && n < largest) {", {
          coach:
            "The other case: the number is not a new largest, but it may still be the new second. It must also be smaller than the largest, so a duplicate of the largest does not count.",
          hint1: "Close the `if` and open an `else if` with two comparisons joined by `&&`.",
          explain: "Otherwise I check if the number is between the two, which also skips a duplicate of the largest.",
        }),
        line("      second = n;\n    }\n  }", {
          coach: "This number goes into the second place, then we close the else if, and then the loop. Three lines.",
          hint1: "Assign `n` to `second`, then two closing braces, each on its own line.",
          explain: "I save this number as the new second largest.",
        }),
        line("  return second === -Infinity ? null : second;\n}", {
          coach:
            "At the end we give back the second, or an empty answer if it never changed from its start value, and we close the function. Two lines.",
          hint1: "`return` with a ternary: compare `second` with `-Infinity`, and give `null` in that case.",
          explain: "If second never changed, there is no second largest, so I return null.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n) in one pass. Space: O(1). Sorting would be O(n log n).",
  followUps: [
    {
      question: "Why not sort and take the second?",
      answer: "Sorting is O(n log n) and changes the array. One pass is O(n).",
    },
  ],
};
