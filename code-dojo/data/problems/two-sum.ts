import type { CodeProblem } from "../types";

export const twoSum: CodeProblem = {
  id: "two-sum",
  kind: "code",
  group: "algorithms",
  title: "Two Sum",
  difficulty: "easy",
  tag: "reported",
  statement: "Return the indexes of the two numbers that add up to the target.",
  examples: ["twoSum([2, 7, 11, 15], 9); // [0, 1]"],
  askFirst: [
    "Is there always exactly one answer?",
    "Can I use the same element twice?",
    "Is the array sorted?",
  ],
  edgeCases: ["No pair exists", "Duplicates: [3, 3] with target 6", "Negative numbers"],
  parts: [
    {
      id: "main",
      title: "twoSum",
      signature: "twoSum(nums, target)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد الأرقام والمجموع المطلوب. اكتب تعريفها.",
          expected: "function twoSum(nums, target) {",
          hint1: "دالة اسمها `twoSum` وبتاخد `nums` و `target`.",
          hint2: "function ______(____, ______) {",
          explain: "twoSum takes the numbers and the target.",
        },
        {
          coach: "بدل loop جوه loop، هنفتكر كل رقم شفناه ومكانه. محتاجين Map.",
          expected: "  const seen = new Map();",
          hint1: "`const` اسمه `seen` وقيمته `new Map()`.",
          hint2: "const ____ = new ___();",
          explain: "I keep a Map from each number I have seen to its index.",
        },
        {
          coach: "لف على الأرقام مرة واحدة بس.",
          expected: "  for (let i = 0; i < nums.length; i++) {",
          accept: ["for (let i = 0; i < nums.length; i += 1) {", "for (let i = 0; i < nums.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `nums.length`.",
          hint2: "for (let _ = 0; _ < ____.______; _++) {",
          explain: "I loop over the numbers once.",
        },
        {
          coach: "لكل رقم: إيه الرقم اللي لو لقيناه يكمّل المجموع؟ احسبه.",
          expected: "    const need = target - nums[i];",
          hint1: "`const` اسمه `need` وقيمته `target` ناقص `nums[i]`.",
          hint2: "const ____ = ______ - ____[_];",
          explain: "For each number I compute the number I need to reach the target.",
        },
        {
          coach: "هل الرقم ده عدّى علينا قبل كده؟",
          expected: "    if (seen.has(need)) {",
          hint1: "`if` ومعاها `seen.has` على `need`.",
          hint2: "if (____.___(____)) {",
          explain: "If I have already seen that number,",
        },
        {
          coach: "لو آه، لقينا الاتنين: رجّع مكان القديم ومكان الحالي، واقفل الـ `if`. سطرين.",
          expected: "      return [seen.get(need), i];\n    }",
          hint1: "`return` array فيها `seen.get(need)` وبعده `i`، وبعدها قوس القفل.",
          hint2: "return [____.___(____), _];\n}",
          explain: "I return its index and the current index.",
        },
        {
          coach:
            "لو لأ، سجّل الرقم الحالي ومكانه علشان اللي جاي. لازم بعد السؤال مش قبله، علشان منستخدمش نفس العنصر مرتين. واقفل الـ loop. سطرين.",
          expected: "    seen.set(nums[i], i);\n  }",
          hint1: "`seen.set` بالرقم `nums[i]` كمفتاح و `i` كقيمة، وبعدها قوس القفل.",
          hint2: "____.___(____[_], _);\n}",
          explain:
            "Otherwise I save the current number with its index. I do it after the check, so I never use the same element twice.",
        },
        {
          coach: "لو الـ loop خلصت ومفيش حاجة، رجّع array فاضية واقفل الدالة. سطرين.",
          expected: "  return [];\n}",
          hint1: "`return` array فاضية، وبعدها قوس قفل الدالة.",
          hint2: "return __;\n}",
          explain: "If the loop ends with no pair, I return an empty array.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "finds the pair",
      code: `expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);`,
    },
    {
      name: "the pair can be anywhere in the array",
      code: `
expect(twoSum([1, 5, 8, 3, 9], 12)).toEqual([3, 4]);
expect(twoSum([10, 1, 2, 30], 40)).toEqual([0, 3]);`,
    },
    {
      name: "does not use the same element twice",
      code: `expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);`,
    },
    {
      name: "edge case: no pair exists",
      code: `
expect(twoSum([1, 2, 3], 100)).toEqual([]);
expect(twoSum([5], 10)).toEqual([]);`,
    },
    {
      name: "edge case: duplicates",
      code: `expect(twoSum([3, 3], 6)).toEqual([0, 1]);`,
    },
    {
      name: "edge case: negative numbers and zero",
      code: `
expect(twoSum([-3, 4, 3, 90], 0)).toEqual([0, 2]);
expect(twoSum([0, 4, 3, 0], 0)).toEqual([0, 3]);
expect(twoSum([-1, -2, -3, -4], -7)).toEqual([2, 3]);`,
    },
    {
      name: "edge case: empty array",
      code: `expect(twoSum([], 5)).toEqual([]);`,
    },
    {
      name: "does not change the array",
      code: `
const nums = [4, 1, 3];
twoSum(nums, 4);
expect(nums).toEqual([4, 1, 3]);`,
    },
  ],
  complexity: "Time: O(n). Space: O(n). The brute force is O(n²).",
  idea: "قول الحل البسيط بـ loop جوه loop الأول، وبعدين قول إنك هتحسّنه بـ `Map`.",
  followUps: [
    {
      question: "What if the array is sorted?",
      answer: "Two pointers: one at the start, one at the end. O(n) time and O(1) space.",
    },
  ],
};
