import { describe, expect, it } from "vitest";
import { getProblem } from "@/data/problems";
import type { CodeProblem, Step } from "@/data/types";
import { acceptSteps, check, checkFast, EMPTY_STATE, flattenSteps, type CheckState } from "@/lib/checker/check";
import { changedNames, renameCode, renameText } from "@/lib/checker/names";
import { deps, story, type } from "./helpers";

const debounce = getProblem("debounce") as CodeProblem;
const flatten = getProblem("flatten") as CodeProblem;
const memoize = getProblem("memoize") as CodeProblem;

/** A small problem made of the given reference lines. Names in `api` cannot be renamed. */
function tiny(expected: (string | Partial<Step>)[], options: { api?: string[]; plainLoops?: boolean } = {}): CodeProblem {
  const steps: Step[] = expected.map((item) => ({
    coach: "",
    hint1: "",
    hint2: "",
    explain: "",
    expected: "",
    ...(typeof item === "string" ? { expected: item } : item),
  }));
  return {
    id: "tiny",
    kind: "code",
    group: "most-repeated",
    title: "tiny",
    difficulty: "easy",
    tag: "likely",
    language: "js",
    api: options.api ?? [],
    plainLoops: options.plainLoops ?? false,
    statement: "",
    askFirst: [],
    edgeCases: [],
    complexity: "",
    followUps: [],
    parts: [{ id: "main", title: "main", signature: "main()", steps }],
    tests: [],
  };
}

/** The verdict for typing `input` as the next step, after the first `done` reference steps. */
function verdictOf(problem: CodeProblem, input: string, done = 0) {
  const steps = flattenSteps(problem);
  let state: CheckState = EMPTY_STATE;
  for (let i = 0; i < done; i++) {
    const before = checkFast(problem, state, steps[i].expected);
    if (before.kind !== "accept") throw new Error("the reference line " + i + " was not accepted: " + JSON.stringify(before));
    state = acceptSteps(problem, state, steps[i].expected, before.steps, before.names, null);
  }
  return checkFast(problem, state, input);
}

function accepts(reference: string | string[], typed: string, options?: { api?: string[] }): void {
  const problem = tiny(Array.isArray(reference) ? reference : [reference], options);
  const verdict = verdictOf(problem, typed);
  expect(verdict.kind === "reject" ? verdict.message : verdict.kind, typed).toBe("accept");
}

function rejects(reference: string | string[], typed: string, options?: { api?: string[]; done?: number }): string {
  const problem = tiny(Array.isArray(reference) ? reference : [reference], options);
  const verdict = verdictOf(problem, typed, options?.done ?? 0);
  expect(verdict.kind, typed).toBe("reject");
  return verdict.kind === "reject" ? verdict.message : "";
}

describe("layer 1: what does not matter in a line", () => {
  it("spaces, semicolons, quotes, trailing commas, comments, brackets around one arrow parameter", () => {
    accepts("const add = (a, b) => a + b;", "const add=(a,b)=>a+b");
    accepts("const add = (a, b) => a + b;", "const   add = ( a , b ) =>\n  a + b ;");
    accepts('const greeting = "hello";', "const greeting = 'hello'");
    accepts("const point = { x: 1, y: 2 };", "const point = { x: 1, y: 2, };");
    accepts("const list = [1, 2];", "const list = [1, 2,]; // two numbers");
    accepts("const list = [1, 2];", "/* the list */ const list = [1, 2];");
    accepts("const double = (x) => x * 2;", "const double = x => x * 2;");
  });
});

