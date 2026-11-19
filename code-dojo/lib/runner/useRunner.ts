"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startRun, type RunHandle } from "./client";
import type { ConsoleEntry, ErrorInfo, RunnerTest, TestStatus } from "./protocol";

export interface TestView {
  /** waiting = not reached yet in this run. */
  status: "waiting" | "running" | TestStatus;
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
  tests: TestView[];
}

export interface RunSummary {
  passed: number;
  total: number;
  allPassed: boolean;
  fatal: boolean;
}

const IDLE: RunView = { phase: "idle", console: [], fatal: null, tests: [] };

export function countPassed(view: RunView): number {
  let passed = 0;
  for (let i = 0; i < view.tests.length; i++) {
    if (view.tests[i].status === "pass") passed++;
  }
  return passed;
}

/** Runs code against the hidden tests in a worker and tracks the result. */
export function useRunner(tests: RunnerTest[]) {
  const [view, setView] = useState<RunView>(IDLE);
  const handle = useRef<RunHandle | null>(null);

  // Leaving the page stops a run that is still going.
  useEffect(() => () => handle.current?.cancel(), []);

  const run = useCallback(
    async (code: string): Promise<RunSummary> => {
      handle.current?.cancel();

      // Built up here, then copied into state after every event.
      const next: RunView = { phase: "running", console: [], fatal: null, tests: [] };
      for (let i = 0; i < tests.length; i++) {
        next.tests.push({ status: "waiting", message: "", logs: [], ms: 0 });
      }
      const publish = () => {
        setView({ ...next, console: [...next.console], tests: [...next.tests] });
      };
      publish();

      const current = startRun({ code, tests }, (event) => {
        if (handle.current !== current) return;
        if (event.type === "console") next.console.push(event.entry);
        if (event.type === "fatal") next.fatal = event.error;
        if (event.type === "test-start") {
          next.tests[event.index] = { ...next.tests[event.index], status: "running" };
        }
        if (event.type === "test-end") next.tests[event.index] = event.result;
        if (event.type === "done") next.phase = "done";
        publish();
      });
      handle.current = current;
      await current.done;

      const passed = countPassed(next);
      return {
        passed,
        total: tests.length,
        allPassed: next.phase === "done" && next.fatal === null && passed === tests.length,
        fatal: next.fatal !== null,
      };
    },
    [tests],
  );

  const clear = useCallback(() => {
    handle.current?.cancel();
    handle.current = null;
    setView(IDLE);
  }, []);

  return { view, run, clear };
}
