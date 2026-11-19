/**
 * The memory system: when a problem comes back, how well it is known, the
 * streak, and which steps count as weak.
 *
 * Nothing here is saved. Everything is worked out from the finished
 * sessions (`runs`) and the weak steps that the store already keeps, so old
 * progress fits without any conversion.
 *
 * The schedule is a ladder of three waits: 1 day, 3 days, 7 days.
 * - The score of a session says how far up the ladder it may go:
 *   85% or more can reach 7 days, 60% or more can reach 3 days, less goes
 *   back to 1 day.
 * - A problem climbs one step at a time, and only once per day. So the
 *   first session always comes back the next day, however good it was.
 * - While a problem has weak steps it comes back after 1 day.
 *
 * All days are local calendar days, written "2026-11-18".
 */

import type { Problem } from "@/data/types";
import type { Tier } from "./learn";
import type { Mode, ProblemProgress, RunRecord, Store } from "./store";

export type Mastery = "new" | "learning" | "strong";
export type Band = "weak" | "ok" | "strong";

/** Days to wait on each step of the ladder. */
export const INTERVALS = [1, 3, 7];
export const STRONG_SCORE = 0.85;
export const OK_SCORE = 0.6;

/** How far up the ladder a score may go. */
const REACH: Record<Band, number> = { weak: 0, ok: 1, strong: 2 };

function pad(value: number): string {
  return value < 10 ? "0" + value : String(value);
}

/** The local calendar day of a moment. */
export function dayOf(date: Date): string {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

/** A day as a count of days, so two days can be subtracted. */
function dayNumber(day: string): number {
  const parts = day.split("-");
  return Math.round(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / 86_400_000);
}

/** How many days from one day to another. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(day: string, count: number): string {
  const date = new Date((dayNumber(day) + count) * 86_400_000);
  return date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate());
}

/** The local day a session finished on, or null if its date cannot be read. */
function dayOfRun(run: { at: string }): string | null {
  const date = new Date(run.at);
  return Number.isNaN(date.getTime()) ? null : dayOf(date);
}

export function scoreOf(run: RunRecord): number {
  return run.max > 0 ? run.points / run.max : 0;
}

export function bandOf(score: number): Band {
  if (score >= STRONG_SCORE) return "strong";
  if (score >= OK_SCORE) return "ok";
  return "weak";
}

export interface Review {
  mastery: Mastery;
  /** The step on the ladder: 0, 1 or 2. It is -1 for a new problem. */
  level: number;
  /** Days from the last session to the next review. */
  interval: number | null;
  /** The day of the last finished session. */
  lastDay: string | null;
  /** The score of that session, 0 to 1. */
  lastScore: number | null;
  /** The day of the next review. */
  dueDay: string | null;
  /** Days from today to the next review. 0 or less means it is due. */
  dueIn: number | null;
  /** True when weak steps made the wait shorter than the ladder says. */
  sooner: boolean;
}

const NEW_REVIEW: Review = {
  mastery: "new",
  level: -1,
  interval: null,
  lastDay: null,
  lastScore: null,
  dueDay: null,
  dueIn: null,
  sooner: false,
};

export function reviewOf(progress: ProblemProgress, today: string): Review {
  let level = -1;
  let levelBeforeDay = -1;
  let lastDay: string | null = null;
  let lastScore: number | null = null;

  for (let i = 0; i < progress.runs.length; i++) {
    const run = progress.runs[i];
    const day = dayOfRun(run);
    if (day === null) continue;
    if (day !== lastDay) {
      levelBeforeDay = level;
      lastDay = day;
    }
    // Several sessions on one day: the last one decides, and the day still
    // counts as one step up at most.
    lastScore = scoreOf(run);
    level = Math.min(REACH[bandOf(lastScore)], levelBeforeDay + 1);
  }

  if (lastDay === null) return NEW_REVIEW;

  const hasWeak = progress.weak.length > 0;
  const ladder = INTERVALS[level];
  const interval = hasWeak ? Math.min(ladder, INTERVALS[0]) : ladder;
  const dueDay = addDays(lastDay, interval);

  return {
    mastery: level === INTERVALS.length - 1 && !hasWeak ? "strong" : "learning",
    level,
    interval,
    lastDay,
    lastScore,
    dueDay,
    dueIn: daysBetween(today, dueDay),
    sooner: interval < ladder,
  };
}

export function isDue(review: Review): boolean {
  return review.dueIn !== null && review.dueIn <= 0;
}

/**
 * The mode to open for a review. The point is to need less and less help:
 * Learn again while lines are weak, then Recall, then Exam.
 */
export function suggestedMode(problem: Problem, progress: ProblemProgress, review: Review): Mode {
  if (problem.kind === "output") return "output";
  if (review.level < 0) return "learn";
  if (progress.weak.length > 0) return "learn";
  if (review.lastScore !== null && bandOf(review.lastScore) === "weak") return "learn";
  return review.level >= 1 ? "exam" : "recall";
}

export interface ReviewItem {
  problem: Problem;
  progress: ProblemProgress;
  review: Review;
}

function progressIn(store: Store, id: string): ProblemProgress {
  return store.problems[id] ?? { weak: [], runs: [] };
}

/** Every problem with its review, in study order. */
export function reviewAll(problems: Problem[], store: Store, today: string): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (let i = 0; i < problems.length; i++) {
    const progress = progressIn(store, problems[i].id);
    out.push({ problem: problems[i], progress, review: reviewOf(progress, today) });
  }
  return out;
}

