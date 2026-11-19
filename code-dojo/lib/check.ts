/**
 * Line checker for Learn mode.
 *
 * It never compares raw strings. Both the typed line and the reference are
 * split into tokens, so spacing, the quote style, and optional semicolons do
 * not matter. Names do matter: later coach sentences use them.
 */

export type TokenKind = "ident" | "num" | "str" | "tpl" | "punct";

/**
 * How a line is read.
 *   js          code and tests (the default)
 *   dockerfile  words split on spaces; the instruction in any case; [ ] , apart
 *   yaml        words split on spaces; the indentation of a line counts;
 *               [ ] , and the ${{ }} of an expression apart
 *   lines       words split on spaces, nothing else (.dockerignore)
 * In the last three a line that starts with "#" is a comment.
 */
export type Syntax = "js" | "dockerfile" | "yaml" | "lines";

export interface Token {
  kind: TokenKind;
  value: string;
  /** Offsets in the source string. */
  start: number;
  end: number;
  /** True when a line break comes before this token. */
  nl: boolean;
}

const PUNCTUATORS = [
  ">>>=",
  "...",
  "===",
  "!==",
  "**=",
  "<<=",
  ">>=",
  ">>>",
  "&&=",
  "||=",
  "??=",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "?.",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "**",
  "<<",
  ">>",
];

const KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "finally", "for",
  "function", "if", "import", "in", "instanceof", "new", "return", "super",
  "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with",
  "yield", "let", "static", "async", "await", "of", "null", "undefined",
  "true", "false", "NaN", "Infinity",
]);

const IDENT = /[\p{L}_$][\p{L}\p{N}_$]*/uy;
const NUMBER = /\d[\dA-Za-z_]*(\.\d[\dA-Za-z_]*)?/y;

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let nl = false;

  while (i < src.length) {
    const ch = src[i];

    if (ch === "\n") {
      nl = true;
      i++;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r" || ch === " ") {
      i++;
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const close = src.indexOf("*/", i + 2);
      i = close === -1 ? src.length : close + 2;
      continue;
    }

    const start = i;
    let kind: TokenKind;
    let value: string;

    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let content = "";
      while (j < src.length && src[j] !== ch && src[j] !== "\n") {
        if (src[j] === "\\" && j + 1 < src.length) {
          const next = src[j + 1];
          // \' and \" mean the same as the bare quote in the other style.
          content += next === '"' || next === "'" ? next : "\\" + next;
          j += 2;
        } else {
          content += src[j];
          j++;
        }
      }
      const closed = src[j] === ch;
      i = closed ? j + 1 : j;
      kind = "str";
      // An unclosed string keeps no closing quote, so it never matches.
      value = '"' + content + (closed ? '"' : "");
    } else if (ch === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== "`") {
        j += src[j] === "\\" ? 2 : 1;
      }
      i = Math.min(src.length, j + 1);
      kind = "tpl";
      value = src.slice(start, i);
    } else {
      IDENT.lastIndex = i;
      NUMBER.lastIndex = i;
      const ident = IDENT.exec(src);
      const num = ident ? null : NUMBER.exec(src);
      if (ident) {
        kind = "ident";
        value = ident[0];
        i += value.length;
      } else if (num) {
        kind = "num";
        value = num[0];
        i += value.length;
      } else {
        kind = "punct";
        value = ch;
        for (let p = 0; p < PUNCTUATORS.length; p++) {
          if (src.startsWith(PUNCTUATORS[p], i)) {
            value = PUNCTUATORS[p];
            break;
          }
        }
        i += value.length;
      }
    }

    out.push({ kind, value, start, end: i, nl });
    nl = false;
  }

  return out;
}

