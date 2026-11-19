/**
 * Messages between the page and the runner worker.
 *
 * The page sends one RunRequest. The worker answers with a stream of
 * RunEvents, so results that are already known survive if the worker has to
 * be killed (an endless loop cannot be stopped any other way).
 */

export interface RunnerTest {
  name: string;
  /** JavaScript source of the test body. */
  code: string;
}

export interface RunRequest {
  /** The learner's code. */
  code: string;
  tests: RunnerTest[];
}

export type ConsoleLevel = "log" | "info" | "warn" | "error";

export interface ConsoleEntry {
  level: ConsoleLevel;
  text: string;
}

export interface ErrorInfo {
  /** For example "TypeError: fn is not a function". */
  message: string;
  /** Line in the learner's code, when it is known. */
  line: number | null;
}

export type TestStatus = "pass" | "fail" | "timeout" | "skipped";

export interface TestResult {
  status: TestStatus;
  /** Why it failed. Empty for a pass. */
  message: string;
  /** What the learner's code printed while this test ran. */
  logs: ConsoleEntry[];
  ms: number;
}

export type RunEvent =
  /** Output of the learner's own top-level code. */
  | { type: "console"; entry: ConsoleEntry }
  /** The code could not run at all: a syntax error, or it threw at the top level. */
  | { type: "fatal"; error: ErrorInfo }
  | { type: "test-start"; index: number }
  | { type: "test-end"; index: number; result: TestResult }
  | { type: "done" };

/** Real time allowed for one unit of work (the plain run, or one test). */
export const UNIT_TIMEOUT_MS = 2000;

/** A loop that turns more often than this in one unit is treated as endless. */
export const LOOP_LIMIT = 2_000_000;
