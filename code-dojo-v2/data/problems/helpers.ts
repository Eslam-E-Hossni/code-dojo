import { shape } from "../shape";
import type { Step } from "../types";

/**
 * A step of a solution. Its hint2, the shape of the line with blanks, is
 * made from the line itself.
 */
export function line(expected: string, text: Omit<Step, "expected" | "hint2">): Step {
  return { ...text, expected, hint2: shape(expected) };
}
