import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const UTILS = `export function sum(a, b) {
  if (typeof a !== "number" || typeof b !== "number") {
    throw new TypeError("sum needs two numbers");
  }
  return a + b;
}

export function isPalindrome(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  let left = 0;
  let right = clean.length - 1;
  while (left < right) {
    if (clean[left] !== clean[right]) return false;
    left++;
    right--;
  }
  return true;
}

export function flatten(list) {
  const result = [];
  for (const item of list) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(item);
    }
  }
  return result;
}
`;

export const testPureFunctions: TestingProblem = {
  id: "test-pure-functions",
  kind: "test",
  group: "testing",
  title: "Pure functions with Jest: sum, isPalindrome, flatten",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Write Jest tests for three pure functions. sum: adds two numbers, and throws a TypeError when a value is not a number. isPalindrome: true or false, ignoring case and spaces. flatten: any depth, an empty array, and it must not change its input.",
  askFirst: [
    "What should each function do with wrong input: throw, or return something?",
    "Which edge cases matter: empty input, nested input, mixed case?",
    "May flatten change the array it is given?",
  ],
  edgeCases: [
    "sum with a string that looks like a number",
    "A palindrome with capital letters and spaces",
    "An empty array, and arrays nested three levels deep",
    "The input array after the call",
  ],
  testFile: "/utils.test.js",
  subject: { "/utils.js": UTILS },
  buggy: [
    buggy(
      "sum-no-check",
      "/utils.js",
      swap(
        UTILS,
        `  if (typeof a !== "number" || typeof b !== "number") {
    throw new TypeError("sum needs two numbers");
  }
`,
        "",
      ),
      'sum does not check its arguments, so sum("2", 3) returns the string "23".',
      "مفيش اختبار لقيمة مش رقم. المفروض الدالة ترمي خطأ في الحالة دي، واختبارك مجرّبهاش.",
    ),
    buggy(
      "sum-plain-error",
      "/utils.js",
      swap(UTILS, 'throw new TypeError("sum needs two numbers")', 'throw new Error("sum needs two numbers")'),
      "sum throws a plain Error, not a TypeError.",
      "اختبارك بيتأكد إن فيه خطأ اترمى، بس مش بيتأكد من نوع الخطأ.",
    ),
    buggy(
      "palindrome-always-true",
      "/utils.js",
      swap(UTILS, "if (clean[left] !== clean[right]) return false;", "if (clean[left] !== clean[right]) return true;"),
      "isPalindrome returns true for every text.",
      "مفيش اختبار لكلمة مش palindrome. دالة بترجّع true دايمًا هتعدّي من اختبارك.",
    ),
    buggy(
      "palindrome-exact",
      "/utils.js",
      swap(UTILS, 'const clean = text.toLowerCase().replace(/[^a-z0-9]/g, "");', "const clean = text;"),
      "isPalindrome compares the text as it is: capital letters and spaces break it.",
      "مجرّبتش نص فيه حروف كبيرة ومسافات. المفروض الدالة تتجاهلهم.",
    ),
    buggy(
      "flatten-one-level",
      "/utils.js",
      swap(UTILS, "result.push(...flatten(item));", "result.push(...item);"),
      "flatten removes only one level of nesting.",
      "اختبارك بيجرّب تداخل مستوى واحد بس. جرّب array جواها array جواها array.",
    ),
    buggy(
      "flatten-mutates",
      "/utils.js",
      swap(
        UTILS,
        `  const result = [];
  for (const item of list) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(item);
    }
  }
  return result;`,
        `  for (let i = 0; i < list.length; i++) {
    if (Array.isArray(list[i])) {
      list.splice(i, 1, ...list[i]);
      i--;
    }
  }
  return list;`,
      ),
      "flatten changes the array it was given, and returns that same array.",
      "مفيش اختبار بيتأكد إن الـ array اللي اتبعتت فضلت زي ما هي بعد النداء.",
    ),
  ],
  parts: [
    {
      id: "sum",
      title: "sum",
      signature: 'describe("sum")',
      steps: [
        tline('import { sum, isPalindrome, flatten } from "./utils";', {
          coach:
            "نبدأ يا إسلام: هات التلات دوال اللي هنختبرهم من ملف `utils` اللي في التاب التاني. في Jest مش محتاج تعمل import لـ `describe` و `it` و `expect`، دول موجودين لوحدهم.",
          accept: [
            'import { sum, flatten, isPalindrome } from "./utils";',
            'import { isPalindrome, sum, flatten } from "./utils";',
            'import { isPalindrome, flatten, sum } from "./utils";',
            'import { flatten, sum, isPalindrome } from "./utils";',
            'import { flatten, isPalindrome, sum } from "./utils";',
          ],
          hint1: '`sum` و `isPalindrome` و `flatten`، من `"./utils"`. الترتيب مش مهم.',
          explain: "I import the functions under test. describe, it and expect are globals in Jest.",
        }),
        tline('\ndescribe("sum", () => {', {
          coach: "افتح مجموعة اختبارات للدالة الأولى، وسمّيها باسمها: `sum`.",
          hint1: "`describe` بياخد اسم المجموعة، وبعده arrow function فيها الاختبارات.",
          explain: "describe groups the tests of one function.",
        }),
        tline('  it("adds two numbers", () => {', {
          coach: "أول اختبار هو الحالة العادية. سمّيه `adds two numbers`. الاسم بيوصف السلوك، مش الكود.",
          hint1: "`it` بياخد اسم الاختبار، وبعده arrow function.",
          explain: "The first test is the normal case. Its name says what the function should do.",
        }),
        tline("    expect(sum(2, 3)).toBe(5);\n  });", {
          coach:
            "نادي الدالة بـ 2 و 3، واتأكد إن الناتج 5. الناتج رقم، فاستخدم الـ matcher اللي بيقارن القيمة نفسها. واقفل الاختبار. سطرين.",
          hint1: "`expect` على نداء `sum`، وبعدها `toBe` بالناتج المتوقع. وفي السطر اللي بعده `});`.",
          explain: "toBe compares with Object.is. It is right for numbers, strings and booleans.",
        }),
        tline('\n  it("throws when a value is not a number", () => {', {
          coach: "تاني اختبار هو الـ edge case: قيمة مش رقم. سمّيه `throws when a value is not a number`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The second test is the edge case: wrong input.",
        }),
        tline('    expect(() => sum("2", 3)).toThrow(TypeError);\n  });\n});', {
          coach:
            'خد بالك: لو ناديت الدالة مباشرة جوه `expect`، الخطأ هيترمي قبل ما Jest يمسكه. لِفّ النداء في arrow function، ونادي `sum` بالنص `"2"` والرقم 3، واتأكد إن نوع الخطأ `TypeError`. واقفل الاختبار والمجموعة. تلات سطور.',
          hint1: "`expect` بياخد arrow function بتنادي `sum`، وبعدها `toThrow` بنوع الخطأ. وبعده `});` مرتين.",
          explain: "I wrap the call in a function, so Jest can catch the error. toThrow also checks the error type.",
        }),
      ],
    },
    {
      id: "is-palindrome",
      title: "isPalindrome",
      signature: 'describe("isPalindrome")',
      steps: [
        tline('describe("isPalindrome", () => {', {
          coach: "مجموعة جديدة للدالة التانية: `isPalindrome`.",
          hint1: "`describe` بالاسم، وبعده arrow function.",
          explain: "A new group for the second function.",
        }),
        tline('  it("is true for a word that reads the same both ways", () => {', {
          coach: "أول اختبار: كلمة بتتقري زي بعضها من الناحيتين. سمّيه `is true for a word that reads the same both ways`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "First the case where the answer is true.",
        }),
        tline('    expect(isPalindrome("level")).toBe(true);\n  });', {
          coach: "جرّب الكلمة `level` واتأكد إن الناتج `true`. واقفل الاختبار. سطرين.",
          hint1: "`expect` على نداء `isPalindrome` بالكلمة، وبعدها `toBe(true)`.",
          explain: "A simple palindrome gives true.",
        }),
        tline('\n  it("is false for other words", () => {', {
          coach:
            "مهم جدًا: لو اختبرت الحالة اللي بترجّع true بس، دالة بترجّع true دايمًا هتعدّي. فاختبر العكس. سمّيه `is false for other words`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "I also test the false case. A function that always returns true must not pass.",
        }),
        tline('    expect(isPalindrome("hello")).toBe(false);\n  });', {
          coach: "جرّب الكلمة `hello` واتأكد إن الناتج `false`. واقفل الاختبار. سطرين.",
          hint1: "نفس الشكل، بالكلمة `hello` و `toBe(false)`.",
          explain: "A normal word gives false.",
        }),
        tline('\n  it("ignores case and spaces", () => {', {
          coach: "والـ edge case: حروف كبيرة ومسافات. سمّيه `ignores case and spaces`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The edge case: capital letters and spaces.",
        }),
        tline('    expect(isPalindrome("Never odd or even")).toBe(true);\n  });\n});', {
          coach:
            "جرّب الجملة `Never odd or even`: فيها حرف كبير ومسافات، وهي palindrome. اتأكد إن الناتج `true`. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`expect` على `isPalindrome` بالجملة، وبعدها `toBe(true)`. وبعده `});` مرتين.",
          explain: "The function must ignore case and spaces.",
        }),
      ],
    },
    {
      id: "flatten",
      title: "flatten",
      signature: 'describe("flatten")',
      steps: [
        tline('describe("flatten", () => {', {
          coach: "آخر مجموعة، للدالة التالتة: `flatten`.",
          hint1: "`describe` بالاسم، وبعده arrow function.",
          explain: "A group for the third function.",
        }),
        tline('  it("flattens deep arrays", () => {', {
          coach: "أول اختبار: التداخل العميق، مش مستوى واحد بس. سمّيه `flattens deep arrays`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The main case, with more than one level of nesting.",
        }),
        tline("    expect(flatten([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);\n  });", {
          coach:
            "ابعت array متداخلة أربع مستويات: 1 وجواها 2 وجواها 3 وجواها 4. الناتج array جديدة، و `toBe` بيقارن هل هي نفس الـ array في الذاكرة فهيفشل. استخدم الـ matcher اللي بيقارن المحتوى. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `flatten` بالـ array المتداخلة، وبعدها `toEqual` بالـ array المسطّحة.",
          explain: "toEqual compares the content, deeply. toBe would fail, because the result is a new array.",
        }),
        tline('\n  it("returns an empty array for an empty array", () => {', {
          coach: "الـ edge case الأول: array فاضية. سمّيه `returns an empty array for an empty array`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "The empty input is an edge case.",
        }),
        tline("    expect(flatten([])).toEqual([]);\n  });", {
          coach: "ابعت array فاضية، واتأكد إن الناتج array فاضية برضه. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `flatten([])`، وبعدها `toEqual([])`.",
          explain: "An empty array stays empty.",
        }),
        tline('\n  it("does not change the input", () => {', {
          coach:
            "والـ edge case التاني: دالة pure مينفعش تعدّل اللي اتبعتلها. سمّيه `does not change the input`.",
          hint1: "`it` بالاسم، وبعده arrow function.",
          explain: "A pure function must not change its input.",
        }),
        tline("    const input = [1, [2]];", {
          coach: "جهّز array متداخلة في متغير اسمه `input`، علشان نقدر نبص عليها بعد النداء.",
          hint1: "`const input` بيساوي array فيها 1 و array جواها 2.",
          explain: "Arrange: I keep the input in a variable, to look at it after the call.",
        }),
        tline("    flatten(input);", {
          coach: "نادي الدالة عليها. الناتج مش مهم هنا.",
          hint1: "نداء `flatten` بـ `input`، من غير ما تخزّن الناتج.",
          explain: "Act: I call the function.",
        }),
        tline("    expect(input).toEqual([1, [2]]);\n  });\n});", {
          coach: "اتأكد إن `input` لسه زي ما كانت بالظبط. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`expect` على `input`، وبعدها `toEqual` بنفس الشكل الأصلي. وبعده `});` مرتين.",
          explain: "Assert: the input still has its nested shape.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: one behaviour per test, a name that says the behaviour, and always the edge cases. toBe for simple values, toEqual for arrays and objects.",
  idea: "اختبار الدالة الـ pure سهل: تبعت قيمة وتتأكد من الناتج. المهم تختبر الحالة العادية، والحالة العكسية، والـ edge cases. و `toBe` للقيم البسيطة و `toEqual` للـ arrays والـ objects.",
  interview:
    "A pure function is the easiest thing to test: I call it with an input and assert on the output, and I add the edge cases, like empty input and wrong types.",
  followUps: [
    {
      question: "What is the difference between toBe and toEqual?",
      answer: "toBe checks that two values are the same value. toEqual checks that they have the same content.",
      how: "toBe uses Object.is, so two different arrays are never equal. toEqual walks through the arrays or objects and compares each item.",
      example: "expect([1, 2]).toEqual([1, 2]) passes. expect([1, 2]).toBe([1, 2]) fails.",
    },
    {
      question: "Why wrap the call in a function for toThrow?",
      answer: "So Jest can call it and catch the error.",
      how: "Without the wrapper the function throws while the arguments of expect are evaluated, before Jest is involved.",
      example: 'expect(() => sum("2", 3)).toThrow(TypeError)',
    },
    {
      question: "How do you choose the test cases?",
      answer: "One normal case, the opposite case, and the edge cases.",
      how: "For each rule in the description I write one test. Then I add the inputs that often break code: empty, nested, wrong type.",
      example: "For isPalindrome: a palindrome, a normal word, and a sentence with capitals and spaces.",
    },
  ],
};
