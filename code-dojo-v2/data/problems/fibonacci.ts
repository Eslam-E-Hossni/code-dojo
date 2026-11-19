import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "zero",
    name: "edge case: n is 0",
    code: `expect(fibonacci(0)).toBe(0);`,
  },
  {
    id: "one",
    name: "edge case: n is 1",
    code: `expect(fibonacci(1)).toBe(1);`,
  },
  {
    id: "first-numbers",
    name: "the first numbers of the sequence",
    code: `
const expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
for (let n = 0; n < expected.length; n++) {
  expect(fibonacci(n), "fibonacci(" + n + ")").toBe(expected[n]);
}`,
  },
  {
    id: "two-is-one",
    name: "fibonacci(2) is 1, not 2",
    code: `expect(fibonacci(2)).toBe(1);`,
  },
  {
    id: "larger-numbers",
    name: "larger numbers",
    code: `
expect(fibonacci(20)).toBe(6765);
expect(fibonacci(30)).toBe(832040);`,
  },
  {
    id: "large-n-fast",
    name: "edge case: a large n is fast",
    code: `
expect(fibonacci(50)).toBe(12586269025);
expect(fibonacci(70)).toBe(190392490709135);`,
  },
  {
    id: "sum-of-two-before",
    name: "every number is the sum of the two before it",
    code: `
for (let n = 2; n < 40; n++) {
  expect(fibonacci(n), "fibonacci(" + n + ")").toBe(fibonacci(n - 1) + fibonacci(n - 2));
}`,
  },
];

export const fibonacci: CodeProblem = {
  id: "fibonacci",
  kind: "code",
  group: "algorithms",
  title: "Fibonacci",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["fibonacci"],
  plainLoops: true,
  statement:
    "Return the n-th Fibonacci number, where fibonacci(0) is 0 and fibonacci(1) is 1. Every next number is the sum of the two before it.",
  examples: ["fibonacci(10); // 55", "// 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55"],
  askFirst: [
    "Does the sequence start from 0 or from 1?",
    "Do you want the n-th number, or the whole sequence?",
    "How large can n be?",
  ],
  edgeCases: ["n is 0", "n is 1", "A large n: plain recursion is far too slow"],
  parts: [
    {
      id: "main",
      title: "fibonacci",
      signature: "fibonacci(n)",
      steps: [
        line("function fibonacci(n) {", {
          coach: "Let's start, Islam. We need a function that takes the position of the number we want.",
          hint1: "Declare a function called `fibonacci` with one parameter.",
          explain: "fibonacci takes the position n.",
        }),
        line("  if (n < 2) return n;", {
          coach:
            "Positions 0 and 1 are the two base cases that the task gives us. They need no work, so we answer them before anything else.",
          hint1: "For these positions the answer is the same as the input. Use an `if` with the `return` on the same line.",
          explain: "The first two numbers are 0 and 1, the same as n, so I return n.",
          accept: ["  if (n <= 1) return n;"],
        }),
        line("  let prev = 0;", {
          coach:
            "Plain recursion is far too slow here, so we build the sequence from the start with only two variables. The first one holds the number before the current one.",
          hint1: "Declare it with `let`. It starts as the number at position 0.",
          explain: "prev is the number before the current one, and it starts at 0.",
        }),
        line("  let current = 1;", {
          coach: "The second variable holds the current number.",
          hint1: "Another `let`. It starts as the number at position 1.",
          explain: "current is the number at the position I have reached, and it starts at 1.",
        }),
        line("  for (let i = 2; i <= n; i++) {", {
          coach:
            "Positions 0 and 1 are done, so we count from position 2 up to the position we want. That last position is included.",
          hint1: "A plain `for` loop that starts at 2 and uses `<=`, so `n` is included.",
          explain: "I loop from 2 to n.",
        }),
        line("    const next = prev + current;", {
          coach:
            "The number that comes next is the sum of the two we hold. We keep it in a third variable, because we are about to change the other two.",
          hint1: "Add `prev` and `current`, and keep the sum in a `const`.",
          explain: "next is the sum of prev and current.",
        }),
        line("    prev = current;", {
          coach:
            "Now both variables move one step forward. The older one must take the current number first, before that number is replaced.",
          hint1: "Assign to `prev`. This line must come before `current` changes.",
          explain: "The old current becomes the new prev.",
        }),
        line("    current = next;\n  }", {
          coach:
            "The current number is saved, so now it is safe to replace it with the new one, and then we close the loop. Two lines.",
          hint1: "Assign the sum we saved to `current`, then a closing brace.",
          explain: "Then next becomes current.",
        }),
        line("  return current;\n}", {
          coach:
            "When the loop ends, the current number is the one at the position we want, so we give it back and close the function. Two lines.",
          hint1: "`return` the current number, then close the function.",
          explain: "After the loop, current is the n-th number, and I return it.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(1). Plain recursion is O(2ⁿ).",
  followUps: [
    {
      question: "Why not plain recursion?",
      answer:
        "fibonacci(n) calls itself twice, so the same values are computed again and again. It grows like 2 to the power n.",
    },
    {
      question: "How do you fix the recursive version?",
      answer: "With memoization: I save each result in a cache, so every n is computed once.",
    },
  ],
};
