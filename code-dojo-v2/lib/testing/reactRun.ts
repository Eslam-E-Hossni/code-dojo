"use client";

import type { CodeProblem, TestCase } from "@/data/types";
import type { RunHandle } from "@/lib/runner/client";
import type { RunEvent } from "@/lib/runner/protocol";
import { runInFrame } from "./client";
import { reactEvents, reactRequest } from "./reactTests";

/**
 * Runs the hidden tests of a React problem in the test frame, and reports
 * through the same events as the worker of the plain JavaScript problems.
 * The frame answers once, at the end, so the events come together.
 */
export function startReactRun(
  problem: CodeProblem,
  code: string,
  tests: TestCase[],
  onEvent: (event: RunEvent) => void,
): RunHandle {
  const run = runInFrame(reactRequest(problem, code, tests));
  let cancelled = false;
  const done = run.done.then((result) => {
    if (cancelled) return;
    for (const event of reactEvents(result, tests)) onEvent(event);
  });
  return {
    done,
    cancel: () => {
      cancelled = true;
      run.cancel();
    },
  };
}
