/**
 * The script of the test frame: a hidden, sandboxed iframe that the app
 * creates for one test run and then throws away (see ../client.ts).
 *
 * scripts/build-test-frame.mjs bundles this file, with React, Testing
 * Library and the Jest parts, into public/test-frame/frame.js.
 */

import { FRAME_SOURCE, type FrameCommand, type FrameMessage } from "../protocol";
import { installFastTimers } from "./fastTimers";
import { installFocusEvents } from "./focus";
import { runFiles } from "./run";

// The frame is hidden: the browser gives it no focus and slows its timers.
installFastTimers(window);
installFocusEvents(window);

function send(message: FrameMessage): void {
  // The frame has no origin of its own, so it cannot name the page's origin.
  // The message carries only test results.
  window.parent.postMessage(message, "*");
}

let busy = false;

window.addEventListener("message", (event) => {
  const data = event.data as FrameCommand | undefined;
  if (event.source !== window.parent || !data || data.source !== FRAME_SOURCE || data.type !== "run" || busy) return;
  busy = true;
  runFiles(data.request)
    .catch((error) => ({ fatal: "The test runner stopped: " + String(error), tests: [], logs: [] }))
    .then((result) => send({ source: FRAME_SOURCE, type: "result", id: data.id, result }));
});

send({ source: FRAME_SOURCE, type: "ready" });
