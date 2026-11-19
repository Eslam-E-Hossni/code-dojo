/**
 * Checking a config file by rules.
 *
 * A rule looks at the whole file and gives one of three answers:
 *   pass  the file follows the rule
 *   fail  the file breaks the rule
 *   todo  the part the rule is about is not written yet
 * While the learner types, "todo" stays neutral and the list turns green
 * rule by rule. When the file is handed in, every rule must be "pass".
 */

export type RuleStatus = "pass" | "fail" | "todo";

export interface RuleVerdict {
  status: RuleStatus;
  /** What exactly is wrong or missing, in Egyptian Arabic. */
  detail?: string;
  /** The line the detail is about, from 1. */
  line?: number;
}

export interface Rule<File> {
  id: string;
  /** The rule in a few words, Egyptian Arabic. */
  title: string;
  /** Why the rule exists, Egyptian Arabic. */
  why: string;
  check(file: File): RuleVerdict;
}

export interface RuleResult extends RuleVerdict {
  id: string;
  title: string;
  why: string;
}

/** A place in the file that could not be read: a syntax error. */
export interface Diagnostic {
  line: number;
  /**
   * Set when the parser cannot tell which of two lines is the wrong one:
   * the mistake is somewhere from `line` to `endLine`.
   */
  endLine?: number;
  /** What is wrong, in Egyptian Arabic. */
  message: string;
  /** The parser's own message, in English, when there is one. */
  raw?: string;
}

export interface CheckReport {
  rules: RuleResult[];
  diagnostics: Diagnostic[];
  /** How many rules pass. */
  passed: number;
  /** True when the file has no syntax error and every rule passes. */
  ok: boolean;
}

export const PASS: RuleVerdict = { status: "pass" };

/**
 * A piece of the learner's file inside a message. The backticks make it
 * render left-to-right, as code, like the code terms of a coach sentence.
 */
export function code(text: string | null): string {
  return "`" + String(text).split("`").join("'") + "`";
}

export function todo(detail: string): RuleVerdict {
  return { status: "todo", detail };
}

export function fail(detail: string, line?: number): RuleVerdict {
  return { status: "fail", detail, line };
}
