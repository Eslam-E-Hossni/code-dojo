import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "two-digits",
    name: "swaps two digits",
    code: `
expect(nextBigger(12)).toBe(21);
expect(nextBigger(38)).toBe(83);`,
  },
  {
    id: "smallest-step",
    name: "gives the next one, not just a bigger one",
    code: `
expect(nextBigger(513)).toBe(531);
expect(nextBigger(1243)).toBe(1324);
expect(nextBigger(123)).toBe(132);`,
  },
  {
    id: "zero-inside",
    name: "works with a zero inside the number",
    code: `
expect(nextBigger(2017)).toBe(2071);
expect(nextBigger(1090)).toBe(1900);`,
  },
  {
    id: "tail-is-reversed",
    name: "puts the digits after the swap in ascending order",
    code: `
expect(nextBigger(15432)).toBe(21345);
expect(nextBigger(218765)).toBe(251678);`,
  },
  {
    id: "repeated-digits",
    name: "edge case: repeated digits",
    code: `
expect(nextBigger(144)).toBe(414);
expect(nextBigger(414)).toBe(441);
expect(nextBigger(1332)).toBe(2133);`,
  },
  {
    id: "one-digit",
    name: "edge case: one digit has no bigger number",
    code: `
expect(nextBigger(9)).toBe(-1);
expect(nextBigger(0)).toBe(-1);`,
  },
  {
    id: "all-the-same",
    name: "edge case: all digits are the same",
    code: `
expect(nextBigger(111)).toBe(-1);
expect(nextBigger(77)).toBe(-1);`,
  },
  {
    id: "descending",
    name: "edge case: digits in descending order are already the biggest",
    code: `
expect(nextBigger(531)).toBe(-1);
expect(nextBigger(9870)).toBe(-1);
expect(nextBigger(10)).toBe(-1);`,
  },
  {
    id: "long-number",
    name: "works on a long number",
    code: `
expect(nextBigger(1234567908)).toBe(1234567980);
expect(nextBigger(59884848459853)).toBe(59884848483559);`,
  },
  {
    id: "returns-number",
    name: "returns a number, not a string",
    code: `expect(typeof nextBigger(12)).toBe("number");`,
  },
];

