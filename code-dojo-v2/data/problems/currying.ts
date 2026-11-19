import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "add-two-calls",
    name: "add: add(3)(4) returns 7",
    part: "add",
    code: `expect(add(3)(4)).toBe(7);`,
  },
  {
    id: "add-returns-function",
    name: "add: the first call returns a function",
    part: "add",
    code: `expect(typeof add(3), "typeof add(3)").toBe("function");`,
  },
  {
    id: "add-negative-zero",
    name: "add: negative numbers and zero",
    part: "add",
    code: `
expect(add(-1)(1)).toBe(0);
expect(add(0)(0)).toBe(0);
expect(add(-2)(-3)).toBe(-5);`,
  },
  {
    id: "add-reuse",
    name: "add: the first call can be used many times",
    part: "add",
    code: `
const addFive = add(5);
expect(addFive(1)).toBe(6);
expect(addFive(10)).toBe(15);`,
  },
  {
    id: "sum-chain",
    name: "sum: sum(1)(2)(3)() returns 6",
    part: "sum",
    code: `expect(sum(1)(2)(3)()).toBe(6);`,
  },
  {
    id: "sum-one-number",
    name: "sum: edge case: one number, then the empty call",
    part: "sum",
    code: `expect(sum(5)()).toBe(5);`,
  },
  {
    id: "sum-long-chain",
    name: "sum: a long chain and negative numbers",
    part: "sum",
    code: `
expect(sum(1)(1)(1)(1)(1)(1)()).toBe(6);
expect(sum(-2)(2)(-5)()).toBe(-5);`,
  },
  {
    id: "sum-zero",
    name: "sum: zero is a number, not the end of the chain",
    part: "sum",
    code: `expect(sum(1)(0)(2)()).toBe(3);`,
  },
  {
    id: "sum-reuse",
    name: "sum: a chain can go on from the middle more than once",
    part: "sum",
    code: `
const three = sum(1)(2);
expect(three(3)()).toBe(6);
expect(three(10)()).toBe(13);`,
  },
  {
    id: "curry-one-at-a-time",
    name: "curry: one argument at a time",
    part: "curry",
    code: `
const addThree = curry((a, b, c) => a + b + c);
expect(addThree(1)(2)(3)).toBe(6);`,
  },
  {
    id: "curry-grouped",
    name: "curry: the arguments can be grouped in any way",
    part: "curry",
    code: `
const addThree = curry((a, b, c) => a + b + c);
expect(addThree(1, 2)(3)).toBe(6);
expect(addThree(1)(2, 3)).toBe(6);
expect(addThree(1, 2, 3)).toBe(6);`,
  },
  {
    id: "curry-waits",
    name: "curry: does not call fn before it has all the arguments",
    part: "curry",
    code: `
const calls = [];
const record = curry((a, b, c) => {
  calls.push([a, b, c]);
  return "done";
});
const waiting = record("a")("b");
expect(calls, "calls after two arguments").toEqual([]);
expect(waiting("c")).toBe("done");
expect(calls, "calls after three arguments").toEqual([["a", "b", "c"]]);`,
  },
  {
    id: "curry-no-argument",
    name: "curry: edge case: called with no argument",
    part: "curry",
    code: `
const addThree = curry((a, b, c) => a + b + c);
expect(addThree()(1)()(2)(3)).toBe(6);`,
  },
  {
    id: "curry-extra-arguments",
    name: "curry: edge case: more arguments than the function needs",
    part: "curry",
    code: `
const received = [];
const addTwo = curry(function (a, b) {
  received.push(arguments.length);
  return a + b;
});
expect(addTwo(1, 2, 99)).toBe(3);
expect(received, "number of arguments fn got").toEqual([3]);`,
  },
  {
    id: "curry-reuse",
    name: "curry: a partly filled function can be used many times",
    part: "curry",
    code: `
const addThree = curry((a, b, c) => a + b + c);
const addOne = addThree(1);
expect(addOne(2)(3)).toBe(6);
expect(addOne(10)(20)).toBe(31);`,
  },
  {
    id: "curry-no-parameters",
    name: "curry: a function with no parameters is called at once",
    part: "curry",
    code: `expect(curry(() => "now")()).toBe("now");`,
  },
];

function idsOf(part: string): string[] {
  const out: string[] = [];
  for (const test of tests) {
    if (test.part === part) out.push(test.id);
  }
  return out;
}

