import { describe, expect, it } from "vitest";
import { groups } from "@/data/groups";
import { codeProblems, problems } from "@/data/problems";
import { interviewTemplate } from "@/data/template";
import { dataRules } from "./rules";

describe("the problem list", () => {
  it("has unique ids, and every problem is in a known group", () => {
    const ids = new Set(problems.map((problem) => problem.id));
    expect(ids.size).toBe(problems.length);
    const known = new Set(groups.map((group) => group.id));
    for (const problem of problems) expect(known.has(problem.group), problem.id).toBe(true);
  });

  it("has no empty group", () => {
    for (const group of groups) {
      expect(problems.some((problem) => problem.group === group.id), group.id).toBe(true);
    }
  });

  it("has the 7 steps of the interview template", () => {
    expect(interviewTemplate).toHaveLength(7);
    for (const item of interviewTemplate) {
      expect(item.title.trim(), item.id).not.toBe("");
      expect(item.say.trim(), item.id).not.toBe("");
    }
  });
});

describe.each(codeProblems)("data of $id", (problem) => {
  dataRules(problem);
});
