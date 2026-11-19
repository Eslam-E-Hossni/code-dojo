import type { CodeProblem, TestCase } from "../types";

/** Both versions must behave the same, so they share these tests. */
function sharedTests(fn: string, part: string): TestCase[] {
  return [
    {
      name: fn + ": nested to any depth",
      part,
      code: `expect(${fn}([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);`,
    },
    {
      name: fn + ": an already flat array stays the same",
      part,
      code: `expect(${fn}([1, 2, 3])).toEqual([1, 2, 3]);`,
    },
    {
      name: fn + ": keeps the order of the items",
      part,
      code: `expect(${fn}([[1, 2], 3, [[4], 5], [[[6]]]])).toEqual([1, 2, 3, 4, 5, 6]);`,
    },
    {
      name: fn + ": edge case: empty array",
      part,
      code: `expect(${fn}([])).toEqual([]);`,
    },
    {
      name: fn + ": edge case: empty arrays inside",
      part,
      code: `
expect(${fn}([1, [], 2])).toEqual([1, 2]);
expect(${fn}([[], [[]], [[], []]])).toEqual([]);`,
    },
    {
      name: fn + ": one item",
      part,
      code: `
expect(${fn}([5])).toEqual([5]);
expect(${fn}([[[5]]])).toEqual([5]);`,
    },
    {
      name: fn + ": duplicates and negative numbers are kept",
      part,
      code: `expect(${fn}([-1, [-1, [0, 0]], -2])).toEqual([-1, -1, 0, 0, -2]);`,
    },
    {
      name: fn + ": strings, null and objects are left as they are",
      part,
      code: `
const item = { list: [1, 2] };
expect(${fn}(["ab", [null, [undefined, item]], "cd"])).toEqual(["ab", null, undefined, item, "cd"]);`,
    },
    {
      name: fn + ": returns a new array and does not change the input",
      part,
      code: `
const input = [1, [2, [3]]];
const output = ${fn}(input);
expect(output, "the returned array").not.toBe(input);
expect(input, "the input after the call").toEqual([1, [2, [3]]]);`,
    },
  ];
}

