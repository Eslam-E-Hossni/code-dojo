import { describe, expect, it } from "vitest";
import { execute } from "@/lib/runner/execute";
import type { ConsoleEntry, ErrorInfo, RunnerTest, TestResult } from "@/lib/runner/protocol";

interface Outcome {
  console: ConsoleEntry[];
  fatal: ErrorInfo | null;
  results: TestResult[];
  done: boolean;
}

async function run(code: string, tests: RunnerTest[] = []): Promise<Outcome> {
  const outcome: Outcome = { console: [], fatal: null, results: [], done: false };
  await execute({ code, tests }, (event) => {
    if (event.type === "console") outcome.console.push(event.entry);
    if (event.type === "fatal") outcome.fatal = event.error;
    if (event.type === "test-end") outcome.results[event.index] = event.result;
    if (event.type === "done") outcome.done = true;
  });
  return outcome;
}

const texts = (outcome: Outcome) => outcome.console.map((entry) => entry.text);
const test = (code: string, name = "test"): RunnerTest => ({ name, code });

describe("console", () => {
  it("captures log, warn and error with readable values", async () => {
    const out = await run(`
      console.log("a", 1, [1, [2]], { x: 1, "y-z": "s" }, undefined, null);
      console.warn("careful");
      console.error(new TypeError("bad"));
      console.log(function named() {}, () => {}, new Map([["k", 1]]), new Set([1]), [1, , 3]);
    `);
    expect(out.fatal).toBeNull();
    expect(out.console).toEqual([
      { level: "log", text: "a 1 [1, [2]] { x: 1, 'y-z': 's' } undefined null" },
      { level: "warn", text: "careful" },
      { level: "error", text: "TypeError: bad" },
      { level: "log", text: "[Function: named] [Function: (anonymous)] Map(1) {'k' => 1} Set(1) {1} [1, <1 empty item>, 3]" },
    ]);
  });

  it("stops after too much output", async () => {
    const out = await run(`for (let i = 0; i < 1000; i++) console.log(i);`);
    expect(out.console).toHaveLength(201);
    expect(out.console[200].level).toBe("warn");
  });

  it("handles circular objects", async () => {
    const out = await run(`const a = { name: "a" }; a.self = a; console.log(a);`);
    expect(texts(out)).toEqual(["{ name: 'a', self: [Circular] }"]);
  });
});

