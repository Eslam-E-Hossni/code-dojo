"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CodeProblem, TestCase } from "@/data/types";
import { startReactRun } from "@/lib/testing/reactRun";
import { startRun, type RunHandle } from "./client";
import type { ConsoleEntry, ErrorInfo, TestStatus } from "./protocol";

export interface TestView {
  /** waiting = not reached yet in this run. left-out = this run was not about this test. */
  status: "waiting" | "running" | "left-out" | TestStatus;
  message: string;
  logs: ConsoleEntry[];
  ms: number;
}

export interface RunView {
  /** idle = nothing has been run yet. */
  phase: "idle" | "running" | "done";
  console: ConsoleEntry[];
  /** A syntax error, or an error that stopped the code before the tests. */
  fatal: ErrorInfo | null;
  /** One entry per test of the problem, in the same order. */
  tests: TestView[];
}

export interface RunSummary {
  passed: number;
  /** How many tests this run was about. */
  total: number;
  allPassed: boolean;
  fatal: boolean;
  /** The finished view, for a caller that needs each result. */
  view: RunView;
}

const IDLE: RunView = { phase: "idle", console: [], fatal: null, tests: [] };

export function countPassed(view: RunView): number {
  let passed = 0;
  for (let i = 0; i < view.tests.length; i++) {
    if (view.tests[i].status === "pass") passed++;
  }
  return passed;
}

/** How many tests the run was about: all of them, minus the ones left out. */
export function countRun(view: RunView): number {
  let count = 0;
  for (let i = 0; i < view.tests.length; i++) {
    if (view.tests[i].status !== "left-out") count++;
  }
  return count;
}

/**
 * Runs code against the hidden tests of a problem and tracks the result.
 * Plain JavaScript runs in a Web Worker. A React problem runs in the test
 * frame, with React Testing Library.
 *
 * `run(code)` runs every test. `run(code, only)` runs the tests at these
 * positions and leaves the others out: in Learn mode a function that is
 * not written yet has nothing to test.
 */
export function useRunner(problem: CodeProblem) {
  const tests = problem.tests;
  const [view, setView] = useState<RunView>(IDLE);
  const handle = useRef<RunHandle | null>(null);

  // Leaving the page stops a run that is still going.
  useEffect(() => () => handle.current?.cancel(), []);

  const run = useCallback(
    async (code: string, only?: number[]): Promise<RunSummary> => {
      handle.current?.cancel();

      /** Position in this run -> position in the problem's list. */
      const chosen: number[] = [];
      for (let i = 0; i < tests.length; i++) {
        if (only === undefined || only.includes(i)) chosen.push(i);
      }
      const subset: TestCase[] = [];
      for (const index of chosen) subset.push(tests[index]);

      // Built up here, then copied into state after every event.
      const next: RunView = { phase: "running", console: [], fatal: null, tests: [] };
      for (let i = 0; i < tests.length; i++) {
        next.tests.push({ status: chosen.includes(i) ? "waiting" : "left-out", message: "", logs: [], ms: 0 });
      }
      const publish = () => {
        setView({ ...next, console: [...next.console], tests: [...next.tests] });
      };
      publish();

      const report = (event: Parameters<Parameters<typeof startRun>[1]>[0]) => {
        if (handle.current !== current) return;
        if (event.type === "console") next.console.push(event.entry);
        if (event.type === "fatal") next.fatal = event.error;
        if (event.type === "test-start") {
          const at = chosen[event.index];
          next.tests[at] = { ...next.tests[at], status: "running" };
        }
        if (event.type === "test-end") next.tests[chosen[event.index]] = event.result;
        if (event.type === "done") next.phase = "done";
        publish();
      };
      // The handle must be known before the first event can come, so the run starts one tick later.
      let current: RunHandle = { done: Promise.resolve(), cancel: () => {} };
      current =
        problem.react !== undefined
          ? startReactRun(problem, code, subset, (event) => report(event))
          : startRun({ code, tests: subset }, (event) => report(event));
      handle.current = current;
      await current.done;

      // The run was stopped from outside (the page was left). Without this the
      // view would say "running" for ever. A newer run owns the view, so only
      // the latest run may write it.
      if (next.phase !== "done" && handle.current === current) {
        next.phase = "done";
        for (let i = 0; i < next.tests.length; i++) {
          const status = next.tests[i].status;
          if (status === "waiting" || status === "running") {
            next.tests[i] = { status: "skipped", message: "Not run: the run was stopped.", logs: [], ms: 0 };
          }
        }
        publish();
      }

      const passed = countPassed(next);
      return {
        passed,
        total: chosen.length,
        allPassed: next.phase === "done" && next.fatal === null && passed === chosen.length,
        fatal: next.fatal !== null,
        view: next,
      };
    },
    [problem, tests],
  );

  const clear = useCallback(() => {
    handle.current?.cancel();
    handle.current = null;
    setView(IDLE);
  }, []);

  return { view, run, clear };
}
