/**
 * Runs a test file in the test frame: a hidden iframe that is created for
 * one run and removed after it.
 *
 * The frame is sandboxed without `allow-same-origin`, so the test code has
 * no access to this page, its storage or its cookies. It may run scripts
 * and submit forms, nothing else. Its script is put
 * inline (srcdoc), so the frame itself downloads nothing: the script comes
 * from this page's fetch, which the service worker can answer offline.
 */

import { FRAME_SOURCE, type FrameCommand, type FrameMessage, type TestRunRequest, type TestRunResult } from "./protocol";

const FRAME_SCRIPT = "/test-frame/frame.js";
/** One run: loading the frame, and every test of the file. */
const RUN_TIMEOUT_MS = 30_000;

let script: Promise<string> | null = null;

function loadScript(): Promise<string> {
  if (script === null) {
    script = fetch(FRAME_SCRIPT)
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      })
      .catch((error) => {
        // Try again on the next run.
        script = null;
        throw error;
      });
  }
  return script;
}

function frameDocument(code: string): string {
  // The script sits inside a <script> tag, so these two sequences must not appear as they are.
  const safe = code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Test frame</title></head>' +
    "<body><script>" +
    safe +
    "</script></body></html>"
  );
}

function failed(message: string): TestRunResult {
  return { fatal: message, tests: [], logs: [] };
}

let nextId = 1;

export interface FrameRun {
  done: Promise<TestRunResult>;
  cancel(): void;
}

export function runInFrame(request: TestRunRequest): FrameRun {
  let finish: (result: TestRunResult) => void = () => {};
  let cleanUp = () => {};
  let finished = false;

  const done = new Promise<TestRunResult>((resolve) => {
    finish = (result) => {
      if (finished) return;
      finished = true;
      cleanUp();
      resolve(result);
    };
  });

  loadScript().then(
    (code) => {
      if (finished) return;
      const id = nextId++;
      const focused = document.activeElement as HTMLElement | null;

      const frame = document.createElement("iframe");
      // allow-forms: without it the browser never fires a form's submit
      // event, and every test that submits a form would fail.
      frame.setAttribute("sandbox", "allow-scripts allow-forms");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.title = "Test frame";
      // Out of sight, but with a real size: Testing Library reads layout and styles.
      frame.style.cssText =
        "position:fixed;left:-10000px;top:0;width:1024px;height:768px;border:0;opacity:0;pointer-events:none";

      const onMessage = (event: MessageEvent) => {
        if (event.source !== frame.contentWindow) return;
        const data = event.data as FrameMessage | undefined;
        if (!data || data.source !== FRAME_SOURCE) return;
        if (data.type === "ready") {
          const command: FrameCommand = { source: FRAME_SOURCE, type: "run", id, request };
          // The frame has no origin of its own, so "*" is the only address that reaches it.
          frame.contentWindow?.postMessage(command, "*");
        } else if (data.type === "result" && data.id === id) {
          finish(data.result);
        }
      };

      const timer = setTimeout(() => {
        finish(
          failed(
            "The tests did not finish in " +
              RUN_TIMEOUT_MS / 1000 +
              " seconds. Look for a promise that never settles, or a loop that never ends.",
          ),
        );
      }, RUN_TIMEOUT_MS);

      cleanUp = () => {
        clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        frame.remove();
        // A test that focuses an input can pull the focus into the frame.
        if (focused && document.activeElement !== focused && document.contains(focused)) focused.focus();
      };

      window.addEventListener("message", onMessage);
      frame.srcdoc = frameDocument(code);
      document.body.appendChild(frame);
    },
    () => finish(failed("The test runner could not be loaded. Check the connection and run again.")),
  );

  return { done, cancel: () => finish(failed("Cancelled.")) };
}

/** The same thing as a plain function, for the checker. */
export function runTestsInFrame(request: TestRunRequest): Promise<TestRunResult> {
  return runInFrame(request).done;
}
