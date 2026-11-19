/**
 * Runs the learner's code and the hidden tests.
 *
 * This file has no browser or worker API in it, so the same code runs in
 * the Web Worker (see runner.worker.ts) and in Node for `npm test`.
 * It must never be imported by a page: the code runs through `new Function`,
 * and that is only allowed off the main thread.
 */

import { FAKE_EPOCH, FakeClock, fakeDate, macrotask } from "./clock";
import { AssertionError, expect, spy } from "./expect";
import { formatArgs, formatValue } from "./format";
import { CodeSyntaxError, GUARD, instrument } from "./instrument";
import {
  LOOP_LIMIT,
  type ConsoleEntry,
  type ConsoleLevel,
  type ErrorInfo,
  type RunEvent,
  type RunRequest,
  type RunnerTest,
  type TestResult,
} from "./protocol";

const SOURCE_NAME = "dojo-user.js";
/** Real time one test may wait for a promise before it counts as stuck. */
const TEST_TIMEOUT_MS = 1500;
const MAX_LOGS = 200;
/** The plain run stops timers after this much fake time. */
const RUN_FAKE_LIMIT_MS = 60_000;
const RUN_TIMER_LIMIT = 2000;
/** Turns to wait for a promise that no timer is going to settle. */
const IDLE_TURNS = 20;

/**
 * Worker globals the learner's code has no use for. They are shadowed, so
 * a stray call cannot reach the network or talk to the page.
 */
const BLOCKED = [
  "self",
  "postMessage",
  "close",
  "importScripts",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "indexedDB",
  "caches",
  "navigator",
  "location",
  "Worker",
  "SharedWorker",
  "BroadcastChannel",
];

const PARAMS = [
  GUARD,
  "console",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "Date",
  "performance",
  ...BLOCKED,
];

const HEAD = "return (async function () {\n";

const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
const realNow = () => globalThis.performance.now();

type TestFunction = (e: typeof expect, s: typeof spy, clock: FakeClock) => Promise<void>;

/**
 * One run: the fake clock, the console and the loop guard that the
 * learner's code sees. The code is evaluated once; each unit of work (the
 * plain run, then every test) gets its own output and a fresh loop count.
 */
class Session {
  clock = new FakeClock();
  private sink: (entry: ConsoleEntry) => void = () => {};
  private loops = 0;
  private written = 0;

  /** Starts a unit: output goes to `sink`, timers of the last unit are dropped. */
  begin(sink: (entry: ConsoleEntry) => void): void {
    this.sink = sink;
    this.loops = 0;
    this.written = 0;
    this.clock.clearAll();
    this.clock.uncaught.length = 0;
    this.clock.fired = 0;
  }

  private write(level: ConsoleLevel, args: unknown[]): void {
    this.written++;
    if (this.written > MAX_LOGS) {
      if (this.written === MAX_LOGS + 1) {
        this.sink({ level: "warn", text: "Too much output. The rest is not shown." });
      }
      return;
    }
    this.sink({ level, text: formatArgs(args) });
  }

  console = {
    log: (...args: unknown[]) => this.write("log", args),
    info: (...args: unknown[]) => this.write("info", args),
    debug: (...args: unknown[]) => this.write("log", args),
    warn: (...args: unknown[]) => this.write("warn", args),
    error: (...args: unknown[]) => this.write("error", args),
    table: (...args: unknown[]) => this.write("log", args),
    dir: (...args: unknown[]) => this.write("log", args),
    trace: (...args: unknown[]) => this.write("log", args),
    assert: (condition: unknown, ...args: unknown[]) => {
      if (!condition) this.write("error", ["Assertion failed:", ...args]);
    },
    group: () => {},
    groupEnd: () => {},
    clear: () => {},
    time: () => {},
    timeEnd: () => {},
  };

  guard = (): void => {
    if (++this.loops > LOOP_LIMIT) {
      throw new Error(
        "Loop guard: a loop ran more than " +
          LOOP_LIMIT.toLocaleString("en-US") +
          " times. This looks like an endless loop.",
      );
    }
  };

