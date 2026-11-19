import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "repeats-text",
    name: "repeats the text inside the brackets",
    code: `expect(decodeString("3[a]2[ab]")).toBe("aaaabab");`,
  },
  {
    id: "nested",
    name: "edge case: nested brackets",
    code: `
expect(decodeString("2[a3[b]]c")).toBe("abbbabbbc");
expect(decodeString("2[2[2[a]]]")).toBe("aaaaaaaa");`,
  },
  {
    id: "empty-string",
    name: "edge case: empty string",
    code: `expect(decodeString("")).toBe("");`,
  },
  {
    id: "multi-digit",
    name: "edge case: multi-digit numbers",
    code: `
expect(decodeString("10[x]")).toBe("xxxxxxxxxx");
expect(decodeString("12[ab]").length).toBe(24);`,
  },
  {
    id: "letters-outside",
    name: "edge case: letters outside any brackets",
    code: `
expect(decodeString("abc")).toBe("abc");
expect(decodeString("ab2[c]d")).toBe("abccd");
expect(decodeString("x3[y]z")).toBe("xyyyz");`,
  },
  {
    id: "count-one-and-zero",
    name: "a count of 1 and a count of 0",
    code: `
expect(decodeString("1[a]")).toBe("a");
expect(decodeString("0[a]b")).toBe("b");`,
  },
  {
    id: "groups-inside-group",
    name: "two groups next to each other inside a group",
    code: `expect(decodeString("2[a2[b]3[c]]")).toBe("abbcccabbccc");`,
  },
  {
    id: "number-reset",
    name: "the number is reset after each group",
    code: `expect(decodeString("2[a]3[b]")).toBe("aabbb");`,
  },
];

