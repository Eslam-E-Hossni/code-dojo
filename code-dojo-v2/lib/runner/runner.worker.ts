/**
 * The Web Worker that runs the learner's code. One worker serves one run and
 * is then thrown away, so nothing leaks from one run into the next.
 */

import { execute } from "./execute";
import type { RunEvent, RunRequest } from "./protocol";

// The page's type definitions describe `self` as a window. In here it is a worker.
const scope = self as unknown as {
  postMessage(message: RunEvent): void;
  onmessage: ((event: MessageEvent<RunRequest>) => void) | null;
  addEventListener(type: "unhandledrejection", listener: (event: Event) => void): void;
};

// A rejected promise nobody handles must not print to the real browser console.
scope.addEventListener("unhandledrejection", (event) => event.preventDefault());

scope.onmessage = (event) => {
  void execute(event.data, (runEvent) => scope.postMessage(runEvent));
};
