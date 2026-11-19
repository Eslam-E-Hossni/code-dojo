/**
 * Comparing a predicted console output with the real one, for the
 * "what does this print?" problems.
 */

/** Points for every line that was predicted right. */
export const POINTS_PER_LINE = 5;

/**
 * Makes two ways of writing the same line equal: spaces at the ends,
 * repeated spaces, quotes around the whole line, and upper or lower case.
 */
export function normalizeLine(line: string): string {
  let text = line.trim().replace(/\s+/g, " ");
  const first = text[0];
  const last = text[text.length - 1];
  if (text.length >= 2 && first === last && (first === '"' || first === "'" || first === "`")) {
    text = text.slice(1, -1).trim();
  }
  return text.toLowerCase();
}

/** The lines the learner typed, without the empty ones. */
export function splitPrediction(text: string): string[] {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") out.push(lines[i].trim());
  }
  return out;
}

export type OutputRow =
  /** Predicted, and printed at this place. */
  | { kind: "match"; predicted: string; actual: string; actualIndex: number }
  /** Printed, but not predicted here. */
  | { kind: "missing"; actual: string; actualIndex: number }
  /** Predicted, but not printed here. */
  | { kind: "extra"; predicted: string };

/**
 * Lines up the two lists so that the longest run of lines in the right
 * order counts as right. One forgotten line then costs one line, not every
 * line after it.
 */
export function compareOutput(predicted: string[], actual: string[]): OutputRow[] {
  const p = predicted.map(normalizeLine);
  const a = actual.map(normalizeLine);

  // lcs[i][j] = longest common run of p from i and a from j
  const lcs: number[][] = [];
  for (let i = 0; i <= p.length; i++) {
    lcs.push(new Array(a.length + 1).fill(0));
  }
  for (let i = p.length - 1; i >= 0; i--) {
    for (let j = a.length - 1; j >= 0; j--) {
      lcs[i][j] = p[i] === a[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: OutputRow[] = [];
  let i = 0;
  let j = 0;
  while (i < p.length && j < a.length) {
    if (p[i] === a[j]) {
      rows.push({ kind: "match", predicted: predicted[i], actual: actual[j], actualIndex: j });
      i++;
      j++;
    } else if (lcs[i + 1][j] > lcs[i][j + 1]) {
      rows.push({ kind: "extra", predicted: predicted[i] });
      i++;
    } else {
      rows.push({ kind: "missing", actual: actual[j], actualIndex: j });
      j++;
    }
  }
  while (i < p.length) {
    rows.push({ kind: "extra", predicted: predicted[i] });
    i++;
  }
  while (j < a.length) {
    rows.push({ kind: "missing", actual: actual[j], actualIndex: j });
    j++;
  }
  return rows;
}

export function countMatches(rows: OutputRow[]): number {
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].kind === "match") count++;
  }
  return count;
}
