/**
 * Attempt rules for one Learn session.
 *
 * Each step allows three tries. Every miss (a wrong line or a requested
 * hint) lowers what the step is worth:
 *   0 misses -> 10 points
 *   1 miss   -> 5 points, hint 1 is shown
 *   2 misses -> 2 points, hint 2 is shown
 *   3 misses -> 0 points, the line is revealed and the step is marked weak
 */

export type Tier = "first" | "second" | "third" | "revealed";

export const POINTS: Record<Tier, number> = {
  first: 10,
  second: 5,
  third: 2,
  revealed: 0,
};

export const MAX_POINTS_PER_STEP = POINTS.first;
export const MAX_MISSES = 3;

export interface StepResult {
  tier: Tier;
  points: number;
}

export interface LearnSession {
  /** The step being typed now. */
  index: number;
  /** Misses on that step, 0 to 3. */
  misses: number;
  /** One entry per finished step. */
  results: StepResult[];
}

export function newSession(): LearnSession {
  return { index: 0, misses: 0, results: [] };
}

export function tierFor(misses: number): Tier {
  if (misses <= 0) return "first";
  if (misses === 1) return "second";
  if (misses === 2) return "third";
  return "revealed";
}

export function withMiss(session: LearnSession): LearnSession {
  return { ...session, misses: Math.min(MAX_MISSES, session.misses + 1) };
}

export function withPass(session: LearnSession): LearnSession {
  const tier = tierFor(session.misses);
  return {
    index: session.index + 1,
    misses: 0,
    results: [...session.results, { tier, points: POINTS[tier] }],
  };
}

export function totalPoints(results: StepResult[]): number {
  let sum = 0;
  for (let i = 0; i < results.length; i++) sum += results[i].points;
  return sum;
}

export function countTier(results: StepResult[], tier: Tier): number {
  let count = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].tier === tier) count++;
  }
  return count;
}

/** A saved session is usable only if it still fits the problem's steps. */
export function isValidSession(
  session: LearnSession | undefined,
  stepCount: number,
): session is LearnSession {
  return (
    session !== undefined &&
    Number.isInteger(session.index) &&
    session.index >= 0 &&
    session.index < stepCount &&
    Array.isArray(session.results) &&
    session.results.length === session.index &&
    session.misses >= 0 &&
    session.misses <= MAX_MISSES
  );
}
