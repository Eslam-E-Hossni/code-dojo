/**
 * The test framework part of the runner: describe, it, the hooks, and the
 * loop that runs the collected tests one by one.
 *
 * It follows Jest: tests are collected first, then run in order; hooks of
 * outer blocks wrap hooks of inner blocks; a failing hook fails the test.
 */

import type { TestOutcome } from "../protocol";

type Fn = () => unknown;

interface Block {
  name: string;
  parent: Block | null;
  children: (Block | Test)[];
  beforeAll: Fn[];
  afterAll: Fn[];
  beforeEach: Fn[];
  afterEach: Fn[];
  skip: boolean;
}

interface Test {
  test: true;
  name: string;
  fn: Fn | null;
  mode: "run" | "skip" | "only";
  parent: Block;
}

export interface FrameworkHooks {
  /** Runs before every test, before its beforeEach hooks. */
  beforeTest(): void;
  /** Runs after every test and its afterEach hooks. May throw to fail the test. */
  afterTest(): void;
  /** How many expect() calls ran in the test that just finished. */
  assertions(): number;
  /** The real clock. Tests may replace setTimeout with a fake one. */
  realSetTimeout: (fn: () => void, ms: number) => unknown;
  realClearTimeout: (id: unknown) => void;
  now(): number;
}

const DEFAULT_TIMEOUT_MS = 5000;

function makeBlock(name: string, parent: Block | null): Block {
  return { name, parent, children: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [], skip: false };
}