describe("layer 2: code that means the same", () => {
  it("let or const, when the variable is never given a new value", () => {
    accepts("const cache = new Map();", "let cache = new Map();");
    accepts(["let total = 0;", "const size = 2;"], "let total = 0;");
    // The reference gives count a new value later, so const is an error.
    const message = rejects(["let count = 0;", "count = count + 1;"], "const count = 0;");
    expect(message).toContain("cannot be `const`");
    expect(message).toContain("count");
  });

  it("the three ways to write a small arrow function", () => {
    for (const typed of ["const double = x => x * 2;", "const double = (x) => x * 2;", "const double = (x) => { return x * 2; };"]) {
      accepts("const double = (x) => x * 2;", typed);
      accepts("const double = (x) => {\n  return x * 2;\n};", typed);
    }
  });

  it("a function expression, a declaration or an arrow, when there is no this and no arguments", () => {
    const forms = [
      "function area(w, h) { return w * h; }",
      "const area = function (w, h) { return w * h; };",
      "const area = (w, h) => w * h;",
      "const area = (w, h) => { return w * h; };",
    ];
    for (const reference of forms) for (const typed of forms) accepts(reference, typed, { api: ["area"] });
  });

  it("but not when the function uses this or arguments", () => {
    const withThis = rejects("const getName = function () { return this.name; };", "const getName = () => this.name;");
    expect(withThis).toContain("no `this` of its own");
    const withArguments = rejects("const count = function () { return arguments.length; };", "const count = () => arguments.length;");
    expect(withArguments).toContain("arrow function");
    // The real case: the function that debounce returns.
    const real = verdictOf(debounce, "return (...args) => {", 2);
    expect(real.kind === "reject" ? real.message : real.kind).toContain("`function` keyword");
    // An arrow that is needed for the outer this cannot become a function.
    const outer = verdictOf(debounce, "timer = setTimeout(function () {", 4);
    expect(outer.kind === "reject" ? outer.message : outer.kind).toContain("use an arrow function");
  });

  it("a + 1 and 1 + a, and the three ways to add one", () => {
    accepts("const next = index + 1;", "const next = 1 + index;", { api: ["index"] });
    accepts("const area = width * height;", "const area = height * width;", { api: ["width", "height"] });
    for (const typed of ["i++;", "++i;", "i += 1;", "i = i + 1;", "i = 1 + i;"]) {
      accepts(["let i = 0;", "i++;"].join("\n"), "let i = 0;\n" + typed);
    }
    for (const typed of ["i--;", "--i;", "i -= 1;", "i = i - 1;"]) accepts("let i = 9;\ni--;", "let i = 9;\n" + typed);
    // Text is not a number: "a" + name is not name + "a".
    rejects('const label = "id-" + name;', 'const label = name + "id-";', { api: ["name"] });
    // Subtraction cannot be turned around.
    rejects("const left = total - used;", "const left = used - total;", { api: ["total", "used"] });
  });

  it("a comparison written from the other side", () => {
    accepts("const isBig = size > limit;", "const isBig = limit < size;", { api: ["size", "limit"] });
    accepts("const same = a === b;", "const same = b === a;", { api: ["a", "b"] });
    accepts("const isEmpty = !(count > 0);", "const isEmpty = !(0 < count);", { api: ["count"] });
  });

  it("== is never ===, and the message says why", () => {
    const message = rejects("const same = a === b;", "const same = a == b;", { api: ["a", "b"] });
    expect(message).toContain("converts the types");
    expect(rejects("const other = a !== b;", "const other = a != b;", { api: ["a", "b"] })).toContain("converts the types");
  });

  it("!= null is !== null only when the value can never be undefined", () => {
    // timer always holds null or an id, so the two checks are the same.
    accepts(["let timer = null;", "timer = setTimeout(run, 10);", "const busy = timer !== null;"].join("\n"), "let timer = null;\ntimer = setTimeout(run, 10);\nconst busy = timer != null;", { api: ["run"] });
    // value comes from outside, so it can be undefined: != null also catches that.
    const message = rejects("const has = value !== null;", "const has = value != null;", { api: ["value"] });
    expect(message).toContain("undefined");
  });

  it("a template string and a concatenation with the same parts", () => {
    accepts('const label = "Hello " + name + "!";', "const label = `Hello ${name}!`;", { api: ["name"] });
    accepts("const label = `Hello ${name}!`;", 'const label = "Hello " + name + "!";', { api: ["name"] });
    accepts("const key = `${a}-${b}`;", 'const key = a + "-" + b;', { api: ["a", "b"] });
    rejects("const label = `Hello ${name}!`;", "const label = `Hello ${name}?`;", { api: ["name"] });
    // 1 + 2 is added first, so this is not the same text.
    rejects("const text = `${a}${b}x`;", 'const text = a + b + "x";', { api: ["a", "b"] });
  });

  it("if/else or a ternary, for a simple return or assignment", () => {
    const returns = [
      "function sign(n) {\n  if (n < 0) {\n    return -1;\n  } else {\n    return 1;\n  }\n}",
      "function sign(n) {\n  if (n < 0) return -1;\n  return 1;\n}",
      "function sign(n) {\n  return n < 0 ? -1 : 1;\n}",
      "const sign = (n) => (n < 0 ? -1 : 1);",
    ];
    for (const reference of returns) for (const typed of returns) accepts(reference, typed, { api: ["sign"] });

    const assigns = [
      "let label;\nif (count === 1) {\n  label = \"item\";\n} else {\n  label = \"items\";\n}",
      'let label;\nif (count === 1) label = "item";\nelse label = "items";',
      'let label = count === 1 ? "item" : "items";',
      'const label = count === 1 ? "item" : "items";',
    ];
    for (const reference of assigns) for (const typed of assigns) accepts(reference, typed, { api: ["count"] });
  });

  it("a counting loop or for...of over the same array", () => {
    const loops = [
      "for (let i = 0; i < items.length; i++) {\n  total += items[i];\n}",
      "for (let i = 0; i < items.length; i += 1) {\n  const item = items[i];\n  total += item;\n}",
      "for (const item of items) {\n  total += item;\n}",
      "for (const item of items) total += item;",
    ];
    for (const reference of loops) for (const typed of loops) accepts(reference, typed, { api: ["items", "total"] });
    // When the position itself is used, a for...of cannot replace the loop.
    const message = rejects("for (let i = 0; i < items.length; i++) {\n  out.push(i + \": \" + items[i]);\n}", "for (const item of items) {\n  out.push(item);\n}", { api: ["items", "out"] });
    expect(message).toContain("no index");
  });

  it("decides the loop line at once, from what the full solution does with the counter", () => {
    // The loop only reads its item: the for...of line is a finished step, not "keep typing".
    const reads = tiny(["for (let i = 0; i < items.length; i++) {", "  total += items[i];", "}"], { api: ["items", "total"] });
    const line = verdictOf(reads, "for (const item of items) {");
    expect(line.kind).toBe("accept");
    if (line.kind === "accept") {
      expect(line.steps).toEqual([0]);
      // The reference writes the item `items[i]`. For this learner it is `item`.
      expect(line.names["items[i]"]).toBe("item");
      for (const name of Object.keys(line.names)) expect(name).not.toContain("#");
    }

    // The loop uses the position later: the for...of line is refused now, not two lines later.
    const needsIndex = tiny(["for (let i = 0; i < items.length; i++) {", '  out.push(i + ": " + items[i]);', "}"], { api: ["items", "out"] });
    const refused = verdictOf(needsIndex, "for (const item of items) {");
    expect(refused.kind).toBe("reject");
    if (refused.kind === "reject") expect(refused.message).toContain("no index");
    // The counting loop itself is fine in both.
    expect(verdictOf(needsIndex, "for (let k = 0; k < items.length; k++) {").kind).toBe("accept");
    expect(verdictOf(reads, "for (let k = 0; k < items.length; k += 1) {").kind).toBe("accept");
  });

  it("goes on after a for...of line, with the learner's name for the item", async () => {
    const session = await type(flatten, [
      "function flatten(list) {",
      "  const out = [];",
      "  for (const entry of list) {",
      "    if (Array.isArray(entry)) {",
    ]);
    expect(story(session).join("\n")).not.toContain("REJECT");
    expect(session.log.map((entry) => entry.verdict.kind)).toEqual(["accept", "accept", "accept", "accept"]);
  });

  it("shows the next lines with the learner's loop variable, only while that loop is open", async () => {
    const steps = flattenSteps(flatten);
    const start = ["function flatten(list) {", "  const out = [];", "  for (const entry of list) {"];
    const open = await type(flatten, start);
    // A line that is shown, or named in a hint, must be a line this learner can type.
    const shown = renameCode(steps[3].expected, open.state.names);
    expect(shown).toBe("    if (Array.isArray(entry)) {");
    expect(renameText(steps[3].hint1, open.state.names)).not.toContain("[i]");
    expect(changedNames(open.state.names)).toContainEqual({ expected: "arr[i]", mine: "entry" });

    // Typing every shown line to the end of the part is accepted, line by line.
    let session = open;
    const typed = [...start];
    for (let i = 3; i < steps.length && steps[i].partId === "recursive"; i++) {
      for (const line of renameCode(steps[i].expected, session.state.names).split("\n")) typed.push(line);
      session = await type(flatten, typed);
      expect(story(session).join("\n")).not.toContain("REJECT");
    }
    expect(session.state.done).toHaveLength(11);

    // The loop is closed now. In the next part `arr[i]` is a real index again.
    expect(Object.keys(session.state.names).filter((key) => key.includes("["))).toEqual([]);
    expect(renameCode(steps[13].expected, session.state.names)).toContain("stack.push(list[i]);");
  });

  it("a loop header is one step, also when the next line only gives the item a name", () => {
    // The reference names the item in its own step. The header alone must not stand for both.
    const withName = tiny(["for (let i = 0; i < text.length; i++) {", "  const ch = text[i];", "  out.push(ch);", "}"], { api: ["text", "out"] });
    const header = verdictOf(withName, "for (let i = 0; i < text.length; i++) {");
    expect(header.kind === "accept" ? header.steps : header.kind).toEqual([0]);
    // The naming line is then a step of its own, accepted as it is.
    const naming = verdictOf(withName, "  const ch = text[i];", 1);
    expect(naming.kind === "accept" ? naming.steps : naming.kind).toEqual([1]);
    // A for...of does both at once: the loop, and the name of the item.
    const forOf = verdictOf(withName, "for (const ch of text) {");
    expect(forOf.kind === "accept" ? forOf.steps : forOf.kind).toEqual([0, 1]);
  });

  it("keeps the names clean with a for...of inside a for...of", async () => {
    const session = await type(flatten, [
      "function flatten(list) {",
      "  const out = [];",
      "  for (const entry of list) {",
      "    if (Array.isArray(entry)) {",
      "      const inner = flatten(entry);",
      "      for (const value of inner) {",
      "        out.push(value);",
      "      }",
      "    } else {",
      "      out.push(entry);",
      "    }",
      "  }",
      "  return out;",
      "}",
    ]);
    expect(story(session).join("\n")).not.toContain("REJECT");
    expect(session.state.done).toHaveLength(11);
    // Every name on both sides is a real one.
    for (const [expected, mine] of Object.entries(session.state.names)) {
      expect(expected).toMatch(/^[A-Za-z_$][\w$]*$/);
      expect(mine).toMatch(/^[A-Za-z_$][\w$]*$/);
    }
    expect(session.state.names).toEqual({ flatten: "flatten", arr: "list", result: "out", inner: "inner" });
  });

  it("forgets the loop variable when the rest of the function is accepted by its tests", async () => {
    const session = await type(flatten, [
      "function flatten(list) {",
      "  const out = [];",
      "  for (const entry of list) {",
      // From here on in another way, and the tests pass.
      "    if (!Array.isArray(entry)) {\n      out.push(entry);\n      continue;\n    }\n    const inner = flatten(entry);\n    for (const value of inner) out.push(value);\n  }\n  return out;\n}",
    ]);
    const last = session.log[session.log.length - 1].verdict;
    expect(last.kind === "accept" ? last.via : story(session).join("\n")).toBe("tests");
    expect(Object.keys(session.state.names).filter((key) => key.includes("["))).toEqual([]);
  });

  it("an empty check: length === 0 or !length, as a condition and as a value", () => {
    const names = { api: ["stack"] };
    accepts("const empty = stack.length === 0;", "const empty = !stack.length;", names);
    accepts("const empty = !stack.length;", "const empty = stack.length === 0;", names);
    accepts("const empty = stack.length === 0;", "const empty = 0 === stack.length;", names);
    accepts("if (stack.length === 0) stack.push(1);", "if (!stack.length) stack.push(1);", names);
    // The loose operator is still another operator.
    expect(rejects("const empty = stack.length === 0;", "const empty = stack.length == 0;", names)).toContain("`==`");
    // And "not empty" is not "empty".
    rejects("const empty = stack.length === 0;", "const empty = stack.length !== 0;", names);
  });

  it("null or undefined: the two strict checks, or one loose check", () => {
    const names = { api: ["value"] };
    const forms = [
      "const missing = value === null || value === undefined;",
      "const missing = value === undefined || value === null;",
      "const missing = value == null;",
      "const missing = value == undefined;",
      "const missing = null == value;",
    ];
    for (const reference of forms) for (const typed of forms) accepts(reference, typed, names);
    accepts("const there = value !== null && value !== undefined;", "const there = value != null;", names);
    accepts("const there = value != null;", "const there = value !== undefined && value !== null;", names);
    // Only one of the two is another check, and the message says what it lets through.
    expect(rejects(forms[0], "const missing = value === null;", names)).toContain("undefined");
    // "and" in place of "or" is never true.
    rejects(forms[0], "const missing = value === null && value === undefined;", names);
    // Two different things compared is not one check.
    rejects("const missing = a === null || a === undefined;", "const missing = a === null || b === undefined;", { api: ["a", "b"] });
  });

  it("call with the arguments one by one, or apply with them in a list", () => {
    const names = { api: ["fn", "context", "first", "second", "a", "b", "list"] };
    accepts("fn.apply(context, [...first, ...second]);", "fn.call(context, ...first, ...second);", names);
    accepts("fn.call(context, ...first, ...second);", "fn.apply(context, [...first, ...second]);", names);
    accepts("fn.call(context, a, b);", "fn.apply(context, [a, b]);", names);
    accepts("fn.apply(context, list);", "fn.call(context, ...list);", names);
    accepts("fn.apply(context, list);", "fn.apply(context, [...list]);", names);
    // The order of the arguments still counts, and so does the first one.
    rejects("fn.call(context, a, b);", "fn.call(context, b, a);", names);
    rejects("fn.apply(context, [a, b]);", "fn.apply(a, [context, b]);", names);
    // A list is one argument for call, and many for apply.
    rejects("fn.apply(context, list);", "fn.call(context, list);", names);
  });

  it("the bigger or the smaller of two: a ternary, an if, or Math.max and Math.min", () => {
    const names = { api: ["a", "b", "best", "value"] };
    const bigger = [
      "const top = a > b ? a : b;",
      "const top = b > a ? b : a;",
      "const top = a < b ? b : a;",
      "const top = a >= b ? a : b;",
      "const top = Math.max(a, b);",
      "const top = Math.max(b, a);",
    ];
    for (const reference of bigger) for (const typed of bigger) accepts(reference, typed, names);
    const smaller = ["const low = a < b ? a : b;", "const low = b > a ? a : b;", "const low = Math.min(a, b);"];
    for (const reference of smaller) for (const typed of smaller) accepts(reference, typed, names);
    // The other one of the two is the other answer, and the message says which.
    expect(rejects("const top = a > b ? a : b;", "const top = Math.min(a, b);", names)).toContain("smaller");
    expect(rejects("const low = Math.min(a, b);", "const low = a > b ? a : b;", names)).toContain("bigger");

    // The same with an if that keeps the best value seen so far.
    const keep = ["if (value > best) best = value;", "if (value > best) {\n  best = value;\n}", "best = Math.max(best, value);", "best = value > best ? value : best;"];
    for (const reference of keep) for (const typed of keep) accepts("let best = 0;\n" + reference, "let best = 0;\n" + typed, { api: ["value"] });
    // An if that does something else stays an if.
    rejects("let best = 0;\nif (value > best) best = value;", "let best = 0;\nif (value > best) best = 1;", { api: ["value"] });
    // With a call inside, the ternary runs it twice and Math.max once: not the same.
    rejects("const top = Math.max(read(), b);", "const top = read() > b ? read() : b;", { api: ["read", "b"] });
  });

  it("an if that is still open is not taken for a finished one", () => {
    // The reference block has two lines. After the first one the learner is half way, not wrong.
    const two = tiny(["let best = 0;", "if (value > best) {", "  best = value;", "  count++;", "}"], { api: ["value", "count"] });
    const half = verdictOf(two, "  best = value;", 2);
    expect(half.kind === "accept" ? half.steps : half.kind).toEqual([2]);
    // And the block typed whole, with both lines, is accepted in one go.
    const whole = verdictOf(two, "if (value > best) {\n  best = value;\n  count++;\n}", 1);
    expect(whole.kind === "accept" ? whole.steps : whole.kind).toEqual([1, 2, 3, 4]);
    // Closing it after one line is wrong: a line is missing.
    expect(verdictOf(two, "if (value > best) {\n  best = value;\n}", 1).kind).toBe("reject");
  });

  it("destructuring or property access with the same result", () => {
    accepts("const { name, age } = user;", "const name = user.name;\nconst age = user.age;", { api: ["user"] });
    accepts("const name = user.name;\nconst age = user.age;", "const { name, age } = user;", { api: ["user"] });
    accepts("const [first, second] = pair;", "const first = pair[0];\nconst second = pair[1];", { api: ["pair"] });
    accepts("const { name: label } = user;", "const label = user.name;", { api: ["user"] });
    rejects("const { name, age } = user;", "const name = user.name;\nconst age = user.years;", { api: ["user"] });
  });

  it("smaller things: obj[\"key\"], { a }, call with spread, length as a condition, two declarations in one line", () => {
    accepts("const name = user.name;", 'const name = user["name"];', { api: ["user"] });
    accepts("const point = { x: x, y: y };", "const point = { x, y };", { api: ["x", "y"] });
    accepts("fn.apply(this, args);", "fn.call(this, ...args);", { api: ["fn", "args"] });
    for (const typed of ["while (stack.length > 0) {", "while (stack.length) {", "while (stack.length !== 0) {", "while (0 < stack.length) {"]) {
      accepts("while (stack.length > 0) {", typed, { api: ["stack"] });
    }
    accepts("if (list.length === 0) return;", "if (!list.length) return;", { api: ["list"] });
    accepts("let low = 0;\nlet high = 9;", "let low = 0, high = 9;");
    accepts("const ok = !(a === b);", "const ok = a !== b;", { api: ["a", "b"] });
  });
});

