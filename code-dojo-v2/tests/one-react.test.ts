// @vitest-environment jsdom
/**
 * Checks React problem files before they are added to the list:
 *
 *   DOJO_FILES=react-counter,react-timer npx vitest run tests/one-react.test.ts
 *
 * Each name is a file in data/problems, without ".ts". The same rules as
 * for every problem, with the hidden tests run by React Testing Library
 * on jsdom. Without DOJO_FILES this file does nothing.
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
    if (isCode && (value as CodeProblem).react !== undefined) loaded.push(value as CodeProblem);
  }
}

if (loaded.length === 0) {
  describe("one React problem at a time", () => {
    it("has nothing to check: set DOJO_FILES to the file names", () => {});
  });
}

describe.each(loaded)("$id", (problem) => {
  describe("data", () => dataRules(problem));
  describe("reference", () => referenceRules(problem));
});
