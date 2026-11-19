import { describe, expect, it } from "vitest";
import { codeProblems } from "@/data/problems";
import type { CodeProblem } from "@/data/types";
import { learnerCode } from "@/lib/checker/check";
import { judgeWhole, story, type, type Session } from "./helpers";

const problem = (id: string) => codeProblems.find((item) => item.id === id) as CodeProblem;

function lines(code: string): string[] {
  return code.trim().split("\n");
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
 * Twelve correct solutions of the phase 3 problems, written in another
 * style than the reference. Typed line by line they must be accepted by
 * meaning. Written in a really different way, they are pasted whole and
 * accepted by the hidden tests.
 */
describe("alternative solutions of the phase 3 problems are accepted", () => {
  it("1. count characters: for...of with a named item, typed line by line", async () => {
    const session = await type(
      problem("count-characters"),
      lines(`
function countCharacters(text) {
  const seen = {};
  for (const letter of text) {
    seen[letter] = (seen[letter] || 0) + 1;
  }
  return seen;
}`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
    // The for...of line is the loop and the name of the item: two steps of the reference.
    const covered = session.log.map((entry) => (entry.verdict.kind === "accept" ? entry.verdict.steps.length : 0));
    expect(covered[2]).toBe(2);
  });

  it("2. anagram: for...of in both loops and other names, typed line by line", async () => {
    const session = await type(
      problem("anagram"),
      lines(`
function isAnagram(first, second) {
  if (first.length !== second.length) return false
  const tally = {}
  for (const ch of first) {
    tally[ch] = (tally[ch] || 0) + 1
  }
  for (const ch of second) {
    if (!tally[ch]) return false
    tally[ch] -= 1
  }
  return true
}`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
  });

  it("3. two sum: other names, i += 1 and no semicolons, typed line by line", async () => {
    const session = await type(
      problem("two-sum"),
      lines(`
function twoSum(numbers, goal) {
  const indexOf = new Map()
  for (let k = 0; k < numbers.length; k += 1) {
    const missing = goal - numbers[k]
    if (indexOf.has(missing)) {
      return [indexOf.get(missing), k]
    }
    indexOf.set(numbers[k], k)
  }
  return []
}`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
    expect(session.state.names).toMatchObject({ nums: "numbers", target: "goal", seen: "indexOf", need: "missing" });
  });

  it("4. binary search: other names and an if/else without braces, typed line by line", async () => {
    const session = await type(
      problem("binary-search"),
      lines(`
function binarySearch(list, wanted) {
  let low = 0
  let high = list.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (list[middle] === wanted) return middle
    if (list[middle] < wanted) low = middle + 1
    else high = middle - 1
  }
  return -1
}`),
    );
    await noRejects(session);
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
  });

  it("5. sleep and delay: arrow functions in a const, each in one line", async () => {
    const session = await type(problem("sleep"), [
      "const sleep = (ms) => new Promise((done) => setTimeout(done, ms));",
      "const delay = (fn, ms, ...rest) => new Promise((done) => setTimeout(() => done(fn(...rest)), ms));",
    ]);
    await noRejects(session);
  });

  it("6. largest: for...of over every item, pasted as one block", async () => {
    const session = await type(problem("largest"), [
      `function largest(list) {
  if (!list.length) return null;
  let top = list[0];
  for (const value of list) {
    if (value > top) top = value;
  }
  return top;
}`,
    ]);
    await noRejects(session);
  });

  it("7. reverse string: builds the result from the front, pasted as one block", async () => {
    const session = await type(problem("reverse-string"), [
      `function reverse(text) {
  let out = "";
  for (const ch of text) out = ch + out;
  return out;
}`,
    ]);
    await noRejects(session);
    expect(ways(session)).toEqual(["tests"]);
  });

  it("8. palindrome: one counter to the middle, pasted as one block", async () => {
    const session = await type(problem("palindrome"), [
      `function isPalindrome(text) {
  for (let i = 0; i < text.length / 2; i++) {
    if (text[i] !== text[text.length - 1 - i]) return false;
  }
  return true;
}`,
    ]);
    await noRejects(session);
    expect(ways(session)).toEqual(["tests"]);
  });

  it("9. FizzBuzz: builds the word from two checks, pasted as one block", async () => {
    const session = await type(problem("fizzbuzz"), [
      `function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    let word = "";
    if (i % 3 === 0) word += "Fizz";
    if (i % 5 === 0) word += "Buzz";
    out.push(word || i);
  }
  return out;
}`,
    ]);
    await noRejects(session);
    expect(ways(session)).toEqual(["tests"]);
  });

  it("10. fibonacci: a destructuring swap, pasted as one block", async () => {
    const session = await type(problem("fibonacci"), [
      `function fibonacci(n) {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}`,
    ]);
    await noRejects(session);
    expect(ways(session)).toEqual(["tests"]);
  });

  it("11. remove duplicates: includes on the result, pasted as one block", async () => {
    const session = await type(problem("remove-duplicates"), [
      `function removeDuplicates(items) {
  const out = [];
  for (const item of items) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}`,
    ]);
    await noRejects(session);
    expect(ways(session)).toEqual(["tests"]);
  });

  it("12. Kadane: Math.max in place of the comparisons, typed line by line", async () => {
    const session = await type(
      problem("max-subarray"),
      lines(`
function maxSubarray(nums) {
  let best = nums[0];
  let sum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    sum = Math.max(nums[i], sum + nums[i]);
    best = Math.max(best, sum);
  }
  return best;
}`),
    );
    await noRejects(session);
    // Math.max says the same as the ternary and the if of the reference, so every line matches by meaning.
    expect(new Set(ways(session))).toEqual(new Set(["match"]));
  });
});