  /** The values for PARAMS, in the same order. */
  scope(): unknown[] {
    const clock = this.clock;
    const values: unknown[] = [
      this.guard,
      this.console,
      clock.setTimeout,
      clock.clear,
      clock.setInterval,
      clock.clear,
      clock.requestAnimationFrame,
      clock.clear,
      fakeDate(clock),
      { now: () => clock.now - FAKE_EPOCH },
    ];
    for (let i = 0; i < BLOCKED.length; i++) values.push(undefined);
    return values;
  }
}

/**
 * Builds one function from the learner's code and all the test bodies.
 *
 * The learner's code sits in an async function, so `await` works at the top
 * level. It runs exactly once per run: code that adds a method to a built-in
 * prototype must not be evaluated twice. The test bodies are functions
 * inside it, so they see the learner's functions, and their own helpers
 * (expect, spy, clock) are parameters that the learner's names cannot shadow.
 */
function compile(instrumented: string, tests: RunnerTest[]): (...args: unknown[]) => Promise<TestFunction[]> {
  let body = HEAD + instrumented + "\n;return [";
  for (let i = 0; i < tests.length; i++) {
    body += "\nasync function (expect, spy, clock) {\n" + tests[i].code + "\n},";
  }
  body += "\n];\n}).call(undefined);\n//# sourceURL=" + SOURCE_NAME;
  return new Function(...PARAMS, body) as (...args: unknown[]) => Promise<TestFunction[]>;
}

let wrapperLines: number | null = null;

/** How many lines the engine puts before the body of a `new Function`. */
function linesBeforeBody(): number {
  if (wrapperLines === null) {
    wrapperLines = 2;
    try {
      const stack = String(
        new Function("return new Error('probe').stack;\n//# sourceURL=dojo-probe.js")(),
      );
      const match = /dojo-probe\.js:(\d+)/.exec(stack);
      if (match) wrapperLines = Number(match[1]) - 1;
    } catch {
      // Keep the usual value.
    }
  }
  return wrapperLines;
}

/** The line of the learner's code an error came from, if the stack says. */
function lineOf(error: unknown, userLines: number): number | null {
  const stack = error instanceof Error && typeof error.stack === "string" ? error.stack : "";
  const match = /dojo-user\.js:(\d+)/.exec(stack);
  if (!match) return null;
  const line = Number(match[1]) - linesBeforeBody() - 1;
  return line >= 1 && line <= userLines ? line : null;
}

function describe(error: unknown, userLines: number): ErrorInfo {
  if (error instanceof CodeSyntaxError) {
    return { message: "SyntaxError: " + error.message, line: error.line };
  }
  if (error instanceof AssertionError) {
    return { message: error.message, line: null };
  }
  if (error instanceof Error) {
    return { message: error.name + ": " + error.message, line: lineOf(error, userLines) };
  }
  return { message: "Thrown: " + formatValue(error), line: null };
}

function withLine(info: ErrorInfo): string {
  return info.line === null ? info.message : info.message + " (line " + info.line + ")";
}

type PlainRun =
  | { ok: true; tests: TestFunction[] }
  | { ok: false; error: ErrorInfo | null; skipMessage: string };

/**
 * Runs the learner's code, for the Console. Timers do not wait: fake time
 * jumps forward until nothing is left, so a 300 ms debounce prints at once.
 * On success it hands back the test functions that were compiled with it.
 */