export const currying: CodeProblem = {
  id: "currying",
  kind: "code",
  group: "most-repeated",
  title: "Currying: add(3)(4)",
  difficulty: "medium",
  tag: "reported",
  language: "js",
  api: ["add", "sum", "curry"],
  plainLoops: true,
  statement: "Make add(3)(4) return 7. Then make it work for any number of calls.",
  examples: [
    "add(3)(4); // 7",
    "sum(1)(2)(3)(); // 6",
    "",
    "const addThree = curry((a, b, c) => a + b + c);",
    "addThree(1)(2)(3); // 6",
  ],
  askFirst: ["Is it always two calls, or any number?", "How do I know the chain is finished: an empty call?"],
  edgeCases: ["Called with no argument", "More arguments than the function needs"],
  parts: [
    {
      id: "add",
      title: "Two calls: add(3)(4)",
      signature: "add(a)(b)",
      steps: [
        line("function add(a) {", {
          coach: "Let's start, Islam. The first call gets only the first number, so we need a function with one parameter.",
          hint1: "Declare a function called `add` with one parameter.",
          explain: "add takes the first number.",
        }),
        line("  return function (b) {", {
          coach: "The second number comes in a second call, so we give back another function that waits for it.",
          hint1: "Return a function that has one parameter of its own.",
          explain: "I return a function, so the result of the first call can be called again with the second number.",
        }),
        line("    return a + b;", {
          coach: "Now both numbers are known, so the answer can go back to the caller.",
          hint1: "`return` the two numbers added together.",
          explain: "The inner function still sees a through the closure, so it returns the sum.",
        }),
        line("  };\n}", {
          coach: "Last, we close the inner function, and then the outer function. Two lines.",
          hint1: "One line with a closing brace and a semicolon, then one line with a closing brace.",
          explain: "The inner function ends first, and then add ends.",
          checks: idsOf("add"),
        }),
      ],
    },
    {
      id: "sum",
      title: "Any number of calls: sum(1)(2)(3)()",
      signature: "sum(a)(b)()",
      steps: [
        line("function sum(a) {", {
          coach:
            "Now the second version, which works for any number of calls and gives the total on an empty call. It starts the same way, with a new name.",
          hint1: "Declare a function called `sum` with one parameter.",
          explain: "sum takes the total so far.",
        }),
        line("  return function (b) {", {
          coach: "The chain must be able to go on, so the result of a call must be something we can call again.",
          hint1: "Return a function that has one parameter of its own.",
          explain: "I return a function that takes the next number.",
        }),
        line("    if (b === undefined) return a;", {
          coach: "We need a way to know that the chain is finished. An empty call is the sign, and then we give back the total.",
          hint1: "In an empty call the parameter is `undefined`. Check for that, and `return` the total.",
          explain: "When b is undefined the call was empty, so I return the total.",
        }),
        line("    return sum(a + b);", {
          coach: "If a number came, the chain goes on. We need a new function that remembers the new total and waits for the next call.",
          hint1: "Call `sum` again with the two numbers added, and `return` what it gives.",
          explain: "I call sum again with the new total, which gives back a function for the next call.",
        }),
        line("  };\n}", {
          coach: "We close the inner function, and then the outer function. Two lines.",
          hint1: "One line with a closing brace and a semicolon, then one line with a closing brace.",
          explain: "The inner function ends first, and then sum ends.",
          checks: idsOf("sum"),
        }),
      ],
    },
    {
      id: "curry",
      title: "Generic curry(fn)",
      signature: "curry(fn)",
      steps: [
        line("function curry(fn) {", {
          coach: "Now the last part: a general version that can do this for any function. It takes the original function.",
          hint1: "Declare a function called `curry` with one parameter.",
          explain: "curry takes any function.",
        }),
        line("  return function curried(...args) {", {
          coach:
            "We give back the function that collects the arguments, any number of them in one call. It must be able to call itself from the inside later.",
          hint1: "Return a regular `function` that has a name, `curried`, and a rest parameter.",
          explain: "I return a named function, because it has to call itself later.",
        }),
        line("    if (args.length >= fn.length) {", {
          coach: "Now we ask: do we have enough arguments yet? The original function knows how many parameters it declares.",
          hint1: "Compare `args.length` with `fn.length`, the number of parameters of `fn`.",
          explain: "I check if I have at least as many arguments as fn declares, which is fn.length.",
        }),
        line("      return fn.apply(this, args);\n    }", {
          coach: "If we have enough, the original function runs with them and its result goes back, and then we close the if. Two lines.",
          hint1: "`return` the result of `apply` on `fn`, with `this` and `args`. Then close the block.",
          explain: "apply calls the original function with the collected arguments and the same this, and I return what it gives.",
        }),
        line("    return (...next) => curried.apply(this, [...args, ...next]);", {
          coach:
            "If some are still missing, we wait for more. The next call must come back to the same check, with the old arguments and the new ones together.",
          hint1:
            "Return an arrow function with a rest parameter. It uses `apply` on `curried`, with one array made of `args` and then `next`.",
          explain: "I return an arrow function that takes more arguments and calls curried again with the old and the new ones in one array.",
        }),
        line("  };\n}", {
          coach: "Last, we close the returned function, and then the outer function. Two lines.",
          hint1: "One line with a closing brace and a semicolon, then one line with a closing brace.",
          explain: "The returned function ends first, and then curry ends.",
          checks: idsOf("curry"),
        }),
      ],
    },
  ],
  tests,
  complexity: "O(1) per call.",
  followUps: [
    {
      question: "What is fn.length?",
      answer: "The number of parameters the function declares. curry uses it to know when to call fn.",
    },
  ],
};
