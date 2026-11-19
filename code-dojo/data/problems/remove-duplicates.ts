import type { CodeProblem } from "../types";

export const removeDuplicates: CodeProblem = {
  id: "remove-duplicates",
  kind: "code",
  group: "algorithms",
  title: "Remove duplicates from an array",
  difficulty: "easy",
  tag: "likely",
  statement: "Return a new array without the duplicates, keeping the first time each value appears.",
  examples: ["removeDuplicates([1, 2, 2, 3, 1]); // [1, 2, 3]"],
  askFirst: [
    "Should I keep the first one or the last one?",
    "Return a new array, or change the input?",
    "Is the array sorted?",
  ],
  edgeCases: [
    "Empty array",
    "No duplicates",
    "All items equal",
    "The number 1 and the string '1' are different",
  ],
  parts: [
    {
      id: "main",
      title: "removeDuplicates",
      signature: "removeDuplicates(arr)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد الـ array. اكتب تعريفها.",
          expected: "function removeDuplicates(arr) {",
          hint1: "دالة اسمها `removeDuplicates` وبتاخد `arr`.",
          hint2: "function ________________(___) {",
          explain: "removeDuplicates takes the array.",
        },
        {
          coach:
            "محتاجين نعرف بسرعة: القيمة دي شفناها قبل كده؟ الـ Set بيجاوب على السؤال ده في خطوة واحدة.",
          expected: "  const seen = new Set();",
          hint1: "`const` اسمه `seen` وقيمته `new Set()`.",
          hint2: "const ____ = new ___();",
          explain: "A Set remembers the values I have already seen, and answers in O(1).",
        },
        {
          coach: "والناتج في array جديدة علشان منعدّلش الأصلية ونحافظ على الترتيب.",
          expected: "  const result = [];",
          hint1: "`const` اسمه `result` وقيمته array فاضية.",
          hint2: "const ______ = [];",
          explain: "The result is a new array, so the input is not changed and the order is kept.",
        },
        {
          coach: "لف على الـ array من الأول للآخر.",
          expected: "  for (let i = 0; i < arr.length; i++) {",
          accept: ["for (let i = 0; i < arr.length; i += 1) {", "for (let i = 0; i < arr.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `arr.length`.",
          hint2: "for (let _ = 0; _ < ___.______; _++) {",
          explain: "I loop over the array.",
        },
        {
          coach: "اللي يهمنا القيمة اللي أول مرة نشوفها.",
          expected: "    if (!seen.has(arr[i])) {",
          hint1: "`if` بتنفي `seen.has` على `arr[i]`.",
          hint2: "if (!____.___(___[_])) {",
          explain: "If I have not seen this value before,",
        },
        {
          coach: "سجّل إننا شفناها.",
          expected: "      seen.add(arr[i]);",
          hint1: "`seen.add` للقيمة `arr[i]`.",
          hint2: "____.___(___[_]);",
          explain: "I remember it",
        },
        {
          coach: "وضيفها في الناتج. واقفل الـ `if` واقفل الـ loop. تلات سطور.",
          expected: "      result.push(arr[i]);\n    }\n  }",
          hint1: "`result.push` للقيمة `arr[i]`، وبعدها قوسين قفل.",
          hint2: "______.push(___[_]);\n}\n}",
          explain: "and push it into the result.",
        },
        {
          coach: "رجّع الناتج واقفل الدالة. سطرين.",
          expected: "  return result;\n}",
          hint1: "`return result`، وبعدها قوس قفل الدالة.",
          hint2: "return ______;\n}",
          explain: "At the end I return the result.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "removes the duplicates",
      code: `expect(removeDuplicates([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);`,
    },
    {
      name: "keeps the first time each value appears, in order",
      code: `expect(removeDuplicates([3, 1, 3, 2, 1, 2, 4])).toEqual([3, 1, 2, 4]);`,
    },
    {
      name: "edge case: empty array",
      code: `expect(removeDuplicates([])).toEqual([]);`,
    },
    {
      name: "edge case: no duplicates",
      code: `expect(removeDuplicates([1, 2, 3])).toEqual([1, 2, 3]);`,
    },
    {
      name: "edge case: all items equal",
      code: `expect(removeDuplicates([7, 7, 7, 7])).toEqual([7]);`,
    },
    {
      name: "edge case: the number 1 and the string '1' are different",
      code: `expect(removeDuplicates([1, "1", 1, "1"])).toEqual([1, "1"]);`,
    },
    {
      name: "works with strings, negative numbers and zero",
      code: `
expect(removeDuplicates(["a", "b", "a"])).toEqual(["a", "b"]);
expect(removeDuplicates([0, -1, 0, -1, 1])).toEqual([0, -1, 1]);`,
    },
    {
      name: "returns a new array and does not change the input",
      code: `
const input = [1, 1, 2];
const result = removeDuplicates(input);
expect(result, "the returned array").not.toBe(input);
expect(input, "the input after the call").toEqual([1, 1, 2]);`,
    },
    {
      name: "is fast on a large array",
      code: `
const input = [];
for (let i = 0; i < 20000; i++) input.push(i % 5000);
expect(removeDuplicates(input).length).toBe(5000);`,
    },
  ],
  complexity: "Time: O(n). Space: O(n). Checking with a loop inside a loop would be O(n²).",
  idea: "الـ `Set` بيفتكر اللي شفناه. كل قيمة جديدة بتتسجّل فيه وتتضاف للناتج، والمكرر بيتعدّى.",
  followUps: [
    {
      question: "What is the shortest way in real code?",
      answer: "[...new Set(arr)]. A Set keeps insertion order, so the result is the same.",
    },
    {
      question: "What if the array is sorted?",
      answer: "Then duplicates are next to each other. I compare each item with the one before it, with no extra Set.",
    },
  ],
};