describe("layer 3: name freedom", () => {
  it("any names for variables and parameters, with the map kept for later sentences", () => {
    const first = verdictOf(memoize, "function memoize(slowFunction) {");
    expect(first.kind).toBe("accept");
    if (first.kind === "accept") expect(first.names).toMatchObject({ memoize: "memoize", fn: "slowFunction" });
  });

  it("a name of the required API cannot change, and the message says why", () => {
    const verdict = verdictOf(debounce, "function debouncer(fn, delay) {");
    expect(verdict.kind === "reject" ? verdict.message : "").toBe("Call it `debounce`. The tests use this name, so it cannot change.");
  });

  it("a name must be used the same way everywhere", () => {
    // timer was declared as timer: another word here is a name nobody declared.
    const verdict = verdictOf(debounce, "clearTimeout(timr);", 3);
    expect(verdict.kind === "reject" ? verdict.message : "").toBe("`timr` is not defined at this point.");
    // delay is a real name, but it is the wrong one here.
    const wrong = verdictOf(debounce, "clearTimeout(delay);", 3);
    expect(wrong.kind === "reject" ? wrong.message : "").toBe("`delay` is not the value we need here.");
  });

  it("the same name in two separate scopes is fine", () => {
    accepts("for (let i = 0; i < 3; i++) {\n  a.push(i);\n}\nfor (let j = 0; j < 3; j++) {\n  b.push(j);\n}", "for (let k = 0; k < 3; k++) {\n  a.push(k);\n}\nfor (let k = 0; k < 3; k++) {\n  b.push(k);\n}", { api: ["a", "b"] });
  });

  it("property names and built-in names are not variables: they must be exact", () => {
    rejects("const size = list.length;", "const size = list.size;", { api: ["list"] });
    rejects("const cache = new Map();", "const cache = new Set();");
  });

  it("renames the code terms of a sentence, and nothing else", () => {
    const names = { timer: "timeoutId", fn: "callback", args: "params" };
    expect(renameText("Give `timer` to the function. The timer waits.", names)).toBe("Give `timeoutId` to the function. The timer waits.");
    expect(renameCode("      fn.apply(this, args);", names)).toBe("      callback.apply(this, params);");
    // A property and an object key keep their name.
    expect(renameCode("box.timer = { timer: timer };", names)).toBe("box.timer = { timer: timeoutId };");
    expect(renameCode("const text = `${fn} and fn`;", names)).toBe("const text = `${callback} and fn`;");
    expect(changedNames({ a: "a", fn: "callback" })).toEqual([{ expected: "fn", mine: "callback" }]);
  });
});

