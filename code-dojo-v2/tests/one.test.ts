/**
 * Checks problem files before they are added to the list:
 *
 *   DOJO_FILES=throttle,sleep npx vitest run tests/one.test.ts
 *
 * Each name is a file in data/problems, without ".ts". Every code problem
 * that the file exports is checked with the same rules as the whole app.
 * Without DOJO_FILES this file does nothing.
 */
import { describe, it } from "vitest";
import type { CodeProblem } from "@/data/types";
import { dataRules, referenceRules } from "./rules";

const files = (process.env.DOJO_FILES ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name !== "");

const loaded: CodeProblem[] = [];
for (const file of files) {
  const exports = (await import(/* @vite-ignore */ "../data/problems/" + file + ".ts")) as Record<string, unknown>;
  for (const value of Object.values(exports)) {
    const isCode = typeof value === "object" && value !== null && (value as { kind?: string }).kind === "code";
    // A React problem needs a DOM for its tests: tests/one-react.test.ts checks those.
    if (isCode && (value as CodeProblem).react === undefined) loaded.push(value as CodeProblem);
  }
}

if (loaded.length === 0) {
  describe("one problem at a time", () => {
    it("has nothing to check: set DOJO_FILES to the file names", () => {});
  });
}

describe.each(loaded)("$id", (problem) => {
  describe("data", () => dataRules(problem));
  describe("reference", () => referenceRules(problem));
});
