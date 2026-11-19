import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

/** Both versions must behave the same, so they share these tests. */
function sharedTests(fn: string, part: string): TestCase[] {
  return [
    {
      id: part + "-nested",
      name: fn + ": nested to any depth",
      part,
      code: `expect(${fn}([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);`,
    },
    {
      id: part + "-flat",
      name: fn + ": an already flat array stays the same",
      part,
      code: `expect(${fn}([1, 2, 3])).toEqual([1, 2, 3]);`,
    },
    {
      id: part + "-order",
      name: fn + ": keeps the order of the items",
      part,
      code: `expect(${fn}([[1, 2], 3, [[4], 5], [[[6]]]])).toEqual([1, 2, 3, 4, 5, 6]);`,
    },
    {
      id: part + "-empty",
      name: fn + ": edge case: empty array",
      part,
      code: `expect(${fn}([])).toEqual([]);`,
    },
    {
      id: part + "-empty-inside",
      name: fn + ": edge case: empty arrays inside",
      part,
      code: `
expect(${fn}([1, [], 2])).toEqual([1, 2]);
expect(${fn}([[], [[]], [[], []]])).toEqual([]);`,
    },
    {
      id: part + "-one-item",
      name: fn + ": one item",
      part,
      code: `
expect(${fn}([5])).toEqual([5]);
expect(${fn}([[[5]]])).toEqual([5]);`,
    },
    {
      id: part + "-duplicates",
      name: fn + ": duplicates and negative numbers are kept",
      part,
      code: `expect(${fn}([-1, [-1, [0, 0]], -2])).toEqual([-1, -1, 0, 0, -2]);`,
    },
    {
      id: part + "-other-values",
      name: fn + ": strings, null and objects are left as they are",
      part,
      code: `
const item = { list: [1, 2] };
expect(${fn}(["ab", [null, [undefined, item]], "cd"])).toEqual(["ab", null, undefined, item, "cd"]);`,
    },
    {
      id: part + "-new-array",
      name: fn + ": returns a new array and does not change the input",
      part,
      code: `
const input = [1, [2, [3]]];
const output = ${fn}(input);
expect(output, "the returned array").not.toBe(input);
expect(input, "the input after the call").toEqual([1, [2, [3]]]);`,
    },
  ];
}

const tests: TestCase[] = [
  ...sharedTests("flatten", "recursive"),
  ...sharedTests("flattenIterative", "iterative"),
  {
    id: "iterative-very-deep",
    name: "flattenIterative: edge case: very deep nesting does not overflow the stack",
    part: "iterative",
    code: `
let deep = [1];
for (let i = 0; i < 50000; i++) deep = [deep];
expect(flattenIterative(deep)).toEqual([1]);`,
  },
];

function idsOf(part: string): string[] {
  const out: string[] = [];
  for (const test of tests) {
    if (test.part === part) out.push(test.id);
  }
  return out;
}

