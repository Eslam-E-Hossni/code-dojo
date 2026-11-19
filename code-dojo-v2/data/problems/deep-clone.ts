import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "primitives",
    name: "returns primitives as they are",
    code: `
expect(deepClone(5)).toBe(5);
expect(deepClone("text")).toBe("text");
expect(deepClone(true)).toBe(true);
expect(deepClone(undefined)).toBe(undefined);`,
  },
  {
    id: "null",
    name: "edge case: null stays null",
    code: `
expect(deepClone(null)).toBe(null);
expect(deepClone({ empty: null })).toEqual({ empty: null });`,
  },
  {
    id: "nested-object",
    name: "copies a nested object deeply",
    code: `
const original = { name: "A", address: { city: "X" } };
const copy = deepClone(original);
expect(copy).toEqual({ name: "A", address: { city: "X" } });
expect(copy, "the copy").not.toBe(original);
expect(copy.address, "the nested object in the copy").not.toBe(original.address);
copy.address.city = "Z";
expect(original.address.city, "the original after changing the copy").toBe("X");`,
  },
  {
    id: "arrays",
    name: "copies arrays as arrays",
    code: `
const original = [1, [2, 3], { list: [4] }];
const copy = deepClone(original);
expect(Array.isArray(copy), "the copy is an array").toBe(true);
expect(copy).toEqual([1, [2, 3], { list: [4] }]);
expect(copy[1], "the inner array in the copy").not.toBe(original[1]);
expect(Array.isArray(copy[2].list), "the array inside an object is an array").toBe(true);`,
  },
  {
    id: "dates",
    name: "edge case: Date objects are copied",
    code: `
const original = { at: new Date(2020, 0, 15) };
const copy = deepClone(original);
expect(copy.at instanceof Date, "the copy is a Date").toBe(true);
expect(copy.at.getTime(), "the time of the copy").toBe(original.at.getTime());
expect(copy.at, "the Date in the copy").not.toBe(original.at);`,
  },
  {
    id: "circular",
    name: "edge case: circular references",
    code: `
const original = { name: "loop" };
original.self = original;
const copy = deepClone(original);
expect(copy, "the copy").not.toBe(original);
expect(copy.name).toBe("loop");
expect(copy.self, "copy.self").toBe(copy);`,
  },
  {
    id: "functions",
    name: "edge case: functions are copied by reference",
    code: `
const greet = () => "hi";
const copy = deepClone({ greet });
expect(copy.greet, "the function in the copy").toBe(greet);`,
  },
  {
    id: "shared-object",
    name: "an object used in two places is copied once",
    code: `
const shared = { n: 1 };
const copy = deepClone({ a: shared, b: shared });
expect(copy.a, "copy.a").not.toBe(shared);
expect(copy.b, "copy.b").toBe(copy.a);`,
  },
  {
    id: "empty",
    name: "empty object and empty array",
    code: `
expect(deepClone({})).toEqual({});
expect(deepClone([])).toEqual([]);
expect(Array.isArray(deepClone([])), "an empty array stays an array").toBe(true);`,
  },
];

export const deepClone: CodeProblem = {
  id: "deep-clone",
  kind: "code",
  group: "most-repeated",
  title: "Shallow copy and deep copy: deepClone",
  difficulty: "medium",
  tag: "reported",
  language: "js",
  api: ["deepClone"],
  plainLoops: true,
  statement: "Show a shallow copy and a deep copy, and write a deepClone function.",
  examples: [
    'const original = { name: "A", address: { city: "X" } };',
    "",
    "const shallow = { ...original };",
    'shallow.address.city = "Y";      // also changes original.address.city',
    "",
    "const deep = structuredClone(original);",
    'deep.address.city = "Z";         // original is not changed',
  ],
  askFirst: ["Which types must deepClone support: dates, arrays?", "Do I need to handle circular references?"],
  edgeCases: ["null: typeof null is 'object'", "Date objects", "Circular references", "Functions are copied by reference"],
  parts: [
    {
      id: "main",
      title: "deepClone",
      signature: "deepClone(value)",
      steps: [
        line("function deepClone(value, seen = new WeakMap()) {", {
          coach:
            "Let's start, Islam. The function takes the value to copy, and a second parameter with a default value that remembers the objects we already copied.",
          hint1: "Declare `deepClone` with two parameters. The second one, `seen`, gets a `new WeakMap` as its default value.",
          explain: "deepClone takes a value, and a WeakMap of the objects it has already copied.",
        }),
        line('  if (value === null || typeof value !== "object") return value;', {
          coach:
            "First the simple case: a value that is not an object has nothing inside to copy, so it goes back as it is. We must not forget `null`, which looks like an object to `typeof`.",
          hint1:
            'One `if` with two conditions and `||` between them: the value is `null`, or `typeof` does not give "object". Then `return` the value.',
          explain: "I return primitives and null as they are, and null needs its own check because typeof null is object.",
        }),
        line("  if (value instanceof Date) return new Date(value);", {
          coach: "A date is a special case, because its time is not stored under normal keys. It needs its own way to be copied.",
          hint1: "Check with `instanceof Date`. A `new Date` can be built from another date.",
          explain: "A Date gets a new Date with the same time.",
        }),
        line("  if (seen.has(value)) return seen.get(value);", {
          coach:
            "An object can point back to itself, and then the copying would never stop. When we meet an object for the second time, we give back the copy we already made.",
          hint1: "Ask `seen` with `has`. If the answer is yes, `return` what `get` gives for the same value.",
          explain: "If I have already copied this object, I return that copy, which stops the endless loop on circular references.",
        }),
        line("  const copy = Array.isArray(value) ? [] : {};", {
          coach: "Now we prepare the empty copy. It must be an array when the original is an array, and a plain object in every other case.",
          hint1: "A ternary on `Array.isArray`, and the result goes into a variable.",
          explain: "The copy starts as an empty array or an empty object, the same kind as the original.",
        }),
        line("  seen.set(value, copy);", {
          coach:
            "Now the memory must learn about this new copy. We do it before we fill the copy, because something inside can point back to this object.",
          hint1: "A WeakMap saves a pair with `set`: the original is the key, and the copy is the value.",
          explain: "I save the pair of original and copy before I go deeper, so a reference back to this object finds the copy.",
        }),
        line("  for (const key of Object.keys(value)) {", {
          coach: "Next we go over every key of the original, one by one.",
          hint1: "A `for...of` loop over `Object.keys` of the original.",
          explain: "Object.keys gives the own keys of the original, and I loop over them.",
        }),
        line("    copy[key] = deepClone(value[key], seen);\n  }", {
          coach:
            "The value under each key can be an object too, so the same function copies it with the same `seen`, and then we close the loop. Two lines.",
          hint1: "Call `deepClone` on `value[key]` and pass `seen` along. Put the result in `copy[key]`, then close the block.",
          explain: "Each value is cloned with a recursive call, and I pass the same WeakMap along.",
        }),
        line("  return copy;\n}", {
          coach: "Every key is copied now, so we give the copy back and close the function. Two lines.",
          hint1: "`return` the copy, then close the function.",
          explain: "At the end I return the copy.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "Time and space: O(n) for n values.",
  followUps: [
    {
      question: "Problem with JSON.parse(JSON.stringify(x))?",
      answer: "It loses dates, undefined, functions, and it throws on circular references.",
    },
  ],
};
