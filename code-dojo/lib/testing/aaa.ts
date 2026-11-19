/**
 * Splits a test file into Arrange, Act and Assert, line by line, for the
 * card shown after an exercise.
 *
 * It reads the shape of the lines, not their meaning, so it works on the
 * learner's own test as well as on the reference:
 *   assert   a line that starts with expect(
 *   act      what a user or time does: user.click, act(...), advancing
 *            timers, rerender, or a bare call of the code under test
 *   arrange  everything else inside a test: render, mocks, variables
 *   frame    imports, describe, it, hooks and closing brackets
 */

export type Phase = "arrange" | "act" | "assert" | "frame";

export interface PhaseLine {
  text: string;
  phase: Phase;
}

const TEST_START = /^(it|test)(\.\w+)?\s*\(/;
const ASSERT = /^(await\s+)?expect\s*\(/;
const ACT =
  /^(await\s+)?(user\.|userEvent\.|fireEvent\.|act\s*\(|rerender\s*\(|jest\.(advanceTimers|runAllTimers|runOnlyPendingTimers)|result\.current\.\w+\()/;
/** Calls that set the scene. Any other bare call inside a test is the act. */
const ARRANGE_CALL = /^(await\s+)?(render\w*\s*\(|jest\.|\w+\.mock\w*\(|const\s|let\s|var\s)/;
const BARE_CALL = /^(await\s+)?[A-Za-z_$][\w$.]*\s*\(/;

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function phaseOf(statement: string): Phase {
  if (ASSERT.test(statement)) return "assert";
  if (ACT.test(statement)) return "act";
  if (ARRANGE_CALL.test(statement)) return "arrange";
  if (BARE_CALL.test(statement)) return "act";
  return "arrange";
}

export function splitByPhase(code: string): PhaseLine[] {
  const lines = code.split("\n");
  const out: PhaseLine[] = [];

  /** The indentation of the `it(` line of the test we are in, or -1. */
  let testIndent = -1;
  /** The indentation of statements directly inside that test. */
  let bodyIndent = -1;
  let current: Phase = "frame";

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const trimmed = text.trim();
    const indent = indentOf(text);

    if (trimmed === "") {
      out.push({ text, phase: "frame" });
      continue;
    }

    if (testIndent === -1) {
      if (TEST_START.test(trimmed)) {
        testIndent = indent;
        bodyIndent = -1;
      }
      out.push({ text, phase: "frame" });
      continue;
    }

    // The line that closes the test.
    if (indent <= testIndent) {
      testIndent = -1;
      out.push({ text, phase: "frame" });
      continue;
    }

    if (bodyIndent === -1) bodyIndent = indent;
    // A statement starts at the body's indentation. Deeper lines, and the
    // bracket that closes them, belong to the statement above.
    const closes = /^[)}\]]/.test(trimmed);
    if (indent === bodyIndent && !closes) current = phaseOf(trimmed);
    out.push({ text, phase: current });
  }

  return out;
}

export function countPhases(lines: PhaseLine[]): Record<Phase, number> {
  const count: Record<Phase, number> = { arrange: 0, act: 0, assert: 0, frame: 0 };
  for (let i = 0; i < lines.length; i++) count[lines[i].phase]++;
  return count;
}
