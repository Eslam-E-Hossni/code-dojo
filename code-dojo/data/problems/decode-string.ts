import type { CodeProblem } from "../types";

export const decodeString: CodeProblem = {
  id: "decode-string",
  kind: "code",
  group: "algorithms",
  title: "Decode a string: 3[a]2[ab]",
  difficulty: "hard",
  tag: "reported",
  statement: "Expand the string: a number followed by brackets repeats the text inside.",
  examples: ['decodeString("3[a]2[ab]"); // "aaaabab"', 'decodeString("2[a3[b]]c"); // "abbbabbbc"'],
  askFirst: [
    "Can the brackets be nested, like 2[a3[b]]?",
    "Can the number have more than one digit?",
    "Is the input always valid?",
  ],
  edgeCases: [
    "Empty string",
    "Nested brackets",
    "Multi-digit numbers like 10[x]",
    "Letters outside any brackets",
  ],
  parts: [
    {
      id: "main",
      title: "decodeString",
      signature: "decodeString(s)",
      steps: [
        {
          coach: "نبدأ يا إسلام: الدالة بتاخد النص المضغوط. اكتب تعريفها.",
          expected: "function decodeString(s) {",
          hint1: "دالة اسمها `decodeString` وبتاخد `s`.",
          hint2: "function ____________(_) {",
          explain: "decodeString takes the encoded string.",
        },
        {
          coach:
            "عند كل قوس مفتوح لازم نفتكر حاجتين. الأولى: رقم التكرار. اعمله stack.",
          expected: "  const countStack = [];",
          hint1: "`const` اسمه `countStack` وقيمته array فاضية.",
          hint2: "const __________ = [];",
          explain: "I need two stacks. One for the repeat counts,",
        },
        {
          coach: "والتانية: النص اللي كان مكتوب قبل القوس. stack تاني.",
          expected: "  const textStack = [];",
          hint1: "`const` اسمه `textStack` وقيمته array فاضية.",
          hint2: "const _________ = [];",
          explain: "and one for the text that came before each bracket.",
        },
        {
          coach: "ومتغير للنص اللي بنبنيه دلوقتي في المستوى الحالي.",
          expected: '  let current = "";',
          hint1: "`let` اسمه `current` وقيمته نص فاضي.",
          hint2: 'let _______ = "";',
          explain: "current is the text I am building at this level.",
        },
        {
          coach: "ومتغير للرقم اللي بنقراه، علشان ممكن يبقى أكتر من خانة.",
          expected: "  let num = 0;",
          hint1: "`let` اسمه `num` وقيمته صفر.",
          hint2: "let ___ = 0;",
          explain: "num is the number I am reading, because it can have many digits.",
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
          coach: "خد الحرف الحالي في متغير.",
          expected: "    const ch = s[i];",
          hint1: "`const` اسمه `ch` وقيمته `s[i]`.",
          hint2: "const __ = _[_];",
          explain: "I take the current character.",
        },
        {
          coach: "فيه أربع حالات للحرف. الأولى: رقم. قارنه كنص بين صفر وتسعة.",
          expected: '    if (ch >= "0" && ch <= "9") {',
          hint1: "`if` فيها شرطين بينهم `&&`: `ch` أكبر من أو يساوي النص 0، وأصغر من أو يساوي النص 9.",
          hint2: 'if (__ >= "_" && __ <= "_") {',
          explain: "There are four cases. A digit:",
        },
        {
          coach: "لو رقم، ضيفه على يمين الرقم اللي معانا: القديم في عشرة زائد الخانة الجديدة.",
          expected: "      num = num * 10 + Number(ch);",
          hint1: "`num` بيساوي `num` في 10 زائد `Number(ch)`.",
          hint2: "___ = ___ * 10 + ______(__);",
          explain: "I add it to the number, times ten for the digits before it.",
        },
        {
          coach: "الحالة التانية: قوس مربع مفتوح.",
          expected: '    } else if (ch === "[") {',
          hint1: "اقفل الـ `if` وافتح `else if` بتسأل `ch` بيساوي القوس المربع المفتوح كنص.",
          hint2: '} else if (__ === "_") {',
          explain: "An opening bracket:",
        },
        {
          coach: "هندخل مستوى جديد. احفظ رقم التكرار في الـ stack بتاعه.",
          expected: "      countStack.push(num);",
          hint1: "`countStack.push` للرقم `num`.",
          hint2: "__________.push(___);",
          explain: "I save the count",
        },
        {
          coach: "واحفظ النص اللي اتبنى لحد دلوقتي في الـ stack التاني.",
          expected: "      textStack.push(current);",
          hint1: "`textStack.push` للنص `current`.",
          hint2: "_________.push(_______);",
          explain: "and the text so far,",
        },
        {
          coach: "وصفّر الرقم علشان اللي جاي.",
          expected: "      num = 0;",
          hint1: "`num` بيساوي صفر.",
          hint2: "___ = 0;",
          explain: "then I reset the number",
        },
        {
          coach: "وابدأ نص جديد فاضي للمستوى اللي جوه القوس.",
          expected: '      current = "";',
          hint1: "`current` بيساوي نص فاضي.",
          hint2: '_______ = "";',
          explain: "and start a new empty text for the inside of the bracket.",
        },
        {
          coach: "الحالة التالتة: قوس مربع مقفول.",
          expected: '    } else if (ch === "]") {',
          hint1: "اقفل وافتح `else if` بتسأل `ch` بيساوي القوس المربع المقفول كنص.",
          hint2: '} else if (__ === "_") {',
          explain: "A closing bracket:",
        },
        {
          coach: "المستوى ده خلص. طلّع عدد التكرار بتاعه.",
          expected: "      const times = countStack.pop();",
          hint1: "`countStack.pop()` والناتج في `const` اسمه `times`.",
          hint2: "const _____ = __________.___();",
          explain: "I take back the count",
        },
        {
          coach: "وطلّع النص اللي كان قبل القوس.",
          expected: "      const before = textStack.pop();",
          hint1: "`textStack.pop()` والناتج في `const` اسمه `before`.",
          hint2: "const ______ = _________.___();",
          explain: "and the text from before the bracket.",
        },
        {
          coach: "محتاجين نص فاضي نكرر فيه.",
          expected: '      let repeated = "";',
          hint1: "`let` اسمه `repeated` وقيمته نص فاضي.",
          hint2: 'let ________ = "";',
          explain: "I build the repeated text",
        },
        {
          coach: "كرر النص الحالي بعدد المرات، بـ loop في سطر واحد وبعدّاد اسمه `j`.",
          expected: "      for (let j = 0; j < times; j++) repeated += current;",
          accept: [
            "for (let j = 0; j < times; j++) { repeated += current; }",
            "for (let j = 0; j < times; j += 1) repeated += current;",
            "for (let j = 0; j < times; ++j) repeated += current;",
          ],
          hint1: "`for` بعدّاد `j` من صفر لحد `times`، وجسمها `repeated += current`.",
          hint2: "for (let _ = 0; _ < _____; _++) ________ += _______;",
          explain: "with a plain loop.",
        },
        {
          coach: "النص الحالي بقى: اللي كان قبل القوس، وبعده المتكرر.",
          expected: "      current = before + repeated;",
          hint1: "`current` بيساوي `before` زائد `repeated`.",
          hint2: "_______ = ______ + ________;",
          explain: "Now current is the text before, plus the repeated text.",
        },
        {
          coach: "الحالة الرابعة: أي حرف عادي.",
          expected: "    } else {",
          hint1: "اقفل وافتح `else` في نفس السطر.",
          hint2: "} ____ {",
          explain: "Any other character:",
        },
        {
          coach: "ضيفه على النص الحالي.",
          expected: "      current += ch;",
          hint1: "`current +=` الحرف `ch`.",
          hint2: "_______ += __;",
          explain: "I add it to current.",
        },
        {
          coach: "اقفل الـ `else` واقفل الـ loop. سطرين.",
          expected: "    }\n  }",
          hint1: "قوسين قفل، كل واحد في سطر.",
          hint2: "_\n_",
          explain: "I close the else and the loop.",
        },
        {
          coach: "رجّع النص النهائي واقفل الدالة. سطرين.",
          expected: "  return current;\n}",
          hint1: "`return current`، وبعدها قوس قفل الدالة.",
          hint2: "return _______;\n}",
          explain: "At the end, current is the answer.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "repeats the text inside the brackets",
      code: `expect(decodeString("3[a]2[ab]")).toBe("aaaabab");`,
    },
    {
      name: "edge case: nested brackets",
      code: `
expect(decodeString("2[a3[b]]c")).toBe("abbbabbbc");
expect(decodeString("2[2[2[a]]]")).toBe("aaaaaaaa");`,
    },
    {
      name: "edge case: empty string",
      code: `expect(decodeString("")).toBe("");`,
    },
    {
      name: "edge case: multi-digit numbers",
      code: `
expect(decodeString("10[x]")).toBe("xxxxxxxxxx");
expect(decodeString("12[ab]").length).toBe(24);`,
    },
    {
      name: "edge case: letters outside any brackets",
      code: `
expect(decodeString("abc")).toBe("abc");
expect(decodeString("ab2[c]d")).toBe("abccd");
expect(decodeString("x3[y]z")).toBe("xyyyz");`,
    },
    {
      name: "a count of 1 and a count of 0",
      code: `
expect(decodeString("1[a]")).toBe("a");
expect(decodeString("0[a]b")).toBe("b");`,
    },
    {
      name: "two groups next to each other inside a group",
      code: `expect(decodeString("2[a2[b]3[c]]")).toBe("abbcccabbccc");`,
    },
    {
      name: "the number is reset after each group",
      code: `expect(decodeString("2[a]3[b]")).toBe("aabbb");`,
    },
  ],
  complexity: "Time: O(length of the output). Space: O(depth of nesting).",
  idea: "اتنين stack: واحد للأرقام وواحد للنص اللي قبل القوس. عند القوس المفتوح بنحفظ، وعند المقفول بنكرر ونرجّع.",
  followUps: [
    {
      question: "Why two stacks?",
      answer: "At each opening bracket I must remember the count and the text before it.",
    },
  ],
};
