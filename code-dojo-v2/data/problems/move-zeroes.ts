import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "moves-zeroes",
    name: "moves the zeroes to the end",
    code: `expect(moveZeroes([0, 1, 0, 3, 12])).toEqual([1, 3, 12, 0, 0]);`,
  },
  {
    id: "in-place",
    name: "works in place and returns the same array",
    code: `
const nums = [0, 5, 0, 6];
const result = moveZeroes(nums);
expect(result, "the returned array").toBe(nums);
expect(nums, "the array after the call").toEqual([5, 6, 0, 0]);`,
  },
  {
    id: "keeps-order",
    name: "keeps the order of the other numbers",
    code: `expect(moveZeroes([4, 0, 2, 0, 9, 1, 0, 7])).toEqual([4, 2, 9, 1, 7, 0, 0, 0]);`,
  },
  {
    id: "no-zeroes",
    name: "edge case: no zeroes",
    code: `expect(moveZeroes([1, 2, 3])).toEqual([1, 2, 3]);`,
  },
  {
    id: "all-zeroes",
    name: "edge case: all zeroes",
    code: `expect(moveZeroes([0, 0, 0])).toEqual([0, 0, 0]);`,
  },
  {
    id: "empty",
    name: "edge case: empty array",
    code: `expect(moveZeroes([])).toEqual([]);`,
  },
  {
    id: "start-or-end",
    name: "zeroes already at the end, and zeroes only at the start",
    code: `
expect(moveZeroes([1, 2, 0, 0])).toEqual([1, 2, 0, 0]);
expect(moveZeroes([0, 0, 1, 2])).toEqual([1, 2, 0, 0]);`,
  },
  {
    id: "negatives",
    name: "negative numbers are not zeroes",
    code: `expect(moveZeroes([0, -1, 0, -2])).toEqual([-1, -2, 0, 0]);`,
  },
  {
    id: "same-length",
    name: "the length does not change",
    code: `expect(moveZeroes([0, 1, 0]).length).toBe(3);`,
  },
];

export const moveZeroes: CodeProblem = {
  id: "move-zeroes",
  kind: "code",
  group: "algorithms",
  title: "Move zeroes to the end",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["moveZeroes"],
  plainLoops: true,
  statement: "Move all zeroes to the end, in place, keeping the order of the other numbers.",
  examples: ["moveZeroes([0, 1, 0, 3, 12]); // [1, 3, 12, 0, 0]"],
  askFirst: ["In place, or can I return a new array?", "Must the order stay the same?"],
  edgeCases: ["No zeroes", "All zeroes", "Empty array"],
  parts: [
    {
      id: "main",
      title: "moveZeroes",
      signature: "moveZeroes(nums)",
      steps: [
        line("function moveZeroes(nums) {", {
          coach: "Let's start, Islam. We need a function that takes the array and works on that same array.",
          hint1: "Declare a function called `moveZeroes` with one parameter.",
          explain: "moveZeroes takes the array and changes it in place.",
        }),
        line("  let insert = 0;", {
          coach:
            "The numbers that are not zero must end up at the front, in their order. We need a pointer that remembers the next free place for them.",
          hint1: "Declare it with `let` and start it at index 0.",
          explain: "One pointer marks where the next non-zero number goes.",
        }),
        line("  for (let i = 0; i < nums.length; i++) {", {
          coach: "We go over the whole array, one item at a time.",
          hint1: "A plain `for` loop over `nums`, from the first index to the last.",
          explain: "I loop over the array once.",
        }),
        line("    if (nums[i] !== 0) {", {
          coach: "We only care about the numbers that are not zero. A zero stays where it is for now.",
          hint1: "An `if` that compares the current item with 0, using `!==`.",
          explain: "I check if the current number is not zero.",
        }),
        line("      [nums[insert], nums[i]] = [nums[i], nums[insert]];", {
          coach:
            "This number belongs in the next free place, and the item that sits there must come back here. Both moves happen in one line.",
          hint1: "Swap with array destructuring: two items in brackets on the left, the same two in the opposite order on the right.",
          explain: "I swap this number with the number at the insert position.",
        }),
        line("      insert++;\n    }\n  }", {
          coach:
            "That place is taken now, so the pointer moves one step forward, then we close the if, and then the loop. Three lines.",
          hint1: "Add one to `insert`, then two closing braces, each on its own line.",
          explain: "Then I move the insert position one step forward.",
        }),
        line("  return nums;\n}", {
          coach:
            "All the zeroes are at the end now, so we give the array back to the caller and close the function. Two lines.",
          hint1: "`return` the array we got, then close the function.",
          explain: "I return the same array, not a copy.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(1).",
  followUps: [
    {
      question: "Why does the order of the other numbers stay the same?",
      answer:
        "The insert position is never ahead of i, and every non-zero number goes to the next free place in the order it was found.",
    },
  ],
};
