import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "nested",
    name: "nested brackets of all kinds",
    code: `
expect(isValid("{[()]}")).toBe(true);
expect(isValid("()[]{}")).toBe(true);`,
  },
  {
    id: "wrong-order",
    name: "edge case: wrong order",
    code: `
expect(isValid("([)]")).toBe(false);
expect(isValid("(]")).toBe(false);`,
  },
  {
    id: "empty",
    name: "edge case: empty string",
    code: `expect(isValid("")).toBe(true);`,
  },
  {
    id: "starts-closing",
    name: "edge case: starts with a closing bracket",
    code: `
expect(isValid(")")).toBe(false);
expect(isValid("]()")).toBe(false);`,
  },
  {
    id: "left-open",
    name: "edge case: left open",
    code: `
expect(isValid("((")).toBe(false);
expect(isValid("{[()]")).toBe(false);`,
  },
  {
    id: "extra-closing",
    name: "one extra closing bracket at the end",
    code: `expect(isValid("()())")).toBe(false);`,
  },
  {
    id: "other-characters",
    name: "other characters are ignored",
    code: `
expect(isValid("a(b)c")).toBe(true);
expect(isValid("fn(arr[0]) { }")).toBe(true);
expect(isValid("fn(arr[0)]")).toBe(false);`,
  },
  {
    id: "single-and-long",
    name: "a single pair, and a long valid string",
    code: `
expect(isValid("()")).toBe(true);
expect(isValid("((((((((((()))))))))))")).toBe(true);`,
  },
];

export const validParentheses: CodeProblem = {
  id: "valid-parentheses",
  kind: "code",
  group: "algorithms",
  title: "Valid parentheses",
  difficulty: "medium",
  tag: "reported",
  language: "js",
  api: ["isValid"],
  plainLoops: true,
  statement: "Return true if every opening bracket is closed in the right order.",
  examples: ['isValid("{[()]}"); // true', 'isValid("([)]");   // false'],
  askFirst: ["Only round brackets, or also [] and {}?", "Can the string have other characters?"],
  edgeCases: ["Empty string: valid", "Starts with a closing bracket", 'Wrong order: "([)]"', 'Left open: "(("'],
  parts: [
    {
      id: "main",
      title: "isValid",
      signature: "isValid(s)",
      steps: [
        line("function isValid(s) {", {
          coach: "Let's start, Islam. We need a function that takes the string and answers true or false.",
          hint1: "Declare a function called `isValid` with one parameter.",
          explain: "isValid takes the string.",
        }),
        line('  const pairs = { ")": "(", "]": "[", "}": "{" };', {
          coach:
            "For every closing bracket we must know which opening bracket belongs to it. We need a lookup table for the three kinds, with the closing bracket as the key.",
          hint1: "An object with three keys. Each key is a closing bracket as a string, and its value is the opening bracket.",
          explain: "pairs maps each closing bracket to its opening bracket.",
        }),
        line("  const stack = [];", {
          coach:
            "We also need a place for the opening brackets that are not closed yet. The last one opened must be the first one closed.",
          hint1: "An empty array works as a stack.",
          explain: "The stack holds the opening brackets that are still open.",
        }),
        line("  for (let i = 0; i < s.length; i++) {", {
          coach: "We go over the string, one character at a time.",
          hint1: "A plain `for` loop over `s`, from the first index to the last.",
          explain: "I loop over the string.",
        }),
        line("    const ch = s[i];", {
          coach: "We will use the current character several times, so we give it a short name.",
          hint1: "Read the character at index `i` and keep it in a `const`.",
          explain: "I keep the current character in a variable.",
        }),
        line('    if (ch === "(" || ch === "[" || ch === "{") {', {
          coach: "The first case: is this character an opening bracket of any of the three kinds?",
          hint1: "Three comparisons with `===`, joined by `||`. Each one compares `ch` with an opening bracket as a string.",
          explain: "I check if the character is an opening bracket.",
        }),
        line("      stack.push(ch);", {
          coach: "An opening bracket goes on the stack and waits there for the bracket that closes it.",
          hint1: "Use `push` on `stack`.",
          explain: "I push the opening bracket on the stack.",
        }),
        line("    } else if (pairs[ch]) {", {
          // `in` asks for the key, the reference asks for its value. Every value of the table is a bracket, so both work.
          accept: ["    } else if (ch in pairs) {"],
          coach:
            "The second case: is this character a closing bracket? It is one if our table has it as a key, and any other character is skipped.",
          hint1: "Close the `if` and open an `else if` that looks up `ch` in `pairs`.",
          explain: "Otherwise I check if it is a closing bracket, which means it is a key in pairs.",
        }),
        line("      if (stack.pop() !== pairs[ch]) return false;\n    }\n  }", {
          coach:
            "We take the last opening bracket off the stack, and if it is not the one that belongs to this closing bracket, the answer is false, then we close the else if and the loop. Three lines.",
          hint1:
            "`pop` the top of `stack` and compare it with `pairs[ch]`, using `!==`. If they differ, `return` `false`. Then two closing braces.",
          explain:
            "The top of the stack must match this closing bracket, and on an empty stack pop gives undefined, which is also wrong.",
        }),
        line("  return stack.length === 0;\n}", {
          coach:
            "A string that only opens brackets passes every check in the loop, so at the end we must also make sure that nothing is left on the stack, and we close the function. Two lines.",
          hint1: "`return` a comparison: the `length` of `stack` with 0. Then close the function.",
          explain: "At the end I return true only if the stack is empty, because anything left is a bracket that was never closed.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n). Space: O(n).",
  followUps: [
    {
      question: "With round brackets only, do you need a stack?",
      answer: "No. A counter is enough: +1 for open, -1 for close, never below zero, and zero at the end.",
    },
  ],
};
