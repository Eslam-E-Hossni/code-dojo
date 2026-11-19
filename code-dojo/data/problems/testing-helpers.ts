import { shape } from "../shape";
import type { BuggyVersion, Step } from "../types";

/**
 * In a test these names are the frame of every line, like `function` and
 * `return` in other code. They stay visible in the "shape" hint.
 */
export const TEST_KEEP = [
  "describe",
  "it",
  "test",
  "beforeEach",
  "afterEach",
  "expect",
  "jest",
  "screen",
  "userEvent",
  "global",
];

/** A step of a test file. Its hint2 is made from the line itself. */
export function tline(expected: string, text: Omit<Step, "expected" | "hint2">): Step {
  return { ...text, expected, hint2: shape(expected, TEST_KEEP) };
}

/**
 * A buggy version that replaces one file.
 * `bug` says what is broken (English, shown when the test catches it).
 * `missed` says what the test forgot to check (Arabic, never code).
 */
export function buggy(id: string, path: string, code: string, bug: string, missed: string): BuggyVersion {
  return { id, bug, missed, files: { [path]: code } };
}

/**
 * Replaces one piece of text in a file, to make a buggy version from the
 * correct one. It throws if the text is not there, so a buggy version
 * cannot silently become the same as the correct code.
 */
export function swap(code: string, from: string, to: string): string {
  if (!code.includes(from)) throw new Error("swap: this text is not in the code: " + from);
  return code.replace(from, to);
}

/** The three library imports of a component test, in the order the exercises use. */
export const RTL_IMPORTS = [
  'import { render, screen } from "@testing-library/react";',
  'import userEvent from "@testing-library/user-event";',
  'import "@testing-library/jest-dom";',
];