export const flatten: CodeProblem = {
  id: "flatten",
  kind: "code",
  group: "most-repeated",
  title: "Flatten a nested array",
  difficulty: "medium",
  tag: "reported",
  language: "js",
  api: ["flatten", "flattenIterative"],
  plainLoops: true,
  statement: "Flatten a multi-dimensional array without using flat() or other built-in helpers.",
  examples: ["flatten([1, [2, [3, [4]]]]); // [1, 2, 3, 4]"],
  askFirst: [
    "Can it be nested to any depth?",
    "Should I return a new array or change the input?",
    "Is Array.isArray allowed?",
  ],
  edgeCases: [
    "Empty array",
    "Empty arrays inside: [1, [], 2]",
    "Very deep nesting: recursion can overflow the stack",
  ],
  parts: [
    {
      id: "recursive",
      title: "Recursive version",
      signature: "flatten(arr)",
      steps: [
        line("function flatten(arr) {", {
          coach: "Let's start, Islam. We need a function that takes the nested array.",
          hint1: "Declare a function called `flatten` with one parameter.",
          explain: "flatten takes the nested array.",
        }),
        line("  const result = [];", {
          coach: "We must not change the input, so we collect the flat items in a new array.",
          hint1: "Create an empty array and keep it in a variable.",
          explain: "I create a new array for the output, so I don't change the input.",
        }),
        line("  for (let i = 0; i < arr.length; i++) {", {
          coach: "We look at every item of the array, one by one, in order.",
          hint1: "A plain `for` loop over `arr`, from the first index to the last.",
          explain: "I loop over every item with a plain for loop.",
        }),
        line("    if (Array.isArray(arr[i])) {", {
          coach: "An item can be a plain value or another array. We need to know which one it is.",
          hint1: "`Array.isArray` tells you if a value is an array.",
          explain: "For each item I check if it is an array.",
        }),
        line("      const inner = flatten(arr[i]);", {
          coach: "If the item is an array, it can hold more arrays inside. We let the same function flatten it first.",
          hint1: "Call `flatten` again on the item, and keep the answer in a variable.",
          explain: "If it is, I flatten it first with a recursive call.",
        }),
        line("      for (let j = 0; j < inner.length; j++) {", {
          coach: "Now the inner array is flat. We move its items into our result one by one, with our own loop.",
          hint1: "A second `for` loop, this time over `inner`.",
          explain: "Then I loop over the flattened inner array.",
        }),
        line("        result.push(inner[j]);\n      }", {
          coach: "Each inner item goes to the end of the result. Then we close this inner loop.",
          hint1: "`push` the item into `result`, then close the block.",
          explain: "I push each inner item into the result.",
        }),
        line("    } else {", {
          coach: "The other case: the item is not an array.",
          hint1: "Close the `if` block and open an `else` block on the same line.",
          explain: "Otherwise it is a plain value.",
        }),
        line("      result.push(arr[i]);", {
          coach: "A plain value needs no work. It goes into the result as it is.",
          hint1: "`push` the item itself into `result`.",
          explain: "I push it into the result as it is.",
        }),
        line("    }\n  }", {
          coach: "We close the else, and then the loop. Two lines.",
          hint1: "Two closing braces, each on its own line.",
          explain: "I close the else and the loop.",
        }),
        line("  return result;\n}", {
          coach: "Every item is handled now. We give the new array back and close the function.",
          hint1: "`return` the result array, then close the function.",
          explain: "At the end I return the result.",
          checks: idsOf("recursive"),
        }),
      ],
    },
    {
      id: "iterative",
      title: "Iterative version with a stack (no recursion)",
      signature: "flattenIterative(arr)",
      steps: [
        line("function flattenIterative(arr) {", {
          coach:
            "Now the second version. Recursion can overflow the call stack on a very deep array, so this time we keep our own stack.",
          hint1: "Declare a function called `flattenIterative` with one parameter.",
          explain: "The second version uses my own stack, so very deep arrays cannot overflow the call stack.",
        }),
        line("  const stack = [];", {
          coach: "We need a place for the items that still wait for their turn.",
          hint1: "An empty array works as a stack.",
          explain: "I create a stack for the items that still wait.",
        }),
        line("  for (let i = arr.length - 1; i >= 0; i--) stack.push(arr[i]);", {
          coach:
            "We put all the items on the stack. A stack gives back the last item first, so we go from the end to the start.",
          hint1: "A `for` loop that counts down from the last index to 0, with one `push` as its body.",
          explain: "I push the items in reverse order, so the first item is on top of the stack.",
        }),
        line("  const result = [];", {
          coach: "And we need the new array for the flat items.",
          hint1: "Another empty array, in its own variable.",
          explain: "And I create the result array.",
        }),
        line("  while (stack.length > 0) {", {
          coach: "We work as long as something still waits on the stack.",
          hint1: "A `while` loop that checks the length of `stack`.",
          explain: "I keep going while the stack is not empty.",
        }),
        line("    const item = stack.pop();", {
          coach: "We take the item that is on top of the stack.",
          hint1: "`pop` removes the last item of an array and gives it back.",
          explain: "I take the top item.",
        }),
        line("    if (Array.isArray(item)) {", {
          coach: "Again we need to know: is this item an array or a plain value?",
          hint1: "`Array.isArray` again, this time on `item`.",
          explain: "I check if the top item is an array.",
        }),
        line("      for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);", {
          coach:
            "An array is not ready for the result yet. We put its items back on the stack, again from the end to the start, to keep the order.",
          hint1: "The same count-down loop as before, this time over `item`.",
          explain: "I push its items back on the stack, again in reverse, to keep the order.",
        }),
        line("    } else {", {
          coach: "The other case: a plain value.",
          hint1: "Close the `if` block and open an `else` block on the same line.",
          explain: "Otherwise the item is a plain value.",
        }),
        line("      result.push(item);", {
          coach: "A plain value is finished. It goes into the result.",
          hint1: "`push` it into `result`.",
          explain: "A plain value goes straight into the result.",
        }),
        line("    }\n  }", {
          coach: "We close the else, and then the while loop. Two lines.",
          hint1: "Two closing braces, each on its own line.",
          explain: "I close the else and the while loop.",
        }),
        line("  return result;\n}", {
          coach: "The stack is empty, so nothing is left to do. We give the result back and close the function.",
          hint1: "`return` the result array, then close the function.",
          explain: "When the stack is empty, I return the result.",
          checks: idsOf("iterative"),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n) for n total items. Space: O(n) for the result, plus the depth for recursion.",
  followUps: [
    {
      question: "Recursion or a loop?",
      answer: "Recursion is simpler to read. The stack version is safer for very deep arrays.",
    },
    {
      question: "How would you add a depth parameter?",
      answer: "I pass depth to the recursive call and stop flattening when it is 0.",
    },
  ],
};
