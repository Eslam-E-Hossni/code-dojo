/**
 * Rules for Recall and Exam.
 *
 * Both end when every hidden test passes. Running the tests is free, but
 * the points drop with every run: passing at the first run is worth the
 * most, because in an interview there is no test button.
 */

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
