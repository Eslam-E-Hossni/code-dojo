import type { EditorRange } from "@/components/LearnEditor";
import type { CodeProblem } from "@/data/types";
import type { Block } from "./store";

export interface LockedDoc {
  /** The learner's own accepted code, as the editor shows it. */
  text: string;
  /** Which lines belong to which block, for the coloured bars. */
  ranges: EditorRange[];
}

/**
 * Builds the locked text of the editor from what the learner wrote. With
 * several parts, each part gets a comment line with its title, like the
 * reference solution, so the two line up in Compare.
 *
 * `currentPartId` is the part being written: its title is shown before its
 * first line is in. Null when the problem is finished.
 */
export function buildLocked(problem: CodeProblem, blocks: Block[], currentPartId: string | null): LockedDoc {
  const lines: string[] = [];
  const ranges: EditorRange[] = [];
  const multiPart = problem.parts.length > 1;

  for (const part of problem.parts) {
    const own: Block[] = [];
    for (const block of blocks) {
      if (block.partId === part.id) own.push(block);
    }
    if (own.length === 0 && part.id !== currentPartId) continue;

    if (multiPart) {
      if (lines.length > 0) lines.push("");
      lines.push("// " + part.title);
      ranges.push({ startLine: lines.length, endLine: lines.length, tone: "header" });
    }
    for (const block of own) {
      const start = lines.length + 1;
      for (const line of block.text.split("\n")) lines.push(line);
      ranges.push({ startLine: start, endLine: lines.length, tone: block.tier });
    }
  }
  return { text: lines.join("\n"), ranges };
}

function leading(line: string): string {
  const match = /^[ \t]*/.exec(line);
  return match === null ? "" : match[0];
}

/** The indentation typed for the learner at the start of a step. */
export function indentOf(expected: string): string {
  return leading(expected);
}

/**
 * The indentation of the next line, when a step is right so far but not
 * finished. Inside a step of several lines it is the indentation of the
 * reference line. Past that, it follows what the learner typed.
 */
export function indentAfter(input: string, expected: string): string {
  const typed = input.replace(/\s+$/, "").split("\n");
  const reference = expected.split("\n");
  if (typed.length < reference.length) return leading(reference[typed.length]);
  const last = typed[typed.length - 1];
  const opens = /(?:[{([]|=>)$/.test(last.trim());
  return leading(last) + (opens ? "  " : "");
}
