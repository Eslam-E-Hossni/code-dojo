/**
 * The 5-minute drill: three steps from three different problems.
 *
 * Weak steps (the line had to be revealed) come first. When fewer than
 * three problems have one, the drill fills up with shaky steps (the line
 * needed a hint), and then with any real line of a problem that was
 * finished before. It never repeats a problem.
 */

import type { Problem, StepProblem } from "@/data/types";
import { normalize } from "./check";
import { flattenSteps, type FlatStep } from "./steps";
import type { Store } from "./store";

export const DRILL_SIZE = 3;
/** The drill is meant to be short. The clock only reminds, it never stops the drill. */
export const DRILL_SECONDS = 5 * 60;

export type DrillReason = "weak" | "shaky" | "random";

export interface DrillItem {
  problem: StepProblem;
  /** All the steps of the problem. The ones before `step` are shown as context. */
  steps: FlatStep[];
  step: FlatStep;
  reason: DrillReason;
}

interface Candidate {
  problem: StepProblem;
  steps: FlatStep[];
  weak: FlatStep[];
  shaky: FlatStep[];
  any: FlatStep[];
}

/** A line like "}" teaches nothing alone, so a random pick skips it. */
function isRealLine(step: FlatStep): boolean {
  return normalize(step.expected).length >= 12;
}

function candidates(problems: Problem[], store: Store): Candidate[] {
  const out: Candidate[] = [];
  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];
    if (problem.kind === "output") continue;
    const progress = store.problems[problem.id];
    if (!progress) continue;

    const steps = flattenSteps(problem);
    const weakKeys = progress.weak ?? [];
    const shakyKeys = progress.shaky ?? [];
    const candidate: Candidate = { problem, steps, weak: [], shaky: [], any: [] };

    for (let s = 0; s < steps.length; s++) {
      const step = steps[s];
      if (weakKeys.includes(step.key)) candidate.weak.push(step);
      else if (shakyKeys.includes(step.key)) candidate.shaky.push(step);
      if ((progress.runs ?? []).length > 0 && isRealLine(step)) candidate.any.push(step);
    }
    if (candidate.weak.length + candidate.shaky.length + candidate.any.length > 0) out.push(candidate);
  }
  return out;
}

/** A shuffled copy. `random` returns a number from 0 up to, not including, 1. */
function shuffled<T>(list: T[], random: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const k = Math.floor(random() * (i + 1));
    const swap = out[i];
    out[i] = out[k];
    out[k] = swap;
  }
  return out;
}

function pickOne<T>(list: T[], random: () => number): T {
  return list[Math.floor(random() * list.length)];
}

export function pickDrill(
  problems: Problem[],
  store: Store,
  random: () => number,
  size: number = DRILL_SIZE,
): DrillItem[] {
  const pool = shuffled(candidates(problems, store), random);
  const used = new Set<string>();
  const items: DrillItem[] = [];
  const reasons: DrillReason[] = ["weak", "shaky", "random"];

  for (let r = 0; r < reasons.length; r++) {
    const reason = reasons[r];
    for (let i = 0; i < pool.length && items.length < size; i++) {
      const candidate = pool[i];
      if (used.has(candidate.problem.id)) continue;
      const steps = reason === "weak" ? candidate.weak : reason === "shaky" ? candidate.shaky : candidate.any;
      if (steps.length === 0) continue;
      used.add(candidate.problem.id);
      items.push({ problem: candidate.problem, steps: candidate.steps, step: pickOne(steps, random), reason });
    }
  }
  return items;
}

/** How many weak steps there are in all, for the home page. */
export function countWeakSteps(problems: Problem[], store: Store): { steps: number; problems: number } {
  const list = candidates(problems, store);
  let steps = 0;
  let withWeak = 0;
  for (let i = 0; i < list.length; i++) {
    steps += list[i].weak.length;
    if (list[i].weak.length > 0) withWeak++;
  }
  return { steps, problems: withWeak };
}