/** Reads a config file. Spacing between words never matters; in YAML the indentation does. */
function tokenizePlain(src: string, syntax: Exclude<Syntax, "js">): Token[] {
  const out: Token[] = [];
  const lines = src.split("\n");
  let offset = 0;
  // Dockerfile: the line before ended with a backslash, so this one goes on.
  let continued = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const lineStart = offset;
    offset += line.length + 1;

    const trimmed = line.trim();
    if (trimmed === "" || trimmed[0] === "#") continue;

    let i = 0;
    while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;

    let firstOfLine = true;
    const push = (kind: TokenKind, value: string, start: number, end: number) => {
      out.push({ kind, value, start: lineStart + start, end: lineStart + end, nl: firstOfLine && out.length > 0 });
      firstOfLine = false;
    };

    if (syntax === "yaml") push("punct", i + " spaces", 0, i);

    let words = 0;
    let isFrom = false;
    while (i < line.length) {
      const ch = line[i];
      if (ch === " " || ch === "\t" || ch === "\r") {
        i++;
        continue;
      }
      // In YAML a "#" that starts a word starts a comment.
      if (syntax === "yaml" && ch === "#") break;

      const start = i;
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        let content = "";
        while (j < line.length && line[j] !== ch) {
          content += line[j];
          j++;
        }
        const closed = line[j] === ch;
        i = closed ? j + 1 : j;
        // In YAML both quote styles mean the same. In a Dockerfile they do
        // not: CMD ['node'] is not an array, so the quote style is kept.
        const quote = syntax === "dockerfile" ? ch : '"';
        // An unclosed string keeps no closing quote, so it never matches.
        push("str", quote + content + (closed ? quote : ""), start, i);
      } else if (syntax === "yaml" && (line.startsWith("${{", i) || line.startsWith("}}", i))) {
        // ${{ secrets.TOKEN }} and ${{secrets.TOKEN}} are the same expression.
        i += line[i] === "$" ? 3 : 2;
        push("punct", line.slice(start, i), start, i);
      } else if (syntax !== "lines" && (ch === "[" || ch === "]" || ch === ",")) {
        // [main] and [ main ], [20,22] and [20, 22] are the same list.
        i++;
        push("punct", ch, start, i);
      } else {
        while (i < line.length && line[i] !== " " && line[i] !== "\t" && line[i] !== "\r") {
          if (syntax !== "lines" && (line[i] === "[" || line[i] === "]" || line[i] === ",")) break;
          if (syntax === "dockerfile" && line[i] === '"') break;
          if (syntax === "yaml" && (line.startsWith("${{", i) || line.startsWith("}}", i))) break;
          i++;
        }
        let value = line.slice(start, i);
        if (syntax === "dockerfile") {
          // FROM and from are the same instruction, and so are AS and as.
          if (words === 0 && !continued) {
            value = value.toUpperCase();
            isFrom = value === "FROM";
          } else if (isFrom && value.toLowerCase() === "as") {
            value = "AS";
          }
        }
        push("ident", value, start, i);
      }
      words++;
    }

    continued = false;
    if (syntax === "dockerfile" && out.length > 0 && out[out.length - 1].value === "\\" && !firstOfLine) {
      out.pop();
      continued = true;
    }
  }

  return out;
}

/** The tokens of a line, with the differences that do not change its meaning removed. */
function read(code: string, syntax: Syntax): Token[] {
  return syntax === "js" ? canonical(tokenize(code)) : tokenizePlain(code, syntax);
}

function isPunct(token: Token | undefined, value: string): boolean {
  return token !== undefined && token.kind === "punct" && token.value === value;
}

function isName(token: Token | undefined): token is Token {
  return (
    token !== undefined && token.kind === "ident" && !KEYWORDS.has(token.value)
  );
}

/**
 * Removes differences that do not change the meaning:
 * - a semicolon at the end of a statement
 * - the brackets around a single arrow parameter: (x) => is x =>
 */
