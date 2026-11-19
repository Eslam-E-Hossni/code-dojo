import type { CodeProblem, TestCase } from "@/data/types";
import { check, EMPTY_STATE, flattenSteps, type CheckState, type Deps, type TestReport, type Verdict } from "@/lib/checker/check";
import { bannedIn, type BannedFinding } from "@/lib/practice";
import { execute } from "@/lib/runner/execute";
import type { RunEvent } from "@/lib/runner/protocol";
import { reactEvents, reactRequest } from "@/lib/testing/reactTests";

/**
 * The built-ins a polyfill problem adds a method to. In the browser every
 * run has a fresh worker, so `Array.prototype.myMap` is gone with it. Here
 * all runs share one process, so what a run added is taken away after it:
 * otherwise an empty solution would pass because an earlier run left the
 * method behind.
 */
const SHARED: object[] = [Array.prototype, Function.prototype, Object.prototype, String.prototype, Promise, Promise.prototype, JSON, Object];

async function inCleanGlobals<T>(work: () => Promise<T>): Promise<T> {
  const before = SHARED.map((target) => new Set(Reflect.ownKeys(target)));
  try {
    return await work();
  } finally {
    SHARED.forEach((target, i) => {
      for (const key of Reflect.ownKeys(target)) {
        if (!before[i].has(key)) Reflect.deleteProperty(target, key);
      }
    });
  }
}

/** Runs hidden tests in this process, the way the worker runs them in the browser. */
export async function runTests(code: string, tests: TestCase[]): Promise<TestReport> {
  const report: TestReport = { passed: 0, total: tests.length, failures: [], fatal: null };
  await inCleanGlobals(() =>
    execute({ code, tests }, (event) => {
      if (event.type === "fatal") report.fatal = event.error.message;
      if (event.type === "test-end") {
        if (event.result.status === "pass") report.passed++;
        else report.failures.push({ name: tests[event.index].name, message: event.result.message });
      }
    }),
  );
  return report;
}

function collect(tests: TestCase[]): { report: TestReport; onEvent: (event: RunEvent) => void } {
  const report: TestReport = { passed: 0, total: tests.length, failures: [], fatal: null };
  const onEvent = (event: RunEvent) => {
    if (event.type === "fatal") report.fatal = event.error.message;
    if (event.type === "test-end") {
      if (event.result.status === "pass") report.passed++;
      else report.failures.push({ name: tests[event.index].name, message: event.result.message });
    }
  };
  return { report, onEvent };
}

/**
 * Runs the hidden tests of a React problem, the way the test frame runs
 * them in the browser. It needs a DOM, so the test file that calls it
 * starts with "// @vitest-environment jsdom".
 */
export async function runReactTests(problem: CodeProblem, code: string, tests: TestCase[]): Promise<TestReport> {
  if (typeof document === "undefined") throw new Error("React tests need the jsdom environment");
  const { runFiles } = await import("@/lib/testing/frame/run");
  const result = await runFiles(reactRequest(problem, code, tests));
  const { report, onEvent } = collect(tests);
  for (const event of reactEvents(result, tests)) onEvent(event);
  return report;
}

/** The right runner for a problem: the worker's code for plain JavaScript, the test frame's code for React. */
export function runnerFor(problem: CodeProblem): (code: string, tests: TestCase[]) => Promise<TestReport> {
  if (problem.react !== undefined) return (code, tests) => runReactTests(problem, code, tests);
  return runTests;
}

export const deps: Deps = { runTests };

export interface Typed {
  /** What was typed for this check. */
  input: string;
  verdict: Verdict;
}

export interface Session {
  problem: CodeProblem;
  state: CheckState;
  log: Typed[];
  /** True when every step of the problem is done. */
  finished: boolean;
}

/**
 * Types a solution the way a learner does: one piece at a time, Enter
 * after each. When the checker says "right so far, keep typing", the next
 * piece is added to the same input, as it would be in the editor.
 * It stops at the first piece that is refused.
 */
export async function type(problem: CodeProblem, pieces: string[], extra: Partial<Deps> = {}): Promise<Session> {
  let state = EMPTY_STATE;
  const log: Typed[] = [];
  let pending = "";

  for (const piece of pieces) {
    const input = pending === "" ? piece : pending + "\n" + piece;
    const verdict = await check(problem, state, input, { runTests: runnerFor(problem), ...extra });
    log.push({ input, verdict });
    if (verdict.kind === "accept") {
      state = verdict.state;
      pending = "";
    } else if (verdict.kind === "partial") {
      pending = input;
    } else {
      break;
    }
  }
  return { problem, state, log, finished: state.done.length === flattenSteps(problem).length };
}

export interface WholeVerdict {
  report: TestReport;
  banned: BannedFinding | null;
  /** What Recall and Exam need to call the solution done. */
  accepted: boolean;
}

/** Judges a whole solution the way Recall and Exam do: every hidden test, and no banned pattern. */
export async function judgeWhole(problem: CodeProblem, code: string): Promise<WholeVerdict> {
  const report = await runnerFor(problem)(code, problem.tests);
  const banned = bannedIn(problem, code);
  return { report, banned, accepted: report.fatal === null && report.passed === report.total && banned === null };
}

/** A short view of a session for failure messages. */
export function story(session: Session): string[] {
  return session.log.map((entry) => {
    const verdict = entry.verdict;
    const what =
      verdict.kind === "accept"
        ? "accept x" + verdict.steps.length + " via " + verdict.via
        : verdict.kind === "reject"
          ? "REJECT (" + verdict.reason + "): " + verdict.message
          : verdict.kind;
    return JSON.stringify(entry.input.split("\n").pop()) + " -> " + what;
  });
}