export const flatten: CodeProblem = {
  id: "flatten",
  kind: "code",
  group: "most-repeated",
  title: "Flatten a nested array",
  difficulty: "medium",
  tag: "reported",
  statement:
    "Flatten a multi-dimensional array without using flat() or other built-in helpers.",
  examples: ["flatten([1, [2, [3, [4]]]]); // [1, 2, 3, 4]"],
  askFirst: [
    "Can it be nested to any depth?",
    "Should I return a new array or change the input?",
    "Is Array.isArray allowed?",
  ],
  edgeCases: [
    "Empty array",
    "Empty arrays inside: [1, [], 2]",
    "Very deep nesting: recursion can overflow the stack",
  ],
  parts: [
    {
      id: "recursive",
      title: "Recursive version",
      signature: "flatten(arr)",
      steps: [
        {
          coach:
            "نبدأ يا إسلام بالنسخة الـ recursive علشان هي الأبسط. الدالة هتاخد الـ array المتداخلة. اكتب تعريفها.",
          expected: "function flatten(arr) {",
          hint1: "دالة اسمها `flatten` وبتاخد parameter واحد اسمه `arr`.",
          hint2: "function _______(___) {",
          explain: "flatten takes the nested array.",
        },
        {
          coach:
            "محتاجين array جديدة فاضية نجمّع فيها العناصر، علشان منعدّلش في الأصلية.",
          expected: "  const result = [];",
          accept: ["let result = [];"],
          hint1: "`const` اسمه `result` وقيمته array فاضية.",
          hint2: "const ______ = [];",
          explain:
            "I create a new array for the output, so I don't change the input.",
        },
        {
          coach: "نلف على كل عنصر في `arr` بـ loop عادية من الأول للآخر.",
          expected: "  for (let i = 0; i < arr.length; i++) {",
          accept: [
            "for (let i = 0; i < arr.length; i += 1) {",
            "for (let i = 0; i < arr.length; ++i) {",
          ],
          hint1: "`for` بعدّاد `i` يبدأ من صفر لحد `arr.length`.",
          hint2: "for (let _ = 0; _ < ___.______; _++) {",
          explain: "I loop over every item with a plain for loop.",
        },
        {
          coach: "السؤال المهم: العنصر ده هو نفسه array؟",
          expected: "    if (Array.isArray(arr[i])) {",
          hint1: "`if` ومعاها `Array.isArray` على العنصر الحالي `arr[i]`.",
          hint2: "if (Array._______(___[_])) {",
          explain: "For each item I check if it is an array.",
        },
        {
          coach:
            "لو array، نفردها هي كمان بنفس الدالة ونحفظ الناتج. هنا الـ recursion.",
          expected: "      const inner = flatten(arr[i]);",
          hint1: "نادي `flatten` على `arr[i]` وحط الناتج في `const` اسمه `inner`.",
          hint2: "const _____ = _______(___[_]);",
          explain: "If it is, I flatten it first with a recursive call.",
        },
        {
          coach:
            "`inner` دلوقتي array مفرودة. نلف عليها بعدّاد تاني علشان ننقل عناصرها واحد واحد، من غير `concat` ولا spread.",
          expected: "      for (let j = 0; j < inner.length; j++) {",
          accept: [
            "for (let j = 0; j < inner.length; j += 1) {",
            "for (let j = 0; j < inner.length; ++j) {",
          ],
          hint1: "`for` تانية بعدّاد `j` على `inner.length`.",
          hint2: "for (let _ = 0; _ < _____.______; _++) {",
          explain: "Then I loop over the flattened inner array.",
        },
        {
          coach:
            "ضيف كل عنصر من `inner` في `result`، واقفل الـ loop الصغيرة. سطرين.",
          expected: "        result.push(inner[j]);\n      }",
          hint1:
            "`result.push` للعنصر `inner[j]`، وبعدها قوس القفل في سطر لوحده.",
          hint2: "______.push(_____[_]);\n}",
          explain: "I push each inner item into the result.",
        },
        {
          coach: "طب لو العنصر مش array؟ افتح الحالة التانية.",
          expected: "    } else {",
          hint1: "اقفل الـ `if` وافتح `else` في نفس السطر.",
          hint2: "} ____ {",
          explain: "Otherwise it is a plain value.",
        },
        {
          coach: "العنصر العادي بيتضاف زي ما هو في `result`.",
          expected: "      result.push(arr[i]);",
          hint1: "`result.push` للعنصر `arr[i]`.",
          hint2: "______.push(___[_]);",
          explain: "I push it into the result as it is.",
        },
        {
          coach: "اقفل الـ `else`، وبعدها اقفل الـ loop الكبيرة. سطرين.",
          expected: "    }\n  }",
          hint1: "قوسين قفل، كل واحد في سطر.",
          hint2: "_\n_",
          explain: "I close the else and the loop.",
        },
        {
          coach: "خلصنا اللف. رجّع الـ array المفرودة واقفل الدالة. سطرين.",
          expected: "  return result;\n}",
          hint1: "`return` والمتغير اللي جمّعنا فيه، وبعدها قوس قفل الدالة.",
          hint2: "return ______;\n}",
          explain: "At the end I return the result.",
        },
      ],
    },
    {
      id: "iterative",
      title: "Iterative version with a stack (no recursion)",
      signature: "flattenIterative(arr)",
      steps: [
        {
          coach:
            "دلوقتي النسخة التانية يا إسلام: من غير recursion، علشان لو الـ array عميقة جدًا منقعش في stack overflow. اكتب تعريف الدالة.",
          expected: "function flattenIterative(arr) {",
          hint1: "دالة اسمها `flattenIterative` وبتاخد `arr`.",
          hint2: "function _______Iterative(___) {",
          explain:
            "The second version uses my own stack, so very deep arrays cannot overflow the call stack.",
        },
        {
          coach:
            "هنعمل الـ stack بتاعنا بإيدينا: array فاضية نحط فيها اللي لسه مستني دوره.",
          expected: "  const stack = [];",
          accept: ["let stack = [];"],
          hint1: "`const` اسمه `stack` وقيمته array فاضية.",
          hint2: "const _____ = [];",
          explain: "I create a stack for the items that still wait.",
        },
        {
          coach:
            "حط كل عناصر `arr` في الـ stack، بس لف من الآخر للأول، علشان أول عنصر هو اللي يطلع الأول مع `pop`. الـ loop كلها في سطر واحد.",
          expected: "  for (let i = arr.length - 1; i >= 0; i--) stack.push(arr[i]);",
          accept: [
            "for (let i = arr.length - 1; i >= 0; i--) { stack.push(arr[i]); }",
            "for (let i = arr.length - 1; i >= 0; i -= 1) stack.push(arr[i]);",
            "for (let i = arr.length - 1; i >= 0; --i) stack.push(arr[i]);",
          ],
          hint1:
            "`for` تبدأ من `arr.length - 1` وتنزل لحد صفر، وجسمها `stack.push(arr[i])`.",
          hint2: "for (let _ = ___.______ - 1; _ >= 0; _--) _____.push(___[_]);",
          explain:
            "I push the items in reverse order, so the first item is on top of the stack.",
        },
        {
          coach: "ومحتاجين array للناتج زي النسخة الأولى.",
          expected: "  const result = [];",
          accept: ["let result = [];"],
          hint1: "`const` اسمه `result` وقيمته array فاضية.",
          hint2: "const ______ = [];",
          explain: "And I create the result array.",
        },
        {
          coach: "نفضل شغالين طول ما الـ stack لسه فيه حاجة.",
          expected: "  while (stack.length > 0) {",
          accept: ["while (stack.length) {", "while (stack.length !== 0) {"],
          hint1: "`while` وشرطها إن `stack.length` أكبر من صفر.",
          hint2: "while (_____.______ > 0) {",
          explain: "I keep going while the stack is not empty.",
        },
        {
          coach: "خد آخر عنصر من فوق الـ stack.",
          expected: "    const item = stack.pop();",
          hint1: "`stack.pop()` والناتج في `const` اسمه `item`.",
          hint2: "const ____ = _____.___();",
          explain: "I take the top item.",
        },
        {
          coach: "نفس سؤال النسخة الأولى: العنصر ده array؟",
          expected: "    if (Array.isArray(item)) {",
          hint1: "`if` ومعاها `Array.isArray` على `item`.",
          hint2: "if (Array._______(____)) {",
          explain: "If it is an array,",
        },
        {
          coach:
            "لو array، رجّع عناصرها للـ stack، وبرضه من الآخر للأول علشان الترتيب ميتلخبطش. سطر واحد زي الـ loop الأولى.",
          expected:
            "      for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);",
          accept: [
            "for (let i = item.length - 1; i >= 0; i--) { stack.push(item[i]); }",
            "for (let i = item.length - 1; i >= 0; i -= 1) stack.push(item[i]);",
            "for (let i = item.length - 1; i >= 0; --i) stack.push(item[i]);",
          ],
          hint1:
            "نفس الـ `for` العكسية، بس على `item` بدل `arr`، وجسمها `stack.push(item[i])`.",
          hint2: "for (let _ = ____.______ - 1; _ >= 0; _--) _____.push(____[_]);",
          explain:
            "I push its items back on the stack, again in reverse, to keep the order.",
        },
        {
          coach: "ولو مش array؟ افتح الحالة التانية.",
          expected: "    } else {",
          hint1: "اقفل الـ `if` وافتح `else` في نفس السطر.",
          hint2: "} ____ {",
          explain: "Otherwise it is a plain value,",
        },
        {
          coach: "العنصر العادي بيروح على `result` على طول.",
          expected: "      result.push(item);",
          hint1: "`result.push` للعنصر `item`.",
          hint2: "______.push(____);",
          explain: "so I push it into the result.",
        },
        {
          coach: "اقفل الـ `else`، وبعدها اقفل الـ `while`. سطرين.",
          expected: "    }\n  }",
          hint1: "قوسين قفل، كل واحد في سطر.",
          hint2: "_\n_",
          explain: "I close the else and the while loop.",
        },
        {
          coach: "الـ stack فضي يبقى خلصنا. رجّع الناتج واقفل الدالة. سطرين.",
          expected: "  return result;\n}",
          hint1: "`return` والمتغير اللي جمّعنا فيه، وبعدها قوس قفل الدالة.",
          hint2: "return ______;\n}",
          explain: "When the stack is empty, I return the result.",
        },
      ],
    },
  ],
  tests: [
    ...sharedTests("flatten", "recursive"),
    ...sharedTests("flattenIterative", "iterative"),
    {
      name: "flattenIterative: edge case: very deep nesting does not overflow the stack",
      part: "iterative",
      code: `
let deep = [1];
for (let i = 0; i < 50000; i++) deep = [deep];
expect(flattenIterative(deep)).toEqual([1]);`,
    },
  ],
  complexity:
    "Time: O(n) for n total items. Space: O(n) for the result, plus the depth for recursion.",
  idea: "اكتب النسخة الـ recursive الأول علشان أبسط. ولو سألك عن الـ stack overflow، قول النسخة التانية بالـ stack.",
  followUps: [
    {
      question: "Recursion or a loop?",
      answer:
        "Recursion is simpler to read. The stack version is safer for very deep arrays.",
    },
    {
      question: "How would you add a depth parameter?",
      answer:
        "I pass depth to the recursive call and stop flattening when it is 0.",
    },
  ],
};
