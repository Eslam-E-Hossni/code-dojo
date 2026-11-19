/**
 * The key check of the Testing track: does this test really test something?
 *
 * A test is run on the correct code, where it must pass, and then on every
 * buggy version, where it must fail. A test that passes on a buggy version
 * did not check the behaviour that the bug breaks.
 */

import type { TestingProblem } from "@/data/types";
import { runPassed, type TestRunRequest, type TestRunResult } from "./protocol";

export type TestRunner = (request: TestRunRequest) => Promise<TestRunResult>;

export interface BuggyVerdict {
  id: string;
  /** True when the test failed on this version, as it should. */
  caught: boolean;
  /** The learner's tests that failed on it. */
  caughtBy: string[];
}

export interface CheckResult {
  /** The run on the correct code. */
  correct: TestRunResult;
  correctPassed: boolean;
  /** Empty until the test passes on the correct code. */
  buggy: BuggyVerdict[];
  /** Passed on the correct code and failed on every buggy version. */
  solved: boolean;
}

export function filesFor(problem: TestingProblem, testCode: string, buggyId?: string): Record<string, string> {
  const files: Record<string, string> = { ...problem.subject, [problem.testFile]: testCode };
  if (buggyId === undefined) return files;
  for (let i = 0; i < problem.buggy.length; i++) {
    if (problem.buggy[i].id === buggyId) return { ...files, ...problem.buggy[i].files };
  }
  throw new Error("no buggy version " + buggyId);
}

function verdictOf(id: string, result: TestRunResult): BuggyVerdict {
  const caughtBy: string[] = [];
  for (let i = 0; i < result.tests.length; i++) {
    if (result.tests[i].status === "fail") caughtBy.push(result.tests[i].name);
  }
  return { id, caught: !runPassed(result), caughtBy };
}

/**
 * `parallel` runs the buggy versions at the same time. Use it when every
 * run has its own page (the app's iframes); `npm test` shares one page.
 */
export async function checkTest(
  problem: TestingProblem,
  testCode: string,
  run: TestRunner,
  parallel: boolean,
): Promise<CheckResult> {
  const entry = problem.testFile;
  const correct = await run({ files: filesFor(problem, testCode), entry });
  const correctPassed = runPassed(correct);
  if (!correctPassed) return { correct, correctPassed, buggy: [], solved: false };

  const one = async (id: string) => verdictOf(id, await run({ files: filesFor(problem, testCode, id), entry }));
  let buggy: BuggyVerdict[] = [];
  if (parallel) {
    buggy = await Promise.all(problem.buggy.map((version) => one(version.id)));
  } else {
    for (let i = 0; i < problem.buggy.length; i++) buggy.push(await one(problem.buggy[i].id));
  }

  let solved = true;
  for (let i = 0; i < buggy.length; i++) {
    if (!buggy[i].caught) solved = false;
  }
  return { correct, correctPassed, buggy, solved };
}