export const nextBiggerNumber: CodeProblem = {
  id: "next-bigger-number",
  kind: "code",
  group: "algorithms",
  title: "Next bigger number with the same digits",
  difficulty: "hard",
  tag: "likely",
  language: "js",
  api: ["nextBigger"],
  plainLoops: true,
  statement:
    "Return the next bigger number that uses the same digits. If there is no bigger number, return -1.",
  examples: ["nextBigger(12); // 21", "nextBigger(513); // 531", "nextBigger(531); // -1"],
  askFirst: [
    "Is the input always a positive integer?",
    "What do I return when no bigger number exists: -1?",
    "Can the number be larger than Number.MAX_SAFE_INTEGER?",
  ],
  edgeCases: [
    "One digit",
    "Digits in descending order: 531",
    "Repeated digits: 111 and 144",
    "A zero inside: 2017",
  ],
  parts: [
    {
      id: "main",
      title: "nextBigger",
      signature: "nextBigger(n)",
      steps: [
        line("function nextBigger(n) {", {
          coach: "Let's start, Islam. We need a function that takes one number.",
          hint1: "Declare a function called `nextBigger` with one parameter.",
          explain: "nextBigger takes the number.",
        }),
        line('  const digits = String(n).split("");', {
          coach: "A number has no positions we can swap. We turn it into a list of its digits.",
          hint1: "Make a string from `n`, then `split` it on an empty string.",
          explain: "I turn the number into an array of digit characters, so I can swap them.",
        }),
        line("  let i = digits.length - 2;", {
          coach:
            "We look for the place to change from the right, because a change on the right makes the smallest step. We start at the digit before the last one.",
          hint1: "A counter with `let`, starting at the length minus 2.",
          explain: "I start at the second digit from the right.",
        }),
        line("  while (i >= 0 && digits[i] >= digits[i + 1]) i--;", {
          coach:
            "We move left while the digit is not smaller than its right neighbour. We stop at the first digit that is smaller, because that one can grow.",
          hint1: "A `while` with two conditions: `i` is still inside, and the digit at `i` is `>=` the digit after it. Its body moves `i` one step left.",
          explain: "I walk left until I find a digit that is smaller than the digit after it.",
        }),
        line("  if (i < 0) return -1;", {
          coach: "If we fell off the left end, the digits only go down, so the number is already the biggest one.",
          hint1: "Check if `i` went below 0, and give back -1.",
          explain: "If there is no such digit, the digits are in descending order, and I return -1.",
        }),
        line("  let j = digits.length - 1;", {
          coach: "Now we need a digit to put in that place. We search for it from the right end too.",
          hint1: "A second counter with `let`, starting at the last index.",
          explain: "I start a second pointer at the last digit.",
        }),
        line("  while (digits[j] <= digits[i]) j--;", {
          coach:
            "We want the smallest digit that is still bigger than the one we found. The right side goes down from left to right, so the first bigger digit from the right is that one.",
          hint1: "A `while` that moves `j` left as long as the digit at `j` is `<=` the digit at `i`.",
          explain: "I move left to the first digit that is bigger than the digit at i.",
        }),
        line("  const temp = digits[i];", {
          coach: "We swap the two digits. A swap needs a place to keep one value for a moment.",
          hint1: "Save the digit at `i` in a `const`.",
          explain: "I save the digit at i before I overwrite it.",
        }),
        line("  digits[i] = digits[j];\n  digits[j] = temp;", {
          coach: "We put the bigger digit in the left place, and the saved digit in the right place. Two lines.",
          hint1: "Assign the digit at `j` to position `i`, then `temp` to position `j`.",
          explain: "I swap the two digits, so the number becomes bigger at position i.",
        }),
        line("  let left = i + 1;\n  let right = digits.length - 1;", {
          coach:
            "The digits after that place still go down, so we reverse them with two pointers to get their smallest order. Two lines.",
          hint1: "Two counters with `let`: one right after `i`, one at the last index.",
          explain: "I set two pointers at the two ends of the tail.",
        }),
        line("  while (left < right) {", {
          coach: "We swap the two ends and move inwards, until the pointers meet.",
          hint1: "A `while` that runs as long as `left` is before `right`.",
          explain: "I loop until the two pointers meet in the middle.",
        }),
        line("    const swap = digits[left];\n    digits[left] = digits[right];\n    digits[right] = swap;", {
          coach: "The same swap as before, this time for the two ends of the tail. Three lines.",
          hint1: "Save the digit at `left` in a `const`, copy the digit at `right` over it, then put the saved one at `right`.",
          explain: "I swap the two ends of the tail.",
        }),
        line("    left++;\n    right--;\n  }", {
          coach: "We move both pointers one step towards the middle, and we close the loop. Three lines.",
          hint1: "`left` goes up by one, `right` goes down by one, then the closing brace.",
          explain: "I move both pointers inwards, so the tail ends up in ascending order.",
        }),
        line('  return Number(digits.join(""));\n}', {
          coach: "The digits are in their new order, so we join them and give back a number, not a string. Two lines.",
          hint1: "`join` the array on an empty string, wrap it in `Number`, and `return` it. Then close the function.",
          explain: "I join the digits back and return them as a number.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(d) for d digits. Space: O(d) for the array of digits.",
  followUps: [
    {
      question: "Why reverse the tail and not sort it?",
      answer:
        "After the swap the tail is still in descending order, so reversing it gives ascending order in O(d). Sorting would cost O(d log d).",
    },
    {
      question: "What is the name of this algorithm?",
      answer: "Next permutation. The same steps give the next arrangement of any list in dictionary order.",
    },
    {
      question: "What about numbers larger than Number.MAX_SAFE_INTEGER?",
      answer:
        "Number loses exact digits above 2^53. I would take the input as a string or a BigInt and return the same type.",
    },
  ],
};
