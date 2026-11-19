import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "given-this",
    name: "calls the function with the given this",
    code: `
const user = { name: "Islam" };
function getName() {
  return this.name;
}
expect(getName.myApply(user)).toBe("Islam");`,
  },
  {
    id: "spreads-array",
    name: "spreads the array into separate arguments",
    code: `
const fn = spy();
fn.myApply({}, [1, "two", [3]]);
expect(fn.calls, "calls to the function").toEqual([[1, "two", [3]]]);`,
  },
  {
    id: "return-value",
    name: "returns what the function returns",
    code: `
function add(a, b) {
  return this.base + a + b;
}
expect(add.myApply({ base: 10 }, [1, 2])).toBe(13);`,
  },
  {
    id: "same-array",
    name: "does not change the array it was given",
    code: `
const args = [3, 1, 2];
function first(a) {
  return a;
}
expect(first.myApply(null, args)).toBe(3);
expect(args, "the array after the call").toEqual([3, 1, 2]);`,
  },
  {
    id: "missing-array",
    name: "edge case: the array of arguments is missing",
    code: `
const fn = spy(() => "done");
expect(fn.myApply({})).toBe("done");
expect(fn.calls, "calls to the function").toEqual([[]]);`,
  },
  {
    id: "temporary-property",
    name: "edge case: the object does not keep the temporary property",
    code: `
const user = { name: "Islam" };
function look() {
  return Object.keys(this);
}
expect(look.myApply(user), "Object.keys(this) during the call").toEqual(["name"]);
expect(Object.keys(user), "keys after the call").toEqual(["name"]);
expect(Object.getOwnPropertySymbols(user).length, "symbols left on the object").toBe(0);`,
  },
  {
    id: "null-context",
    name: "edge case: context is null or undefined",
    code: `
function getThis() {
  return this;
}
expect(getThis.myApply(null, []), "this for null").toBe(globalThis);
expect(getThis.myApply(undefined, []), "this for undefined").toBe(globalThis);`,
  },
  {
    id: "math-max",
    name: "works like Math.max over an array",
    code: `expect(Math.max.myApply(null, [3, 9, 2])).toBe(9);`,
  },
];

export const functionApply: CodeProblem = {
  id: "function-apply",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Function.prototype.apply",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: [],
  plainLoops: true,
  statement:
    "Write your own apply, as Function.prototype.myApply. Do not use call, apply or bind inside it.",
  examples: [
    "function add(a, b) {",
    "  return this.base + a + b;",
    "}",
    "add.myApply({ base: 10 }, [1, 2]); // 13",
  ],
  askFirst: [
    "What should happen when the context is null or undefined?",
    "What if no array of arguments is passed?",
    "Can I use the spread operator?",
  ],
  edgeCases: [
    "context is null or undefined: use the global object",
    "The array of arguments is missing",
    "The object must not keep the temporary property",
  ],
  parts: [
    {
      id: "main",
      title: "myApply",
      signature: "Function.prototype.myApply(context, args)",
      steps: [
        line("Function.prototype.myApply = function (context, args = []) {", {
          coach:
            "Let's start, Islam. We need a method on all functions that takes the `this` value and all the arguments in one array, and the array may be missing.",
          hint1:
            "Assign a regular `function` to `Function.prototype.myApply`. Give the second parameter a default value, an empty array.",
          explain: "myApply takes the this value and one array of arguments, which defaults to an empty array.",
        }),
        line("  const target = context === null || context === undefined ? globalThis : Object(context);", {
          coach:
            "We will call the function as a method of an object, so we need a real object first. For `null` or `undefined` we take the global object, and any other value we turn into an object.",
          hint1: "A ternary: if `context` is `null` or `undefined`, use `globalThis`. If not, wrap it with `Object`.",
          explain:
            "I need an object to call the function on: the global one for null or undefined, and Object(context) for primitives.",
        }),
        line("  const key = Symbol();", {
          coach: "We need a temporary property name that cannot be the same as any name the object already has.",
          hint1: "A `Symbol` is always unique. Create one and keep it in a variable.",
          explain: "A new Symbol is a unique key, so it cannot clash with a property the object already has.",
          accept: ['  const key = Symbol("fn");'],
        }),
        line("  target[key] = this;", {
          coach: "Inside this method, `this` is the function we want to call. We put it on the object under the temporary name.",
          hint1: "Assign `this` to a property of `target`. Use square brackets, because the name is in a variable.",
          explain: "I put the function on the object under that key.",
        }),
        line("  const result = target[key](...args);", {
          coach:
            "We call the function from the object and keep its answer. The function expects separate arguments, so we must pass the items of the array one by one.",
          hint1: "Call `target[key]` like a method and use the spread syntax on `args`. Keep the answer in a variable.",
          explain: "I call the function as a method and spread the array into separate arguments.",
        }),
        line("  delete target[key];", {
          coach: "Now the cleanup. The object must look the same as before, so we remove the temporary property.",
          hint1: "The `delete` operator removes a property from an object.",
          explain: "Then I remove the temporary property, so the object is left as it was.",
        }),
        line("  return result;\n};", {
          coach:
            "The caller needs the answer of the function, so we give it back and close the method, with a semicolon because this is an assignment. Two lines.",
          hint1: "`return` the saved answer. Then a closing brace with a semicolon after it.",
          explain: "At the end I return what the function returned.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1), plus the call itself.",
  followUps: [
    {
      question: "What is the difference between call and apply?",
      answer: "call takes the arguments one by one. apply takes them as one array.",
    },
    {
      question: "When was apply useful before the spread operator?",
      answer: "To pass an array as separate arguments, like Math.max.apply(null, numbers).",
    },
  ],
};