/** Jest writes %s, %i, %d, %p and so on in the name of an `each` test. */
function formatName(name: string, row: unknown[]): string {
  let at = 0;
  return name.replace(/%[sdifjop#%]/g, (mark) => {
    if (mark === "%%") return "%";
    if (mark === "%#") return String(at);
    if (at >= row.length) return mark;
    const value = row[at++];
    if (mark === "%s") return String(value);
    if (mark === "%j" || mark === "%o" || mark === "%p") {
      try {
        return typeof value === "string" ? '"' + value + '"' : JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(Number(value));
  });
}

function messageOf(error: unknown): string {
  let text: string;
  if (error instanceof Error) {
    // A plain Error is shown with its name, an assertion error as it is.
    const assertion = "matcherResult" in error || error.message.startsWith("expect(");
    text = assertion || !error.name || error.name === "Error" ? error.message : error.name + ": " + error.message;
  } else {
    text = "Thrown: " + String(error);
  }
  // Jest colours its messages for a terminal.
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

export class Framework {
  private root = makeBlock("", null);
  private current = this.root;
  private collecting = true;
  private hasOnly = false;
  private timeoutMs = DEFAULT_TIMEOUT_MS;

  constructor(private hooks: FrameworkHooks) {}

  /** jest.setTimeout */
  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  /** The functions a test file sees as globals. */
  globals(): Record<string, unknown> {
    const addTest = (mode: Test["mode"]) => (name: string, fn?: Fn) => {
      this.mustBeCollecting("it");
      if (typeof name !== "string") throw new Error("The first argument of it() is the name of the test, a string.");
      if (mode !== "skip" && typeof fn !== "function") {
        throw new Error('The test "' + name + '" has no function. Write it("' + name + '", () => { ... }).');
      }
      if (mode === "only") this.hasOnly = true;
      this.current.children.push({ test: true, name, fn: fn ?? null, mode, parent: this.current });
    };

    const withEach =
      (add: (name: string, fn?: Fn) => void) =>
      (table: unknown[]) =>
      (name: string, fn: (...args: unknown[]) => unknown) => {
        for (let i = 0; i < table.length; i++) {
          const row = Array.isArray(table[i]) ? (table[i] as unknown[]) : [table[i]];
          add(formatName(name, row), () => fn(...row));
        }
      };

    const it = Object.assign(addTest("run"), {
      only: addTest("only"),
      skip: addTest("skip"),
      todo: (name: string) => addTest("skip")(name),
      each: withEach(addTest("run")),
    });

    const addBlock = (skip: boolean) => (name: string, fn: Fn) => {
      this.mustBeCollecting("describe");
      if (typeof fn !== "function") throw new Error('describe("' + String(name) + '") needs a function with the tests in it.');
      const block = makeBlock(String(name), this.current);
      block.skip = skip || this.current.skip;
      this.current.children.push(block);
      const outer = this.current;
      this.current = block;
      try {
        const returned = fn();
        if (returned && typeof (returned as Promise<unknown>).then === "function") {
          throw new Error('The function of describe("' + block.name + '") must not be async. Put async on the tests inside it.');
        }
      } finally {
        this.current = outer;
      }
    };
    const describe = Object.assign(addBlock(false), { skip: addBlock(true) });

    const hook = (kind: "beforeAll" | "afterAll" | "beforeEach" | "afterEach") => (fn: Fn) => {
      this.mustBeCollecting(kind);
      if (typeof fn !== "function") throw new Error(kind + "() needs a function.");
      this.current[kind].push(fn);
    };

    return {
      describe,
      it,
      test: it,
      xit: it.skip,
      xtest: it.skip,
      xdescribe: describe.skip,
      beforeAll: hook("beforeAll"),
      afterAll: hook("afterAll"),
      beforeEach: hook("beforeEach"),
      afterEach: hook("afterEach"),
    };
  }

  private mustBeCollecting(what: string): void {
    if (!this.collecting) {
      throw new Error(what + "() cannot be called inside a test. Move it out, next to the other tests.");
    }
  }

  /** Runs one function and waits for it, but not longer than the test timeout. */
  private async call(fn: Fn): Promise<void> {
    if (fn.length > 0) {
      throw new Error("A test with a done callback is not supported here. Return a promise, or make the test async.");
    }
    const returned = fn();
    if (!returned || typeof (returned as Promise<unknown>).then !== "function") return;

    let timer: unknown;
    const late = new Promise<never>((_, reject) => {
      timer = this.hooks.realSetTimeout(() => {
        reject(
          new Error(
            "Exceeded timeout of " +
              this.timeoutMs +
              " ms for a test. A promise never settled. With fake timers, did you advance them?",
          ),
        );
      }, this.timeoutMs);
    });
    try {
      await Promise.race([returned, late]);
    } finally {
      this.hooks.realClearTimeout(timer);
    }
  }

  private chain(block: Block, kind: "beforeEach" | "afterEach"): Fn[] {
    const blocks: Block[] = [];
    for (let b: Block | null = block; b !== null; b = b.parent) blocks.push(b);
    // beforeEach runs from the outside in, afterEach from the inside out.
    // Inside one block both run in the order they were written.
    if (kind === "beforeEach") blocks.reverse();
    const out: Fn[] = [];
    for (const b of blocks) {
      for (const fn of b[kind]) out.push(fn);
    }
    return out;
  }

  private blockNames(block: Block): string[] {
    const names: string[] = [];
    for (let b: Block | null = block; b !== null && b.parent !== null; b = b.parent) names.unshift(b.name);
    return names;
  }

  private willRun(test: Test): boolean {
    if (test.mode === "skip" || test.parent.skip) return false;
    return !this.hasOnly || test.mode === "only";
  }

  private hasRunnableTest(block: Block): boolean {
    for (const child of block.children) {
      if ("test" in child ? this.willRun(child) : this.hasRunnableTest(child)) return true;
    }
    return false;
  }

  private async runTest(test: Test, outcomes: TestOutcome[], blockError: string | null): Promise<void> {
    const outcome: TestOutcome = {
      blocks: this.blockNames(test.parent),
      name: test.name,
      status: "skip",
      message: "",
      assertions: 0,
      ms: 0,
    };
    outcomes.push(outcome);
    if (!this.willRun(test) || test.fn === null) return;

    const started = this.hooks.now();
    let failure: string | null = blockError;

    if (failure === null) {
      this.hooks.beforeTest();
      try {
        for (const fn of this.chain(test.parent, "beforeEach")) await this.call(fn);
        await this.call(test.fn);
      } catch (error) {
        failure = messageOf(error);
      }
      // afterEach hooks run even when the test failed, as in Jest.
      for (const fn of this.chain(test.parent, "afterEach")) {
        try {
          await this.call(fn);
        } catch (error) {
          if (failure === null) failure = messageOf(error);
        }
      }
      outcome.assertions = this.hooks.assertions();
      try {
        this.hooks.afterTest();
      } catch (error) {
        if (failure === null) failure = messageOf(error);
      }
    }

    outcome.ms = Math.round(this.hooks.now() - started);
    outcome.status = failure === null ? "pass" : "fail";
    outcome.message = failure ?? "";
  }

  private async runBlock(block: Block, outcomes: TestOutcome[], inherited: string | null): Promise<void> {
    let blockError = inherited;
    const active = this.hasRunnableTest(block);

    if (active && blockError === null) {
      try {
        for (const fn of block.beforeAll) await this.call(fn);
      } catch (error) {
        blockError = "beforeAll failed: " + messageOf(error);
      }
    }

    for (const child of block.children) {
      if ("test" in child) await this.runTest(child, outcomes, blockError);
      else await this.runBlock(child, outcomes, blockError);
    }

    if (active && inherited === null) {
      for (const fn of block.afterAll) {
        try {
          await this.call(fn);
        } catch {
          // Jest reports this on the file. The tests themselves already have their result.
        }
      }
    }
  }

  /** Call after the test file was evaluated: runs everything that was collected. */
  async run(): Promise<TestOutcome[]> {
    this.collecting = false;
    const outcomes: TestOutcome[] = [];
    await this.runBlock(this.root, outcomes, null);
    return outcomes;
  }
}