async function plainRun(
  session: Session,
  instrumented: string,
  request: RunRequest,
  userLines: number,
  emit: (event: RunEvent) => void,
): Promise<PlainRun> {
  const clock = session.clock;
  session.begin((entry) => emit({ type: "console", entry }));

  let tests: TestFunction[] | null = null;
  let failed = false;
  let failure: unknown = null;

  try {
    compile(instrumented, request.tests)(...session.scope()).then(
      (functions) => {
        tests = functions;
      },
      (error) => {
        failed = true;
        failure = error;
      },
    );
  } catch (error) {
    return {
      ok: false,
      error: describe(error, userLines),
      skipMessage: "Not run: the code could not be compiled.",
    };
  }

  const fakeLimit = clock.now + RUN_FAKE_LIMIT_MS;
  let idle = 0;
  let reported = 0;

  while (true) {
    await macrotask();

    // An error inside a timer callback does not stop the program.
    while (reported < clock.uncaught.length) {
      const info = describe(clock.uncaught[reported++], userLines);
      emit({ type: "console", entry: { level: "error", text: "Uncaught " + withLine(info) } });
    }

    if (failed) break;
    if (clock.pending() > 0) {
      const ran = clock.fired < RUN_TIMER_LIMIT && (await clock.fireNext(fakeLimit));
      if (!ran) {
        emit({
          type: "console",
          entry: {
            level: "warn",
            text: "Stopped here: timers were still running after 60 seconds of fake time.",
          },
        });
        break;
      }
      idle = 0;
      continue;
    }
    if (tests !== null) break;
    if (++idle > IDLE_TURNS) break;
  }

  if (failed) {
    return {
      ok: false,
      error: describe(failure, userLines),
      skipMessage: "Not run: the code stopped with an error. See the Console.",
    };
  }
  if (tests === null) {
    return {
      ok: false,
      error: null,
      skipMessage:
        "Not run: the code is still waiting at the top level, on a promise that never settles or a timer that never stops.",
    };
  }
  return { ok: true, tests };
}

async function runTest(session: Session, test: TestFunction, userLines: number): Promise<TestResult> {
  const logs: ConsoleEntry[] = [];
  session.begin((entry) => logs.push(entry));
  const clock = session.clock;
  const started = realNow();

  const finish = (status: TestResult["status"], message: string): TestResult => ({
    status,
    message,
    logs,
    ms: Math.round(realNow() - started),
  });

  let timeout: ReturnType<typeof realSetTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      test(expect, spy, clock).then(() => "ok" as const),
      new Promise<"timeout">((resolve) => {
        timeout = realSetTimeout(() => resolve("timeout"), TEST_TIMEOUT_MS);
      }),
    ]);

    if (outcome === "timeout") {
      return finish(
        "timeout",
        "The test waited " +
          TEST_TIMEOUT_MS / 1000 +
          " seconds and nothing happened. A promise never settled, or a callback was never called.",
      );
    }
    if (clock.uncaught.length > 0) {
      const info = describe(clock.uncaught[0], userLines);
      return finish("fail", "Error inside a timer callback: " + withLine(info));
    }
    return finish("pass", "");
  } catch (error) {
    return finish("fail", withLine(describe(error, userLines)));
  } finally {
    if (timeout !== undefined) realClearTimeout(timeout);
  }
}

function skipAll(request: RunRequest, emit: (event: RunEvent) => void, message: string): void {
  for (let i = 0; i < request.tests.length; i++) {
    emit({ type: "test-end", index: i, result: { status: "skipped", message, logs: [], ms: 0 } });
  }
}

export async function execute(request: RunRequest, emit: (event: RunEvent) => void): Promise<void> {
  const userLines = request.code.split("\n").length;

  let instrumented: string;
  try {
    instrumented = instrument(request.code);
  } catch (error) {
    emit({ type: "fatal", error: describe(error, userLines) });
    skipAll(request, emit, "Not run: the code has a syntax error.");
    emit({ type: "done" });
    return;
  }

  const session = new Session();
  const run = await plainRun(session, instrumented, request, userLines, emit);
  if (!run.ok) {
    if (run.error) emit({ type: "fatal", error: run.error });
    skipAll(request, emit, run.skipMessage);
    emit({ type: "done" });
    return;
  }

  for (let i = 0; i < run.tests.length; i++) {
    emit({ type: "test-start", index: i });
    const result = await runTest(session, run.tests[i], userLines);
    emit({ type: "test-end", index: i, result });
  }
  emit({ type: "done" });
}
