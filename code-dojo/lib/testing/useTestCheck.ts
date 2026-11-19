"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TestingProblem } from "@/data/types";
import { checkTest, type CheckResult } from "./check";
import { runTestsInFrame } from "./client";

export type TestCheckState =
  | { phase: "idle" }
  | { phase: "running" }
  /** `code` is the test that was checked. */
  | { phase: "done"; result: CheckResult; code: string };

const IDLE: TestCheckState = { phase: "idle" };

/**
 * Runs the learner's test for an exercise of the Testing track: on the
 * correct code, then on every buggy version, each in its own test frame.
 * Pass null for problems of another kind; the hook then does nothing.
 */
export function useTestCheck(problem: TestingProblem | null) {
  const [state, setState] = useState<TestCheckState>(IDLE);
  // A newer run, a reset or leaving the page makes an older result worthless.
  const latest = useRef(0);

  useEffect(
    () => () => {
      latest.current++;
    },
    [],
  );

  const run = useCallback(
    async (code: string): Promise<CheckResult | null> => {
      if (problem === null) return null;
      const mine = ++latest.current;
      setState({ phase: "running" });
      const result = await checkTest(problem, code, runTestsInFrame, true);
      if (latest.current !== mine) return null;
      setState({ phase: "done", result, code });
      return result;
    },
    [problem],
  );

  const clear = useCallback(() => {
    latest.current++;
    setState(IDLE);
  }, []);

  return { state, run, clear };
}
