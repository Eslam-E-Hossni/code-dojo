"use client";

import { UNIT_TIMEOUT_MS, type RunEvent, type RunRequest } from "./protocol";

export interface RunHandle {
  /** Resolves when the run is over, however it ended. */
  done: Promise<void>;
  /** Stops the run without reporting anything more. */
  cancel(): void;
}

/**
 * Runs code in a fresh Web Worker and reports what happens through `onEvent`.
 *
 * The worker's own guard stops most endless loops. If a unit of work (the
 * plain run, or one test) still takes more than 2 seconds, the worker is
 * killed from here: that is the only way to stop a thread that never yields.
 */
export function startRun(request: RunRequest, onEvent: (event: RunEvent) => void): RunHandle {
  const worker = new Worker(new URL("./runner.worker.ts", import.meta.url), { type: "module" });

  let finished = false;
  /** -1 while the plain run is going, then the index of the running test. */
  let current = -1;
  const ended = new Set<number>();
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    worker.terminate();
    resolveDone();
  };

  const abandon = (stuckMessage: string, restMessage: string) => {
    if (current === -1) {
      onEvent({ type: "fatal", error: { message: stuckMessage, line: null } });
    }
    for (let i = 0; i < request.tests.length; i++) {
      if (ended.has(i)) continue;
      const stuck = i === current;
      onEvent({
        type: "test-end",
        index: i,
        result: {
          status: stuck ? "timeout" : "skipped",
          message: stuck ? stuckMessage : restMessage,
          logs: [],
          ms: stuck ? UNIT_TIMEOUT_MS : 0,
        },
      });
    }
    onEvent({ type: "done" });
    finish();
  };

  const arm = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      abandon(
        "Timed out: the code ran for more than 2 seconds without stopping. Look for an endless loop.",
        "Not run: an earlier test never finished.",
      );
    }, UNIT_TIMEOUT_MS);
  };

  worker.onmessage = (message: MessageEvent<RunEvent>) => {
    if (finished) return;
    const event = message.data;
    if (event.type === "test-start") {
      current = event.index;
      arm();
    }
    if (event.type === "test-end") ended.add(event.index);
    onEvent(event);
    if (event.type === "done") finish();
  };

  worker.onerror = (event) => {
    if (finished) return;
    event.preventDefault();
    abandon(
      "The runner stopped with an error: " + (event.message || "unknown error"),
      "Not run: the runner stopped.",
    );
  };

  arm();
  worker.postMessage(request);

  return { done, cancel: finish };
}
