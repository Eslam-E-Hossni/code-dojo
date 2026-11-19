import type { CodeProblem } from "../types";

export const secondLargest: CodeProblem = {
  id: "second-largest",
  kind: "code",
  group: "algorithms",
  title: "Second largest number",
  difficulty: "easy",
  tag: "reported",
  statement: "Return the second largest number in an array, without sorting.",
  examples: ["secondLargest([5, 1, 9, 9, 3]); // 5"],
  askFirst: [
    "Do duplicates count? In [9, 9, 5] is the answer 5 or 9?",
    "What should I return if there is no second largest?",
  ],
  edgeCases: ["Fewer than two items", "All items equal", "Negative numbers"],
  parts: [
    {
      id: "main",
      title: "secondLargest",
      signature: "secondLargest(nums)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد array الأرقام. اكتب تعريفها.",
          expected: "function secondLargest(nums) {",
          hint1: "دالة اسمها `secondLargest` وبتاخد `nums`.",
          hint2: "function _____________(____) {",
          explain: "secondLargest takes the numbers.",
        },
        {
          coach:
            "هنحتاج متغيرين بس. الأول لأكبر رقم، ويبدأ بأصغر قيمة ممكنة علشان الأرقام السالبة تعدّي.",
          expected: "  let largest = -Infinity;",
          hint1: "`let` اسمه `largest` وقيمته `-Infinity`.",
          hint2: "let _______ = -________;",
          explain: "I keep the largest number. It starts at minus Infinity, so negative numbers work.",
        },
        {
          coach: "والتاني للرقم اللي بعده في الترتيب، بنفس البداية.",
          expected: "  let second = -Infinity;",
          hint1: "`let` اسمه `second` وقيمته `-Infinity`.",
          hint2: "let ______ = -________;",
          explain: "And I keep the second largest, starting the same way.",
        },
        {
          coach: "لف على الأرقام نفسها. مش محتاجين الـ index هنا.",
          expected: "  for (const n of nums) {",
          hint1: "`for...of` على `nums`، والمتغير اسمه `n`.",
          hint2: "for (const _ of ____) {",
          explain: "I loop over the numbers once.",
        },
        {
          coach: "أول حالة: الرقم ده أكبر من أكبر واحد معانا؟",
          expected: "    if (n > largest) {",
          hint1: "`if` بتقارن `n` بـ `largest` بأكبر من.",
          hint2: "if (_ > _______) {",
          explain: "If the number is larger than the largest,",
        },
        {
          coach: "لقينا أكبر جديد، فالقديم ينزل يبقى التاني. السطر ده لازم الأول، قبل ما القديم يضيع.",
          expected: "      second = largest;",
          hint1: "`second` بيساوي `largest`.",
          hint2: "______ = _______;",
          explain: "the old largest moves down to second,",
        },
        {
          coach: "وبعدين الرقم الجديد ياخد مكان الأكبر.",
          expected: "      largest = n;",
          hint1: "`largest` بيساوي `n`.",
          hint2: "_______ = _;",
          explain: "and this number becomes the largest.",
        },
        {
          coach:
            "ولو مش أكبر من الأكبر؟ ممكن يبقى هو التاني: أكبر من التاني وأصغر من الأكبر. الشرط التاني هو اللي بيمنع إن المكرر يتحسب.",
          expected: "    } else if (n > second && n < largest) {",
          hint1: "`else if` فيها شرطين بينهم `&&`: `n` أكبر من `second`، و `n` أصغر من `largest`.",
          hint2: "} else if (_ > ______ && _ < _______) {",
          explain: "Otherwise, if it is between the two, it is the new second. The second check skips a duplicate of the largest.",
        },
        {
          coach: "سجّله كتاني، واقفل الـ `else if`، واقفل الـ loop. تلات سطور.",
          expected: "      second = n;\n    }\n  }",
          hint1: "`second` بيساوي `n`، وبعدها قوسين قفل.",
          hint2: "______ = _;\n}\n}",
          explain: "I save it as the second.",
        },
        {
          coach:
            "لو التاني فضل زي ما بدأ، يبقى مفيش تاني أصلًا: رجّع `null`. غير كده رجّعه. واقفل الدالة. سطرين.",
          expected: "  return second === -Infinity ? null : second;\n}",
          hint1: "`return` ومعاها ternary: لو `second` بيساوي `-Infinity` يبقى `null`، غير كده `second`.",
          hint2: "return ______ === -________ ? ____ : ______;\n}",
          explain: "If second never changed, there is no second largest, so I return null.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "finds the second largest",
      code: `expect(secondLargest([5, 1, 9, 9, 3])).toBe(5);`,
    },
    {
      name: "works wherever the two numbers are",
      code: `
expect(secondLargest([1, 2])).toBe(1);
expect(secondLargest([2, 1])).toBe(1);
expect(secondLargest([3, 8, 1, 7])).toBe(7);
expect(secondLargest([8, 7, 3, 1])).toBe(7);
expect(secondLargest([1, 3, 7, 8])).toBe(7);`,
    },
    {
      name: "a duplicate of the largest does not count as second",
      code: `
expect(secondLargest([9, 9, 5])).toBe(5);
expect(secondLargest([5, 9, 9])).toBe(5);`,
    },
    {
      name: "edge case: fewer than two items",
      code: `
expect(secondLargest([])).toBe(null);
expect(secondLargest([7])).toBe(null);`,
    },
    {
      name: "edge case: all items equal",
      code: `expect(secondLargest([4, 4, 4])).toBe(null);`,
    },
    {
      name: "edge case: negative numbers",
      code: `
expect(secondLargest([-5, -2, -9])).toBe(-5);
expect(secondLargest([-1, 0])).toBe(-1);`,
    },
    {
      name: "does not sort or change the array",
      code: `
const nums = [3, 1, 2];
secondLargest(nums);
expect(nums).toEqual([3, 1, 2]);`,
    },
  ],
  complexity: "Time: O(n) in one pass. Space: O(1). Sorting would be O(n log n).",
  idea: "متغيرين بس: `largest` و `second`. ولما تلاقي رقم أكبر، القديم ينزل لـ `second`.",
  followUps: [
    {
      question: "Why not sort and take the second?",
      answer: "Sorting is O(n log n) and changes the array. One pass is O(n).",
    },
  ],
};