describe("several steps at once, and half a step", () => {
  it("takes as many steps as the text covers", () => {
    const three = verdictOf(memoize, "function memoize(fn) {\n  const cache = new Map();\n  return function (...args) {");
    expect(three.kind === "accept" ? three.steps : three.kind).toEqual([0, 1, 2]);
    const oneLineIf = verdictOf(memoize, "if (cache.has(key)) return cache.get(key);", 4);
    expect(oneLineIf.kind === "accept" ? oneLineIf.steps : oneLineIf.kind).toEqual([4, 5]);
  });

  it("says 'right so far' for an unfinished step, and does not count it as wrong", () => {
    for (const [typed, done] of [
      ["clearTimeout(", 3],
      ["clearTimeout(timer", 3],
      ["timer = setTimeout(() =>", 4],
      ["timer = setTimeout(", 4],
      ["timer =", 4],
      ["};", 7],
    ] as const) {
      expect(verdictOf(debounce, typed, done).kind, typed).toBe("partial");
    }
    expect(verdictOf(memoize, "const cache =", 1).kind).toBe("partial");
    expect(verdictOf(memoize, "const cache = new", 1).kind).toBe("partial");
    expect(verdictOf(memoize, "if (cache.has(key))", 4).kind).toBe("partial");
    expect(verdictOf(memoize, "return cache.get(key);", 5).kind).toBe("partial");
    // "}" alone, where the step is "} else {".
    expect(verdictOf(flatten, "}", 7).kind).toBe("partial");
  });

  it("but a half step that is already wrong is refused", () => {
    expect(verdictOf(debounce, "clearInterval(", 3).kind).toBe("reject");
    expect(verdictOf(memoize, "const cache = new Set", 1).kind).toBe("reject");
  });
});

