import { describe, expect, it } from "vitest";
import { codeProblems, plainProblems } from "@/data/problems";
import type { CodeProblem } from "@/data/types";
import { partSolution, solutionText } from "@/lib/checker/check";
import { bannedIn, formatDuration, PRACTICE_POINTS, practicePoints } from "@/lib/practice";
import { judgeWhole } from "./helpers";

const byId = (id: string) => codeProblems.find((problem) => problem.id === id) as CodeProblem;
const debounce = byId("debounce");
const flatten = byId("flatten");
const memoize = byId("memoize");

describe("points in Recall and Exam", () => {
  it("drop with every run of the tests, and stop dropping at the third", () => {
    expect([1, 2, 3, 4, 9].map((runs) => practicePoints("recall", runs))).toEqual([30, 20, 10, 10, 10]);
    expect([1, 2, 3, 4, 9].map((runs) => practicePoints("exam", runs))).toEqual([50, 35, 20, 20, 20]);
  });

  it("give more in Exam than in Recall, run for run", () => {
    for (let i = 0; i < 3; i++) expect(PRACTICE_POINTS.exam[i]).toBeGreaterThan(PRACTICE_POINTS.recall[i]);
  });

  it("show the time as mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(75)).toBe("01:15");
    expect(formatDuration(59.9)).toBe("00:59");
    expect(formatDuration(3600)).toBe("60:00");
    expect(formatDuration(-5)).toBe("00:00");
  });
});

describe.each(plainProblems)("$id written whole, as in Recall and Exam", (problem) => {
  it("the reference solution passes every hidden test and has nothing banned", async () => {
    const verdict = await judgeWhole(problem, solutionText(problem));
    expect(verdict.report.fatal).toBeNull();
    expect(verdict.report.failures).toEqual([]);
    expect(verdict.report.passed).toBe(problem.tests.length);
    expect(verdict.banned).toBeNull();
    expect(verdict.accepted).toBe(true);
  });

  it("an empty editor and half a solution are not accepted", async () => {
    const empty = await judgeWhole(problem, "");
    expect(empty.accepted).toBe(false);
    // A test that expects an error can pass on nothing at all ("x is not a function" is a TypeError too).
    // Most tests must still need the real code.
    expect(empty.report.passed).toBeLessThan(problem.tests.length / 2);

    // Everything but the last line: the code does not parse, so nothing runs.
    const lines = solutionText(problem).split("\n");
    const half = await judgeWhole(problem, lines.slice(0, lines.length - 1).join("\n"));
    expect(half.accepted).toBe(false);
    expect(half.report.fatal).not.toBeNull();
    // A syntax error is the runner's to report, not a banned pattern.
    expect(half.banned).toBeNull();
  });
});

describe("a banned pattern is refused even when every test passes", () => {
  const withFlat = "function flatten(arr) {\n  return arr.flat(Infinity);\n}\n\n" + partSolution(flatten, 1);

  it("flat() in flatten: the tests pass, the solution is not accepted", async () => {
    const verdict = await judgeWhole(flatten, withFlat);
    expect(verdict.report.failures).toEqual([]);
    expect(verdict.report.passed).toBe(flatten.tests.length);
    expect(verdict.accepted).toBe(false);
    expect(verdict.banned).not.toBeNull();
    expect(verdict.banned?.message).toContain("`flat`");
    expect(verdict.banned?.message).toContain("loop by hand");
  });

  it("says where it is, in lines and columns as the editor counts them", () => {
    const found = bannedIn(flatten, withFlat);
    // Line 2 is "  return arr.flat(Infinity);" and `flat` starts at column 14.
    expect(found).toMatchObject({ line: 2, column: 14, endLine: 2, endColumn: 18 });
  });

  it("forEach in place of the loop of flatten", async () => {
    const code =
      "function flatten(arr) {\n  const result = [];\n  arr.forEach((item) => {\n    if (Array.isArray(item)) {\n      const inner = flatten(item);\n      for (const value of inner) result.push(value);\n    } else {\n      result.push(item);\n    }\n  });\n  return result;\n}\n\n" +
      partSolution(flatten, 1);
    const verdict = await judgeWhole(flatten, code);
    expect(verdict.report.passed).toBe(flatten.tests.length);
    expect(verdict.accepted).toBe(false);
    expect(verdict.banned).toMatchObject({ line: 3 });
    expect(verdict.banned?.message).toContain("`forEach`");
  });

  it("is about calls only: a variable called map, or the Map class, is fine", async () => {
    const code =
      "function memoize(fn) {\n  const map = new Map();\n  return function (...args) {\n    const key = JSON.stringify(args);\n    if (map.has(key)) return map.get(key);\n    const result = fn.apply(this, args);\n    map.set(key, result);\n    return result;\n  };\n}";
    const verdict = await judgeWhole(memoize, code);
    expect(verdict.banned).toBeNull();
    expect(verdict.accepted).toBe(true);
  });

  it("does not hide a real failure: a wrong solution fails its tests", async () => {
    // A debounce that never cancels the old timer.
    const code =
      "function debounce(fn, delay) {\n  return function (...args) {\n    setTimeout(() => {\n      fn.apply(this, args);\n    }, delay);\n  };\n}";
    const verdict = await judgeWhole(debounce, code);
    expect(verdict.banned).toBeNull();
    expect(verdict.accepted).toBe(false);
    expect(verdict.report.passed).toBeLessThan(debounce.tests.length);
    expect(verdict.report.failures.length).toBeGreaterThan(0);
  });

  it("stops an endless loop and reports it, without hanging", async () => {
    const code = "function memoize(fn) {\n  while (true) {}\n}";
    const verdict = await judgeWhole(memoize, code);
    expect(verdict.accepted).toBe(false);
    expect(verdict.report.passed).toBe(0);
  });
});
