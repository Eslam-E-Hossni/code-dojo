import type { CodeProblem } from "../types";

export const largest: CodeProblem = {
  id: "largest",
  kind: "code",
  group: "algorithms",
  title: "Largest number in an array",
  difficulty: "easy",
  tag: "reported",
  statement: "Return the largest number, without Math.max.",
  examples: ["largest([3, 9, 2]); // 9"],
  askFirst: ["What should I return for an empty array?"],
  edgeCases: ["Empty array", "All negative numbers: don't start max at 0"],
  parts: [
    {
      id: "main",
      title: "largest",
      signature: "largest(nums)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد array الأرقام. اكتب تعريفها.",
          expected: "function largest(nums) {",
          hint1: "دالة اسمها `largest` وبتاخد `nums`.",
          hint2: "function _______(____) {",
          explain: "largest takes the numbers.",
        },
        {
          coach: "أول حاجة الحالة الفاضية: لو مفيش أرقام، مفيش أكبر. رجّع `null`.",
          expected: "  if (nums.length === 0) return null;",
          hint1: "`if` بتسأل `nums.length` بيساوي صفر، ولو آه `return null`.",
          hint2: "if (____.______ === 0) return ____;",
          explain: "An empty array has no largest number, so I return null.",
        },
        {
          coach:
            "ابدأ بأول عنصر مش بصفر. دي الغلطة المشهورة: لو كل الأرقام سالبة، الصفر هيكسب وهو مش موجود أصلًا.",
          expected: "  let max = nums[0];",
          hint1: "`let` اسمه `max` وقيمته `nums[0]`.",
          hint2: "let ___ = ____[_];",
          explain: "I start with the first item, not with 0, so negative numbers work.",
        },
        {
          coach: "لف من العنصر التاني، علشان الأول معانا خلاص.",
          expected: "  for (let i = 1; i < nums.length; i++) {",
          accept: ["for (let i = 1; i < nums.length; i += 1) {", "for (let i = 1; i < nums.length; ++i) {"],
          hint1: "`for` بعدّاد `i` يبدأ من 1 لحد `nums.length`.",
          hint2: "for (let _ = 1; _ < ____.______; _++) {",
          explain: "I loop from the second item.",
        },
        {
          coach: "لو العنصر أكبر من اللي معانا، هو الأكبر الجديد. واقفل الـ loop. سطرين.",
          expected: "    if (nums[i] > max) max = nums[i];\n  }",
          accept: ["if (nums[i] > max) { max = nums[i]; }\n}"],
          hint1: "`if` بتقارن `nums[i]` بـ `max`، ولو أكبر `max = nums[i]`. وبعدها قوس القفل.",
          hint2: "if (____[_] > ___) ___ = ____[_];\n}",
          explain: "When an item is larger than max, it becomes the new max.",
        },
        {
          coach: "رجّع الأكبر واقفل الدالة. سطرين.",
          expected: "  return max;\n}",
          hint1: "`return max`، وبعدها قوس قفل الدالة.",
          hint2: "return ___;\n}",
          explain: "At the end I return max.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "finds the largest number",
      code: `expect(largest([3, 9, 2])).toBe(9);`,
    },
    {
      name: "works wherever the largest number is",
      code: `
expect(largest([9, 3, 2])).toBe(9);
expect(largest([2, 3, 9])).toBe(9);
expect(largest([1, 100, 50, 99])).toBe(100);`,
    },
    {
      name: "edge case: empty array",
      code: `expect(largest([])).toBe(null);`,
    },
    {
      name: "edge case: all negative numbers",
      code: `
expect(largest([-5, -2, -9])).toBe(-2);
expect(largest([-1])).toBe(-1);`,
    },
    {
      name: "one item",
      code: `expect(largest([7])).toBe(7);`,
    },
    {
      name: "duplicates and zero",
      code: `
expect(largest([4, 4, 4])).toBe(4);
expect(largest([0, -1, 0])).toBe(0);`,
    },
    {
      name: "does not change the array",
      code: `
const nums = [3, 1, 2];
largest(nums);
expect(nums).toEqual([3, 1, 2]);`,
    },
  ],
  complexity: "Time: O(n). Space: O(1).",
  idea: "الغلطة المشهورة إنك تبدأ بصفر. ابدأ بأول عنصر علشان الأرقام السالبة.",
  followUps: [],
};
