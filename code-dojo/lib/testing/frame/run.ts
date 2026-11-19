/**
 * Runs one test file, the way Jest would, on the DOM of the page it is in.
 *
 * In the app that page is a hidden, isolated iframe (see main.ts and
 * ../client.ts), so a test never touches the app itself. In `npm test` the
 * same code runs on jsdom.
 *
 * The parts are Jest's own: `expect` for the matchers and their messages,
 * jest-mock for mock functions, @sinonjs/fake-timers for fake timers. The
 * test framework (describe, it, hooks) and the module system (imports,
 * jest.mock) are small and live next to this file.
 */

import * as DomTestingLibrary from "@testing-library/dom";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";
import * as ReactTestingLibrary from "@testing-library/react";
import * as UserEventLibrary from "@testing-library/user-event";
import { expect } from "expect";
import * as React from "react";
import * as ReactDom from "react-dom";
import * as ReactDomClient from "react-dom/client";
import * as JsxRuntime from "react/jsx-runtime";
import { LOOP_LIMIT } from "../../runner/protocol";
import type { TestLog, TestRunRequest, TestRunResult } from "../protocol";
import { Framework } from "./framework";
import { createJest } from "./jestObject";
import { Modules } from "./modules";

const MAX_LOGS = 60;

/** A compiled file reads `default` through an interop helper, so every library gets one. */
function asModule(namespace: object): Record<string, unknown> {
  const source = namespace as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source)) out[key] = source[key];
  if (!("default" in out)) out.default = source;
  Object.defineProperty(out, "__esModule", { value: true });
  return out;
}

const userEvent = asModule(UserEventLibrary);

const BUILTINS: Record<string, unknown> = {
  react: asModule(React),
  "react-dom": asModule(ReactDom),
  "react-dom/client": asModule(ReactDomClient),
  "react/jsx-runtime": asModule(JsxRuntime),
  "@testing-library/react": asModule(ReactTestingLibrary),
  "@testing-library/dom": asModule(DomTestingLibrary),
  "@testing-library/user-event": userEvent,
  // Its matchers are added to expect below, so importing it changes nothing more.
  "@testing-library/jest-dom": {},
  "@testing-library/jest-dom/extend-expect": {},
};

// toBeInTheDocument, toHaveTextContent and the rest.
const matchers: Record<string, never> = {};
for (const name of Object.keys(jestDomMatchers)) {
  const matcher = (jestDomMatchers as Record<string, unknown>)[name];
  if (typeof matcher === "function") matchers[name] = matcher as never;
}
expect.extend(matchers);

function errorText(error: unknown): string {
  const text = error instanceof Error ? (error.name && error.name !== "Error" ? error.name + ": " : "") + error.message : String(error);
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function logText(args: unknown[]): string {
  const parts: string[] = [];
  for (const arg of args) {
    if (typeof arg === "string") parts.push(arg);
    else if (arg instanceof Error) parts.push(errorText(arg));
    else {
      try {
        parts.push(JSON.stringify(arg) ?? String(arg));
      } catch {
        parts.push(String(arg));
      }
    }
  }
  return parts.join(" ").slice(0, 2000);
}

export async function runFiles(request: TestRunRequest): Promise<TestRunResult> {
  const scope = globalThis as unknown as Record<string, unknown>;
  const logs: TestLog[] = [];

  // Kept before the test can replace them with fakes.
  const realSetTimeout = globalThis.setTimeout.bind(globalThis);
  const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
  const realNow = globalThis.performance.now.bind(globalThis.performance);

  const before = {
    fetch: scope.fetch,
    jest: scope.jest,
    act: scope.IS_REACT_ACT_ENVIRONMENT,
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  const record = (level: TestLog["level"]) => (...args: unknown[]) => {
    if (logs.length < MAX_LOGS) logs.push({ level, text: logText(args) });
  };
  console.log = record("log");
  console.info = record("log");
  console.warn = record("warn");
  console.error = record("error");

  // A test must never reach the network. This also makes the idea of a mock clear.
  scope.fetch = () =>
    Promise.reject(
      new TypeError('fetch is not mocked in this test. Replace it first: jest.spyOn(global, "fetch").mockResolvedValue(...)'),
    );
  scope.IS_REACT_ACT_ENVIRONMENT = true;

  let loops = 0;
  const guard = () => {
    if (++loops > LOOP_LIMIT) {
      throw new Error("Loop guard: a loop ran more than " + LOOP_LIMIT.toLocaleString("en-US") + " times. This looks like an endless loop.");
    }
  };

  const framework = new Framework({
    beforeTest: () => {
      loops = 0;
      expect.setState({
        assertionCalls: 0,
        expectedAssertionsNumber: null,
        isExpectingAssertions: false,
        suppressedErrors: [],
      });
    },
    afterTest: () => {
      // What Testing Library does by itself under Jest: unmount what the test rendered.
      ReactTestingLibrary.cleanup();
      const wrong = expect.extractExpectedAssertionsErrors();
      if (wrong.length > 0) throw wrong[0].error;
    },
    assertions: () => expect.getState().assertionCalls,
    realSetTimeout,
    realClearTimeout: (id) => realClearTimeout(id as never),
    now: realNow,
  });

  // The module system and the jest object need each other.
  const holder: { modules: Modules | null } = { modules: null };
  const handle = createJest({
    global: globalThis,
    framework,
    modules: () => holder.modules as Modules,
    entry: request.entry,
  });
  const modules = new Modules(request.files, BUILTINS, {
    scope: { ...framework.globals(), expect, jest: handle.jest, global: globalThis },
    guard,
    automock: handle.automock,
  });
  holder.modules = modules;
  // Testing Library looks for a global `jest` to know when timers are fake.
  scope.jest = handle.jest;

  let fatal: string | null = null;
  let tests: TestRunResult["tests"] = [];
  try {
    try {
      modules.run(request.entry);
    } catch (error) {
      fatal = errorText(error);
    }
    if (fatal === null) tests = await framework.run();
  } catch (error) {
    fatal = errorText(error);
  } finally {
    handle.dispose();
    try {
      ReactTestingLibrary.cleanup();
    } catch {
      // Nothing was left to unmount.
    }
    if (typeof document !== "undefined") document.body.innerHTML = "";
    console.log = before.log;
    console.info = before.info;
    console.warn = before.warn;
    console.error = before.error;
    scope.fetch = before.fetch;
    scope.jest = before.jest;
    scope.IS_REACT_ACT_ENVIRONMENT = before.act;
  }

  return { fatal, tests, logs };
}
