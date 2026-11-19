import type { CodeProblem } from "../types";

export const binarySearch: CodeProblem = {
  id: "binary-search",
  kind: "code",
  group: "algorithms",
  title: "Binary search",
  difficulty: "easy",
  tag: "likely",
  statement:
    "The array is sorted from small to large. Return the index of the target, or -1 if it is not there. Do not check every item.",
  examples: ["binarySearch([1, 3, 5, 7, 9], 7); // 3", "binarySearch([1, 3, 5, 7, 9], 4); // -1"],
  askFirst: [
    "Is the array always sorted, and in which direction?",
    "What should I return when the target is not found?",
    "Can there be duplicates? Which index do you want then?",
  ],
  edgeCases: [
    "Empty array",
    "One item",
    "The target is the first or the last item",
    "The target is smaller or larger than everything",
  ],
  parts: [
    {
      id: "main",
      title: "binarySearch",
      signature: "binarySearch(nums, target)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد الـ array المترتبة والرقم اللي بندوّر عليه. اكتب تعريفها.",
          expected: "function binarySearch(nums, target) {",
          hint1: "دالة اسمها `binarySearch` وبتاخد `nums` و `target`.",
          hint2: "function ____________(____, ______) {",
          explain: "binarySearch takes a sorted array and the target.",
        },
        {
          coach: "هنحدد منطقة البحث بمؤشرين. الأول عند أول عنصر.",
          expected: "  let left = 0;",
          hint1: "`let` اسمه `left` وقيمته صفر.",
          hint2: "let ____ = 0;",
          explain: "Two pointers mark the part I am still searching. left starts at the first index,",
        },
        {
          coach: "والتاني عند آخر عنصر.",
          expected: "  let right = nums.length - 1;",
          hint1: "`let` اسمه `right` وقيمته `nums.length - 1`.",
          hint2: "let _____ = ____.______ - 1;",
          explain: "and right at the last index.",
        },
        {
          coach:
            "نفضل ندوّر طول ما المنطقة لسه فيها عناصر. خد بالك: أصغر من أو يساوي، علشان لو فاضل عنصر واحد لازم نشوفه.",
          expected: "  while (left <= right) {",
          hint1: "`while` وشرطها `left` أصغر من أو يساوي `right`.",
          hint2: "while (____ <= _____) {",
          explain: "I go on while the part is not empty. It is less than or equal, so a part of one item is still checked.",
        },
        {
          coach: "هات مكان النص: متوسط المؤشرين، مقرّب لتحت علشان يبقى رقم صحيح.",
          expected: "    const mid = Math.floor((left + right) / 2);",
          hint1: "`const` اسمه `mid` وقيمته `Math.floor` على مجموع `left` و `right` مقسوم على 2.",
          hint2: "const ___ = Math._____((____ + _____) / 2);",
          explain: "I take the middle index.",
        },
        {
          coach: "لو اللي في النص هو المطلوب، رجّع مكانه على طول.",
          expected: "    if (nums[mid] === target) return mid;",
          hint1: "`if` بتقارن `nums[mid]` بـ `target`، ولو متساويين `return mid`.",
          hint2: "if (____[___] === ______) return ___;",
          explain: "If the middle item is the target, I return its index.",
        },
        {
          coach: "لو اللي في النص أصغر من المطلوب، يبقى المطلوب في النص اليمين.",
          expected: "    if (nums[mid] < target) {",
          hint1: "`if` بتقارن `nums[mid]` بـ `target` بأصغر من.",
          hint2: "if (____[___] < ______) {",
          explain: "If the middle item is smaller, the target can only be on the right,",
        },
        {
          coach: "ارمي النص الشمال كله: حرّك الشمال لبعد النص بواحد.",
          expected: "      left = mid + 1;",
          hint1: "`left` بيساوي `mid + 1`.",
          hint2: "____ = ___ + 1;",
          explain: "so I move left past the middle.",
        },
        {
          coach: "ولو أكبر؟ افتح الحالة التانية.",
          expected: "    } else {",
          hint1: "اقفل الـ `if` وافتح `else` في نفس السطر.",
          hint2: "} ____ {",
          explain: "Otherwise it can only be on the left,",
        },
        {
          coach: "ارمي النص اليمين: حرّك اليمين لقبل النص بواحد. واقفل الـ `else` والـ loop. تلات سطور.",
          expected: "      right = mid - 1;\n    }\n  }",
          hint1: "`right` بيساوي `mid - 1`، وبعدها قوسين قفل.",
          hint2: "_____ = ___ - 1;\n}\n}",
          explain: "so I move right before the middle.",
        },
        {
          coach: "لو المنطقة فضيت ومالقيناش حاجة، رجّع سالب واحد. واقفل الدالة. سطرين.",
          expected: "  return -1;\n}",
          hint1: "`return -1`، وبعدها قوس قفل الدالة.",
          hint2: "return -_;\n}",
          explain: "If the part becomes empty, the target is not there, and I return -1.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "finds a number in the middle",
      code: `
expect(binarySearch([1, 3, 5, 7, 9], 7)).toBe(3);
expect(binarySearch([1, 3, 5, 7, 9], 5)).toBe(2);`,
    },
    {
      name: "edge case: the target is the first or the last item",
      code: `
expect(binarySearch([1, 3, 5, 7, 9], 1)).toBe(0);
expect(binarySearch([1, 3, 5, 7, 9], 9)).toBe(4);`,
    },
    {
      name: "returns -1 when the number is between two items",
      code: `expect(binarySearch([1, 3, 5, 7, 9], 4)).toBe(-1);`,
    },
    {
      name: "edge case: the target is smaller or larger than everything",
      code: `
expect(binarySearch([1, 3, 5], 0)).toBe(-1);
expect(binarySearch([1, 3, 5], 6)).toBe(-1);`,
    },
    {
      name: "edge case: empty array",
      code: `expect(binarySearch([], 3)).toBe(-1);`,
    },
    {
      name: "edge case: one item",
      code: `
expect(binarySearch([4], 4)).toBe(0);
expect(binarySearch([4], 5)).toBe(-1);`,
    },
    {
      name: "even length and negative numbers",
      code: `
expect(binarySearch([-9, -4, 0, 2], -4)).toBe(1);
expect(binarySearch([-9, -4, 0, 2], 2)).toBe(3);
expect(binarySearch([-9, -4, 0, 2], -9)).toBe(0);`,
    },
    {
      name: "finds every item of a larger array",
      code: `
const nums = [];
for (let i = 0; i < 101; i++) nums.push(i * 3);
for (let i = 0; i < nums.length; i++) {
  expect(binarySearch(nums, nums[i]), "index of " + nums[i]).toBe(i);
}`,
    },
    {
      name: "does not check every item: about 20 looks for a million numbers",
      code: `
const nums = [];
for (let i = 0; i < 1000000; i++) nums.push(i);
let reads = 0;
const counted = new Proxy(nums, {
  get(target, key) {
    if (typeof key === "string" && key !== "length") reads++;
    return target[key];
  },
});
expect(binarySearch(counted, 765432)).toBe(765432);
expect(reads <= 60, "items read: " + reads + ", allowed: 60").toBe(true);`,
    },
  ],
  complexity: "Time: O(log n), because every step throws away half of what is left. Space: O(1).",
  idea: "مؤشرين حوالين منطقة البحث. بص على النص: لو هو المطلوب خلاص، لو أصغر ارمي النص الشمال، لو أكبر ارمي النص اليمين.",
  followUps: [
    {
      question: "Why left <= right and not left < right?",
      answer: "When one item is left, left equals right. With < the loop would stop before checking it.",
    },
    {
      question: "Why mid + 1 and mid - 1, not just mid?",
      answer: "The middle was already checked. Without the plus or minus one, the range may never shrink and the loop never ends.",
    },
  ],
};
