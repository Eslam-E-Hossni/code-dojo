import type { CodeProblem } from "../types";

export const validParentheses: CodeProblem = {
  id: "valid-parentheses",
  kind: "code",
  group: "algorithms",
  title: "Valid parentheses",
  difficulty: "medium",
  tag: "reported",
  statement: "Return true if every opening bracket is closed in the right order.",
  examples: ['isValid("{[()]}"); // true', 'isValid("([)]");   // false'],
  askFirst: ["Only round brackets, or also [] and {}?", "Can the string have other characters?"],
  edgeCases: [
    "Empty string: valid",
    "Starts with a closing bracket",
    'Wrong order: "([)]"',
    'Left open: "(("',
  ],
  parts: [
    {
      id: "main",
      title: "isValid",
      signature: "isValid(s)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد النص وبترجّع true أو false. اكتب تعريفها.",
          expected: "function isValid(s) {",
          hint1: "دالة اسمها `isValid` وبتاخد `s`.",
          hint2: "function _______(_) {",
          explain: "isValid takes the string.",
        },
        {
          coach:
            "محتاجين نعرف كل قوس مقفول بيقابله أنهي مفتوح. اعمل object المفتاح فيه القوس المقفول والقيمة المفتوح بتاعه، للتلات أنواع.",
          expected: '  const pairs = { ")": "(", "]": "[", "}": "{" };',
          hint1: "`const` اسمه `pairs`، وفيه تلات مفاتيح: كل قوس مقفول كنص، وقيمته القوس المفتوح بتاعه.",
          hint2: 'const _____ = { ")": "_", "]": "_", "}": "_" };',
          explain: "pairs maps each closing bracket to its opening bracket.",
        },
        {
          coach: "والـ stack اللي هنحط فيه الأقواس المفتوحة اللي لسه متقفلتش.",
          expected: "  const stack = [];",
          hint1: "`const` اسمه `stack` وقيمته array فاضية.",
          hint2: "const _____ = [];",
          explain: "The stack holds the opening brackets that are still open.",
        },
        {
          coach: "لف على النص حرف حرف.",
          expected: "  for (let i = 0; i < s.length; i++) {",
          accept: ["for (let i = 0; i < s.length; i += 1) {", "for (let i = 0; i < s.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `s.length`.",
          hint2: "for (let _ = 0; _ < _.______; _++) {",
          explain: "I loop over the string.",
        },
        {
          coach: "خد الحرف الحالي في متغير علشان هنستخدمه كذا مرة.",
          expected: "    const ch = s[i];",
          hint1: "`const` اسمه `ch` وقيمته `s[i]`.",
          hint2: "const __ = _[_];",
          explain: "I take the current character.",
        },
        {
          coach: "أول حالة: الحرف ده قوس مفتوح من أي نوع من التلاتة؟",
          expected: '    if (ch === "(" || ch === "[" || ch === "{") {',
          hint1: "`if` فيها تلات مقارنات بينهم `||`: `ch` بيساوي كل قوس مفتوح كنص.",
          hint2: 'if (__ === "_" || __ === "_" || __ === "_") {',
          explain: "If it is an opening bracket,",
        },
        {
          coach: "لو مفتوح، يدخل الـ stack ويستنى اللي يقفله.",
          expected: "      stack.push(ch);",
          hint1: "`stack.push` للحرف `ch`.",
          hint2: "_____.push(__);",
          explain: "I push it on the stack.",
        },
        {
          coach: "تاني حالة: الحرف ده قوس مقفول؟ يعني موجود كمفتاح في `pairs`. أي حرف تاني هنعدّيه.",
          expected: "    } else if (pairs[ch]) {",
          hint1: "اقفل الـ `if` وافتح `else if` بتسأل على `pairs[ch]`.",
          hint2: "} else if (_____[__]) {",
          explain: "If it is a closing bracket,",
        },
        {
          coach:
            "طلّع آخر قوس مفتوح من الـ stack وقارنه باللي المفروض يقابل القوس ده. لو مش هو، أو الـ stack فاضي، يبقى غلط. واقفل الـ `else if` والـ loop. تلات سطور.",
          expected: "      if (stack.pop() !== pairs[ch]) return false;\n    }\n  }",
          hint1: "`if` بتقارن `stack.pop()` بـ `pairs[ch]` بـ `!==`، ولو مختلفين `return false`. وبعدها قوسين قفل.",
          hint2: "if (_____.___() !== _____[__]) return _____;\n}\n}",
          explain: "the top of the stack must be its opening bracket. If the stack is empty, pop gives undefined, which is also wrong.",
        },
        {
          coach: "في الآخر الـ stack لازم يبقى فاضي. لو فيه حاجة فاضلة يبقى فيه قوس متقفلش. واقفل الدالة. سطرين.",
          expected: "  return stack.length === 0;\n}",
          hint1: "`return` ومعاها مقارنة `stack.length` بصفر، وبعدها قوس قفل الدالة.",
          hint2: "return _____.______ === 0;\n}",
          explain: "At the end the stack must be empty. If something is left, a bracket was never closed.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "nested brackets of all kinds",
      code: `
expect(isValid("{[()]}")).toBe(true);
expect(isValid("()[]{}")).toBe(true);`,
    },
    {
      name: "edge case: wrong order",
      code: `
expect(isValid("([)]")).toBe(false);
expect(isValid("(]")).toBe(false);`,
    },
    {
      name: "edge case: empty string",
      code: `expect(isValid("")).toBe(true);`,
    },
    {
      name: "edge case: starts with a closing bracket",
      code: `
expect(isValid(")")).toBe(false);
expect(isValid("]()")).toBe(false);`,
    },
    {
      name: "edge case: left open",
      code: `
expect(isValid("((")).toBe(false);
expect(isValid("{[()]")).toBe(false);`,
    },
    {
      name: "one extra closing bracket at the end",
      code: `expect(isValid("()())")).toBe(false);`,
    },
    {
      name: "other characters are ignored",
      code: `
expect(isValid("a(b)c")).toBe(true);
expect(isValid("fn(arr[0]) { }")).toBe(true);
expect(isValid("fn(arr[0)]")).toBe(false);`,
    },
    {
      name: "a single pair, and a long valid string",
      code: `
expect(isValid("()")).toBe(true);
expect(isValid("((((((((((()))))))))))")).toBe(true);`,
    },
  ],
  complexity: "Time: O(n). Space: O(n).",
  idea: "الـ stack: المفتوح يدخل، والمقفول لازم يطابق آخر واحد دخل. وفي الآخر الـ stack لازم يبقى فاضي.",
  followUps: [
    {
      question: "With round brackets only, do you need a stack?",
      answer: "No. A counter is enough: +1 for open, -1 for close, never below zero, and zero at the end.",
    },
  ],
};