export const decodeString: CodeProblem = {
  id: "decode-string",
  kind: "code",
  group: "algorithms",
  title: "Decode a string: 3[a]2[ab]",
  difficulty: "hard",
  tag: "reported",
  language: "js",
  api: ["decodeString"],
  plainLoops: true,
  statement: "Expand the string: a number followed by brackets repeats the text inside.",
  examples: ['decodeString("3[a]2[ab]"); // "aaaabab"', 'decodeString("2[a3[b]]c"); // "abbbabbbc"'],
  askFirst: [
    "Can the brackets be nested, like 2[a3[b]]?",
    "Can the number have more than one digit?",
    "Is the input always valid?",
  ],
  edgeCases: [
    "Empty string",
    "Nested brackets",
    "Multi-digit numbers like 10[x]",
    "Letters outside any brackets",
  ],
  parts: [
    {
      id: "main",
      title: "decodeString",
      signature: "decodeString(s)",
      steps: [
        line("function decodeString(s) {", {
          coach: "Let's start, Islam. We need a function that takes the encoded string.",
          hint1: "Declare a function called `decodeString` with one parameter.",
          explain: "decodeString takes the encoded string.",
        }),
        line("  const countStack = [];", {
          coach:
            "At every opening bracket we must remember two things. The first is the repeat count, and brackets can be nested, so the counts go on a stack.",
          hint1: "An empty array works as a stack.",
          explain: "The first stack keeps the repeat count of every bracket that is still open.",
        }),
        line("  const textStack = [];", {
          coach: "The second thing to remember is the text that we built before the bracket. It gets its own stack.",
          hint1: "A second empty array, in its own variable.",
          explain: "The second stack keeps the text that came before each open bracket.",
        }),
        line('  let current = "";', {
          coach: "The text of the level we are in grows as we read, so it needs a variable that can change.",
          hint1: "Declare it with `let` and start with an empty string.",
          explain: "current is the text I am building at this level.",
        }),
        line("  let num = 0;", {
          coach: "A count can have more than one digit, so we need a place to build the number while we read it.",
          hint1: "Declare it with `let` and start from 0.",
          explain: "num collects the digits of the count I am reading.",
        }),
        line("  for (let i = 0; i < s.length; i++) {", {
          coach: "Now we read the string one character at a time, from the start to the end.",
          hint1: "A plain `for` loop over `s`, from the first index to the last.",
          explain: "I loop over every index of the string.",
        }),
        line("    const ch = s[i];", {
          coach: "We will test the current character several times, so we give it a short name.",
          hint1: "Read the character at index `i` and keep it in a `const`.",
          explain: "I keep the current character in a variable.",
        }),
        line('    if (ch >= "0" && ch <= "9") {', {
          coach: "A character can be one of four things. The first case is a digit.",
          hint1: 'Compare `ch` with the strings "0" and "9", and join the two checks with `&&`.',
          explain: "The first of the four cases is a digit, which is a character from 0 to 9.",
        }),
        line("      num = num * 10 + Number(ch);", {
          coach:
            "A new digit goes to the right of the digits we already read. So the old value must move one place to the left before we add the digit.",
          hint1: "Multiply `num` by 10, then add the digit. `Number` turns the character into a number.",
          explain: "I multiply the number by ten and add the new digit, so a count with many digits works.",
        }),
        line('    } else if (ch === "[") {', {
          coach: "The second case: the character opens a bracket, so a deeper level starts here.",
          hint1: 'Close the `if` block and open an `else if` that compares `ch` with the string "[".',
          explain: "The second case is an opening bracket.",
        }),
        line("      countStack.push(num);", {
          coach:
            "Before we go inside the bracket, we save the count that we just read. We need it again when this bracket closes.",
          hint1: "`push` the number onto the stack of counts.",
          explain: "I save the count on its stack.",
        }),
        line("      textStack.push(current);", {
          coach: "We also save the text that we built so far, so we can come back to it later.",
          hint1: "`push` again, this time the text onto the other stack.",
          explain: "I save the text so far on the other stack.",
        }),
        line("      num = 0;", {
          coach: "The count is saved now. The next count must not start from the old digits, so we clear the number.",
          hint1: "Set `num` back to its start value.",
          explain: "I reset the number, so the next count starts from zero.",
        }),
        line('      current = "";', {
          coach: "The inside of the bracket is a new level, so its text must start empty.",
          hint1: "Set `current` to an empty string.",
          explain: "I start a new empty text for the inside of the bracket.",
        }),
        line('    } else if (ch === "]") {', {
          coach: "The third case: the character closes a bracket, so the current level is finished.",
          hint1: "Another `else if`, this time for the closing bracket.",
          explain: "The third case is a closing bracket.",
        }),
        line("      const times = countStack.pop();", {
          coach: "To finish this level we must know how many times to repeat it. That is the last count we saved.",
          hint1: "`pop` takes the last item off a stack and gives it back.",
          explain: "I pop the count that I saved for this bracket.",
        }),
        line("      const before = textStack.pop();", {
          coach: "We also need the text that came before this bracket.",
          hint1: "`pop` again, this time from `textStack`.",
          explain: "I pop the text that I saved when this bracket opened.",
        }),
        line('      let repeated = "";', {
          coach: "We need an empty text where we collect the copies.",
          hint1: "Declare it with `let` and start with an empty string.",
          explain: "I start an empty string for the repeated text.",
        }),
        line("      for (let j = 0; j < times; j++) repeated += current;", {
          coach: "Now we add the text of this level to it, once for every repeat. We use a loop of our own for that.",
          hint1: "A `for` loop that runs `times` times, with one `+=` as its body.",
          explain: "A plain loop adds the current text once for each repeat.",
        }),
        line("      current = before + repeated;", {
          coach:
            "The level is closed, so we go back to the outer text. It is the old text with the repeated text after it.",
          hint1: "Use `+` to put the repeated text after the old text.",
          explain: "Now current is the text before the bracket plus the repeated text.",
        }),
        line("    } else {", {
          coach: "The fourth case: any other character, which means a plain letter.",
          hint1: "Close the block and open an `else` block on the same line.",
          explain: "The last case is any other character.",
        }),
        line("      current += ch;", {
          coach: "A plain letter needs no work. It goes to the end of the text we are building.",
          hint1: "Use `+=` on `current`.",
          explain: "I add the letter to the current text.",
        }),
        line("    }\n  }", {
          coach: "We close the else, and then the loop. Two lines.",
          hint1: "Two closing braces, each on its own line.",
          explain: "I close the else and the loop.",
        }),
        line("  return current;\n}", {
          coach:
            "The whole string is read and the text we built is the answer, so we give it back and close the function. Two lines.",
          hint1: "`return` the text, then close the function.",
          explain: "At the end, current is the decoded string, and I return it.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(length of the output). Space: O(depth of nesting).",
  followUps: [
    {
      question: "Why two stacks?",
      answer: "At each opening bracket I must remember the count and the text before it.",
    },
  ],
};
