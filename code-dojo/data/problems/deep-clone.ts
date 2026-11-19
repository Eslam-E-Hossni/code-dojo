import type { CodeProblem } from "../types";

export const deepClone: CodeProblem = {
  id: "deep-clone",
  kind: "code",
  group: "most-repeated",
  title: "Shallow copy and deep copy: deepClone",
  difficulty: "medium",
  tag: "reported",
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
  askFirst: [
    "Which types must deepClone support: dates, arrays?",
    "Do I need to handle circular references?",
  ],
  edgeCases: [
    "null: typeof null is 'object'",
    "Date objects",
    "Circular references",
    "Functions are copied by reference",
  ],
  parts: [
    {
      id: "main",
      title: "deepClone",
      signature: "deepClone(value)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام: الدالة بتاخد القيمة اللي هننسخها، ومعاها parameter تاني بقيمة افتراضية هنحتاجه للـ circular references.",
          expected: "function deepClone(value, seen = new WeakMap()) {",
          hint1:
            "دالة اسمها `deepClone` بتاخد `value`، و `seen` اللي قيمته الافتراضية `new WeakMap()`.",
          hint2: "function _________(_____, ____ = new _______()) {",
          explain: "deepClone takes a value, and a WeakMap of the objects it has already copied.",
        },
        {
          coach:
            "أول حالة: أي حاجة مش object بترجع زي ما هي. وخد بالك إن `typeof null` بيقول object، فلازم تسأل عليه لوحده.",
          expected: '  if (value === null || typeof value !== "object") return value;',
          hint1:
            "`if` فيها شرطين بينهم `||`: القيمة `null`، أو الـ `typeof` مش object. والنتيجة `return value`.",
          hint2: 'if (_____ === ____ || typeof _____ !== "______") return _____;',
          explain:
            "Primitives and null are returned as they are. I check null by itself, because typeof null is object.",
        },
        {
          coach: "التاريخ حالة خاصة: نعمل منه نسخة جديدة بنفس الوقت.",
          expected: "  if (value instanceof Date) return new Date(value);",
          hint1: "اسأل بـ `instanceof Date`، ولو آه رجّع `new Date` من نفس القيمة.",
          hint2: "if (_____ instanceof ____) return new ____(_____);",
          explain: "A Date gets a new Date with the same time.",
        },
        {
          coach:
            "لو الـ object ده نسخناه قبل كده، رجّع نفس النسخة. ده اللي بيمنع اللف اللانهائي مع الـ circular reference.",
          expected: "  if (seen.has(value)) return seen.get(value);",
          hint1: "اسأل `seen.has`، ولو موجود رجّع `seen.get`.",
          hint2: "if (____.___(_____)) return ____.___(_____);",
          explain:
            "If I have already copied this object, I return that copy. This stops the endless loop on circular references.",
        },
        {
          coach: "دلوقتي نجهّز النسخة الفاضية: array لو الأصل array، و object لو غير كده.",
          expected: "  const copy = Array.isArray(value) ? [] : {};",
          hint1: "`const` اسمه `copy`، وقيمته ternary على `Array.isArray(value)`.",
          hint2: "const ____ = Array._______(_____) ? [] : {};",
          explain: "I create an empty array or an empty object for the copy.",
        },
        {
          coach: "سجّل النسخة في `seen` قبل ما ننسخ اللي جواها. الترتيب ده مهم.",
          expected: "  seen.set(value, copy);",
          hint1: "`seen.set` بالأصل كمفتاح والنسخة كقيمة.",
          hint2: "____.___(_____, ____);",
          explain:
            "I remember the copy before I go deeper, so a reference back to this object finds it.",
        },
        {
          coach: "لف على كل مفاتيح الأصل.",
          expected: "  for (const key of Object.keys(value)) {",
          hint1: "`for...of` على `Object.keys(value)`، والمتغير اسمه `key`.",
          hint2: "for (const ___ of Object.____(_____)) {",
          explain: "I loop over the keys of the original.",
        },
        {
          coach:
            "كل قيمة ننسخها بنفس الدالة ونبعت معاها `seen`، ونحطها في النسخة. واقفل الـ loop. سطرين.",
          expected: "    copy[key] = deepClone(value[key], seen);\n  }",
          hint1:
            "`copy[key]` بيساوي `deepClone` على `value[key]` ومعاها `seen`، وبعدها قوس القفل.",
          hint2: "____[___] = _________(_____[___], ____);\n}",
          explain: "Each value is cloned with a recursive call, and I pass the same WeakMap along.",
        },
        {
          coach: "رجّع النسخة واقفل الدالة. سطرين.",
          expected: "  return copy;\n}",
          hint1: "`return` والمتغير اللي فيه النسخة، وبعدها قوس القفل.",
          hint2: "return ____;\n}",
          explain: "At the end I return the copy.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "returns primitives as they are",
      code: `
expect(deepClone(5)).toBe(5);
expect(deepClone("text")).toBe("text");
expect(deepClone(true)).toBe(true);
expect(deepClone(undefined)).toBe(undefined);`,
    },
    {
      name: "edge case: null stays null",
      code: `
expect(deepClone(null)).toBe(null);
expect(deepClone({ empty: null })).toEqual({ empty: null });`,
    },
    {
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
      name: "edge case: Date objects are copied",
      code: `
const original = { at: new Date(2020, 0, 15) };
const copy = deepClone(original);
expect(copy.at instanceof Date, "the copy is a Date").toBe(true);
expect(copy.at.getTime(), "the time of the copy").toBe(original.at.getTime());
expect(copy.at, "the Date in the copy").not.toBe(original.at);`,
    },
    {
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
      name: "edge case: functions are copied by reference",
      code: `
const greet = () => "hi";
const copy = deepClone({ greet });
expect(copy.greet, "the function in the copy").toBe(greet);`,
    },
    {
      name: "an object used in two places is copied once",
      code: `
const shared = { n: 1 };
const copy = deepClone({ a: shared, b: shared });
expect(copy.a, "copy.a").not.toBe(shared);
expect(copy.b, "copy.b").toBe(copy.a);`,
    },
    {
      name: "empty object and empty array",
      code: `
expect(deepClone({})).toEqual({});
expect(deepClone([])).toEqual([]);
expect(Array.isArray(deepClone([])), "an empty array stays an array").toBe(true);`,
    },
  ],
  complexity: "Time and space: O(n) for n values.",
  idea: "الـ shallow بينسخ أول مستوى بس. والـ `WeakMap` في `deepClone` بيمنع الـ infinite loop مع الـ circular reference.",
  followUps: [
    {
      question: "Problem with JSON.parse(JSON.stringify(x))?",
      answer: "It loses dates, undefined, functions, and it throws on circular references.",
    },
  ],
};
