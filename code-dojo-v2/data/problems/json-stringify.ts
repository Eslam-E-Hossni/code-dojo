import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "simple-values",
    name: "null, numbers and booleans",
    code: `
expect(stringify(null)).toBe("null");
expect(stringify(42)).toBe("42");
expect(stringify(-1.5)).toBe("-1.5");
expect(stringify(0)).toBe("0");
expect(stringify(true)).toBe("true");
expect(stringify(false)).toBe("false");`,
  },
  {
    id: "strings",
    name: "strings get double quotes",
    code: `
expect(stringify("hello")).toBe('"hello"');
expect(stringify("")).toBe('""');`,
  },
  {
    id: "nan-infinity",
    name: "edge case: NaN and Infinity become null",
    code: `
expect(stringify(NaN)).toBe("null");
expect(stringify(Infinity)).toBe("null");
expect(stringify(-Infinity)).toBe("null");`,
  },
  {
    id: "undefined-alone",
    name: "undefined and a function alone give undefined",
    code: `
expect(stringify(undefined)).toBe(undefined);
expect(stringify(() => 1)).toBe(undefined);`,
  },
  {
    id: "arrays",
    name: "arrays",
    code: `
expect(stringify([])).toBe("[]");
expect(stringify([1])).toBe("[1]");
expect(stringify([1, "a", true, null])).toBe('[1,"a",true,null]');`,
  },
  {
    id: "objects",
    name: "objects",
    code: `
expect(stringify({})).toBe("{}");
expect(stringify({ a: 1 })).toBe('{"a":1}');
expect(stringify({ a: 1, b: "x", c: false, d: null })).toBe('{"a":1,"b":"x","c":false,"d":null}');`,
  },
  {
    id: "undefined-in-array",
    name: "edge case: undefined and functions become null in arrays",
    code: `expect(stringify([1, undefined, () => 1, 2])).toBe("[1,null,null,2]");`,
  },
  {
    id: "undefined-in-object",
    name: "edge case: undefined and functions are skipped in objects",
    code: `
expect(stringify({ a: undefined, b: 1, c: () => 1, d: 2 })).toBe('{"b":1,"d":2}');
expect(stringify({ a: undefined })).toBe("{}");
expect(stringify({ a: 1, b: undefined })).toBe('{"a":1}');`,
  },
  {
    id: "nested",
    name: "edge case: nested objects and arrays",
    code: `
const value = { user: { name: "A", tags: ["x", "y"] }, list: [{ id: 1 }, [2, [3]]], empty: { a: [] } };
expect(stringify(value)).toBe(JSON.stringify(value));`,
  },
  {
    id: "same-as-real",
    name: "gives the same text as the real JSON.stringify",
    code: `
const values = [
  { a: [1, 2, { b: null }], c: "text", d: 1.5, e: true },
  [[], {}, [[]], { x: {} }],
  { n: NaN, i: Infinity, u: undefined, f: function () {}, z: 0 },
  [undefined, NaN, "a", -0.5],
];
for (let i = 0; i < values.length; i++) {
  expect(stringify(values[i]), "value number " + (i + 1)).toBe(JSON.stringify(values[i]));
}`,
  },
];