describe("steps in an order group can be written in any order", () => {
  const problem = tiny([
    "function area() {",
    { expected: "  const width = 4;", order: "sizes" },
    { expected: "  const height = 3;", order: "sizes" },
    "  return width * height;",
    "}",
  ], { api: ["area"] });

  it("in the order of the reference, or the other way round", async () => {
    const straight = await type(problem, ["function area() {", "const width = 4;", "const height = 3;", "return width * height;", "}"]);
    expect(straight.finished, story(straight).join("\n")).toBe(true);
    const turned = await type(problem, ["function area() {", "const h = 3;", "const w = 4;", "return w * h;", "}"]);
    expect(turned.finished, story(turned).join("\n")).toBe(true);
    expect(turned.state.done).toEqual([0, 2, 1, 3, 4]);
    expect(turned.state.names).toMatchObject({ width: "w", height: "h" });
  });

  it("a step outside the group still has its place", async () => {
    const early = await type(problem, ["function area() {", "return 12;"]);
    expect(early.finished).toBe(false);
    expect(story(early).pop()).toContain("REJECT");
  });
});

describe("layer 5: banned patterns are refused with the reason", () => {
  it("array helpers in a plain-loop problem, even when the result would be right", async () => {
    const pasted = await check(flatten, EMPTY_STATE, "function flatten(arr) {\n  return arr.flat(Infinity);\n}", deps);
    expect(pasted.kind).toBe("reject");
    if (pasted.kind === "reject") {
      expect(pasted.reason).toBe("banned");
      expect(pasted.message).toContain("You used `flat`");
      expect(pasted.message).toContain("write the loop by hand");
      // The mark is on the word flat.
      expect("function flatten(arr) {\n  return arr.flat(Infinity);\n}".slice(pasted.range!.start, pasted.range!.end)).toBe("flat");
    }
    for (const helper of ["map", "filter", "reduce", "forEach", "sort"]) {
      const verdict = verdictOf(flatten, "arr." + helper + "((item) => result.push(item));", 2);
      expect(verdict.kind === "reject" ? verdict.message : verdict.kind, helper).toContain("You used `" + helper + "`");
    }
  });

  it("is not triggered by a method with another name, or where helpers are allowed", () => {
    expect(verdictOf(flatten, "result.push(arr[i]);", 8).kind).toBe("accept");
    accepts("const doubled = list.map((x) => x * 2);", "const doubled = list.map(x => x * 2);", { api: ["list"] });
  });
});

