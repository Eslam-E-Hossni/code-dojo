/**
 * What goes in and out of one test run.
 *
 * A run takes a small set of files (the test the learner wrote, and the
 * code under test) and gives back one result per test.
 */

export interface TestRunRequest {
  /** Every file of the run, by path: "/Counter.js", "/Counter.test.js". */
  files: Record<string, string>;
  /** The test file to run. */
  entry: string;
}

export type TestStatus = "pass" | "fail" | "skip";

export interface TestOutcome {
  /** The names of the describe blocks around the test, outermost first. */
  blocks: string[];
  name: string;
  status: TestStatus;
  /** The failure message, as Jest words it. Empty when the test passed. */
  message: string;
  /** How many expect() calls ran. A passing test with none proves nothing. */
  assertions: number;
  ms: number;
}

export interface TestLog {
  level: "log" | "warn" | "error";
  text: string;
}

export interface TestRunResult {
  /** An error that stopped the file before or outside its tests. Null when it ran. */
  fatal: string | null;
  tests: TestOutcome[];
  logs: TestLog[];
}

/** True when the file ran, has at least one test that ran, and none failed. */
export function runPassed(result: TestRunResult): boolean {
  if (result.fatal !== null) return false;
  let ran = 0;
  for (let i = 0; i < result.tests.length; i++) {
    if (result.tests[i].status === "fail") return false;
    if (result.tests[i].status === "pass") ran++;
  }
  return ran > 0;
}

/** Messages between the page and the test frame. */
export const FRAME_SOURCE = "dojo-test-frame";

export type FrameMessage =
  | { source: typeof FRAME_SOURCE; type: "ready" }
  | { source: typeof FRAME_SOURCE; type: "result"; id: number; result: TestRunResult };

export interface FrameCommand {
  source: typeof FRAME_SOURCE;
  type: "run";
  id: number;
  request: TestRunRequest;
}
