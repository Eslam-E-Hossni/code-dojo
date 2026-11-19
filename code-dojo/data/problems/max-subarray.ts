import type { CodeProblem } from "../types";

export const maxSubarray: CodeProblem = {
  id: "max-subarray",
  kind: "code",
  group: "algorithms",
  title: "Maximum subarray (Kadane)",
  difficulty: "medium",
  tag: "likely",
  statement: "Find the largest sum of a contiguous part of the array.",
  examples: ["maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]); // 6"],
  askFirst: ["Is the array ever empty?", "Do you want the sum, or the part itself?"],
  edgeCases: ["All negative numbers: the answer is the largest one", "One item"],
  parts: [
    {
      id: "main",
      title: "maxSubarray",
      signature: "maxSubarray(nums)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد array الأرقام. اكتب تعريفها.",
          expected: "function maxSubarray(nums) {",
          hint1: "دالة اسمها `maxSubarray` وبتاخد `nums`.",
          hint2: "function ___________(____) {",
          explain: "maxSubarray takes the numbers.",
        },
        {
          coach:
            "محتاجين متغيرين. الأول أحسن مجموع شفناه لحد دلوقتي، ويبدأ بأول عنصر مش بصفر، علشان لو الكل سالب.",
          expected: "  let best = nums[0];",
          hint1: "`let` اسمه `best` وقيمته `nums[0]`.",
          hint2: "let ____ = ____[_];",
          explain: "best is the largest sum found so far. It starts with the first item, so all-negative arrays work.",
        },
        {
          coach: "والتاني مجموع الجزء اللي ماشيين فيه دلوقتي، وبرضه يبدأ بأول عنصر.",
          expected: "  let current = nums[0];",
          hint1: "`let` اسمه `current` وقيمته `nums[0]`.",
          hint2: "let _______ = ____[_];",
          explain: "current is the sum of the part that ends at this position.",
        },
        {
          coach: "لف من العنصر التاني.",
          expected: "  for (let i = 1; i < nums.length; i++) {",
          accept: ["for (let i = 1; i < nums.length; i += 1) {", "for (let i = 1; i < nums.length; ++i) {"],
          hint1: "`for` بعدّاد `i` يبدأ من 1 لحد `nums.length`.",
          hint2: "for (let _ = 1; _ < ____.______; _++) {",
          explain: "I loop from the second item.",
        },
        {
          coach:
            "ده قلب الحل. عند كل رقم اسأل: أبدأ من هنا، ولا أكمّل على اللي قبلي؟ خد الأكبر من الاتنين بـ ternary، من غير `Math.max`.",
          expected: "    current = nums[i] > current + nums[i] ? nums[i] : current + nums[i];",
          hint1:
            "`current` بيساوي ternary: لو `nums[i]` لوحده أكبر من `current + nums[i]` يبقى `nums[i]`، غير كده `current + nums[i]`.",
          hint2: "_______ = ____[_] > _______ + ____[_] ? ____[_] : _______ + ____[_];",
          explain: "At each number I ask: is it better to start again here, or to continue the part before? I keep the larger one.",
        },
        {
          coach: "ولو المجموع الحالي بقى أحسن من أحسن واحد معانا، حدّثه. واقفل الـ loop. سطرين.",
          expected: "    if (current > best) best = current;\n  }",
          accept: ["if (current > best) { best = current; }\n}"],
          hint1: "`if` بتقارن `current` بـ `best`، ولو أكبر `best = current`. وبعدها قوس القفل.",
          hint2: "if (_______ > ____) ____ = _______;\n}",
          explain: "And I update best when current is larger.",
        },
        {
          coach: "رجّع أحسن مجموع واقفل الدالة. سطرين.",
          expected: "  return best;\n}",
          hint1: "`return best`، وبعدها قوس قفل الدالة.",
          hint2: "return ____;\n}",
          explain: "At the end I return best.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "finds the largest sum of a contiguous part",
      code: `expect(maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4])).toBe(6);`,
    },
    {
      name: "edge case: all negative numbers",
      code: `
expect(maxSubarray([-3, -1, -2])).toBe(-1);
expect(maxSubarray([-5, -4])).toBe(-4);`,
    },
    {
      name: "edge case: one item",
      code: `
expect(maxSubarray([7])).toBe(7);
expect(maxSubarray([-7])).toBe(-7);`,
    },
    {
      name: "all positive numbers: the whole array",
      code: `expect(maxSubarray([1, 2, 3, 4])).toBe(10);`,
    },
    {
      name: "a big negative number splits the array",
      code: `
expect(maxSubarray([5, -9, 6])).toBe(6);
expect(maxSubarray([6, -9, 5])).toBe(6);`,
    },
    {
      name: "a small negative number in the middle is worth keeping",
      code: `expect(maxSubarray([4, -1, 5])).toBe(8);`,
    },
    {
      name: "zeroes",
      code: `
expect(maxSubarray([0, 0, 0])).toBe(0);
expect(maxSubarray([-1, 0, -2])).toBe(0);`,
    },
    {
      name: "the best part is at the end",
      code: `expect(maxSubarray([-1, -2, 3, 4])).toBe(7);`,
    },
  ],
  complexity: "Time: O(n). Space: O(1).",
  idea: "عند كل رقم بتسأل: أكمّل على اللي قبلي ولا أبدأ من هنا؟ وبتحتفظ بأحسن مجموع.",
  followUps: [
    {
      question: "What is the brute force?",
      answer: "Two loops over every start and end: O(n²).",
    },
  ],
};
