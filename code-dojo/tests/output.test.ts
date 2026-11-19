import { describe, expect, it } from "vitest";
import { problems } from "@/data/problems";
import { compareOutput, countMatches, normalizeLine, splitPrediction } from "@/lib/output";
import { execute } from "@/lib/runner/execute";

interface Printed {
  fatal: string | null;
  lines: { level: string; text: string }[];
}

async function run(code: string): Promise<Printed> {
  const printed: Printed = { fatal: null, lines: [] };
  await execute({ code, tests: [] }, (event) => {
    if (event.type === "fatal") printed.fatal = event.error.message;
    if (event.type === "console") printed.lines.push({ level: event.entry.level, text: event.entry.text });
  });
  return printed;
}

/**
 * The stored answer of an output question must be what the code really
 * prints in the app's runner: same lines, same order, nothing more.
 */
describe("every output question prints exactly its stored lines", () => {
  for (const problem of problems) {
    if (problem.kind !== "output") continue;

    it(`${problem.id}: ${problem.output.length} lines`, async () => {
      const printed = await run(problem.code);
      expect(printed.fatal).toBeNull();
      expect(printed.lines.map((line) => line.text)).toEqual(problem.output.map((line) => line.text));
      // An uncaught error or a warning would show up as another level.
      expect(printed.lines.every((line) => line.level === "log")).toBe(true);
    });

    it(`${problem.id}: a perfect prediction gets every line`, async () => {
      const printed = await run(problem.code);
      const actual = printed.lines.map((line) => line.text);
      const rows = compareOutput(problem.output.map((line) => line.text), actual);
      expect(countMatches(rows)).toBe(actual.length);
      expect(rows.every((row) => row.kind === "match")).toBe(true);
    });
  }
});

describe("comparing a prediction with the real output", () => {
  it("ignores case, extra spaces and quotes around a line", () => {
    expect(normalizeLine('  "Start"  ')).toBe("start");
    expect(normalizeLine("var   3")).toBe("var 3");
    expect(normalizeLine("'timeout'")).toBe("timeout");
    expect(normalizeLine("ReferenceError")).toBe("referenceerror");
  });

  it("drops empty lines of the prediction", () => {
    expect(splitPrediction("a\n\n  b  \n\n")).toEqual(["a", "b"]);
    expect(splitPrediction("   \n")).toEqual([]);
  });

  it("marks every line right when the prediction is right", () => {
    const rows = compareOutput(["start", "END"], ["start", "end"]);
    expect(rows.map((row) => row.kind)).toEqual(["match", "match"]);
    expect(countMatches(rows)).toBe(2);
  });

  it("costs one line for one forgotten line, not every line after it", () => {
    const rows = compareOutput(["start", "promise", "timeout"], ["start", "end", "promise", "timeout"]);
    expect(rows.map((row) => row.kind)).toEqual(["match", "missing", "match", "match"]);
    expect(countMatches(rows)).toBe(3);
  });

  it("marks a line that was not printed as extra", () => {
    const rows = compareOutput(["start", "oops", "end"], ["start", "end"]);
    expect(rows.map((row) => row.kind)).toEqual(["match", "extra", "match"]);
    expect(countMatches(rows)).toBe(2);
  });

  it("gives no line to a swapped pair twice", () => {
    // Two lines in the wrong order: only one of them can be in the longest right run.
    const rows = compareOutput(["b", "a"], ["a", "b"]);
    expect(countMatches(rows)).toBe(1);
  });

  it("handles an empty prediction and an empty output", () => {
    expect(compareOutput([], ["a"]).map((row) => row.kind)).toEqual(["missing"]);
    expect(compareOutput(["a"], []).map((row) => row.kind)).toEqual(["extra"]);
    expect(compareOutput([], [])).toEqual([]);
  });

  it("keeps the place of every real line, for the reason shown next to it", () => {
    const rows = compareOutput(["var 3", "let 0"], ["loops done", "var 3", "var 3", "let 0"]);
    const places = rows.map((row) => (row.kind === "extra" ? null : row.actualIndex));
    expect(places).toEqual([0, 1, 2, 3]);
  });
});
