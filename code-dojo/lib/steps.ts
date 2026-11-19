import type { Step, StepProblem } from "@/data/types";
import type { Syntax } from "./check";

/** How the lines of this problem are compared in Learn. */
export function syntaxOf(problem: StepProblem): Syntax {
  if (problem.kind !== "config") return "js";
  if (problem.language === "dockerfile") return "dockerfile";
  return problem.language === "yaml" ? "yaml" : "lines";
}

/** A step with its position in the whole problem. */
export interface FlatStep extends Step {
  /** Position across all parts, from 0. */
  index: number;
  /** Stable id for saved progress: "<part id>:<position in the part>". */
  key: string;
  partIndex: number;
  partTitle: string;
  firstOfPart: boolean;
  /** How many lines of code `expected` has. */
  lines: number;
}

/** Lines of code. A blank line kept for looks is not counted. */
function countCodeLines(code: string): number {
  const lines = code.split("\n");
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") count++;
  }
  return count;
}

export function flattenSteps(problem: StepProblem): FlatStep[] {
  const out: FlatStep[] = [];
  for (let p = 0; p < problem.parts.length; p++) {
    const part = problem.parts[p];
    for (let s = 0; s < part.steps.length; s++) {
      out.push({
        ...part.steps[s],
        index: out.length,
        key: part.id + ":" + s,
        partIndex: p,
        partTitle: part.title,
        firstOfPart: s === 0,
        lines: countCodeLines(part.steps[s].expected),
      });
    }
  }
  return out;
}

export interface LockedRange {
  /** The step these lines belong to, or null for a part heading comment. */
  stepIndex: number | null;
  startLine: number;
  endLine: number;
}

export interface LockedDoc {
  text: string;
  ranges: LockedRange[];
}

/**
 * The code of every step before `upTo`, as it should sit in the editor.
 * With several parts, each part starts with a comment line and parts are
 * separated by a blank line. The heading of the part that step `upTo`
 * starts is included, so the learner types right under it.
 */
export function buildLocked(
  problem: StepProblem,
  steps: FlatStep[],
  upTo: number,
): LockedDoc {
  const lines: string[] = [];
  const ranges: LockedRange[] = [];
  const multiPart = problem.parts.length > 1;

  const openPart = (step: FlatStep) => {
    if (!step.firstOfPart) return;
    if (lines.length > 0) lines.push("");
    if (multiPart) {
      // A config file (Dockerfile, YAML) starts a comment with "#".
      lines.push((problem.kind === "config" ? "# " : "// ") + step.partTitle);
      ranges.push({
        stepIndex: null,
        startLine: lines.length,
        endLine: lines.length,
      });
    }
  };

  for (let i = 0; i < upTo && i < steps.length; i++) {
    openPart(steps[i]);
    const stepLines = steps[i].expected.split("\n");
    const startLine = lines.length + 1;
    for (let l = 0; l < stepLines.length; l++) lines.push(stepLines[l]);
    ranges.push({ stepIndex: i, startLine, endLine: lines.length });
  }
  if (upTo < steps.length) openPart(steps[upTo]);

  return { text: lines.join("\n"), ranges };
}

/** The full reference solution. */
export function solutionText(problem: StepProblem): string {
  const steps = flattenSteps(problem);
  return buildLocked(problem, steps, steps.length).text;
}

/**
 * The leading spaces of a step, pre-filled in the editor. A step may start
 * with an empty line (a blank line kept from the source), so this looks at
 * its first line of code.
 */
export function indentOf(step: Step): string {
  const lines = step.expected.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const match = /^[ \t]*/.exec(lines[i]);
    return match ? match[0] : "";
  }
  return "";
}
