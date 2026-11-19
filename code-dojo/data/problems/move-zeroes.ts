import type { CodeProblem } from "../types";

export const moveZeroes: CodeProblem = {
  id: "move-zeroes",
  kind: "code",
  group: "algorithms",
  title: "Move zeroes to the end",
  difficulty: "easy",
  tag: "likely",
  statement: "Move all zeroes to the end, in place, keeping the order of the other numbers.",
  examples: ["moveZeroes([0, 1, 0, 3, 12]); // [1, 3, 12, 0, 0]"],
  askFirst: ["In place, or can I return a new array?", "Must the order stay the same?"],
  edgeCases: ["No zeroes", "All zeroes", "Empty array"],
  parts: [
    {
      id: "main",
      title: "moveZeroes",
      signature: "moveZeroes(nums)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد الـ array وهتعدّل فيها نفسها. اكتب تعريفها.",
          expected: "function moveZeroes(nums) {",
          hint1: "دالة اسمها `moveZeroes` وبتاخد `nums`.",
          hint2: "function __________(____) {",
          explain: "moveZeroes takes the array and changes it in place.",
        },
        {
          coach: "محتاجين مؤشر واحد بس: المكان اللي هيتحط فيه الرقم اللي جاي اللي مش صفر.",
          expected: "  let insert = 0;",
          hint1: "`let` اسمه `insert` وقيمته صفر.",
          hint2: "let ______ = 0;",
          explain: "One pointer marks where the next non-zero number goes.",
        },
        {
          coach: "لف على الـ array كلها.",
          expected: "  for (let i = 0; i < nums.length; i++) {",
          accept: ["for (let i = 0; i < nums.length; i += 1) {", "for (let i = 0; i < nums.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `nums.length`.",
          hint2: "for (let _ = 0; _ < ____.______; _++) {",
          explain: "I loop over the array.",
        },
        {
          coach: "اللي يهمنا الأرقام اللي مش صفر بس.",
          expected: "    if (nums[i] !== 0) {",
          hint1: "`if` بتقارن `nums[i]` بصفر بـ `!==`.",
          hint2: "if (____[_] !== 0) {",
          explain: "For every number that is not zero,",
        },
        {
          coach: "بدّل الرقم ده مع اللي في مكان الإدخال، في سطر واحد بالـ destructuring.",
          expected: "      [nums[insert], nums[i]] = [nums[i], nums[insert]];",
          hint1:
            "على الشمال array فيها `nums[insert]` و `nums[i]`، وعلى اليمين نفس الاتنين بترتيب معكوس.",
          hint2: "[____[______], ____[_]] = [____[_], ____[______]];",
          explain: "I swap it with the number at the insert position,",
        },
        {
          coach: "قدّم مكان الإدخال خطوة، واقفل الـ `if`، واقفل الـ loop. تلات سطور.",
          expected: "      insert++;\n    }\n  }",
          accept: ["insert += 1;\n}\n}", "++insert;\n}\n}"],
          hint1: "`insert` زائد واحد، وبعدها قوسين قفل.",
          hint2: "______++;\n}\n}",
          explain: "and move the insert position forward.",
        },
        {
          coach: "رجّع نفس الـ array واقفل الدالة. سطرين.",
          expected: "  return nums;\n}",
          hint1: "`return nums`، وبعدها قوس قفل الدالة.",
          hint2: "return ____;\n}",
          explain: "I return the same array.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "moves the zeroes to the end",
      code: `expect(moveZeroes([0, 1, 0, 3, 12])).toEqual([1, 3, 12, 0, 0]);`,
    },
    {
      name: "works in place and returns the same array",
      code: `
const nums = [0, 5, 0, 6];
const result = moveZeroes(nums);
expect(result, "the returned array").toBe(nums);
expect(nums, "the array after the call").toEqual([5, 6, 0, 0]);`,
    },
    {
      name: "keeps the order of the other numbers",
      code: `expect(moveZeroes([4, 0, 2, 0, 9, 1, 0, 7])).toEqual([4, 2, 9, 1, 7, 0, 0, 0]);`,
    },
    {
      name: "edge case: no zeroes",
      code: `expect(moveZeroes([1, 2, 3])).toEqual([1, 2, 3]);`,
    },
    {
      name: "edge case: all zeroes",
      code: `expect(moveZeroes([0, 0, 0])).toEqual([0, 0, 0]);`,
    },
    {
      name: "edge case: empty array",
      code: `expect(moveZeroes([])).toEqual([]);`,
    },
    {
      name: "zeroes already at the end, and zeroes only at the start",
      code: `
expect(moveZeroes([1, 2, 0, 0])).toEqual([1, 2, 0, 0]);
expect(moveZeroes([0, 0, 1, 2])).toEqual([1, 2, 0, 0]);`,
    },
    {
      name: "negative numbers are not zeroes",
      code: `expect(moveZeroes([0, -1, 0, -2])).toEqual([-1, -2, 0, 0]);`,
    },
    {
      name: "the length does not change",
      code: `expect(moveZeroes([0, 1, 0]).length).toBe(3);`,
    },
  ],
  complexity: "Time: O(n). Space: O(1).",
  idea: "مؤشّر واحد لمكان الإدخال، وكل رقم مش صفر بيتبدّل معاه.",
  followUps: [
    {
      question: "Why does the order of the other numbers stay the same?",
      answer:
        "The insert position is never ahead of i, and every non-zero number goes to the next free place in the order it was found.",
    },
  ],
};
