// @vitest-environment jsdom
/**
 * The React problems, checked like every other problem. Their hidden
 * tests render the component with React Testing Library, so this file
 * runs on jsdom.
 */
import { describe, expect, it } from "vitest";
import { reactProblems } from "@/data/problems";
import { solutionText } from "@/lib/checker/check";
import { judgeWhole } from "./helpers";
import { dataRules, referenceRules } from "./rules";

describe("the React group", () => {
  it("has the ten problems of the list, in its order", () => {
    expect(reactProblems.map((problem) => problem.id)).toEqual([
      "react-counter",
      "react-timer",
      "react-auto-counter",
      "react-todos",
      "react-debounce-search",
      "react-use-fetch",
      "react-use-context",
      "react-users-table",
      "react-wizard",
      "react-review",
    ]);
  });
});

describe.each(reactProblems)("data of $id", (problem) => {
  dataRules(problem);
});

// Every reference solution against its hidden tests, and every reference
// line through the smart checker: accepted at the first attempt.
describe.each(reactProblems)("reference of $id", (problem) => {
  referenceRules(problem);
});

describe.each(reactProblems)("$id written whole, as in Recall and Exam", (problem) => {
  it("the reference solution passes every hidden test and has nothing risky", async () => {
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
    expect(empty.report.passed).toBe(0);

    // Everything but the last line: the code does not parse, so nothing runs.
    const lines = solutionText(problem).split("\n");
    const half = await judgeWhole(problem, lines.slice(0, lines.length - 1).join("\n"));
    expect(half.accepted).toBe(false);
    expect(half.report.passed).toBe(0);
    // A syntax error is the runner's to report, not a risky pattern.
    expect(half.banned).toBeNull();
  });

  it("a starter with bugs, when there is one, fails the hidden tests", async () => {
    const starter = problem.react?.starter;
    if (starter === undefined) return;
    const verdict = await judgeWhole(problem, starter);
    expect(verdict.accepted).toBe(false);
    expect(verdict.report.passed).toBeLessThan(problem.tests.length);
  }, 30_000);
});
