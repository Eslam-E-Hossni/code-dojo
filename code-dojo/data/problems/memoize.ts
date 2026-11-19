import type { CodeProblem } from "../types";

export const memoize: CodeProblem = {
  id: "memoize",
  kind: "code",
  group: "most-repeated",
  title: "memoize",
  difficulty: "medium",
  tag: "likely",
  statement: "Write memoize(fn): cache the result for the same arguments.",
  askFirst: [
    "Are the arguments always simple values?",
    "Should the cache have a size limit?",
  ],
  edgeCases: [
    "Object arguments: the key from JSON.stringify can be wrong or slow",
    "The cache grows forever",
  ],
  parts: [
    {
      id: "main",
      title: "memoize",
      signature: "memoize(fn)",
      steps: [
        {
          coach: "أول حاجة يا إسلام: الدالة دي هتاخد دالة تانية. اكتب تعريفها.",
          expected: "function memoize(fn) {",
          hint1: "دالة اسمها memoize وبتاخد parameter واحد هو الدالة الأصلية.",
          hint2: "function ____(__) {",
          explain: "memoize takes the function I want to speed up.",
        },
        {
          coach: "محتاجين حاجة تبقى الميموري بتاعتنا، نخزن فيها النتايج القديمة.",
          expected: "  const cache = new Map();",
          accept: ["const cache = {};"],
          hint1: "هنستخدم Map علشان المفتاح والقيمة.",
          hint2: "const ____ = new ____();",
          explain: "A Map in a closure holds the saved results.",
        },
        {
          coach:
            "دلوقتي نرجّع الدالة الجديدة اللي المستخدم هيناديها، وتاخد أي عدد من القيم.",
          expected: "  return function (...args) {",
          hint1: "`return function` ومعاها rest parameter بيلمّ كل القيم في array واحدة.",
          hint2: "return ________ (...____) {",
          explain: "I return a new function that collects all the arguments.",
        },
        {
          coach:
            "عايزين مفتاح نعرف بيه إن نفس القيم دي جت قبل كده. حوّل القيم لنص واحد.",
          expected: "    const key = JSON.stringify(args);",
          hint1: "`JSON.stringify` على `args`، والنتيجة في متغير اسمه `key`.",
          hint2: "const ___ = JSON._________(____);",
          explain: "I turn the arguments into a string and use it as the cache key.",
        },
        {
          coach: "اسأل الميموري: المفتاح ده موجود عندنا؟",
          expected: "    if (cache.has(key)) {",
          hint1: "`if` ومعاها الـ method بتاعة الـ Map اللي بتسأل عن وجود مفتاح.",
          hint2: "if (_____.___(___)) {",
          explain: "If the key is already in the cache,",
        },
        {
          coach:
            "لو موجود، رجّع النتيجة المتخزنة على طول من غير ما نحسب تاني، واقفل الـ `if`. سطرين.",
          expected: "      return cache.get(key);\n    }",
          hint1:
            "`return` ومعاها الـ method اللي بتجيب قيمة من الـ Map، وبعدها قوس القفل في سطر لوحده.",
          hint2: "return _____.___(___);\n}",
          explain: "I return the saved result and skip the work.",
        },
        {
          coach:
            "لو مش موجود: نادي الدالة الأصلية بنفس الـ `this` ونفس القيم، واحفظ الناتج في متغير.",
          expected: "    const result = fn.apply(this, args);",
          accept: ["const result = fn.call(this, ...args);"],
          hint1: "متغير اسمه `result` بيساوي `fn.apply` بـ `this` و `args`.",
          hint2: "const ______ = __.apply(____, ____);",
          explain:
            "Otherwise I call the original function with the same this and arguments.",
        },
        {
          coach: "خزّن الناتج في الميموري بالمفتاح بتاعه، علشان المرة الجاية.",
          expected: "    cache.set(key, result);",
          hint1: "الـ method بتاعة الـ Map اللي بتحط مفتاح وقيمة.",
          hint2: "_____.___(___, ______);",
          explain: "I save the result in the cache under that key.",
        },
        {
          coach: "ورجّع الناتج للي نادى.",
          expected: "    return result;",
          hint1: "`return` والمتغير اللي فيه الناتج.",
          hint2: "return ______;",
          explain: "And I return the result.",
        },
        {
          coach:
            "اقفل الدالة اللي رجّعناها، ومعاها semicolon علشان هي جزء من `return`. وبعدها اقفل `memoize`. سطرين.",
          expected: "  };\n}",
          hint1: "سطر فيه قوس قفل ومعاه semicolon، وسطر فيه قوس قفل بس.",
          hint2: "_;\n_",
          explain: "I close the returned function, and then memoize itself.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "returns the same result as fn",
      code: `
const add = memoize((a, b) => a + b);
expect(add(2, 3)).toBe(5);
expect(add(2, 3)).toBe(5);`,
    },
    {
      name: "calls fn once for the same arguments",
      code: `
const fn = spy((n) => n * 2);
const fast = memoize(fn);
fast(4);
fast(4);
fast(4);
expect(fn.calls.length, "calls to fn").toBe(1);`,
    },
    {
      name: "calls fn again for different arguments",
      code: `
const fn = spy((n) => n * 2);
const fast = memoize(fn);
expect(fast(1)).toBe(2);
expect(fast(2)).toBe(4);
expect(fast(1)).toBe(2);
expect(fn.calls, "calls to fn").toEqual([[1], [2]]);`,
    },
    {
      name: "every argument is part of the key",
      code: `
const fn = spy((a, b) => a + b);
const fast = memoize(fn);
expect(fast(1, 2)).toBe(3);
expect(fast(1, 3)).toBe(4);
expect(fn.calls.length, "calls to fn").toBe(2);`,
    },
    {
      name: "the order of the arguments matters",
      code: `
const fn = spy((a, b) => a - b);
const fast = memoize(fn);
expect(fast(5, 2)).toBe(3);
expect(fast(2, 5)).toBe(-3);
expect(fn.calls.length, "calls to fn").toBe(2);`,
    },
    {
      name: "works with no arguments",
      code: `
const fn = spy(() => 42);
const fast = memoize(fn);
expect(fast()).toBe(42);
expect(fast()).toBe(42);
expect(fn.calls.length, "calls to fn").toBe(1);`,
    },
    {
      name: "caches falsy results too: 0, '', false, null, undefined",
      code: `
const values = [0, "", false, null, undefined];
for (let i = 0; i < values.length; i++) {
  const fn = spy(() => values[i]);
  const fast = memoize(fn);
  fast("x");
  expect(fast("x")).toBe(values[i]);
  expect(fn.calls.length, "calls to fn when it returns " + String(values[i])).toBe(1);
}`,
    },
    {
      name: "the number 1 and the string '1' are different arguments",
      code: `
const fast = memoize((x) => typeof x);
expect(fast(1)).toBe("number");
expect(fast("1")).toBe("string");`,
    },
    {
      name: "edge case: the same object argument hits the cache",
      code: `
const fn = spy((user) => user.name.toUpperCase());
const fast = memoize(fn);
const user = { name: "a" };
expect(fast(user)).toBe("A");
expect(fast(user)).toBe("A");
expect(fn.calls.length, "calls to fn").toBe(1);`,
    },
    {
      name: "edge case: different object arguments are not mixed up",
      code: `
const fast = memoize((user) => user.name);
expect(fast({ name: "a" })).toBe("a");
expect(fast({ name: "b" })).toBe("b");`,
    },
    {
      name: "keeps this",
      code: `
const counter = {
  step: 3,
  times: memoize(function (n) {
    return this.step * n;
  }),
};
expect(counter.times(2)).toBe(6);`,
    },
    {
      name: "each memoized function has its own cache",
      code: `
const double = memoize((n) => n * 2);
const triple = memoize((n) => n * 3);
expect(double(2)).toBe(4);
expect(triple(2)).toBe(6);`,
    },
  ],
  complexity: "A cache hit is O(1) plus building the key.",
  idea: "الـ closure ماسك الـ Map. المفتاح هو الـ arguments كنص.",
  followUps: [
    {
      question: "What is the weak point?",
      answer:
        "The key. JSON.stringify fails on functions and on circular objects, and the order of keys matters.",
    },
  ],
};
