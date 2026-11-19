import type { CodeProblem } from "../types";

export const jsonStringify: CodeProblem = {
  id: "json-stringify",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: JSON.stringify",
  difficulty: "hard",
  tag: "polyfill",
  statement: "Write a simple version of JSON.stringify, as a function stringify(value).",
  examples: ['stringify({ a: 1, b: [true, null], c: "x" }); // \'{"a":1,"b":[true,null],"c":"x"}\''],
  askFirst: [
    "Which types must I support?",
    "Do I need to handle circular references?",
    "Do I need the indent argument?",
  ],
  edgeCases: [
    "undefined and functions are skipped in objects, and become null in arrays",
    "NaN and Infinity become null",
    "Nested objects and arrays",
    "Circular reference: the real one throws",
  ],
  parts: [
    {
      id: "main",
      title: "stringify",
      signature: "stringify(value)",
      steps: [
        {
          coach: "نبدأ يا إسلام: دالة بتاخد أي قيمة وبترجّع النص بتاعها. اكتب تعريفها.",
          expected: "function stringify(value) {",
          hint1: "دالة اسمها `stringify` وبتاخد `value`.",
          hint2: "function _________(_____) {",
          explain: "stringify takes any value.",
        },
        {
          coach: "هنبدأ بالقيم البسيطة واحدة واحدة. الأولى `null`: بترجع كنص.",
          expected: '  if (value === null) return "null";',
          hint1: "`if` بتسأل `value` بيساوي `null`، وبترجّع النص null.",
          hint2: 'if (_____ === ____) return "____";',
          explain: "I start with the simple values. null becomes the text null.",
        },
        {
          coach: "النصوص لازم ترجع وحواليها علامات تنصيص double.",
          expected: "  if (typeof value === \"string\") return '\"' + value + '\"';",
          hint1: "لو الـ `typeof` بيساوي string، رجّع علامة تنصيص زائد القيمة زائد علامة تنصيص.",
          hint2: "if (typeof _____ === \"______\") return '\"' + _____ + '\"';",
          explain: "A string is wrapped in double quotes.",
        },
        {
          coach: "الأرقام بتتحول لنص عادي، بس `NaN` و `Infinity` مش موجودين في JSON فبيبقوا null.",
          expected: '  if (typeof value === "number") return isFinite(value) ? String(value) : "null";',
          hint1: "لو الـ `typeof` بيساوي number: ternary على `isFinite(value)`، يا `String(value)` يا النص null.",
          hint2: 'if (typeof _____ === "______") return ________(_____) ? String(_____) : "____";',
          explain: "A number becomes its text. NaN and Infinity are not valid JSON, so they become null.",
        },
        {
          coach: "الـ boolean بيتحول لنص زي ما هو.",
          expected: '  if (typeof value === "boolean") return String(value);',
          hint1: "لو الـ `typeof` بيساوي boolean، رجّع `String(value)`.",
          hint2: 'if (typeof _____ === "_______") return ______(_____);',
          explain: "A boolean becomes true or false as text.",
        },
        {
          coach:
            "و `undefined` والدوال ملهمش مكان في JSON خالص. رجّع `undefined` نفسها، واللي نادى هو اللي يقرر يعمل بيها إيه.",
          expected: '  if (typeof value === "undefined" || typeof value === "function") return undefined;',
          hint1: "شرطين بينهم `||`: الـ `typeof` بيساوي undefined أو function. والنتيجة `return undefined`.",
          hint2: 'if (typeof _____ === "_________" || typeof _____ === "________") return _________;',
          explain: "undefined and functions have no JSON form, so I return undefined and let the caller decide.",
        },
        {
          coach: "دلوقتي الـ array. اسأل الأول: القيمة دي array؟",
          expected: "  if (Array.isArray(value)) {",
          hint1: "`if` ومعاها `Array.isArray` على `value`.",
          hint2: "if (Array._______(_____)) {",
          explain: "Next, arrays.",
        },
        {
          coach: "النص الناتج بيبدأ بقوس مربع مفتوح.",
          expected: '    let out = "[";',
          hint1: "`let` اسمه `out` وقيمته نص فيه القوس المربع المفتوح.",
          hint2: 'let ___ = "_";',
          explain: "The output starts with an opening bracket.",
        },
        {
          coach: "لف على العناصر.",
          expected: "    for (let i = 0; i < value.length; i++) {",
          accept: ["for (let i = 0; i < value.length; i += 1) {", "for (let i = 0; i < value.length; ++i) {"],
          hint1: "`for` بعدّاد `i` من صفر لحد `value.length`.",
          hint2: "for (let _ = 0; _ < _____.______; _++) {",
          explain: "I loop over the items.",
        },
        {
          coach: "كل عنصر نحوّله بنفس الدالة. هنا الـ recursion.",
          expected: "      const item = stringify(value[i]);",
          hint1: "نادي `stringify` على `value[i]` وحط الناتج في `const` اسمه `item`.",
          hint2: "const ____ = _________(_____[_]);",
          explain: "Each item is converted with a recursive call.",
        },
        {
          coach: "الفاصلة بتتحط قبل كل عنصر ما عدا الأول.",
          expected: '      if (i > 0) out += ",";',
          hint1: "`if` بتسأل `i` أكبر من صفر، ولو آه زوّد فاصلة على `out`.",
          hint2: 'if (_ > 0) ___ += "_";',
          explain: "I add a comma before every item except the first.",
        },
        {
          coach:
            "زوّد العنصر على النص. ولو رجع `undefined`، في الـ array بيتكتب null. واقفل الـ loop. سطرين.",
          expected: '      out += item === undefined ? "null" : item;\n    }',
          hint1: "`out +=` ومعاها ternary: لو `item` بيساوي `undefined` يبقى النص null، غير كده `item`.",
          hint2: '___ += ____ === _________ ? "____" : ____;\n}',
          explain: "Inside an array, undefined and functions are written as null.",
        },
        {
          coach: "رجّع النص ومعاه قوس القفل المربع، واقفل الـ `if`. سطرين.",
          expected: '    return out + "]";\n  }',
          hint1: "`return` ومعاها `out` زائد نص فيه القوس المربع المقفول، وبعدها قوس القفل.",
          hint2: 'return ___ + "_";\n}',
          explain: "Then I close the bracket and return.",
        },
        {
          coach: "اللي فاضل هو الـ object. النص بيبدأ بقوس مجعّد مفتوح.",
          expected: '  let out = "{";',
          hint1: "`let` اسمه `out` وقيمته نص فيه القوس المجعّد المفتوح.",
          hint2: 'let ___ = "_";',
          explain: "What is left is an object. The output starts with an opening brace.",
        },
        {
          coach:
            "هنا مينفعش نعتمد على الـ index علشان الفاصلة، لأن فيه مفاتيح هنعدّيها. محتاجين علامة: ده أول مفتاح بيتكتب ولا لأ؟",
          expected: "  let first = true;",
          hint1: "`let` اسمه `first` وقيمته `true`.",
          hint2: "let _____ = ____;",
          explain: "Some keys are skipped, so I use a flag to know if a comma is needed.",
        },
        {
          coach: "لف على مفاتيح الـ object.",
          expected: "  for (const key of Object.keys(value)) {",
          hint1: "`for...of` على `Object.keys(value)`، والمتغير اسمه `key`.",
          hint2: "for (const ___ of Object.____(_____)) {",
          explain: "I loop over the keys.",
        },
        {
          coach: "حوّل قيمة المفتاح بنفس الدالة.",
          expected: "    const item = stringify(value[key]);",
          hint1: "نادي `stringify` على `value[key]` وحط الناتج في `const` اسمه `item`.",
          hint2: "const ____ = _________(_____[___]);",
          explain: "Each value is converted with a recursive call.",
        },
        {
          coach: "لو رجعت `undefined`، في الـ object المفتاح كله بيتشال. عدّيه.",
          expected: "    if (item === undefined) continue;",
          hint1: "`if` بتسأل `item` بيساوي `undefined`، ولو آه `continue`.",
          hint2: "if (____ === _________) ________;",
          explain: "Inside an object, a key with undefined or a function is skipped.",
        },
        {
          coach: "لو ده مش أول مفتاح بيتكتب، حط فاصلة قبله.",
          expected: '    if (!first) out += ",";',
          hint1: "`if` بتنفي `first`، ولو آه زوّد فاصلة على `out`.",
          hint2: 'if (!_____) ___ += "_";',
          explain: "I add a comma before every key except the first one written.",
        },
        {
          coach:
            "زوّد المفتاح بين علامتين تنصيص، وبعده نقطتين، وبعده القيمة. خد بالك من مكان النقطتين جوه النص.",
          expected: "    out += '\"' + key + '\":' + item;",
          hint1:
            "`out +=` وبعدها أربع حاجات متجمّعة: علامة تنصيص، `key`، نص فيه علامة تنصيص ونقطتين، و `item`.",
          hint2: "___ += '\"' + ___ + '\":' + ____;",
          explain: "I write the key in double quotes, a colon, and the value.",
        },
        {
          coach: "أول مفتاح اتكتب خلاص، غيّر العلامة. واقفل الـ loop. سطرين.",
          expected: "    first = false;\n  }",
          hint1: "`first` بيساوي `false`، وبعدها قوس القفل.",
          hint2: "_____ = _____;\n}",
          explain: "After the first key is written, the flag is off.",
        },
        {
          coach: "رجّع النص ومعاه قوس القفل المجعّد، واقفل الدالة. سطرين.",
          expected: '  return out + "}";\n}',
          hint1: "`return` ومعاها `out` زائد نص فيه القوس المجعّد المقفول، وبعدها قوس قفل الدالة.",
          hint2: 'return ___ + "_";\n}',
          explain: "At the end I close the brace and return.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "null, numbers and booleans",
      code: `
expect(stringify(null)).toBe("null");
expect(stringify(42)).toBe("42");
expect(stringify(-1.5)).toBe("-1.5");
expect(stringify(0)).toBe("0");
expect(stringify(true)).toBe("true");
expect(stringify(false)).toBe("false");`,
    },
    {
      name: "strings get double quotes",
      code: `
expect(stringify("hello")).toBe('"hello"');
expect(stringify("")).toBe('""');`,
    },
    {
      name: "edge case: NaN and Infinity become null",
      code: `
expect(stringify(NaN)).toBe("null");
expect(stringify(Infinity)).toBe("null");
expect(stringify(-Infinity)).toBe("null");`,
    },
    {
      name: "undefined and a function alone give undefined",
      code: `
expect(stringify(undefined)).toBe(undefined);
expect(stringify(() => 1)).toBe(undefined);`,
    },
    {
      name: "arrays",
      code: `
expect(stringify([])).toBe("[]");
expect(stringify([1])).toBe("[1]");
expect(stringify([1, "a", true, null])).toBe('[1,"a",true,null]');`,
    },
    {
      name: "objects",
      code: `
expect(stringify({})).toBe("{}");
expect(stringify({ a: 1 })).toBe('{"a":1}');
expect(stringify({ a: 1, b: "x", c: false, d: null })).toBe('{"a":1,"b":"x","c":false,"d":null}');`,
    },
    {
      name: "edge case: undefined and functions become null in arrays",
      code: `expect(stringify([1, undefined, () => 1, 2])).toBe("[1,null,null,2]");`,
    },
    {
      name: "edge case: undefined and functions are skipped in objects",
      code: `
expect(stringify({ a: undefined, b: 1, c: () => 1, d: 2 })).toBe('{"b":1,"d":2}');
expect(stringify({ a: undefined })).toBe("{}");
expect(stringify({ a: 1, b: undefined })).toBe('{"a":1}');`,
    },
    {
      name: "edge case: nested objects and arrays",
      code: `
const value = { user: { name: "A", tags: ["x", "y"] }, list: [{ id: 1 }, [2, [3]]], empty: { a: [] } };
expect(stringify(value)).toBe(JSON.stringify(value));`,
    },
    {
      name: "gives the same text as the real JSON.stringify",
      code: `
const values = [
  { a: [1, 2, { b: null }], c: "text", d: 1.5, e: true },
  [[], {}, [[]], { x: {} }],
  { n: NaN, i: Infinity, u: undefined, f: function () {}, z: 0 },
  [undefined, NaN, "a", -0.5],
];
for (let i = 0; i < values.length; i++) {
  expect(stringify(values[i]), "value number " + (i + 1)).toBe(JSON.stringify(values[i]));
}`,
    },
  ],
  complexity: "Time: O(n) for n values in the object.",
  idea: "ابدأ بالـ primitives، بعدين الـ array، بعدين الـ object، وكل واحد بينادي نفس الدالة recursive.",
  followUps: [
    {
      question: "What about quotes inside a string?",
      answer: "A full version must escape quotes and backslashes.",
    },
    {
      question: "How would you detect a circular reference?",
      answer: "With a WeakSet of the objects I am visiting.",
    },
  ],
};
