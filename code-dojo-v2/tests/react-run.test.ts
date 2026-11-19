// @vitest-environment jsdom
/**
 * How the hidden tests of a React problem are run: what the test file is
 * given, and what happens with code that would hang or crash the run.
 */
import { describe, expect, it } from "vitest";
import { reactCounter } from "@/data/problems/react-counter";
import { solutionText } from "@/lib/checker/check";
import { runReactTests } from "./helpers";

const firstTwo = reactCounter.tests.slice(0, 2);

describe("the hidden tests of a React problem", () => {
  it("pass on the reference", async () => {
    const report = await runReactTests(reactCounter, solutionText(reactCounter), reactCounter.tests);
    expect(report.fatal).toBeNull();
    expect(report.passed).toBe(reactCounter.tests.length);
  });

  it("stop a render loop made by an effect, and say what it is", async () => {
    const looping = `import { useEffect, useState } from "react";
export default function Counter() {
  const [list, setList] = useState([]);
  useEffect(() => {
    setList([1, 2, 3].filter((n) => n > 1));
  });
  return <p>Count: {list.length}</p>;
}`;
    const started = Date.now();
    const report = await runReactTests(reactCounter, looping, firstTwo);
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(report.passed).toBe(0);
    expect(report.failures).toHaveLength(2);
    expect(report.failures[0].message).toContain("Render loop");
    expect(report.failures[0].message).toContain("without a dependency array");
  }, 30_000);

  it("report a syntax error as an error of the code, not as failed tests", async () => {
    const report = await runReactTests(reactCounter, "export default function Counter() {\n  return <p>Count: 0</p>;\n", firstTwo);
    expect(report.fatal).not.toBeNull();
    expect(report.passed).toBe(0);
  });

  it("fail with a clear message when the component is not exported", async () => {
    const report = await runReactTests(reactCounter, "function Counter() {\n  return <p>Count: 0</p>;\n}", firstTwo);
    expect(report.passed).toBe(0);
  });

  it("stop an endless loop inside a component", async () => {
    const endless = `export default function Counter() {
  let n = 0;
  while (true) n++;
  return <p>Count: {n}</p>;
}`;
    const report = await runReactTests(reactCounter, endless, firstTwo);
    expect(report.passed).toBe(0);
    expect(JSON.stringify(report)).toContain("Loop guard");
  }, 30_000);
});
