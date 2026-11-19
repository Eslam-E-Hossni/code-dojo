import { afterEach, describe, expect, it } from "vitest";
import { problems } from "@/data/problems";
import type { CodeProblem } from "@/data/types";
import { execute } from "@/lib/runner/execute";
import { solutionText } from "@/lib/steps";

/**
 * The hidden tests must catch wrong solutions, not only accept the right
 * one. Every entry below is a typical mistake, and the name of a hidden test
 * that has to fail because of it.
 *
 * A mistake is either a small edit of the reference solution (`edits`: text
 * to find, text to put there) or a whole solution (`code`).
 *
 * Not covered here on purpose:
 * - array-sum: its method is added with defineProperty, which can be done
 *   only once in this test process.
 * - anything that would spin forever in Node, like a recursive fibonacci(50).
 *   In the app the worker is killed after 2 seconds; here nothing would stop it.
 */
interface Mutant {
  id: string;
  mistake: string;
  edits?: [string, string][];
  code?: string;
  mustFail: string;
}

const BUILT_INS: object[] = [Array.prototype, Function.prototype, Object.prototype, String.prototype];
const ORIGINAL_KEYS = BUILT_INS.map((proto) => new Set(Reflect.ownKeys(proto)));

// The solutions run inside this process, so prototype methods are removed again.
afterEach(() => {
  BUILT_INS.forEach((proto, i) => {
    for (const key of Reflect.ownKeys(proto)) {
      if (!ORIGINAL_KEYS[i].has(key)) Reflect.deleteProperty(proto, key);
    }
  });
});

function find(id: string): CodeProblem {
  const problem = problems.find((p) => p.id === id);
  if (!problem || problem.kind !== "code") throw new Error("no code problem " + id);
  return problem;
}

function build(problem: CodeProblem, mutant: Mutant): string {
  if (mutant.code !== undefined) return mutant.code;
  let code = solutionText(problem);
  for (const [from, to] of mutant.edits ?? []) {
    if (!code.includes(from)) throw new Error(`${mutant.id}: "${from}" is not in the solution`);
    code = code.split(from).join(to);
  }
  return code;
}

async function failedTests(problem: CodeProblem, code: string): Promise<{ fatal: string | null; failed: string[] }> {
  let fatal: string | null = null;
  const failed: string[] = [];
  await execute({ code, tests: problem.tests }, (event) => {
    if (event.type === "fatal") fatal = event.error.message;
    if (event.type === "test-end" && event.result.status !== "pass") {
      failed.push(problem.tests[event.index].name);
    }
  });
  return { fatal, failed };
}

const SECOND_FLATTEN = solutionText(find("flatten")).split("\n\n")[1];