describe("a chain of calls written over several lines", () => {
  const chain = tiny(
    ["function load(url) {", "  return fetch(url)", "    .then((res) => {", "      return res.json();", "    })\n    .catch(report);", "}"],
    { api: ["load", "report"] },
  );

  it("is right so far after each line, and accepted at the end of its step", async () => {
    const session = await type(chain, [
      "function load(url) {",
      "  return fetch(url)",
      "    .then((res) => {",
      "      return res.json();",
      "    })",
      "    .catch(report);",
      "}",
    ]);
    expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
    expect(session.finished).toBe(true);
    // The closing "})" alone is the first line of a step of two lines: not finished, not wrong.
    expect(session.log[4].verdict.kind).toBe("partial");
  });

  it("is wrong when the statement is closed too early, or the chain goes another way", async () => {
    const start = ["function load(url) {", "  return fetch(url)", "    .then((res) => {", "      return res.json();"];
    // A semicolon ends the statement: the .catch can no longer come.
    const closed = await type(chain, [...start, "    });"]);
    expect(closed.log[4].verdict.kind).toBe("reject");
    // Another method is not the start of this chain.
    const other = await type(chain, [...start, "    })", "    .finally(report);"]);
    expect(other.log[other.log.length - 1].verdict.kind).toBe("reject");
  });
});

