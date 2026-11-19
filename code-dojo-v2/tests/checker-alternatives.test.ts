import { describe, expect, it } from "vitest";
import { learnerCode } from "@/lib/checker/check";
import { getProblem } from "@/data/problems";
import type { CodeProblem } from "@/data/types";
import { flattenSteps } from "@/lib/checker/check";
import { judgeWhole, story, type, type Session } from "./helpers";

const debounce = getProblem("debounce") as CodeProblem;
const flatten = getProblem("flatten") as CodeProblem;
const memoize = getProblem("memoize") as CodeProblem;

function lines(code: string): string[] {
  return code.trim().split("\n");
}

function reference(problem: CodeProblem, partId: string): string[] {
  return flattenSteps(problem)
    .filter((step) => step.partId === partId)
    .map((step) => step.expected);
}

async function noRejects(session: Session): Promise<void> {
  expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
  expect(session.finished).toBe(true);
  // The same code, typed whole in Recall or Exam, is accepted there too.
  const whole = await judgeWhole(session.problem, learnerCode(session.problem, session.state));
  expect(whole.report.failures).toEqual([]);
  expect(whole.banned).toBeNull();
  expect(whole.accepted).toBe(true);
}

/** How the accepted pieces got in: "match" for the AST layers, "tests" for the behaviour check. */
function ways(session: Session): string[] {
  const out: string[] = [];
  for (const entry of session.log) {
    if (entry.verdict.kind === "accept") out.push(entry.verdict.via);
  }
  return out;
}

/**
 * Ten correct solutions written in another style than the reference:
 * other names, for...of, a short arrow, const or let, .call with spread,
 * a one-line if, another algorithm. The checker must accept all of them.
 */
describe("ten alternative solutions are accepted", () => {
  it("1. debounce: other names, and fn.call with spread, typed line by line", async () => {
    const session = await type(
      debounce,
      lines(`
function debounce(callback, wait) {
  let timeoutId;
  return function (...params) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback.call(this, ...params);
    }, wait);
  };
}`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
    expect(session.state.names).toMatchObject({ fn: "callback", delay: "wait", timer: "timeoutId", args: "params" });
  });

  it("2. debounce: a const with a function expression, let timer = null, a one-line arrow callback", async () => {
    const session = await type(
      debounce,
      lines(`
const debounce = function (fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
    // The one-line callback covers three steps of the reference at once.
    const covered = session.log.map((entry) => (entry.verdict.kind === "accept" ? entry.verdict.steps.length : 0));
    expect(covered).toContain(3);
  });

  it("3. debounce: a named inner function and a saved context, pasted as one block", async () => {
    const session = await type(debounce, [
      `function debounce(fn, delay) {
  let timer;
  function debounced(...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  }
  return debounced;
}`,
    ]);
    await noRejects(session);
    expect(ways(session)).toEqual(["tests"]);
  });

  it("4. flatten: for...of loops and other names, typed line by line", async () => {
    const session = await type(
      flatten,
      lines(`
function flatten(list) {
  const out = [];
  for (const item of list) {
    if (Array.isArray(item)) {
      const flat = flatten(item);
      for (const value of flat) {
        out.push(value);
      }
    } else {
      out.push(item);
    }
  }
  return out;
}`).concat(reference(flatten, "iterative")),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
  });

  it("5. flatten: concat in place of the inner loop, pasted as one block", async () => {
    const session = await type(flatten, [
      `function flatten(arr) {
  let result = [];
  for (let i = 0; i < arr.length; i += 1) {
    if (Array.isArray(arr[i])) {
      result = result.concat(flatten(arr[i]));
    } else {
      result.push(arr[i]);
    }
  }
  return result;
}`,
      ...reference(flatten, "iterative"),
    ]);
    await noRejects(session);
    expect(ways(session)[0]).toBe("tests");
  });

  it("6. flattenIterative: braces around the one-line loops, while (todo.length), k -= 1 and --k", async () => {
    const session = await type(
      flatten,
      reference(flatten, "recursive").concat(
        lines(`
function flattenIterative(input) {
  const todo = [];
  for (let k = input.length - 1; k >= 0; k -= 1) {
    todo.push(input[k]);
  }
  const output = [];
  while (todo.length) {
    const current = todo.pop();
    if (Array.isArray(current)) {
      for (let k = current.length - 1; k >= 0; --k) {
        todo.push(current[k]);
      }
    } else {
      output.push(current);
    }
  }
  return output;
}`),
      ),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
  });

  it("7. flattenIterative: a queue with shift and unshift, pasted as one block", async () => {
    const session = await type(flatten, [
      ...reference(flatten, "recursive"),
      `function flattenIterative(arr) {
  const queue = arr.slice();
  const result = [];
  while (queue.length > 0) {
    const item = queue.shift();
    if (Array.isArray(item)) {
      queue.unshift(...item);
    } else {
      result.push(item);
    }
  }
  return result;
}`,
    ]);
    await noRejects(session);
    expect(ways(session).pop()).toBe("tests");
  });

  it("8. memoize: other names and a one-line if, typed line by line", async () => {
    const session = await type(
      memoize,
      lines(`
function memoize(func) {
  const saved = new Map();
  return function (...params) {
    const id = JSON.stringify(params);
    if (saved.has(id)) return saved.get(id);
    const value = func.apply(this, params);
    saved.set(id, value);
    return value;
  };
}`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
    expect(session.state.names).toMatchObject({ fn: "func", cache: "saved", key: "id", result: "value" });
  });

  it("9. memoize: a plain object as the cache and the in operator, pasted as one block", async () => {
    const session = await type(memoize, [
      `function memoize(fn) {
  const cache = {};
  return function (...args) {
    const key = JSON.stringify(args);
    if (!(key in cache)) {
      cache[key] = fn.apply(this, args);
    }
    return cache[key];
  };
}`,
    ]);
    await noRejects(session);
    expect(ways(session)).toEqual(["tests"]);
  });

  it("10. memoize: an arrow in a const, let for everything, fn.call with spread", async () => {
    const session = await type(
      memoize,
      lines(`
const memoize = (fn) => {
  let cache = new Map();
  return function (...args) {
    let key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    let result = fn.call(this, ...args);
    cache.set(key, result);
    return result;
  };
};`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
  });
});
