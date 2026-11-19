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
expect(getName.myCall(user)).toBe("Islam");`,
  },
  {
    id: "passes-arguments",
    name: "passes the arguments one by one",
    code: `
const fn = spy();
fn.myCall({}, 1, "two", [3]);
expect(fn.calls, "calls to the function").toEqual([[1, "two", [3]]]);`,
  },
  {
    id: "return-value",
    name: "returns what the function returns",
    code: `
function add(a, b) {
  return this.base + a + b;
}
expect(add.myCall({ base: 10 }, 1, 2)).toBe(13);`,
  },
  {
    id: "no-arguments",
    name: "works with no arguments",
    code: `
const fn = spy(() => "done");
expect(fn.myCall({})).toBe("done");
expect(fn.calls, "calls to the function").toEqual([[]]);`,
  },
  {
    id: "temporary-property",
    name: "edge case: the object does not keep the temporary property",
    code: `
const user = { name: "Islam" };
let keysDuringCall = [];
function look() {
  keysDuringCall = Object.keys(this);
}
look.myCall(user);
expect(keysDuringCall, "Object.keys(this) during the call").toEqual(["name"]);
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
expect(getThis.myCall(null), "this for null").toBe(globalThis);
expect(getThis.myCall(undefined), "this for undefined").toBe(globalThis);`,
  },
  {
    id: "primitive-context",
    name: "edge case: context is a primitive",
    code: `
function describe() {
  return typeof this + ":" + this.valueOf();
}
expect(describe.myCall(5)).toBe("object:5");
expect(describe.myCall("a")).toBe("object:a");`,
  },
  {
    id: "later-calls",
    name: "does not change the function for later calls",
    code: `
function getName() {
  return this.name;
}
getName.myCall({ name: "first" });
const other = { name: "second", getName };
expect(other.getName()).toBe("second");`,
  },
];

export const functionCall: CodeProblem = {
  id: "function-call",
  kind: "code",
  group: "polyfills",
  title: "Polyfill: Function.prototype.call",
  difficulty: "medium",
  tag: "polyfill",
  language: "js",
  api: [],
  plainLoops: true,
  statement:
    "Write your own call, as Function.prototype.myCall. Do not use call, apply or bind inside it.",
  examples: [
    'const user = { name: "Islam" };',
    "function greet(greeting) {",
    '  return greeting + ", " + this.name;',
    "}",
    'greet.myCall(user, "Hello"); // "Hello, Islam"',
  ],
  askFirst: [
    "What should happen when the context is null or undefined?",
    "Can I use the spread operator?",
    "Can the context be a primitive, like a number?",
  ],
  edgeCases: [
    "context is null or undefined: use the global object",
    "context is a primitive like 5",
    "The object must not keep the temporary property",
  ],
  parts: [
    {
      id: "main",
      title: "myCall",
      signature: "Function.prototype.myCall(context, ...args)",
      steps: [
        line("Function.prototype.myCall = function (context, ...args) {", {
          coach:
            "Let's start, Islam. We need a method on all functions that takes the `this` value we want, and then the arguments one by one.",
          hint1:
            "Assign a regular `function` to `Function.prototype.myCall`. After the first parameter, use a rest parameter to collect the arguments.",
          explain: "myCall takes the this value first, and then the arguments one by one.",
        }),
        line("  const target = context === null || context === undefined ? globalThis : Object(context);", {
          coach:
            "The idea is to put the function on an object and call it from there, so we need a real object. For `null` or `undefined` we take the global object, and any other value we turn into an object.",
          hint1: "A ternary: if `context` is `null` or `undefined`, use `globalThis`. If not, wrap it with `Object`.",
          explain:
            "I need an object to call the function on, so I use the global object for null or undefined, and Object(context) for any other value.",
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
            "Now we call the function from the object with the arguments, and keep its answer. A function that is called as a method gets that object as `this`.",
          hint1: "Call `target[key]` like a method and spread `args` into the call. Keep the answer in a variable.",
          explain: "Calling the function as a method makes this the object.",
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
      question: "Why a Symbol and not a name like 'fn'?",
      answer: "The object may already have a property called fn. A new Symbol can never clash.",
    },
    {
      question: "What is the difference between call and apply?",
      answer: "call takes the arguments one by one. apply takes them as one array.",
    },
  ],
};