describe("a wrong line gets a message about the first wrong part", () => {
  it("calling a function where the function itself is wanted", () => {
    expect(rejects("setTimeout(run, 100);", "setTimeout(run(), 100);", { api: ["run"] })).toBe(
      "This runs `run` now. Pass the function itself, without ().",
    );
    expect(rejects("const id = start();", "const id = start;", { api: ["start"] })).toContain("not called");
    // One parameter where a rest parameter is wanted.
    expect(rejects("return function (...args) {", "return function (args) {")).toBe(
      "This takes one value only. Here it must collect all of them: put `...` in front of the name.",
    );
    // A call where a callback is wanted.
    expect(rejects("setTimeout(() => run(1), 100);", "setTimeout(run(1), 100);", { api: ["run"] })).toBe(
      "This runs `run` now and passes its result. This step needs a function here, to run later.",
    );
  });

  it("a method that changes the array", () => {
    expect(rejects("const next = list.concat(item);", "const next = list.push(item);", { api: ["list", "item"] })).toBe(
      "You used `push`, which changes the original array.",
    );
  });

  it("new, return, arguments and operators", () => {
    expect(rejects("const cache = new Map();", "const cache = Map();")).toContain("Create it with `new`");
    expect(rejects("function id(x) {\n  return x;\n}", "function id(x) {\n  x;\n}", { api: ["id"] })).toContain("not returned");
    const noDelay = verdictOf(debounce, "});", 6);
    expect(noDelay.kind === "reject" ? noDelay.message : noDelay.kind).toBe("This call needs one more argument.");
    const tooFar = verdictOf(flatten, "for (let i = 0; i <= arr.length; i++) {", 2);
    expect(tooFar.kind === "reject" ? tooFar.message : tooFar.kind).toContain("one step past the end");
    expect(rejects("let total = 0;", "var total = 0;")).toContain("`var` ignores block scope");
    const interval = verdictOf(debounce, "timer = setInterval(() => {", 4);
    expect(interval.kind === "reject" ? interval.message : interval.kind).toContain("repeats again and again");
  });

  it("marks the wrong part inside what was typed", () => {
    const typed = "clearTimeout(delay);";
    const verdict = verdictOf(debounce, typed, 3);
    expect(verdict.kind).toBe("reject");
    if (verdict.kind === "reject") expect(typed.slice(verdict.range!.start, verdict.range!.end)).toBe("delay");
  });

  it("syntax problems are said in plain words", () => {
    const extra = verdictOf(debounce, "clearTimeout(timer));", 3);
    expect(extra.kind === "reject" ? extra.message : extra.kind).toContain("There is an extra )");
    const quote = verdictOf(memoize, 'const key = "abc;', 3);
    expect(quote.kind === "reject" ? quote.message : quote.kind).toContain("closing quote is missing");
  });
});

