import { afterEach, describe, expect, it } from "vitest";
import { problems } from "@/data/problems";
import type { CodeProblem } from "@/data/types";
import { execute } from "@/lib/runner/execute";
import type { TestResult } from "@/lib/runner/protocol";
import { solutionText } from "@/lib/steps";

interface Report {
  fatal: string | null;
  console: string[];
  results: TestResult[];
}

/**
 * Here the solutions run inside the test process itself, not in a throwaway
 * worker. A polyfill problem adds a method to a built-in prototype, so after
 * every test whatever was added is removed again.
 */
const BUILT_INS: object[] = [Array.prototype, Function.prototype, Object.prototype, String.prototype];
const ORIGINAL_KEYS = BUILT_INS.map((proto) => new Set(Reflect.ownKeys(proto)));

afterEach(() => {
  BUILT_INS.forEach((proto, i) => {
    for (const key of Reflect.ownKeys(proto)) {
      if (ORIGINAL_KEYS[i].has(key)) continue;
      // A property made with defineProperty cannot be deleted. It stays, which is harmless.
      Reflect.deleteProperty(proto, key);
    }
  });
});

async function runHiddenTests(problem: CodeProblem, code: string): Promise<Report> {
  const report: Report = { fatal: null, console: [], results: [] };
  await execute({ code, tests: problem.tests }, (event) => {
    if (event.type === "fatal") report.fatal = event.error.message;
    if (event.type === "console") report.console.push(event.entry.text);
    if (event.type === "test-end") report.results[event.index] = event.result;
  });
  return report;
}

/** The wrong solutions that the tests must reject are in mutants.test.ts. */
describe("every reference solution passes its hidden tests", () => {
  for (const problem of problems) {
    // Output questions are checked in output.test.ts, React problems in react.test.ts.
    if (problem.kind !== "code") continue;
    it(`${problem.id}: ${problem.tests.length} tests`, async () => {
      const report = await runHiddenTests(problem, solutionText(problem));
      expect(report.fatal).toBeNull();
      expect(report.console).toEqual([]);
      const failures = problem.tests
        .map((test, i) => ({ name: test.name, ...report.results[i] }))
        .filter((r) => r.status !== "pass")
        .map((r) => `${r.name} -> ${r.status}: ${r.message}`);
      expect(failures).toEqual([]);
      expect(report.results).toHaveLength(problem.tests.length);
    });
  }
});
