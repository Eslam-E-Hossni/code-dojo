import { describe, expect, it } from "vitest";
import { outputProblems } from "@/data/problems";
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

/** Sentences of a text. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.?!])\s+/).filter((part) => part.trim() !== "");
}

/**
 * The stored answer of an output question must be what the code really
 * prints in the app's runner: same lines, same order, nothing more.
 */
describe.each(outputProblems)("output question $id", (problem) => {
  it(`prints exactly its ${problem.output.length} stored lines`, async () => {
    const printed = await run(problem.code);
    expect(printed.fatal).toBeNull();
    expect(printed.lines.map((line) => line.text)).toEqual(problem.output.map((line) => line.text));
    // An uncaught error or a warning would show up as another level.
    expect(printed.lines.every((line) => line.level === "log")).toBe(true);
  });

  it("a perfect prediction gets every line", async () => {
    const printed = await run(problem.code);
    const actual = printed.lines.map((line) => line.text);
    const rows = compareOutput(problem.output.map((line) => line.text), actual);
    expect(countMatches(rows)).toBe(actual.length);
    expect(rows.every((row) => row.kind === "match")).toBe(true);
  });

  it("is complete and in English, with a reason for every line", () => {
    const texts = [problem.title, problem.statement, problem.complexity, ...problem.askFirst, ...problem.edgeCases];
    for (const item of problem.followUps) texts.push(item.question, item.answer);
    for (const line of problem.output) texts.push(line.why);
    for (const text of texts) {
      expect(text.trim(), problem.id).not.toBe("");
      expect(text, text).not.toMatch(/[؀-ۿ]/);
      expect(text, text).not.toMatch(/TODO|TBD|lorem|placeholder/i);
    }
    expect(problem.output.length).toBeGreaterThanOrEqual(3);
    expect(problem.askFirst.length).toBeGreaterThan(0);
    expect(problem.edgeCases.length).toBeGreaterThan(0);
    expect(problem.followUps.length).toBeGreaterThan(0);
    // A reason is short enough to say out loud.
    for (const line of problem.output) expect(sentences(line.why).length, line.why).toBeLessThanOrEqual(3);
    // The code only prints with console.log, so every line of output is a plain log line.
    expect(problem.code).not.toMatch(/console\.(warn|error|info)/);
  });

  it("an empty prediction and a wrong one get no line by accident", async () => {
    const printed = await run(problem.code);
    const actual = printed.lines.map((line) => line.text);
    expect(countMatches(compareOutput([], actual))).toBe(0);
    expect(countMatches(compareOutput(["certainly not a line of this output"], actual))).toBe(0);
  });
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
});
