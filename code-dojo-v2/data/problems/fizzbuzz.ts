import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "first-five",
    name: "the first five",
    code: `expect(fizzBuzz(5)).toEqual([1, 2, "Fizz", 4, "Buzz"]);`,
  },
  {
    id: "fifteen",
    name: "edge case: 15 is FizzBuzz, not Fizz",
    code: `
const result = fizzBuzz(15);
expect(result[14], "the 15th item").toBe("FizzBuzz");
expect(result).toEqual([1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz", 11, "Fizz", 13, 14, "FizzBuzz"]);`,
  },
  {
    id: "zero",
    name: "edge case: n is 0",
    code: `expect(fizzBuzz(0)).toEqual([]);`,
  },
  {
    id: "one",
    name: "edge case: n is 1",
    code: `expect(fizzBuzz(1)).toEqual([1]);`,
  },
  {
    id: "n-included",
    name: "n itself is included",
    code: `
expect(fizzBuzz(3)).toEqual([1, 2, "Fizz"]);
expect(fizzBuzz(10).length).toBe(10);`,
  },
  {
    id: "multiples-of-15",
    name: "every multiple of 15 up to 60 is FizzBuzz",
    code: `
const result = fizzBuzz(60);
expect([result[14], result[29], result[44], result[59]]).toEqual(["FizzBuzz", "FizzBuzz", "FizzBuzz", "FizzBuzz"]);`,
  },
  {
    id: "numbers-stay-numbers",
    name: "plain numbers stay numbers",
    code: `
const result = fizzBuzz(2);
expect(typeof result[0], "typeof the first item").toBe("number");
expect(typeof result[1], "typeof the second item").toBe("number");`,
  },
];

export const fizzBuzz: CodeProblem = {
  id: "fizzbuzz",
  kind: "code",
  group: "algorithms",
  title: "FizzBuzz",
  difficulty: "easy",
  tag: "likely",
  language: "js",
  api: ["fizzBuzz"],
  plainLoops: true,
  statement:
    'Return an array for the numbers 1 to n: "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself otherwise.',
  examples: ['fizzBuzz(5); // [1, 2, "Fizz", 4, "Buzz"]'],
  askFirst: [
    "Should I print the values or return them?",
    "Does it start from 1, and is n included?",
    "Should the plain numbers be numbers or strings?",
  ],
  edgeCases: ["n is 0: empty array", "n is 1", "15 must be FizzBuzz, not Fizz"],
  parts: [
    {
      id: "main",
      title: "fizzBuzz",
      signature: "fizzBuzz(n)",
      steps: [
        line("function fizzBuzz(n) {", {
          coach: "Let's start, Islam. We need a function that takes the last number.",
          hint1: "Declare a function called `fizzBuzz` with one parameter.",
          explain: "fizzBuzz takes the last number.",
        }),
        line("  const result = [];", {
          coach: "We return the values and do not print them, so we need a place to collect them.",
          hint1: "Create an empty array and keep it in a variable.",
          explain: "I collect the answers in an array.",
        }),
        line("  for (let i = 1; i <= n; i++) {", {
          coach: "The task counts from 1, not from 0, and the last number is part of the answer too.",
          hint1: "A plain `for` loop that starts at 1 and uses `<=`, so `n` is included.",
          explain: "I loop from 1 to n, and n is included.",
        }),
        line("    if (i % 15 === 0) {", {
          coach:
            "The order of the checks matters here. A multiple of both 3 and 5 is also a multiple of 3, so we must ask about both first.",
          hint1: "A number that 3 and 5 both divide is a multiple of 15. Use `%` and compare the remainder with 0.",
          explain: "I check the multiples of 15 first, because they are the multiples of both 3 and 5.",
          accept: ["    if (i % 3 === 0 && i % 5 === 0) {", "    if (i % 5 === 0 && i % 3 === 0) {"],
        }),
        line('      result.push("FizzBuzz");', {
          coach: "For such a number the full word goes into the output.",
          hint1: "`push` the string for both into `result`.",
          explain: "I push FizzBuzz for a multiple of both.",
        }),
        line("    } else if (i % 3 === 0) {", {
          coach: "The multiples of both are handled, so now it is safe to ask about 3 alone.",
          hint1: "Close the `if` block and open an `else if` with the same kind of check, this time for 3.",
          explain: "The second check is for the multiples of 3.",
        }),
        line('      result.push("Fizz");', {
          coach: "A multiple of 3 gets the first word.",
          hint1: "`push` the string for 3 into `result`.",
          explain: "I push Fizz for a multiple of 3.",
        }),
        line("    } else if (i % 5 === 0) {", {
          coach: "In the same way we ask about 5 alone.",
          hint1: "Another `else if`, this time for 5.",
          explain: "The third check is for the multiples of 5.",
        }),
        line('      result.push("Buzz");', {
          coach: "A multiple of 5 gets the second word.",
          hint1: "`push` the string for 5 into `result`.",
          explain: "I push Buzz for a multiple of 5.",
        }),
        line("    } else {", {
          coach: "The last case: 3 and 5 do not divide the number.",
          hint1: "Close the block and open an `else` block on the same line.",
          explain: "Otherwise the number is not a multiple of 3 or of 5.",
        }),
        line("      result.push(i);\n    }\n  }", {
          coach: "Such a number goes into the output as it is, and then we close the else and the loop. Three lines.",
          hint1: "`push` the number itself, then two closing braces.",
          explain: "I push the number itself.",
        }),
        line("  return result;\n}", {
          coach: "All the numbers are handled, so we give the array back and close the function. Two lines.",
          hint1: "`return` the result array, then close the function.",
          explain: "At the end I return the array.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(n) for the result.",
  followUps: [
    {
      question: "Why check 15 first?",
      answer: "15 is also a multiple of 3. If I check 3 first, 15 becomes Fizz and never reaches the FizzBuzz branch.",
    },
    {
      question: "How would you do it without checking 15?",
      answer:
        "Build a string: add Fizz for 3, add Buzz for 5, and push the string, or the number if the string is empty.",
    },
  ],
};