export function canonical(tokens: Token[]): Token[] {
  const withoutSemis: Token[] = [];
  const open: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "punct") {
      if (t.value === "(" || t.value === "[" || t.value === "{") {
        open.push(t.value);
      } else if (t.value === ")" || t.value === "]" || t.value === "}") {
        open.pop();
      } else if (t.value === ";") {
        const next = tokens[i + 1];
        const inHeader = open.length > 0 && open[open.length - 1] === "(";
        const endsStatement = !next || next.nl || isPunct(next, "}");
        // Inside for (...) the semicolons are part of the syntax.
        if (endsStatement && !inHeader) continue;
      }
    }
    withoutSemis.push(t);
  }

  const out: Token[] = [];
  for (let i = 0; i < withoutSemis.length; i++) {
    const t = withoutSemis[i];
    if (
      isPunct(t, "(") &&
      isName(withoutSemis[i + 1]) &&
      isPunct(withoutSemis[i + 2], ")") &&
      isPunct(withoutSemis[i + 3], "=>")
    ) {
      out.push(withoutSemis[i + 1]);
      i += 2;
      continue;
    }
    out.push(t);
  }
  return out;
}

/** The normalized form as text. Useful in tests and when debugging data. */
export function normalize(code: string, syntax: Syntax = "js"): string {
  const tokens = read(code, syntax);
  let text = "";
  for (let i = 0; i < tokens.length; i++) {
    text += (i > 0 ? " " : "") + tokens[i].value;
  }
  return text;
}

function sameToken(a: Token, b: Token): boolean {
  return a.kind === b.kind && a.value === b.value;
}

function commonPrefix(a: Token[], b: Token[]): number {
  let n = 0;
  while (n < a.length && n < b.length && sameToken(a[n], b[n])) n++;
  return n;
}

