import type { CodeProblem } from "@/data/types";

/**
 * The files of the small React app that the live preview runs.
 *
 * Only /App.js is the learner's code. The rest is the frame around it:
 *   /index.js    mounts the app, and stops a render loop
 *   /stage.js    renders the learner's component (a problem can replace it)
 *   /mockApi.js  answers fetch() calls, so no real server is needed
 *   /styles.css  basic looks
 */

/** More commits than this in one second can only be a render loop. */
const COMMITS_PER_SECOND = 300;

const INDEX = `import React, { Profiler } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./mockApi";
import Solution from "./App";
import { Stage } from "./stage";

const host = document.getElementById("root");
const root = createRoot(host);

// An effect that sets state on every render never stops. React only warns
// about it, and the loop would keep the browser busy, so it is stopped here.
let commits = 0;
let since = Date.now();
let stopped = false;

function onCommit() {
  if (stopped) return;
  const now = Date.now();
  if (now - since > 1000) {
    since = now;
    commits = 0;
  }
  commits++;
  if (commits <= ${COMMITS_PER_SECOND}) return;
  stopped = true;
  // A root cannot be unmounted while it is busy with a commit.
  setTimeout(() => {
    root.unmount();
    const note = document.createElement("p");
    note.setAttribute("role", "alert");
    note.className = "dojo-stage-note dojo-stage-stop";
    note.textContent =
      "Stopped: the component rendered more than ${COMMITS_PER_SECOND} times in one second. That is a render loop. Look for an effect that sets state on every render, for example an effect without a dependency array.";
    host.appendChild(note);
  }, 0);
}

root.render(
  <Profiler id="dojo-render-guard" onRender={onCommit}>
    <Stage Solution={Solution} />
  </Profiler>,
);
`;

const DEFAULT_STAGE = `export function Stage({ Solution }) {
  return <Solution />;
}
`;

/**
 * A stand-in for the network. Every request waits a little, can be
 * aborted, and can be switched to fail or to come back empty.
 *
 *   /api/search?q=...   words that contain q
 *   /api/users          five users (also the jsonplaceholder URL)
 *   /api/empty          an empty list
 *   /api/broken         HTTP 404
 *   window.__dojoScenario = "data" | "empty" | "error" changes /api/users
 */
const MOCK_API = `const USERS = [
  { id: 1, name: "Leanne Graham", email: "leanne@example.com" },
  { id: 2, name: "Ervin Howell", email: "ervin@example.com" },
  { id: 3, name: "Clementine Bauch", email: "clementine@example.com" },
  { id: 4, name: "Patricia Lebsack", email: "patricia@example.com" },
  { id: 5, name: "Chelsey Dietrich", email: "chelsey@example.com" },
];

const WORDS = ["apple", "apricot", "avocado", "banana", "blueberry", "cherry", "grape", "lemon", "mango", "orange", "peach", "pear"];

const realFetch = window.fetch.bind(window);

function respond(body, status, delay, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(new DOMException("The request was aborted.", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
    }, delay);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("The request was aborted.", "AbortError"));
      });
    }
  });
}

window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const signal = init.signal;
  const scenario = window.__dojoScenario || "data";

  if (url.includes("/api/search")) {
    const query = decodeURIComponent(url.split("q=")[1] || "").toLowerCase();
    const found = [];
    for (let i = 0; i < WORDS.length; i++) {
      if (WORDS[i].includes(query)) found.push(WORDS[i]);
    }
    return respond(found, 200, 300, signal);
  }
  if (url.includes("/api/broken")) return respond({ message: "Not found" }, 404, 500, signal);
  if (url.includes("/api/empty")) return respond([], 200, 500, signal);
  if (url.includes("/api/users") || url.includes("jsonplaceholder.typicode.com/users")) {
    if (scenario === "error") return respond({ message: "Server error" }, 500, 700, signal);
    if (scenario === "empty") return respond([], 200, 700, signal);
    return respond(USERS, 200, 700, signal);
  }
  return realFetch(input, init);
};
`;

const STYLES = `:root {
  color-scheme: dark;
}
body {
  margin: 0;
  padding: 16px;
  font-family: system-ui, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.5;
  background: #0f141b;
  color: #e9edf3;
}
h1 {
  font-size: 2rem;
  margin: 0 0 12px;
}
button {
  font: inherit;
  margin: 4px 6px 4px 0;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid #3a4658;
  background: #1b222d;
  color: inherit;
  cursor: pointer;
}
button:hover:not(:disabled) {
  border-color: #f2b84b;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
input:not([type="checkbox"]) {
  font: inherit;
  margin: 4px 6px 4px 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #3a4658;
  background: #0c0f14;
  color: inherit;
}
label {
  margin-right: 8px;
}
ul {
  padding-left: 20px;
}
li {
  margin: 4px 0;
}
table {
  border-collapse: collapse;
  width: 100%;
}
caption {
  text-align: left;
  font-weight: 600;
  margin-bottom: 6px;
}
th,
td {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid #28313e;
}
[role="alert"] {
  color: #ff7b72;
}
pre {
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #0c0f14;
  font-size: 13px;
  overflow: auto;
}
button[aria-pressed="true"] {
  border-color: #f2b84b;
  color: #f2b84b;
}
.dojo-stage-bar {
  margin: -16px -16px 16px;
  padding: 8px 16px;
  border-bottom: 1px solid #28313e;
  background: #131821;
  font-size: 13px;
  color: #9ba7b9;
}
.dojo-stage-bar button {
  margin-left: 6px;
  padding: 3px 10px;
}
.dojo-stage-note {
  margin: 16px 0 0;
  padding: 8px 12px;
  border: 1px dashed #3a4658;
  border-radius: 8px;
  font-size: 13px;
  color: #9ba7b9;
}
.dojo-stage-stop {
  border-color: #ff7b72;
  color: #ff7b72;
}
`;

export interface PreviewFile {
  code: string;
  hidden?: boolean;
}

/** The files of the preview for this code. The problem must be a React problem. */
export function buildPreviewFiles(problem: CodeProblem, code: string): Record<string, PreviewFile> {
  const preview = problem.react?.preview ?? {};
  const tail = preview.tail;
  return {
    "/App.js": { code: tail ? code + "\n\n" + tail : code },
    "/index.js": { code: INDEX, hidden: true },
    "/stage.js": { code: preview.stage ?? DEFAULT_STAGE, hidden: true },
    "/mockApi.js": { code: MOCK_API, hidden: true },
    "/styles.css": { code: STYLES, hidden: true },
  };
}