const MUTANTS: Mutant[] = [
  // ---------- debounce ----------
  {
    id: "debounce",
    mistake: "never clears the old timer",
    edits: [["    clearTimeout(timer);\n", ""]],
    mustFail: "many fast calls run fn once, with the last arguments",
  },
  {
    id: "debounce",
    mistake: "calls fn at once",
    code: "function debounce(fn, delay) {\n  return function (...args) { fn.apply(this, args); };\n}",
    mustFail: "does not call fn before the delay has passed",
  },
  {
    id: "debounce",
    mistake: "returns an arrow function, so this is lost",
    edits: [["return function (...args) {", "return (...args) => {"]],
    mustFail: "edge case: fn uses 'this'",
  },
  {
    id: "debounce",
    mistake: "drops the arguments",
    edits: [["fn.apply(this, args);", "fn.call(this);"]],
    mustFail: "passes all the arguments",
  },
  {
    id: "debounce",
    mistake: "forgets the delay argument of setTimeout",
    edits: [["}, delay);", "});"]],
    mustFail: "does not call fn before the delay has passed",
  },
  {
    id: "debounce",
    mistake: "keeps one timer for all debounced functions",
    edits: [["function debounce(fn, delay) {\n  let timer;", "let timer;\nfunction debounce(fn, delay) {"]],
    mustFail: "two debounced functions do not share a timer",
  },

  // ---------- throttle ----------
  {
    id: "throttle",
    mistake: "uses > where >= is needed",
    edits: [[">= limit", "> limit"]],
    mustFail: "a call exactly at the limit runs, one millisecond earlier does not",
  },
  {
    id: "throttle",
    mistake: "never saves the time of the last run",
    edits: [["      lastCall = now;\n", ""]],
    mustFail: "edge case: calls inside the period are dropped",
  },
  {
    id: "throttle",
    mistake: "loses this",
    edits: [["fn.apply(this, args);", "fn(...args);"]],
    mustFail: "keeps this",
  },
  {
    id: "throttle",
    mistake: "one shared time for all throttled functions",
    edits: [["function throttle(fn, limit) {\n  let lastCall = 0;", "let lastCall = 0;\nfunction throttle(fn, limit) {"]],
    mustFail: "two throttled functions do not share their time",
  },

  // ---------- sleep ----------
  {
    id: "sleep",
    mistake: "sleep resolves at once",
    edits: [["setTimeout(resolve, ms)", "resolve()"]],
    mustFail: "sleep: does not resolve before the time is over",
  },
  {
    id: "sleep",
    mistake: "delay drops the arguments",
    edits: [["fn(...args)", "fn()"]],
    mustFail: "delay: calls the callback after the time, with the arguments",
  },
  {
    id: "sleep",
    mistake: "delay does not resolve with the result",
    edits: [["() => resolve(fn(...args))", "() => { fn(...args); resolve(); }"]],
    mustFail: "delay: resolves with what the callback returns",
  },

  // ---------- my-set-timeout ----------
  {
    id: "my-set-timeout",
    mistake: "uses the real setTimeout",
    code:
      "function mySetTimeout(callback, delay = 0, ...args) {\n  return { id: setTimeout(() => callback(...args), delay) };\n}\n" +
      "function myClearTimeout(timer) {\n  clearTimeout(timer.id);\n}",
    mustFail: "mySetTimeout: does not use setTimeout or setInterval",
  },
  {
    id: "my-set-timeout",
    mistake: "no default for a missing delay",
    edits: [["delay = 0", "delay"]],
    mustFail: "mySetTimeout: edge case: delay is 0 or missing",
  },
  {
    id: "my-set-timeout",
    mistake: "checks only once and never asks for another frame",
    edits: [["    } else {\n      timer.frame = requestAnimationFrame(check);\n    }", "    }"]],
    mustFail: "mySetTimeout: calls the callback once the delay has passed",
  },
  {
    id: "my-set-timeout",
    mistake: "myClearTimeout does nothing",
    edits: [["  cancelAnimationFrame(timer.frame);\n", ""]],
    mustFail: "myClearTimeout: edge case: cancelled before it fires",
  },
  {
    id: "my-set-timeout",
    mistake: "drops the extra arguments",
    edits: [["callback(...args);", "callback();"]],
    mustFail: "mySetTimeout: passes the extra arguments",
  },

  // ---------- flatten ----------
  {
    id: "flatten",
    mistake: "flattens one level only",
    edits: [["const inner = flatten(arr[i]);", "const inner = arr[i];"]],
    mustFail: "flatten: nested to any depth",
  },
  {
    id: "flatten",
    mistake: "the stack version pushes in forward order",
    edits: [
      [
        "for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);",
        "for (let i = 0; i < item.length; i++) stack.push(item[i]);",
      ],
    ],
    mustFail: "flattenIterative: keeps the order of the items",
  },
  {
    id: "flatten",
    mistake: "the second version is recursive too",
    code: solutionText(find("flatten")) + "\nflattenIterative = flatten;",
    mustFail: "flattenIterative: edge case: very deep nesting does not overflow the stack",
  },
  {
    id: "flatten",
    mistake: "empties the input while reading it",
    code:
      "function flatten(arr) {\n  const result = [];\n  while (arr.length > 0) {\n    const item = arr.shift();\n" +
      "    if (Array.isArray(item)) {\n      const inner = flatten(item);\n      for (let j = 0; j < inner.length; j++) result.push(inner[j]);\n" +
      "    } else {\n      result.push(item);\n    }\n  }\n  return result;\n}\n\n" +
      SECOND_FLATTEN,
    mustFail: "flatten: returns a new array and does not change the input",
  },
  {
    id: "flatten",
    mistake: "only the first function is written",
    code: solutionText(find("flatten")).split("\n\n")[0],
    mustFail: "flattenIterative: nested to any depth",
  },

  // ---------- deep-clone ----------
  {
    id: "deep-clone",
    mistake: "copies only the first level",
    edits: [["copy[key] = deepClone(value[key], seen);", "copy[key] = value[key];"]],
    mustFail: "copies a nested object deeply",
  },
  {
    id: "deep-clone",
    mistake: "forgets Date objects",
    edits: [["  if (value instanceof Date) return new Date(value);\n", ""]],
    mustFail: "edge case: Date objects are copied",
  },
  {
    id: "deep-clone",
    mistake: "never checks what was already copied",
    edits: [["  if (seen.has(value)) return seen.get(value);\n", ""]],
    mustFail: "edge case: circular references",
  },
  {
    id: "deep-clone",
    mistake: "forgets that typeof null is object",
    edits: [["value === null || ", ""]],
    mustFail: "edge case: null stays null",
  },
  {
    id: "deep-clone",
    mistake: "turns arrays into objects",
    edits: [["Array.isArray(value) ? [] : {}", "{}"]],
    mustFail: "copies arrays as arrays",
  },

  // ---------- currying ----------
  {
    id: "currying",
    mistake: "sum treats 0 as the end of the chain",
    edits: [["if (b === undefined) return a;", "if (!b) return a;"]],
    mustFail: "sum: zero is a number, not the end of the chain",
  },
  {
    id: "currying",
    mistake: "curry waits for exactly fn.length arguments",
    edits: [["args.length >= fn.length", "args.length === fn.length"]],
    mustFail: "curry: edge case: more arguments than the function needs",
  },
  {
    id: "currying",
    mistake: "curry forgets the earlier arguments",
    edits: [["[...args, ...next]", "next"]],
    mustFail: "curry: one argument at a time",
  },
  {
    id: "currying",
    mistake: "add takes both numbers at once",
    edits: [["function add(a) {\n  return function (b) {\n    return a + b;\n  };\n}", "function add(a, b) {\n  return a + b;\n}"]],
    mustFail: "add: add(3)(4) returns 7",
  },

  // ---------- memoize ----------
  {
    id: "memoize",
    mistake: "no cache at all",
    code: "function memoize(fn) { return function (...args) { return fn.apply(this, args); }; }",
    mustFail: "calls fn once for the same arguments",
  },
  {
    id: "memoize",
    mistake: "checks the cached value instead of the key",
    edits: [["if (cache.has(key)) {", "if (cache.get(key)) {"]],
    mustFail: "caches falsy results too: 0, '', false, null, undefined",
  },
  {
    id: "memoize",
    mistake: "uses only the first argument as the key",
    edits: [["const key = JSON.stringify(args);", "const key = args[0];"]],
    mustFail: "every argument is part of the key",
  },
  {
    id: "memoize",
    mistake: "joins the arguments into a key",
    edits: [["const key = JSON.stringify(args);", 'const key = args.join(",");']],
    mustFail: "the number 1 and the string '1' are different arguments",
  },
  {
    id: "memoize",
    mistake: "loses this",
    edits: [["fn.apply(this, args)", "fn(...args)"]],
    mustFail: "keeps this",
  },
  {
    id: "memoize",
    mistake: "one cache shared by every memoized function",
    edits: [["function memoize(fn) {\n  const cache = new Map();", "const cache = new Map();\nfunction memoize(fn) {"]],
    mustFail: "each memoized function has its own cache",
  },

  // ---------- ttl-cache ----------
  {
    id: "ttl-cache",
    mistake: "uses > where >= is needed",
    edits: [["Date.now() >= entry.expiresAt", "Date.now() > entry.expiresAt"]],
    mustFail: "edge case: read exactly at the expiry time",
  },
  {
    id: "ttl-cache",
    mistake: "never expires",
    edits: [["if (Date.now() >= entry.expiresAt) {", "if (false) {"]],
    mustFail: "returns undefined after the time is over",
  },
  {
    id: "ttl-cache",
    mistake: "treats falsy values as missing",
    edits: [["return entry.value;", "return entry.value || undefined;"]],
    mustFail: "edge case: falsy values like 0 are still values",
  },
  {
    id: "ttl-cache",
    mistake: "stores the ttl, not the expiry time",
    edits: [["Date.now() + ttl", "ttl"]],
    mustFail: "returns a value before it expires",
  },
  {
    id: "ttl-cache",
    mistake: "one store shared by every cache",
    edits: [["class TTLCache {", "const sharedStore = new Map();\nclass TTLCache {"], ["this.store = new Map();", "this.store = sharedStore;"]],
    mustFail: "two caches do not share entries",
  },

  // ---------- array-map ----------
  {
    id: "array-map",
    mistake: "calls the callback for holes too",
    edits: [
      [
        "    if (i in this) {\n      result[i] = callback.call(thisArg, this[i], i, this);\n    }",
        "    result[i] = callback.call(thisArg, this[i], i, this);",
      ],
    ],
    mustFail: "edge case: holes in the array stay holes",
  },
  {
    id: "array-map",
    mistake: "ignores thisArg",
    edits: [["callback.call(thisArg, this[i], i, this)", "callback(this[i], i, this)"]],
    mustFail: "uses thisArg as this",
  },
  {
    id: "array-map",
    mistake: "writes into the original array",
    edits: [["const result = new Array(this.length);", "const result = this;"]],
    mustFail: "returns a new array and does not change the original",
  },
  {
    id: "array-map",
    mistake: "passes only the item",
    edits: [["callback.call(thisArg, this[i], i, this)", "callback.call(thisArg, this[i])"]],
    mustFail: "passes the item, the index and the array to the callback",
  },

  // ---------- array-filter ----------
  {
    id: "array-filter",
    mistake: "keeps what the callback returned, not the item",
    edits: [["result.push(this[i]);", "result.push(callback.call(thisArg, this[i], i, this));"]],
    mustFail: "keeps the items the callback accepts",
  },
  {
    id: "array-filter",
    mistake: "accepts only the boolean true",
    edits: [["callback.call(thisArg, this[i], i, this))", "callback.call(thisArg, this[i], i, this) === true)"]],
    mustFail: "any truthy value keeps the item, any falsy value drops it",
  },
  {
    id: "array-filter",
    mistake: "calls the callback for holes too",
    edits: [["i in this && ", ""]],
    mustFail: "edge case: holes in the array are skipped",
  },

  // ---------- array-reduce ----------
  {
    id: "array-reduce",
    mistake: "compares the initial value with undefined",
    edits: [["arguments.length < 2", "initialValue === undefined"]],
    mustFail: "edge case: undefined passed as the initial value still counts",
  },
  {
    id: "array-reduce",
    mistake: "counts the first item twice",
    edits: [["    acc = this[0];\n    start = 1;", "    acc = this[0];"]],
    mustFail: "with no initial value, the first item is the start",
  },
  {
    id: "array-reduce",
    mistake: "does not throw for an empty array",
    edits: [['throw new TypeError("Reduce of empty array with no initial value");', "return undefined;"]],
    mustFail: "edge case: empty array with no initial value throws a TypeError",
  },

  // ---------- array-for-each ----------
  {
    id: "array-for-each",
    mistake: "returns the array",
    edits: [["    }\n  }\n};", "    }\n  }\n  return this;\n};"]],
    mustFail: "returns undefined",
  },
  {
    id: "array-for-each",
    mistake: "calls the callback for holes too",
    edits: [["    if (i in this) {\n      callback.call(thisArg, this[i], i, this);\n    }", "    callback.call(thisArg, this[i], i, this);"]],
    mustFail: "edge case: holes in the array are skipped",
  },
  {
    id: "array-for-each",
    mistake: "does not check the callback",
    edits: [['  if (typeof callback !== "function") {\n    throw new TypeError(callback + " is not a function");\n  }\n', ""]],
    mustFail: "edge case: callback is not a function",
  },

  // ---------- function-bind ----------
  {
    id: "function-bind",
    mistake: "ignores the preset arguments",
    edits: [["[...boundArgs, ...callArgs]", "callArgs"]],
    mustFail: "edge case: arguments at bind time and at call time",
  },
  {
    id: "function-bind",
    mistake: "does not return the result",
    edits: [["return fn.apply(context", "fn.apply(context"]],
    mustFail: "returns what the original returns",
  },
  {
    id: "function-bind",
    mistake: "uses the this of the call, not the bound one",
    edits: [["fn.apply(context,", "fn.apply(this,"]],
    mustFail: "the bound this wins over the object it is called on",
  },
  {
    id: "function-bind",
    mistake: "calls the function at bind time",
    edits: [
      [
        "  return function (...callArgs) {\n    return fn.apply(context, [...boundArgs, ...callArgs]);\n  };",
        "  const result = fn.apply(context, boundArgs);\n  return function () {\n    return result;\n  };",
      ],
    ],
    mustFail: "returns a new function and does not call the original yet",
  },

  // ---------- function-call ----------
  {
    id: "function-call",
    mistake: "leaves the temporary property on the object",
    edits: [["  delete target[key];\n", ""]],
    mustFail: "edge case: the object does not keep the temporary property",
  },
  {
    id: "function-call",
    mistake: "uses a string key that shows up in Object.keys",
    edits: [["Symbol()", '"__fn"']],
    mustFail: "edge case: the object does not keep the temporary property",
  },
  {
    id: "function-call",
    mistake: "does not handle a null context",
    edits: [["context === null || context === undefined ? globalThis : Object(context)", "context"]],
    mustFail: "edge case: context is null or undefined",
  },
  {
    id: "function-call",
    mistake: "does not return the result",
    edits: [["  return result;\n", ""]],
    mustFail: "returns what the function returns",
  },

  // ---------- function-apply ----------
  {
    id: "function-apply",
    mistake: "passes the array as one argument",
    edits: [["target[key](...args)", "target[key](args)"]],
    mustFail: "spreads the array into separate arguments",
  },
  {
    id: "function-apply",
    mistake: "no default for a missing array",
    edits: [["args = []", "args"]],
    mustFail: "edge case: the array of arguments is missing",
  },
  {
    id: "function-apply",
    mistake: "leaves the temporary property on the object",
    edits: [["  delete target[key];\n", ""]],
    mustFail: "edge case: the object does not keep the temporary property",
  },

  // ---------- promise-all ----------
  {
    id: "promise-all",
    mistake: "pushes results in the order they finish",
    edits: [["results[i] = value;", "results.push(value);"]],
    mustFail: "edge case: results keep the input order, not the finish order",
  },
  {
    id: "promise-all",
    mistake: "forgets the empty array",
    edits: [["    if (promises.length === 0) return resolve(results);\n", ""]],
    mustFail: "edge case: empty array resolves with []",
  },
  {
    id: "promise-all",
    mistake: "expects every item to be a promise",
    edits: [["Promise.resolve(promises[i])", "promises[i]"]],
    mustFail: "edge case: plain values in the input",
  },
  {
    id: "promise-all",
    mistake: "swallows rejections",
    edits: [[".catch(reject);", ".catch(() => {});"]],
    mustFail: "edge case: one rejection rejects at once",
  },
  {
    id: "promise-all",
    mistake: "resolves after the first promise",
    edits: [["if (completed === promises.length) resolve(results);", "resolve(results);"]],
    mustFail: "does not resolve before the slowest one is done",
  },

  // ---------- promise-all-settled ----------
  {
    id: "promise-all-settled",
    mistake: "does not record rejected promises",
    edits: [['          results[i] = { status: "rejected", reason };\n', ""]],
    mustFail: "reports fulfilled and rejected promises, in input order",
  },
  {
    id: "promise-all-settled",
    mistake: "forgets the empty array",
    edits: [["    if (promises.length === 0) return resolve(results);\n", ""]],
    mustFail: "edge case: empty array resolves with []",
  },
  {
    id: "promise-all-settled",
    mistake: "pushes results in the order they finish",
    edits: [['results[i] = { status: "fulfilled", value };', 'results.push({ status: "fulfilled", value });']],
    mustFail: "edge case: results keep the input order, not the finish order",
  },
  {
    id: "promise-all-settled",
    mistake: "resolves after the first promise",
    edits: [["if (completed === promises.length) resolve(results);", "resolve(results);"]],
    mustFail: "waits for every promise, also after a rejection",
  },

  // ---------- promise-race ----------
  {
    id: "promise-race",
    mistake: "uses then(resolve).catch(reject)",
    edits: [[".then(resolve, reject);", ".then(resolve).catch(reject);"]],
    mustFail: "a promise that is already rejected beats a fulfilled one after it",
  },
  {
    id: "promise-race",
    mistake: "ignores rejections",
    edits: [[".then(resolve, reject);", ".then(resolve, () => {});"]],
    mustFail: "edge case: the first one to settle rejects",
  },
  {
    id: "promise-race",
    mistake: "expects every item to be a promise",
    edits: [["Promise.resolve(promises[i])", "promises[i]"]],
    mustFail: "edge case: a plain value wins against a waiting promise",
  },

  // ---------- promise-any ----------
  {
    id: "promise-any",
    mistake: "rejects on the first rejection",
    edits: [["if (rejected === promises.length) {", "if (rejected === 1) {"]],
    mustFail: "edge case: earlier rejections are ignored",
  },
  {
    id: "promise-any",
    mistake: "pushes errors in the order they arrive",
    edits: [["errors[i] = reason;", "errors.push(reason);"]],
    mustFail: "edge case: the errors keep the input order",
  },
  {
    id: "promise-any",
    mistake: "forgets the empty array",
    edits: [["if (promises.length === 0) {", "if (false) {"]],
    mustFail: "edge case: empty array rejects at once",
  },
  {
    id: "promise-any",
    mistake: "rejects with a plain Error",
    edits: [["new AggregateError(errors, ", "new Error("]],
    mustFail: "edge case: every promise rejects",
  },

  // ---------- json-stringify ----------
  {
    id: "json-stringify",
    mistake: "writes undefined inside arrays",
    edits: [['out += item === undefined ? "null" : item;', "out += item;"]],
    mustFail: "edge case: undefined and functions become null in arrays",
  },
  {
    id: "json-stringify",
    mistake: "does not skip undefined keys",
    edits: [["    if (item === undefined) continue;\n", ""]],
    mustFail: "edge case: undefined and functions are skipped in objects",
  },
  {
    id: "json-stringify",
    mistake: "no quotes around strings",
    edits: [["return '\"' + value + '\"';", "return value;"]],
    mustFail: "strings get double quotes",
  },
  {
    id: "json-stringify",
    mistake: "writes NaN and Infinity as they are",
    edits: [['isFinite(value) ? String(value) : "null"', "String(value)"]],
    mustFail: "edge case: NaN and Infinity become null",
  },
  {
    id: "json-stringify",
    mistake: "never puts a comma between keys",
    edits: [["    first = false;\n", ""]],
    mustFail: "objects",
  },

  // ---------- two-sum ----------
  {
    id: "two-sum",
    mistake: "saves the number before checking, so it pairs with itself",
    edits: [["    const need = target - nums[i];\n", "    const need = target - nums[i];\n    seen.set(nums[i], i);\n"]],
    mustFail: "does not use the same element twice",
  },
  {
    id: "two-sum",
    mistake: "returns the numbers, not the indexes",
    edits: [["return [seen.get(need), i];", "return [need, nums[i]];"]],
    mustFail: "finds the pair",
  },
  {
    id: "two-sum",
    mistake: "returns nothing when there is no pair",
    edits: [["  return [];\n", ""]],
    mustFail: "edge case: no pair exists",
  },

  // ---------- second-largest ----------
  {
    id: "second-largest",
    mistake: "counts a duplicate of the largest",
    edits: [["n > second && n < largest", "n > second"]],
    mustFail: "a duplicate of the largest does not count as second",
  },
  {
    id: "second-largest",
    mistake: "starts from 0",
    edits: [["-Infinity", "0"]],
    mustFail: "edge case: negative numbers",
  },
  {
    id: "second-largest",
    mistake: "does not move the old largest down",
    edits: [["      second = largest;\n", ""]],
    mustFail: "works wherever the two numbers are",
  },
  {
    id: "second-largest",
    mistake: "returns -Infinity when there is no second",
    edits: [["second === -Infinity ? null : second", "second"]],
    mustFail: "edge case: fewer than two items",
  },

  // ---------- largest ----------
  {
    id: "largest",
    mistake: "starts max at 0",
    edits: [["let max = nums[0];", "let max = 0;"]],
    mustFail: "edge case: all negative numbers",
  },
  {
    id: "largest",
    mistake: "forgets the empty array",
    edits: [["  if (nums.length === 0) return null;\n", ""]],
    mustFail: "edge case: empty array",
  },

  // ---------- reverse-string ----------
  {
    id: "reverse-string",
    mistake: "stops one character early",
    edits: [["i >= 0", "i > 0"]],
    mustFail: "reverses a word",
  },
  {
    id: "reverse-string",
    mistake: "starts one character too far",
    edits: [["str.length - 1", "str.length"]],
    mustFail: "edge case: one character",
  },

  // ---------- palindrome ----------
  {
    id: "palindrome",
    mistake: "compares only the first and the last character",
    edits: [["while (left < right) {", "if (left < right) {"]],
    mustFail: "a difference in the middle is found",
  },
  {
    id: "palindrome",
    mistake: "compares the wrong way round",
    edits: [["str[left] !== str[right]", "str[left] === str[right]"]],
    mustFail: "a palindrome returns true",
  },

  // ---------- anagram ----------
  {
    id: "anagram",
    mistake: "checks that the letters exist, not how many",
    edits: [["    if (!counts[b[i]]) return false;\n    counts[b[i]]--;", "    if (counts[b[i]] === undefined) return false;"]],
    mustFail: "edge case: same letters, different counts",
  },
  {
    id: "anagram",
    mistake: "does not compare the lengths",
    edits: [["  if (a.length !== b.length) return false;\n", ""]],
    mustFail: "edge case: different lengths",
  },

  // ---------- move-zeroes ----------
  {
    id: "move-zeroes",
    mistake: "builds a new array",
    code:
      "function moveZeroes(nums) {\n  const out = [];\n  let zeroes = 0;\n  for (let i = 0; i < nums.length; i++) {\n" +
      "    if (nums[i] !== 0) out.push(nums[i]);\n    else zeroes++;\n  }\n  for (let i = 0; i < zeroes; i++) out.push(0);\n  return out;\n}",
    mustFail: "works in place and returns the same array",
  },
  {
    id: "move-zeroes",
    mistake: "treats negative numbers as zeroes",
    edits: [["nums[i] !== 0", "nums[i] > 0"]],
    mustFail: "negative numbers are not zeroes",
  },
  {
    id: "move-zeroes",
    mistake: "never moves the insert position",
    edits: [["      insert++;\n", ""]],
    mustFail: "moves the zeroes to the end",
  },

  // ---------- valid-parentheses ----------
  {
    id: "valid-parentheses",
    mistake: "does not check what is left on the stack",
    edits: [["return stack.length === 0;", "return true;"]],
    mustFail: "edge case: left open",
  },
  {
    id: "valid-parentheses",
    mistake: "pops without comparing the kind of bracket",
    edits: [["if (stack.pop() !== pairs[ch]) return false;", "if (stack.pop() === undefined) return false;"]],
    mustFail: "edge case: wrong order",
  },

  // ---------- decode-string ----------
  {
    id: "decode-string",
    mistake: "reads one digit only",
    edits: [["num = num * 10 + Number(ch);", "num = Number(ch);"]],
    mustFail: "edge case: multi-digit numbers",
  },
  {
    id: "decode-string",
    mistake: "drops the text before the bracket",
    edits: [["current = before + repeated;", "current = repeated;"]],
    mustFail: "edge case: letters outside any brackets",
  },
  {
    id: "decode-string",
    mistake: "does not start a new text at an opening bracket",
    edits: [['      num = 0;\n      current = "";', "      num = 0;"]],
    mustFail: "repeats the text inside the brackets",
  },

  // ---------- max-subarray ----------
  {
    id: "max-subarray",
    mistake: "starts best at 0",
    edits: [["let best = nums[0];", "let best = 0;"]],
    mustFail: "edge case: all negative numbers",
  },
  {
    id: "max-subarray",
    mistake: "never starts again, so it sums everything",
    edits: [["current = nums[i] > current + nums[i] ? nums[i] : current + nums[i];", "current = current + nums[i];"]],
    mustFail: "a big negative number splits the array",
  },

  // ---------- binary-search ----------
  {
    id: "binary-search",
    mistake: "checks every item",
    code:
      "function binarySearch(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    if (nums[i] === target) return i;\n  }\n  return -1;\n}",
    mustFail: "does not check every item: about 20 looks for a million numbers",
  },
  {
    id: "binary-search",
    mistake: "uses < where <= is needed",
    edits: [["while (left <= right) {", "while (left < right) {"]],
    mustFail: "edge case: one item",
  },
  {
    id: "binary-search",
    mistake: "returns null when the target is missing",
    edits: [["return -1;", "return null;"]],
    mustFail: "returns -1 when the number is between two items",
  },

  // ---------- remove-duplicates ----------
  {
    id: "remove-duplicates",
    mistake: "never remembers what it saw",
    edits: [["      seen.add(arr[i]);\n", ""]],
    mustFail: "removes the duplicates",
  },
  {
    id: "remove-duplicates",
    mistake: "uses an object, so 1 and '1' are the same key",
    code:
      "function removeDuplicates(arr) {\n  const seen = {};\n  const result = [];\n  for (let i = 0; i < arr.length; i++) {\n" +
      "    if (!seen[arr[i]]) {\n      seen[arr[i]] = true;\n      result.push(arr[i]);\n    }\n  }\n  return result;\n}",
    mustFail: "edge case: the number 1 and the string '1' are different",
  },
  {
    id: "remove-duplicates",
    mistake: "removes from the input itself",
    code:
      "function removeDuplicates(arr) {\n  const seen = new Set();\n  let write = 0;\n  for (let i = 0; i < arr.length; i++) {\n" +
      "    if (!seen.has(arr[i])) {\n      seen.add(arr[i]);\n      arr[write] = arr[i];\n      write++;\n    }\n  }\n  arr.length = write;\n  return arr;\n}",
    mustFail: "returns a new array and does not change the input",
  },

  // ---------- count-characters ----------
  {
    id: "count-characters",
    mistake: "adds 1 to undefined",
    edits: [["(counts[ch] || 0) + 1", "counts[ch] + 1"]],
    mustFail: "counts every character",
  },
  {
    id: "count-characters",
    mistake: "lower-cases everything",
    edits: [["const ch = str[i];", "const ch = str[i].toLowerCase();"]],
    mustFail: "edge case: upper and lower case are different characters",
  },
  {
    id: "count-characters",
    mistake: "skips spaces",
    edits: [["    const ch = str[i];\n", '    const ch = str[i];\n    if (ch === " ") continue;\n']],
    mustFail: "edge case: spaces count as characters",
  },

  // ---------- fizzbuzz ----------
  {
    id: "fizzbuzz",
    mistake: "checks 3 before 15",
    edits: [
      [
        '    if (i % 15 === 0) {\n      result.push("FizzBuzz");\n    } else if (i % 3 === 0) {\n      result.push("Fizz");',
        '    if (i % 3 === 0) {\n      result.push("Fizz");\n    } else if (i % 15 === 0) {\n      result.push("FizzBuzz");',
      ],
    ],
    mustFail: "edge case: 15 is FizzBuzz, not Fizz",
  },
  {
    id: "fizzbuzz",
    mistake: "stops before n",
    edits: [["i <= n", "i < n"]],
    mustFail: "n itself is included",
  },
  {
    id: "fizzbuzz",
    mistake: "turns the numbers into strings",
    edits: [["result.push(i);", "result.push(String(i));"]],
    mustFail: "plain numbers stay numbers",
  },

  // ---------- fibonacci ----------
  {
    id: "fibonacci",
    mistake: "stops one step early",
    edits: [["i <= n", "i < n"]],
    mustFail: "the first numbers of the sequence",
  },
  {
    id: "fibonacci",
    mistake: "returns 1 for n = 0",
    edits: [["if (n < 2) return n;", "if (n < 2) return 1;"]],
    mustFail: "edge case: n is 0",
  },

  // ---------- event-emitter ----------
  {
    id: "event-emitter",
    mistake: "keeps listeners in an array, so duplicates run twice",
    code:
      "class EventEmitter {\n  constructor() {\n    this.events = new Map();\n  }\n" +
      "  on(name, listener) {\n    if (!this.events.has(name)) this.events.set(name, []);\n    this.events.get(name).push(listener);\n    return () => this.off(name, listener);\n  }\n" +
      "  off(name, listener) {\n    const list = this.events.get(name);\n    if (!list) return;\n    const index = list.indexOf(listener);\n    if (index !== -1) list.splice(index, 1);\n  }\n" +
      "  emit(name, ...args) {\n    const list = this.events.get(name);\n    if (!list) return;\n    const copy = list.slice();\n    for (let i = 0; i < copy.length; i++) copy[i](...args);\n  }\n" +
      "  once(name, listener) {\n    const off = this.on(name, (...args) => {\n      off();\n      listener(...args);\n    });\n  }\n}",
    mustFail: "edge case: the same listener added twice runs once",
  },
  {
    id: "event-emitter",
    mistake: "once never removes the listener",
    edits: [["      off();\n", ""]],
    mustFail: "once: the listener runs only the first time",
  },
  {
    id: "event-emitter",
    mistake: "on does not return an unsubscribe function",
    edits: [["    return () => this.off(name, listener);\n", ""]],
    mustFail: "on returns a function that unsubscribes",
  },
  {
    id: "event-emitter",
    mistake: "emit does not pass the arguments",
    edits: [["      listener(...args);\n    }\n  }\n  once", "      listener();\n    }\n  }\n  once"]],
    mustFail: "a listener is called with the arguments of emit",
  },
  {
    id: "event-emitter",
    mistake: "every emitter shares one Map",
    edits: [["class EventEmitter {", "const sharedEvents = new Map();\nclass EventEmitter {"], ["this.events = new Map();", "this.events = sharedEvents;"]],
    mustFail: "two emitters do not share listeners",
  },
  {
    id: "event-emitter",
    mistake: "off does nothing",
    edits: [["    if (listeners) listeners.delete(listener);\n", ""]],
    mustFail: "off removes a listener",
  },
];

describe("the hidden tests catch common mistakes", () => {
  for (const mutant of MUTANTS) {
    it(`${mutant.id}: ${mutant.mistake}`, async () => {
      const problem = find(mutant.id);
      const code = build(problem, mutant);
      expect(code, "the mistake must change the solution").not.toBe(solutionText(problem));

      const { fatal, failed } = await failedTests(problem, code);
      expect(fatal, "the wrong solution must still run").toBeNull();
      expect(failed).toContain(mutant.mustFail);
    });
  }

  it("covers every problem except the ones listed at the top", () => {
    const covered = new Set(MUTANTS.map((m) => m.id));
    // Only code problems have hidden tests. The others are in output.test.ts and react.test.ts.
    const missing = problems.filter((p) => p.kind === "code" && !covered.has(p.id)).map((p) => p.id);
    expect(missing).toEqual(["array-sum"]);
  });
});
