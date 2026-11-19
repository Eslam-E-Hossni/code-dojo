/**
 * Parses code that may be unfinished.
 *
 * The open brackets are closed first (see scan.ts). When that is not enough
 * to make the code parse (the text stops after "=", or after "if (x)"), a
 * few small repairs are tried: a hole where a value is missing, an empty
 * body where a body is missing.
 */

import { parse, type ParserPlugin } from "@babel/parser";
import type { File } from "@babel/types";
import type { CodeLanguage } from "@/data/types";
import { closersOf, isOpenTag, scan, type Opener, type Scan } from "./scan";

/** Stands for "a value that is not written yet". It matches anything in the reference. */
export const HOLE = "__DOJO_HOLE__";

function pluginsFor(language: CodeLanguage): ParserPlugin[] {
  if (language === "ts") return ["typescript"];
  if (language === "tsx") return ["typescript", "jsx"];
  return ["jsx"];
}

/** True for the languages where "<div>" is a tag and not a comparison. */
export function usesJsx(language: CodeLanguage): boolean {
  return language === "jsx" || language === "tsx";
}

function parseStrict(code: string, language: CodeLanguage): File {
  return parse(code, {
    sourceType: "module",
    plugins: pluginsFor(language),
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowNewTargetOutsideFunction: true,
    allowUndeclaredExports: true,
  });
}

export interface SyntaxProblem {
  /** In plain English, without a position. */
  message: string;
  /** Where it is in the text that was given, or null. */
  offset: number | null;
}

export interface Parsed {
  ast: File;
  /** The code that was really parsed: the text plus what was added to finish it. */
  code: string;
  /** The length of the text that was given. A node that ends after it was closed by us. */
  length: number;
  /** The brackets that were open at the end of the text. */
  open: Opener[];
  /** True when a hole or a body had to be added, not only closing brackets. */
  repaired: boolean;
  /**
   * Which half of a conditional had to be added, or "" when none was.
   * Two texts stop at the same place of a conditional only when this is
   * the same: "a ? (" and "a ? (b" both parse with a hole, but they are
   * not the same step.
   */
  missing: string;
}

export type ParseResult = { ok: true; parsed: Parsed } | { ok: false; problem: SyntaxProblem };

function plainMessage(error: unknown): SyntaxProblem {
  const raw = error instanceof Error ? error.message : String(error);
  const position = (error as { pos?: number }).pos;
  // Babel ends its messages with the position: "Unexpected token (3:5)".
  const message = raw.replace(/\s*\(\d+:\d+\)\s*$/, "").replace(/^SyntaxError:\s*/, "");
  return { message, offset: typeof position === "number" ? position : null };
}

function strayMessage(found: Scan["stray"]): SyntaxProblem {
  const stray = found as NonNullable<Scan["stray"]>;
  return {
    message:
      stray.wanted === null
        ? "There is an extra " + stray.found + " here. Nothing is open for it to close."
        : "This " + stray.found + " closes the wrong thing. A " + stray.wanted + " is expected first.",
    offset: stray.offset,
  };
}

/**
 * Parses text that may stop in the middle of a block or of a statement.
 */
export function parseOpen(text: string, language: CodeLanguage): ParseResult {
  const scanned = scan(text, usesJsx(language));
  if (scanned.stray !== null) return { ok: false, problem: strayMessage(scanned.stray) };
  if (scanned.unterminated === "string") {
    return { ok: false, problem: { message: "A string is not closed: its closing quote is missing.", offset: null } };
  }
  if (scanned.unterminated === "comment") {
    return { ok: false, problem: { message: "A comment is not closed: */ is missing.", offset: null } };
  }

  const closers = closersOf(scanned.open);
  const all = closers.join("");
  // The first ")" and what comes before it: where a missing body goes after "if (x".
  const firstParen = closers.indexOf(")");
  const upToParen = firstParen === -1 ? null : closers.slice(0, firstParen + 1).join("");
  const afterParen = firstParen === -1 ? null : closers.slice(firstParen + 1).join("");

  const body = text.trimEnd();
  const attempts: { code: string; repaired: boolean; missing?: string }[] = [{ code: body + "\n" + all, repaired: false }];
  attempts.push({ code: body + " " + HOLE + "\n" + all, repaired: true });
  attempts.push({ code: body + " {}\n" + all, repaired: true });
  attempts.push({ code: body + " " + HOLE + " {}\n" + all, repaired: true });
  if (upToParen !== null && afterParen !== null) {
    attempts.push({ code: body + upToParen + " {}\n" + afterParen, repaired: true });
    attempts.push({ code: body + " " + HOLE + upToParen + " {}\n" + afterParen, repaired: true });
  }
  // A try block that was just closed: "try { ... }" with its catch still to come.
  attempts.push({ code: body + " catch {}\n" + all, repaired: true });
  // A JSX attribute that stops after its "=": onClick=
  const innermost = scanned.open.length > 0 ? scanned.open[scanned.open.length - 1] : null;
  if (innermost !== null && isOpenTag(innermost) && body.endsWith("=")) {
    attempts.push({ code: body + "{" + HOLE + "}\n" + all, repaired: true });
  }

  // A conditional that has its question mark but not its second branch yet:
  //   {list.length === 0 ? (          the first branch is still to come
  //     <p>Nothing.</p>               the first branch is there, ") : (" is still to come
  if (body.includes("?")) {
    const other = " : " + HOLE;
    attempts.push({ code: body + other + "\n" + all, repaired: true, missing: "else" });
    attempts.push({ code: body + " " + HOLE + other + "\n" + all, repaired: true, missing: "then, else" });
    if (upToParen !== null && afterParen !== null) {
      attempts.push({ code: body + upToParen + other + "\n" + afterParen, repaired: true, missing: "else" });
      attempts.push({ code: body + " " + HOLE + upToParen + other + "\n" + afterParen, repaired: true, missing: "then, else" });
    }
  }

  let firstError: unknown = null;
  for (const attempt of attempts) {
    try {
      const ast = parseStrict(attempt.code, language);
      return {
        ok: true,
        parsed: {
          ast,
          code: attempt.code,
          length: body.length,
          open: scanned.open,
          repaired: attempt.repaired,
          missing: attempt.missing ?? "",
        },
      };
    } catch (error) {
      if (firstError === null) firstError = error;
    }
  }

  const problem = plainMessage(firstError);
  // An error inside what we added is really "the text stops too early".
  if (problem.offset !== null && problem.offset >= body.length) problem.offset = null;
  return { ok: false, problem };
}

/** Parses finished code. Throws a SyntaxProblem-shaped error text when it cannot. */
export function parseWhole(code: string, language: CodeLanguage): ParseResult {
  try {
    const ast = parseStrict(code, language);
    return { ok: true, parsed: { ast, code, length: code.trimEnd().length, open: [], repaired: false, missing: "" } };
  } catch (error) {
    return { ok: false, problem: plainMessage(error) };
  }
}
