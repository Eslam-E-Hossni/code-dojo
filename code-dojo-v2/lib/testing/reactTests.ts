/**
 * The hidden tests of a React problem.
 *
 * Each test of the problem is the body of an async Jest test. This file
 * puts them together into one test file, next to the learner's code as
 * /App.js, and turns the result of the test frame back into the events
 * that the Tests and Console tabs already understand.
 */

import type { CodeProblem, TestCase } from "@/data/types";
import type { RunEvent } from "@/lib/runner/protocol";
import type { TestRunRequest, TestRunResult } from "./protocol";

export const APP_FILE = "/App.js";
const TEST_FILE = "/App.test.js";
/** A name of the API that the code does not export is handed to the tests under this prefix. */
const HANDLE = "__dojo_";

/** The full reference solution: every part, joined. (Kept here so this file needs nothing from the checker.) */
function referenceOf(problem: CodeProblem): string {
  const parts: string[] = [];
  for (const part of problem.parts) {
    const lines: string[] = [];
    for (const step of part.steps) lines.push(step.expected);
    parts.push(lines.join("\n"));
  }
  return parts.join("\n\n");
}

/** True when the reference exports this name as the default export. */
function isDefaultExport(reference: string, name: string): boolean {
  return (
    new RegExp("export\\s+default\\s+(async\\s+)?(function\\*?|class)\\s+" + name + "\\b").test(reference) ||
    new RegExp("export\\s+default\\s+" + name + "\\s*;").test(reference)
  );
}

/**
 * The learner's code as the file the tests import.
 *
 * A hook or a component that the answer does not export (a helper used by
 * the default component, or a hook that only the preview's demo uses) is
 * still part of what is tested. So each name of the API is also handed
 * out under a second name. `typeof` keeps this safe while the name is not
 * written yet: in Learn the first part is tested before the second exists.
 */
export function reactAppFile(problem: CodeProblem, code: string): string {
  const reference = referenceOf(problem);
  const lines = [code];
  for (const name of problem.api) {
    if (isDefaultExport(reference, name)) continue;
    lines.push("export const " + HANDLE + name + " = typeof " + name + ' === "undefined" ? undefined : ' + name + ";");
  }
  return lines.join("\n");
}

/** The test file for these tests of the problem. */
export function reactTestFile(problem: CodeProblem, tests: TestCase[]): string {
  const reference = referenceOf(problem);
  const lines = [
    'import React from "react";',
    'import { render, screen, fireEvent, act, waitFor, within, renderHook } from "@testing-library/react";',
    'import userEvent from "@testing-library/user-event";',
    'import * as Solution from "./App";',
  ];
  // Every name of the API, as the learner's file gives it.
  for (const name of problem.api) {
    lines.push("const " + name + " = " + (isDefaultExport(reference, name) ? "Solution.default" : "Solution." + HANDLE + name) + ";");
  }
  // Every test starts with real time and without the mocks of the test before it.
  lines.push("afterEach(() => {\n  jest.useRealTimers();\n  jest.restoreAllMocks();\n});");
  const setup = problem.react?.testSetup;
  if (setup !== undefined && setup.trim() !== "") lines.push(setup);
  for (const test of tests) {
    // The id is the name of the Jest test: results are matched back by it.
    lines.push("test(" + JSON.stringify(test.id) + ", async () => {\n" + test.code + "\n});");
  }
  return lines.join("\n");
}

/** What the test frame is asked to run: the learner's code and the hidden tests. */
export function reactRequest(problem: CodeProblem, code: string, tests: TestCase[]): TestRunRequest {
  return {
    files: { [APP_FILE]: reactAppFile(problem, code), [TEST_FILE]: reactTestFile(problem, tests) },
    entry: TEST_FILE,
  };
}

/**
 * The result of the test frame, as the events of a run: console lines,
 * an error that stopped everything, then one result per test, in the
 * order of `tests`.
 */
export function reactEvents(result: TestRunResult, tests: TestCase[]): RunEvent[] {
  const events: RunEvent[] = [];
  for (const log of result.logs) events.push({ type: "console", entry: { level: log.level, text: log.text } });
  if (result.fatal !== null) events.push({ type: "fatal", error: { message: result.fatal, line: null } });

  for (let i = 0; i < tests.length; i++) {
    const outcome = result.tests.find((item) => item.name === tests[i].id);
    events.push({ type: "test-start", index: i });
    if (outcome === undefined) {
      events.push({
        type: "test-end",
        index: i,
        result: {
          status: "skipped",
          message: result.fatal !== null ? "Not run: the code could not be loaded." : "Not run.",
          logs: [],
          ms: 0,
        },
      });
      continue;
    }
    events.push({
      type: "test-end",
      index: i,
      result: {
        status: outcome.status === "pass" ? "pass" : outcome.status === "fail" ? "fail" : "skipped",
        message: outcome.message,
        logs: [],
        ms: outcome.ms,
      },
    });
  }
  events.push({ type: "done" });
  return events;
}
