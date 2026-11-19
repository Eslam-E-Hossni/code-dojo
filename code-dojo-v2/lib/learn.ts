/**
 * Attempt rules for one step in Learn mode.
 *
 * Each step allows three tries. Every miss (a wrong line, or a hint that
 * was asked for) lowers what the step is worth:
 *   0 misses -> 10 points, and the `explain` sentence is shown
 *   1 miss   -> 5 points, hint 1 is shown
 *   2 misses -> 2 points, hint 2 is shown
 *   3 misses -> 0 points, the line is revealed and the step is marked weak.
 *               The learner still types it before moving on.
 *
 * "Right so far, keep typing" is not a miss.
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

export function tierFor(misses: number): Tier {
  if (misses <= 0) return "first";
  if (misses === 1) return "second";
  if (misses === 2) return "third";
  return "revealed";
}

/** What the scoring needs to know about a piece of accepted code. */
interface Scored {
  steps: number[];
  tier: Tier;
}

/**
 * The tier of one step of a block. The misses and the hints belonged to
 * the first step of the block. Steps written together with it had no hint
 * of their own, so they count as a first try.
 */
export function tierOfStep(block: Scored, index: number): Tier {
  return block.steps[0] === index ? block.tier : "first";
}

export function blockPoints(block: Scored): number {
  return POINTS[block.tier] + (block.steps.length - 1) * POINTS.first;
}

export function sessionPoints(blocks: Scored[]): number {
  let total = 0;
  for (const block of blocks) total += blockPoints(block);
  return total;
}

/** How many steps ended in this tier. */
export function countTier(blocks: Scored[], tier: Tier): number {
  let count = 0;
  for (const block of blocks) {
    for (const index of block.steps) {
      if (tierOfStep(block, index) === tier) count++;
    }
  }
  return count;
}
