// @vitest-environment jsdom
import { writeFileSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";
import { problems } from "@/data/problems";
import type { TestingProblem } from "@/data/types";
import { checkTest, filesFor } from "@/lib/testing/check";
import { runFiles } from "@/lib/testing/frame/run";
import { solutionText } from "@/lib/steps";

/**
 * The Testing track stands on one promise: an exercise is solved only by a
 * test that passes on the correct code and fails on every buggy version.
 *
 * So every reference test (the steps of the exercise, joined) is run here
 * on the correct code and on each buggy version. After that, weak tests
 * that forget one assertion prove that the check does notice a gap.
 */

const exercises = problems.filter((p): p is TestingProblem => p.kind === "test");

// All runs here share one page (jsdom), so a run must never be cut short:
// its leftovers would land in the next one. In the app every run has its own iframe.
vi.setConfig({ testTimeout: 120_000 });

function find(id: string): TestingProblem {
  const problem = exercises.find((p) => p.id === id);
  if (!problem) throw new Error("no testing exercise " + id);
  return problem;
}

const table: string[] = [];

afterAll(() => {
  // The table of results for the report: DOJO_TABLE=path/to/file npm test
  if (process.env.DOJO_TABLE) writeFileSync(process.env.DOJO_TABLE, table.join("\n") + "\n");
});

describe("every reference test passes on the correct code and fails on every buggy version", () => {
  for (const problem of exercises) {
    describe(problem.id, () => {
      const reference = solutionText(problem);

      it("passes on the correct code", async () => {
        const result = await runFiles({ files: filesFor(problem, reference), entry: problem.testFile });
        expect(result.fatal).toBeNull();
        const failures = result.tests.filter((t) => t.status !== "pass").map((t) => t.name + ": " + t.message);
        expect(failures).toEqual([]);
        expect(result.tests.length).toBeGreaterThan(0);
        // A test with no expect proves nothing.
        expect(result.tests.filter((t) => t.assertions === 0).map((t) => t.name)).toEqual([]);
        // React complains through console.error: a missing act(), a missing key.
        expect(result.logs.filter((log) => log.level === "error")).toEqual([]);
        table.push(`${problem.id} | correct | PASS (${result.tests.length} tests)`);
      });

      it("fails on every buggy version, so the whole check says solved", async () => {
        const check = await checkTest(problem, reference, runFiles, false);
        expect(check.correctPassed).toBe(true);
        expect(check.buggy.map((b) => b.id)).toEqual(problem.buggy.map((b) => b.id));
        for (const verdict of check.buggy) {
          // The buggy code still loads: the test fails on behaviour, with a named test.
          expect(verdict.caughtBy.length, problem.id + " did not fail on " + verdict.id).toBeGreaterThan(0);
          expect(verdict.caught).toBe(true);
          table.push(`${problem.id} | buggy: ${verdict.id} | FAIL as it should (caught by "${verdict.caughtBy[0]}")`);
        }
        expect(check.solved).toBe(true);
      });
    });
  }
});

describe("the exercises are well formed", () => {
  for (const problem of exercises) {
    it(problem.id, () => {
      expect(problem.testFile).toMatch(/^\/[\w.-]+\.test\.js$/);
      expect(Object.keys(problem.subject).length).toBeGreaterThan(0);
      expect(problem.subject[problem.testFile]).toBeUndefined();
      expect(problem.buggy.length).toBeGreaterThanOrEqual(3);
      const ids = new Set<string>();
      for (const version of problem.buggy) {
        expect(ids.has(version.id), version.id).toBe(false);
        ids.add(version.id);
        expect(version.bug.trim().length).toBeGreaterThan(0);
        // The hint is Arabic and must never hand over code.
        expect(version.missed, version.id).toMatch(/[؀-ۿ]/);
        expect(version.missed, version.id).not.toMatch(/expect\(|toBe|toHave|getBy|=>|;\s*$/);
        for (const path of Object.keys(version.files)) {
          // A buggy version replaces a file of the subject, and really changes it.
          expect(problem.subject[path], version.id + " " + path).toBeDefined();
          expect(version.files[path]).not.toBe(problem.subject[path]);
        }
      }
      // The interview sentence is about the tool, never about past work.
      expect(problem.interview).not.toMatch(/\b(I have|I've|I used|I worked|my team|in production|years?)\b/i);
      expect(problem.followUps).toHaveLength(3);
      for (const followUp of problem.followUps) {
        expect(followUp.how?.trim().length, followUp.question).toBeGreaterThan(0);
        expect(followUp.example?.trim().length, followUp.question).toBeGreaterThan(0);
        const all = followUp.answer + " " + followUp.how + " " + followUp.example;
        expect(all).not.toMatch(/\b(I have|I've|I used|I worked|my team|in production|years?)\b/i);
      }
    });
  }
});

/** A test that passes on the correct code but forgot one thing. */
interface WeakTest {
  id: string;
  what: string;
  test: string;
  /** The buggy versions it must NOT catch. */
  misses: string[];
}

const WEAK: WeakTest[] = [
  {
    id: "test-counter",
    what: "clicks plus but only checks that something is still on screen",
    test: `import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Counter from "./Counter";

it("clicks plus", async () => {
  const user = userEvent.setup();
  render(<Counter />);
  await user.click(screen.getByRole("button", { name: "+" }));
  expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
});`,
    misses: ["starts-at-one", "plus-does-nothing", "plus-adds-two", "minus-adds", "reset-does-nothing"],
  },
  {
    id: "test-counter",
    what: "tests plus well but has no test for minus or Reset",
    test: `import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Counter from "./Counter";

it("adds one", async () => {
  const user = userEvent.setup();
  render(<Counter />);
  expect(screen.getByText("Count: 0")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "+" }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});`,
    misses: ["minus-adds", "reset-does-nothing"],
  },
];

describe("a weak test is not accepted: the check names what it missed", () => {
  for (const weak of WEAK) {
    it(`${weak.id}: ${weak.what}`, async () => {
      const problem = find(weak.id);
      const check = await checkTest(problem, weak.test, runFiles, false);
      expect(check.correct.fatal).toBeNull();
      expect(check.correctPassed).toBe(true);
      expect(check.solved).toBe(false);
      expect(check.buggy.filter((b) => !b.caught).map((b) => b.id)).toEqual(weak.misses);
    });
  }

  it("a test that fails on the correct code is not run on the buggy versions", async () => {
    const problem = find("test-counter");
    const wrong = `import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Counter from "./Counter";
it("expects the wrong start", () => {
  render(<Counter />);
  expect(screen.getByText("Count: 5")).toBeInTheDocument();
});`;
    const check = await checkTest(problem, wrong, runFiles, false);
    expect(check.correctPassed).toBe(false);
    expect(check.buggy).toEqual([]);
    expect(check.solved).toBe(false);
    expect(check.correct.tests[0].message).toContain("Unable to find an element with the text: Count: 5");
  });

  it("an empty file and a file with a syntax error are not solved", async () => {
    const problem = find("test-counter");
    expect((await checkTest(problem, "", runFiles, false)).solved).toBe(false);
    const broken = await checkTest(problem, "it(", runFiles, false);
    expect(broken.solved).toBe(false);
    expect(broken.correct.fatal).toContain("SyntaxError");
  });
});