describe("event loop order", () => {
  it("runs sync code, then microtasks, then timers", async () => {
    const out = await run(`
      console.log("start");
      setTimeout(() => console.log("timeout"), 0);
      Promise.resolve()
        .then(() => {
          console.log("promise 1");
          setTimeout(() => console.log("timeout inside promise"), 0);
        })
        .then(() => console.log("promise 2"));
      (async function () {
        console.log("async start");
        await null;
        console.log("after await");
      })();
      console.log("end");
    `);
    expect(texts(out)).toEqual([
      "start",
      "async start",
      "end",
      "promise 1",
      "after await",
      "promise 2",
      "timeout",
      "timeout inside promise",
    ]);
  });

  it("orders timers by delay, not by the order they were set", async () => {
    const out = await run(`
      setTimeout(() => console.log("300"), 300);
      setTimeout(() => console.log("100"), 100);
      setTimeout(() => console.log("100 again"), 100);
      setTimeout(() => console.log("0"));
    `);
    expect(texts(out)).toEqual(["0", "100", "100 again", "300"]);
  });

  it("does not wait for real time", async () => {
    const started = Date.now();
    const out = await run(`setTimeout(() => console.log("an hour? no: 50 seconds"), 50000);`);
    expect(texts(out)).toEqual(["an hour? no: 50 seconds"]);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("supports top-level await on a timer", async () => {
    const out = await run(`
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      console.log("before");
      await sleep(1000);
      console.log("after");
    `);
    expect(texts(out)).toEqual(["before", "after"]);
  });

  it("stops an interval that never ends, with a warning", async () => {
    const out = await run(`let n = 0; setInterval(() => { n++; }, 1000);`);
    expect(out.fatal).toBeNull();
    expect(out.console[out.console.length - 1].level).toBe("warn");
  });

  it("reports an error inside a timer callback and keeps going", async () => {
    const out = await run(`
      setTimeout(() => { throw new Error("boom"); }, 10);
      setTimeout(() => console.log("still here"), 20);
    `);
    expect(out.fatal).toBeNull();
    expect(texts(out)).toEqual(["Uncaught Error: boom (line 2)", "still here"]);
  });
});

describe("errors", () => {
  it("reports a syntax error with its line and skips the tests", async () => {
    const out = await run("function a() {\n  return 1;\n}\nconst = 5;", [test("expect(a()).toBe(1);")]);
    expect(out.fatal?.message).toMatch(/^SyntaxError: /);
    expect(out.fatal?.line).toBe(4);
    expect(out.results[0].status).toBe("skipped");
    expect(out.done).toBe(true);
  });

  it("reports a top-level error with its line and skips the tests", async () => {
    const out = await run("const a = 1;\n\nundefinedFunction();", [test("expect(1).toBe(1);")]);
    expect(out.fatal).toEqual({ message: "ReferenceError: undefinedFunction is not defined", line: 3 });
    expect(out.results[0].status).toBe("skipped");
  });

  it("gives the line of an error thrown inside a function during a test", async () => {
    const code = "function broken(x) {\n  const y = x;\n  return y.missing.value;\n}";
    const out = await run(code, [test("broken({});")]);
    expect(out.fatal).toBeNull();
    expect(out.results[0].status).toBe("fail");
    expect(out.results[0].message).toMatch(/^TypeError: .*\(line 3\)$/);
  });

  it("fails a test that uses a function the learner did not write", async () => {
    const out = await run("function a() {}", [test("b();")]);
    expect(out.results[0]).toMatchObject({ status: "fail", message: "ReferenceError: b is not defined" });
  });
});

describe("loop guard", () => {
  it("stops an endless while loop at the top level", async () => {
    const out = await run("let i = 0;\nwhile (true) {\n  i++;\n}");
    expect(out.fatal?.message).toMatch(/^Error: Loop guard/);
  });

  it("stops an endless loop without braces", async () => {
    const out = await run("for (;;) ;");
    expect(out.fatal?.message).toMatch(/Loop guard/);
  });

  it("stops an endless loop inside a tested function, then runs the next test", async () => {
    const code = "function spin() {\n  let n = 0;\n  do n++; while (n > 0);\n}\nfunction fine() { return 1; }";
    const out = await run(code, [test("spin();"), test("expect(fine()).toBe(1);")]);
    expect(out.results[0].status).toBe("fail");
    expect(out.results[0].message).toMatch(/Loop guard/);
    expect(out.results[1].status).toBe("pass");
  });

  it("leaves long but finite loops alone", async () => {
    const code = "function sum(n) { let s = 0; for (let i = 0; i < n; i++) s += i; return s; }";
    const out = await run(code, [test("expect(sum(100000)).toBe(4999950000);")]);
    expect(out.results[0].status).toBe("pass");
  });

  it("reports endless recursion", async () => {
    const out = await run("function f() { return f(); }", [test("f();")]);
    expect(out.results[0].status).toBe("fail");
    expect(out.results[0].message).toMatch(/RangeError/);
  });
});

describe("tests", () => {
  it("passes and fails with clear messages", async () => {
    const out = await run("function add(a, b) { return a + b; }", [
      test("expect(add(1, 2)).toBe(3);"),
      test("expect(add(1, 2)).toBe(4);"),
      test("expect([add(1, 1)], 'the sums').toEqual([3]);"),
      test("expect(() => add()).toThrow();"),
      test("expect(add(1, 2)).not.toBe(3);"),
    ]);
    expect(out.results.map((r) => r.status)).toEqual(["pass", "fail", "fail", "fail", "fail"]);
    expect(out.results[1].message).toBe("Expected: 4\nReceived: 3");
    expect(out.results[2].message).toBe("the sums\nExpected: [3]\nReceived: [2]");
    expect(out.results[3].message).toBe("Expected: an error to be thrown\nReceived: no error");
    expect(out.results[4].message).toBe("Expected not: 3\nReceived: 3");
  });

  it("evaluates the learner's code exactly once per run", async () => {
    // Code that adds a method to a built-in prototype must not run twice.
    const scope = globalThis as { __dojoEvaluations?: number };
    delete scope.__dojoEvaluations;
    const code = "globalThis.__dojoEvaluations = (globalThis.__dojoEvaluations || 0) + 1;\nfunction one() { return 1; }";
    const out = await run(code, [
      test("expect(globalThis.__dojoEvaluations).toBe(1); expect(one()).toBe(1);"),
      test("expect(globalThis.__dojoEvaluations).toBe(1);"),
    ]);
    expect(out.results.map((r) => r.status)).toEqual(["pass", "pass"]);
    delete scope.__dojoEvaluations;
  });

  it("starts every test without the timers of the test before it", async () => {
    const code = "function later(fn, ms) { setTimeout(fn, ms); }";
    const out = await run(code, [
      test("later(() => console.log('left over'), 500);"),
      test("const fn = spy(); later(fn, 100); await clock.tick(1000); expect(fn.calls.length).toBe(1);"),
    ]);
    expect(out.results[1]).toMatchObject({ status: "pass", logs: [] });
  });

  it("skips the tests when the top-level code waits forever", async () => {
    const out = await run("await new Promise(() => {});\nfunction one() { return 1; }", [test("expect(one()).toBe(1);")]);
    expect(out.fatal).toBeNull();
    expect(out.results[0].status).toBe("skipped");
  });

  it("keeps its helpers even if the learner uses the same names", async () => {
    const code = "const expect = 1; const clock = 2; const spy = 3;\nfunction one() { return 1; }";
    const out = await run(code, [test("const s = spy(); s(5); await clock.tick(1); expect(s.calls).toEqual([[5]]); expect(one()).toBe(1);")]);
    expect(out.results[0]).toMatchObject({ status: "pass" });
  });

  it("moves fake time with clock.tick", async () => {
    const code = "function later(fn, ms) { setTimeout(fn, ms); }";
    const out = await run(code, [
      test(`
        const fn = spy();
        later(fn, 100);
        await clock.tick(99);
        expect(fn.calls.length).toBe(0);
        await clock.tick(1);
        expect(fn.calls.length).toBe(1);
      `),
    ]);
    expect(out.results[0]).toMatchObject({ status: "pass" });
  });

  it("gives Date.now a realistic value that follows fake time", async () => {
    const out = await run("function stamp() { return Date.now(); }", [
      test(`
        const a = stamp();
        expect(a > 1700000000000).toBe(true);
        await clock.tick(250);
        expect(stamp() - a).toBe(250);
        expect(new Date().getTime()).toBe(stamp());
      `),
    ]);
    expect(out.results[0]).toMatchObject({ status: "pass" });
  });

  it("supports requestAnimationFrame", async () => {
    const code = "function frames(fn) { requestAnimationFrame(function step(t) { fn(t); if (t < 48) requestAnimationFrame(step); }); }";
    const out = await run(code, [
      test(`const fn = spy(); frames(fn); await clock.tick(100); expect(fn.calls).toEqual([[16], [32], [48]]);`),
    ]);
    expect(out.results[0]).toMatchObject({ status: "pass" });
  });

  it("keeps the learner's top-level output out of the test logs", async () => {
    const code = "console.log('demo');\nfunction shout(x) { console.log('inside', x); }";
    const out = await run(code, [test("shout(1);")]);
    expect(texts(out)).toEqual(["demo"]);
    expect(out.results[0].logs).toEqual([{ level: "log", text: "inside 1" }]);
  });

  it("does not let timers from the learner's demo calls fire inside a test", async () => {
    const code = [
      "function later(fn, ms) { setTimeout(fn, ms); }",
      "later(() => console.log('demo fired'), 300);",
      "setInterval(() => console.log('demo interval'), 100);",
    ].join("\n");
    const out = await run(code, [
      test("const fn = spy(); later(fn, 500); await clock.tick(1000); expect(fn.calls.length).toBe(1);"),
    ]);
    expect(out.results[0]).toMatchObject({ status: "pass", logs: [] });
    expect(texts(out)).toContain("demo fired");
  });

  it("still runs tests when the learner's own demo code awaits a timer", async () => {
    const code = "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nawait sleep(500);\nfunction two() { return 2; }";
    const out = await run(code, [test("expect(two()).toBe(2);")]);
    expect(out.results[0]).toMatchObject({ status: "pass" });
  });

  it("fails a test when a timer callback throws", async () => {
    const code = "function later() { setTimeout(() => { null.x; }, 10); }";
    const out = await run(code, [test("later(); await clock.tick(10);")]);
    expect(out.results[0].status).toBe("fail");
    expect(out.results[0].message).toMatch(/^Error inside a timer callback: TypeError/);
  });

  it("times out a test that waits on a promise that never settles", async () => {
    const code = "function never() { return new Promise(() => {}); }";
    const out = await run(code, [test("await never();"), test("expect(1).toBe(1);")]);
    expect(out.results[0].status).toBe("timeout");
    expect(out.results[1].status).toBe("pass");
  });

  it("shadows the worker's network and messaging globals", async () => {
    const out = await run("function probe() { return [typeof fetch, typeof postMessage, typeof importScripts, typeof self]; }", [
      test("expect(probe()).toEqual(['undefined', 'undefined', 'undefined', 'undefined']);"),
    ]);
    expect(out.results[0]).toMatchObject({ status: "pass" });
  });
});