/** Indexes of the names a line declares: variables, functions, parameters. */
function declaredAt(tokens: Token[]): Set<number> {
  const found = new Set<number>();

  // Collects names inside a bracket group that starts at `open`.
  const collect = (open: number) => {
    let depth = 0;
    for (let k = open; k < tokens.length; k++) {
      const t = tokens[k];
      if (t.kind === "punct") {
        if (t.value === "(" || t.value === "[" || t.value === "{") depth++;
        if (t.value === ")" || t.value === "]" || t.value === "}") {
          depth--;
          if (depth === 0) return;
        }
        continue;
      }
      const prev = tokens[k - 1];
      if (
        isName(t) &&
        prev.kind === "punct" &&
        (prev.value === "(" ||
          prev.value === "[" ||
          prev.value === "{" ||
          prev.value === "," ||
          prev.value === "...")
      ) {
        found.add(k);
      }
    }
  };

  // A method of a class: on(name, listener) {
  // The method name itself must match, because the tests call it. Its
  // parameters are new names.
  if (isName(tokens[0]) && isPunct(tokens[1], "(") && isPunct(tokens[tokens.length - 1], "{")) {
    let depth = 0;
    for (let k = 1; k < tokens.length; k++) {
      if (isPunct(tokens[k], "(")) depth++;
      if (isPunct(tokens[k], ")")) {
        depth--;
        if (depth === 0) {
          if (k === tokens.length - 2) collect(1);
          break;
        }
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];

    if (t.kind === "ident" && (t.value === "const" || t.value === "let" || t.value === "var")) {
      if (isName(next)) found.add(i + 1);
      else if (isPunct(next, "[") || isPunct(next, "{")) collect(i + 1);
    } else if (t.kind === "ident" && (t.value === "function" || t.value === "class")) {
      let k = i + 1;
      if (isName(tokens[k])) {
        found.add(k);
        k++;
      }
      if (isPunct(tokens[k], "(")) collect(k);
    } else if (t.kind === "ident" && t.value === "catch" && isPunct(next, "(")) {
      collect(i + 1);
    } else if (isPunct(t, "=>")) {
      const prev = tokens[i - 1];
      if (isName(prev)) {
        found.add(i - 1);
      } else if (isPunct(prev, ")")) {
        let depth = 0;
        for (let k = i - 1; k >= 0; k--) {
          if (isPunct(tokens[k], ")")) depth++;
          if (isPunct(tokens[k], "(")) {
            depth--;
            if (depth === 0) {
              collect(k);
              break;
            }
          }
        }
      }
    }
  }

  return found;
}

export interface Rename {
  /** The name in the reference solution. */
  want: string;
  /** The name the learner used. */
  got: string;
}

/**
 * If the typed line equals the reference except for names that this very
 * line declares, returns those names. A different name is not a wrong idea,
 * so the app can ask for the reference name without counting a miss.
 */
function renameOnly(user: Token[], ref: Token[]): Rename[] | null {
  if (user.length !== ref.length) return null;
  const declared = declaredAt(ref);
  const declaredNames = new Set<string>();
  for (const index of declared) declaredNames.add(ref[index].value);

  const mapping = new Map<string, string>();
  for (let i = 0; i < ref.length; i++) {
    const r = ref[i];
    const u = user[i];
    const isDeclaredName = r.kind === "ident" && declaredNames.has(r.value);
    if (!isDeclaredName) {
      if (!sameToken(r, u)) return null;
      continue;
    }
    if (!isName(u)) return null;
    const known = mapping.get(r.value);
    if (known === undefined) mapping.set(r.value, u.value);
    else if (known !== u.value) return null;
  }

  const renames: Rename[] = [];
  for (const [want, got] of mapping) {
    if (want !== got) renames.push({ want, got });
  }
  return renames.length > 0 ? renames : null;
}

export interface Diff {
  /** wrong: a different token. missing: the line stops early. extra: it goes on too long. */
  kind: "wrong" | "missing" | "extra";
  /** Range in the learner's input that holds the first problem. */
  start: number;
  end: number;
  /** The learner's first wrong text, when there is one. */
  got: string | null;
  /** What the reference has there. Show it only after the line is revealed. */
  want: string | null;
}

export type CheckResult =
  | { ok: true; via: "expected" | "accept" }
  | { ok: false; empty: true }
  | { ok: false; empty: false; rename: Rename[] | null; diff: Diff };

export interface Checkable {
  expected: string;
  accept?: string[];
}

function firstDiff(input: string, user: Token[], ref: Token[]): Diff {
  const k = commonPrefix(user, ref);
  const lastEnd = user.length > 0 ? user[user.length - 1].end : input.length;

  if (k === user.length) {
    return {
      kind: "missing",
      start: lastEnd,
      end: lastEnd,
      got: null,
      want: k < ref.length ? ref[k].value : null,
    };
  }
  if (k === ref.length) {
    return {
      kind: "extra",
      start: user[k].start,
      end: lastEnd,
      got: input.slice(user[k].start, lastEnd),
      want: null,
    };
  }
  return {
    kind: "wrong",
    start: user[k].start,
    end: user[k].end,
    got: input.slice(user[k].start, user[k].end),
    want: ref[k].value,
  };
}

export function checkLine(input: string, step: Checkable, syntax: Syntax = "js"): CheckResult {
  const user = read(input, syntax);
  if (user.length === 0) return { ok: false, empty: true };

  const variants: string[] = [step.expected];
  if (step.accept) {
    for (let i = 0; i < step.accept.length; i++) variants.push(step.accept[i]);
  }

  let best: Token[] = [];
  let bestPrefix = -1;
  let rename: Rename[] | null = null;

  for (let v = 0; v < variants.length; v++) {
    const ref = read(variants[v], syntax);
    const prefix = commonPrefix(user, ref);
    if (prefix === ref.length && prefix === user.length) {
      return { ok: true, via: v === 0 ? "expected" : "accept" };
    }
    if (prefix > bestPrefix) {
      bestPrefix = prefix;
      best = ref;
    }
    // "The right idea with another name" only makes sense for code.
    if (!rename && syntax === "js") rename = renameOnly(user, ref);
  }

  return { ok: false, empty: false, rename, diff: firstDiff(input, user, best) };
}