/** The problems to review today: the most overdue first. */
export function dueToday(items: ReviewItem[]): ReviewItem[] {
  const due: ReviewItem[] = [];
  for (let i = 0; i < items.length; i++) {
    if (isDue(items[i].review)) due.push(items[i]);
  }
  // A stable insertion sort keeps study order between problems that are equally late.
  for (let i = 1; i < due.length; i++) {
    const item = due[i];
    let k = i - 1;
    while (k >= 0 && (due[k].review.dueIn as number) > (item.review.dueIn as number)) {
      due[k + 1] = due[k];
      k--;
    }
    due[k + 1] = item;
  }
  return due;
}

/** The review that comes next when nothing is due today. */
export function nextUp(items: ReviewItem[]): ReviewItem | null {
  let best: ReviewItem | null = null;
  for (let i = 0; i < items.length; i++) {
    const dueIn = items[i].review.dueIn;
    if (dueIn === null || dueIn <= 0) continue;
    if (best === null || dueIn < (best.review.dueIn as number)) best = items[i];
  }
  return best;
}

export function countMastery(items: ReviewItem[]): Record<Mastery, number> {
  const count: Record<Mastery, number> = { new: 0, learning: 0, strong: 0 };
  for (let i = 0; i < items.length; i++) count[items[i].review.mastery]++;
  return count;
}

/** The days on which something was finished: a session or a drill. */
export function activeDays(store: Store): Set<string> {
  const days = new Set<string>();
  for (const id of Object.keys(store.problems)) {
    const runs = store.problems[id].runs ?? [];
    for (let i = 0; i < runs.length; i++) {
      const day = dayOfRun(runs[i]);
      if (day !== null) days.add(day);
    }
  }
  const drills = store.drills ?? [];
  for (let i = 0; i < drills.length; i++) {
    const day = dayOfRun(drills[i]);
    if (day !== null) days.add(day);
  }
  return days;
}

export interface Streak {
  /** Days in a row, ending today or yesterday. */
  count: number;
  /** False when today still needs a session to keep the streak. */
  doneToday: boolean;
}

export function streakOf(days: Set<string>, today: string): Streak {
  const doneToday = days.has(today);
  let day = doneToday ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return { count, doneToday };
}

/**
 * The weak and shaky lists after a step was typed with this result.
 * - weak: the line had to be revealed. It comes back first.
 * - shaky: the line needed a hint. The drill uses it when no line is weak.
 * A line typed right at the first try leaves both lists.
 */
export function withStepResult(progress: ProblemProgress, key: string, tier: Tier): ProblemProgress {
  const weak = progress.weak;
  const shaky = progress.shaky ?? [];
  const without = (list: string[]) => list.filter((item) => item !== key);

  if (tier === "first") {
    if (!weak.includes(key) && !shaky.includes(key)) return progress;
    return { ...progress, weak: without(weak), shaky: without(shaky) };
  }
  if (tier === "revealed") {
    return { ...progress, weak: weak.includes(key) ? weak : [...weak, key], shaky: without(shaky) };
  }
  if (weak.includes(key) || shaky.includes(key)) return progress;
  return { ...progress, shaky: [...shaky, key] };
}