describe("layer 4: a finished function that passes its tests is accepted", () => {
  it("and a finished function that fails them is refused, with the test that failed", async () => {
    const wrong = await check(
      memoize,
      EMPTY_STATE,
      "function memoize(fn) {\n  const cache = {};\n  return function (...args) {\n    const key = args[0];\n    if (cache[key]) return cache[key];\n    cache[key] = fn.apply(this, args);\n    return cache[key];\n  };\n}",
      deps,
    );
    expect(wrong.kind).toBe("reject");
    if (wrong.kind === "reject") {
      expect(wrong.reason).toBe("tests");
      expect(wrong.tests!.passed).toBeLessThan(wrong.tests!.total);
      expect(wrong.tests!.failures.length).toBeGreaterThan(0);
    }
  });

  it("an endless loop does not hang the check", async () => {
    const verdict = await check(flatten, EMPTY_STATE, "function flatten(arr) {\n  while (true) {}\n}", deps);
    expect(verdict.kind).toBe("reject");
  });
});

describe("layer 6: the optional AI judge", () => {
  const ask = async () => ({ equivalent: true, reason: "0 works as an empty timer id too." });

  it("is asked only when the other layers cannot decide, and its line does not break the lines after it", async () => {
    const questions: unknown[] = [];
    const judge = async (question: unknown) => {
      questions.push(question);
      return ask();
    };
    // Lines 1 to 3 match, so nobody is asked. Line 4 is odd but harmless: the judge says yes.
    const session = await type(
      debounce,
      ["function debounce(fn, wait) {", "let id;", "return function (...rest) {", "window.clearTimeout(id);", "id = setTimeout(() => {", "fn.apply(this, rest);", "}, wait);", "};", "}"],
      { judge },
    );
    expect(session.finished, story(session).join("\n")).toBe(true);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toEqual({
      line: "window.clearTimeout(id);",
      // The expected line is shown with the learner's own names.
      expected: "    clearTimeout(id);",
      codeSoFar: "function debounce(fn, wait) {\nlet id;\nreturn function (...rest) {",
    });
    const judged = session.log[3].verdict;
    expect(judged.kind === "accept" ? [judged.via, judged.note] : judged.kind).toEqual(["judge", "0 works as an empty timer id too."]);
    // The learner's own line stays in their code.
    expect(session.state.code.main).toContain("window.clearTimeout(id);");
  });

  it("learns the name that a judged line declares, so the lines after it can use it", async () => {
    const judge = async () => ({ equivalent: true, reason: "Joining the arguments gives a usable key here." });
    const session = await type(
      memoize,
      [
        "function memoize(fn) {",
        "const cache = new Map();",
        "return function (...args) {",
        // Not the same as JSON.stringify, so only the judge can say yes. It declares `id`, not `key`.
        'const id = args.join("|");',
        "if (cache.has(id)) {",
        "return cache.get(id);",
        "}",
      ],
      { judge },
    );
    expect(story(session).join("\n")).not.toContain("REJECT");
    expect(session.log[3].verdict.kind === "accept" ? session.log[3].verdict.via : "").toBe("judge");
    expect(session.state.names.key).toBe("id");
    // The learner's own line is kept, and the coach now says `id`.
    expect(session.state.code.main).toContain('const id = args.join("|");');
    expect(renameText("Look up `key` in the cache.", session.state.names)).toBe("Look up `id` in the cache.");
  });

  it("a no from the judge is a refusal with its reason, and no judge means the normal refusal", async () => {
    const no = await check(debounce, EMPTY_STATE, "function debounce(fn) {", { ...deps, judge: async () => ({ equivalent: false, reason: "The delay is missing." }) });
    expect(no.kind === "reject" ? no.judge : no.kind).toBe("The delay is missing.");
    const failed = await check(debounce, EMPTY_STATE, "function debounce(fn) {", { ...deps, judge: async () => null });
    expect(failed.kind === "reject" ? [failed.judge, failed.reason] : failed.kind).toEqual([null, "different"]);
    const none = await check(debounce, EMPTY_STATE, "function debounce(fn) {", deps);
    expect(none.kind).toBe("reject");
  });

  it("is never asked about a banned pattern or a syntax error", async () => {
    let asked = 0;
    const judge = async () => {
      asked++;
      return ask();
    };
    await check(flatten, EMPTY_STATE, "function flatten(arr) { return arr.flat(); }", { ...deps, judge });
    await check(flatten, EMPTY_STATE, "function flatten(arr)) {", { ...deps, judge });
    expect(asked).toBe(0);
  });
});
