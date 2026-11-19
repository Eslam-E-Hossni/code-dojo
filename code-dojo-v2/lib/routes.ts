import type { Problem } from "@/data/types";
import type { Mode } from "./store";

/**
 * The address of a problem in a mode. Learn lives at /problem/x, Recall and
 * Exam at /problem/x/recall and /problem/x/exam. An output question has one
 * screen only, at /problem/x.
 */
export function problemHref(problem: Problem, mode: Mode): string {
  if (problem.kind === "output" || mode === "learn" || mode === "output") return "/problem/" + problem.id;
  return "/problem/" + problem.id + "/" + mode;
}