export const jsonStringify: CodeProblem = {
  id: "json-stringify",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: JSON.stringify",
  difficulty: "hard",
  tag: "polyfill",
  language: "js",
  api: ["stringify"],
  plainLoops: true,
  statement: "Write a simple version of JSON.stringify, as a function stringify(value).",
  examples: ['stringify({ a: 1, b: [true, null], c: "x" }); // \'{"a":1,"b":[true,null],"c":"x"}\''],
  askFirst: [
    "Which types must I support?",
    "Do I need to handle circular references?",
    "Do I need the indent argument?",
  ],
  edgeCases: [
    "undefined and functions are skipped in objects, and become null in arrays",
    "NaN and Infinity become null",
    "Nested objects and arrays",
    "Circular reference: the real one throws",
  ],
  parts: [
    {
      id: "main",
      title: "stringify",
      signature: "stringify(value)",
      steps: [
        line("function stringify(value) {", {
          coach: "Let's start, Islam. We need a function that takes any value and gives back its JSON text.",
          hint1: "Declare a function called `stringify` with one parameter.",
          explain: "stringify takes any value and returns its JSON text.",
        }),
        line('  if (value === null) return "null";', {
          coach:
            "We begin with the simple values and handle them one at a time. The first is null: its JSON form is the word null as text.",
          hint1: "An `if` that compares `value` with `null` and returns a string.",
          explain: "I start with the simple values, and null becomes the text null.",
        }),
        line("  if (typeof value === \"string\") return '\"' + value + '\"';", {
          coach: "Next, strings. In JSON a string always has double quotes around it, so we must add them.",
          hint1: "Check the type with `typeof`. Then join three pieces with +: a double quote, `value`, and a double quote.",
          explain: "A string is wrapped in double quotes.",
        }),
        line('  if (typeof value === "number") return isFinite(value) ? String(value) : "null";', {
          coach: "Next, numbers. A number is turned into text, but NaN and Infinity do not exist in JSON, so for them we give null.",
          hint1: '`isFinite` is false for NaN and for Infinity. Use it in a ternary: `String` of `value`, or the text `"null"`.',
          explain: "A number becomes its text, and NaN and Infinity become null because they are not valid JSON.",
        }),
        line('  if (typeof value === "boolean") return String(value);', {
          coach: "Next, booleans. They need no special rule: the value is only turned into text.",
          hint1: "The same check with `typeof`, and `String` turns the value into text.",
          explain: "A boolean becomes true or false as text.",
        }),
        line('  if (typeof value === "undefined" || typeof value === "function") return undefined;', {
          coach:
            "Two kinds of value have no place in JSON at all: undefined and functions. An array and an object treat them differently, so we give back undefined itself and the caller decides.",
          hint1: "Two `typeof` checks joined with ||. The result is `undefined` itself, not a string.",
          explain: "For undefined and for functions I return undefined, because they have no JSON form.",
        }),
        line("  if (Array.isArray(value)) {", {
          coach: "The simple values are done. Now arrays: first we need to know if the value is an array.",
          hint1: "`Array.isArray` tells you if a value is an array.",
          explain: "Next I check if the value is an array.",
        }),
        line('    let out = "[";', {
          coach: "We build the text piece by piece. The JSON text of an array starts with an opening square bracket.",
          hint1: "A string variable, declared with `let` because we will add to it.",
          explain: "The output starts with an opening bracket.",
        }),
        line("    for (let i = 0; i < value.length; i++) {", {
          coach: "We go through the items one by one, in order. We will need the index, to know which item is the first.",
          hint1: "A plain `for` loop over `value`, from the first index to the last.",
          explain: "I loop over the items.",
        }),
        line("      const item = stringify(value[i]);", {
          coach: "An item can be any value, also another array or an object. So we let the same function turn it into text.",
          hint1: "Call `stringify` again on the item at index `i`, and keep the answer in a variable.",
          explain: "Each item is converted with a recursive call.",
        }),
        line('      if (i > 0) out += ",";', {
          coach:
            "Items are separated by commas, and there must be no comma at the start or at the end. So we add one only when this is not the first item.",
          hint1: "An `if` on `i`. When it is greater than 0, add a comma to `out`.",
          explain: "I add a comma before every item except the first.",
        }),
        line('      out += item === undefined ? "null" : item;\n    }', {
          coach:
            "We add the item to the text, where an item with no JSON form is written as null so it keeps its place, and then we close the loop. Two lines.",
          hint1: 'A ternary on `item`: when it is `undefined`, add the text `"null"`. Then close the block.',
          explain: "Inside an array, undefined and functions are written as null.",
        }),
        line('    return out + "]";\n  }', {
          coach: "The array is finished: we give back the text with the closing square bracket, and then we close the if. Two lines.",
          hint1: "`return` the text plus the closing bracket, then close the block.",
          explain: "I add the closing bracket and return the text of the array.",
        }),
        line('  let out = "{";', {
          coach: "What is left is an object. Its JSON text starts with an opening curly brace.",
          hint1: "The same idea as in the array: a string variable declared with `let`.",
          explain: "Any value that reaches this line is an object, so the output starts with an opening brace.",
        }),
        line("  let first = true;", {
          coach:
            "Here the index cannot tell us where the commas go, because some keys will be skipped. So we need a flag that says if the next key is the first one we write.",
          hint1: "A boolean flag, declared with `let`. It starts as `true`.",
          explain: "Some keys are skipped, so I use a flag to know if a comma is needed.",
        }),
        line("  for (const key of Object.keys(value)) {", {
          coach: "We go through the keys of the object, one by one.",
          hint1: "`Object.keys` gives an array of the keys. Loop over it with `for...of`.",
          explain: "I loop over the own keys of the object.",
        }),
        line("    const item = stringify(value[key]);", {
          coach: "The value of this key can be anything, so again the same function turns it into text.",
          hint1: "Call `stringify` on the value at `key`, and keep the answer in a variable.",
          explain: "Each value is converted with a recursive call.",
        }),
        line("    if (item === undefined) continue;", {
          coach:
            "A value with no JSON form is treated differently in an object: the whole key is left out. So we skip this key and go to the next one.",
          hint1: "Compare `item` with `undefined`. The keyword `continue` jumps to the next turn of the loop.",
          explain: "Inside an object, a key with undefined or a function is skipped.",
        }),
        line('    if (!first) out += ",";', {
          coach: "If we have already written a key, this one needs a comma before it.",
          hint1: "An `if` on the opposite of `first`. When it holds, add a comma to `out`.",
          explain: "I add a comma before every key except the first one written.",
        }),
        line("    out += '\"' + key + '\":' + item;", {
          coach:
            "Now we write the pair itself: the key in double quotes, then a colon, then the text of the value. The colon can share a string with the closing quote.",
          hint1: "Add four pieces to `out` with +: a double quote, `key`, a string with a double quote and a colon, and `item`.",
          explain: "I write the key in double quotes, a colon, and the value.",
        }),
        line("    first = false;\n  }", {
          coach: "A key is written now, so the flag must change, and then we close the loop. Two lines.",
          hint1: "Set `first` to `false`, then close the block.",
          explain: "After a key is written the flag is false, so the next key gets a comma.",
        }),
        line('  return out + "}";\n}', {
          coach: "Last, we give back the text with the closing curly brace, and then we close the function. Two lines.",
          hint1: "`return` the text plus the closing brace, then close the function.",
          explain: "At the end I add the closing brace and return the text.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time: O(n) for n values in the object.",
  followUps: [
    {
      question: "What about quotes inside a string?",
      answer: "A full version must escape quotes and backslashes.",
    },
    {
      question: "How would you detect a circular reference?",
      answer: "With a WeakSet of the objects I am visiting.",
    },
  ],
};
