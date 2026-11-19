/**
 * Rules for Recall and Exam.
 *
 * Both end when every hidden test passes. Running the tests is free, but
 * the points drop with every run: passing at the first run is worth the
 * most, because in an interview there is no test button.
 *
 * Opening the Solution panel is always allowed. It marks the attempt as
 * "assisted": the score is then kept on the attempt only, it is not added
 * to the total, and the problem does not count as mastered by it.
 */

import type { CodeProblem } from "@/data/types";
import { findBanned } from "./checker/banned";
import { parseWhole } from "./checker/parse";

export type PracticeMode = "recall" | "exam";

/** Points by how many runs it took: first run, second run, third or later. */
export const PRACTICE_POINTS: Record<PracticeMode, [number, number, number]> = {
  recall: [30, 20, 10],
  exam: [50, 35, 20],
};

export function practicePoints(mode: PracticeMode, runsUsed: number): number {
  const table = PRACTICE_POINTS[mode];
  if (runsUsed <= 1) return table[0];
  if (runsUsed === 2) return table[1];
  return table[2];
}

/** 75 -> "01:15" */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return mm + ":" + ss;
}

export interface BannedFinding {
  message: string;
  /** Where it is in the code: lines and columns from 1, as the editor counts them. */
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

function positionAt(code: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

/**
 * A whole solution is judged by the hidden tests. One thing is refused
 * even when they pass: a banned pattern, such as `map` or `forEach` in a
 * problem that asks for plain loops, or a list without keys in a React
 * problem. Returns the first one, or null.
 * Code that does not parse gives null: the runner reports the syntax error.
 */
export function bannedIn(problem: CodeProblem, code: string): BannedFinding | null {
  const parsed = parseWhole(code, problem.language);
  if (!parsed.ok) return null;
  const found = findBanned(parsed.parsed.ast, { plainLoops: problem.plainLoops, from: 0, risky: problem.react?.risky });
  if (found === null) return null;
  const from = positionAt(code, found.start);
  const to = positionAt(code, found.end);
  return { message: found.message, line: from.line, column: from.column, endLine: to.line, endColumn: to.column };
}
