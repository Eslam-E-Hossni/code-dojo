/**
 * A light scanner for unfinished code.
 *
 * In Learn mode the code is unfinished most of the time: a function is
 * open, a call is half written, a JSX tag is not closed yet. Before such
 * code can be parsed, the scanner finds what is still open, so it can be
 * closed.
 *
 * It knows strings, template strings with ${ }, comments and regular
 * expressions, so a bracket inside any of them is not counted. With `jsx`
 * on it also knows JSX: an opening tag, the children of an element (plain
 * text, where a quote is just a quote), and { } inside them.
 */

/**
 * Something that is still open:
 *   "{" "(" "["   a bracket
 *   "${"          an expression inside a template string
 *   "`"           the template string itself
 *   "<div"        a JSX opening tag that is not finished: <div className=
 *   "<div>"       a JSX element that waits for its closing tag ("<>" is a fragment)
 *   "{try"        the block of a `try`: closing it alone is not enough, a catch must follow
 */
export type Opener = string;

export interface Scan {
  /** What is still open, outermost first. */
  open: Opener[];
  /** A closing bracket that closes nothing, or the wrong bracket. Null when the brackets fit. */
  stray: { offset: number; found: string; wanted: string | null } | null;
  /** True when the text ends inside a quoted string or a block comment. */
  unterminated: "string" | "comment" | null;
  /** The text with comments removed and strings kept, trimmed at the end. */
  lastChar: string;
  /** The last word or punctuation before the end, for example "=", "return", "=>". */
  lastToken: string;
}

const BRACKET_CLOSER: Record<string, string> = { "{": "}", "(": ")", "[": "]", "${": "}", "`": "`", "{try": "}" };

/** True for a JSX element that waits for its closing tag: "<div>" or "<>". */
export function isElement(opener: Opener): boolean {
  return opener.length >= 2 && opener[0] === "<" && opener[opener.length - 1] === ">";
}

/** True for a JSX opening tag that is still being written: "<div". */
export function isOpenTag(opener: Opener): boolean {
  return opener[0] === "<" && opener[opener.length - 1] !== ">";
}

/** What closes one opener. */
export function closerOf(opener: Opener): string {
  if (isElement(opener)) return "</" + opener.slice(1);
  // A tag that never got its ">" is closed as an element without children.
  if (isOpenTag(opener)) return " />";
  // A try block without its catch does not parse, so an empty one stands in for it.
  if (opener === "{try") return "} catch {}";
  return BRACKET_CLOSER[opener];
}

/** After these, a "/" starts a regular expression and is not a division. */
const BEFORE_REGEX = new Set([
  "", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^",
  "=>", "return", "typeof", "case", "do", "else", "in", "of", "void", "delete", "throw", "new", "await",
]);

/** After these, a "<" with a name behind it starts a JSX tag and is not "less than". */
const BEFORE_JSX = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "=>", "return", "default", "yield"]);

const WORD = /[A-Za-z0-9_$]/;
const TAG_NAME = /[A-Za-z0-9_$.:-]/;

export function scan(text: string, jsx = false): Scan {
  const open: Opener[] = [];
  let stray: Scan["stray"] = null;
  let unterminated: Scan["unterminated"] = null;
  let lastToken = "";
  let i = 0;

  const top = () => (open.length > 0 ? open[open.length - 1] : null);

  /** Reads "<name" at i and opens the tag. */
  const openTag = () => {
    let j = i + 1;
    while (j < text.length && TAG_NAME.test(text[j])) j++;
    open.push(text.slice(i, j));
    lastToken = "jsx";
    i = j;
  };

  while (i < text.length) {
    const ch = text[i];
    const here = top();

    // Inside a template string everything is text, up to ` or ${.
    if (here === "`") {
      if (ch === "\\") {
        i += 2;
      } else if (ch === "`") {
        open.pop();
        lastToken = "`";
        i++;
      } else if (ch === "$" && text[i + 1] === "{") {
        open.push("${");
        lastToken = "{";
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    // The children of a JSX element: text, up to a tag or an expression in { }.
    if (here !== null && isElement(here)) {
      if (ch === "{") {
        open.push("{");
        lastToken = "{";
        i++;
      } else if (ch === "<" && text[i + 1] === "/") {
        // A closing tag. It closes the element that is open, whatever name it says.
        const end = text.indexOf(">", i);
        open.pop();
        lastToken = "jsx";
        i = end === -1 ? text.length : end + 1;
      } else if (ch === "<") {
        openTag();
      } else {
        i++;
      }
      continue;
    }

    // Inside an opening tag: attributes, up to ">" or "/>".
    if (here !== null && isOpenTag(here)) {
      if (ch === "{") {
        open.push("{");
        lastToken = "{";
        i++;
      } else if (ch === '"' || ch === "'") {
        // An attribute string has no escapes and may go over several lines.
        const end = text.indexOf(ch, i + 1);
        if (end === -1) {
          unterminated = "string";
          i = text.length;
        } else {
          i = end + 1;
        }
        lastToken = "string";
      } else if (ch === "/" && text[i + 1] === ">") {
        open.pop();
        lastToken = "jsx";
        i += 2;
      } else if (ch === ">") {
        open[open.length - 1] = here + ">";
        lastToken = "jsx";
        i++;
      } else {
        if (ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r") lastToken = ch;
        i++;
      }
      continue;
    }

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      if (close === -1) {
        unterminated = "comment";
        break;
      }
      i = close + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
      if (text[j] !== ch) unterminated = "string";
      i = Math.min(text.length, j + 1);
      lastToken = "string";
      continue;
    }
    if (ch === "`") {
      open.push("`");
      i++;
      continue;
    }
    // A JSX tag, where a value can start: <div, <Counter, or <> for a fragment.
    if (jsx && ch === "<" && BEFORE_JSX.has(lastToken) && /[A-Za-z_$>]/.test(text[i + 1] ?? "")) {
      openTag();
      continue;
    }
    if (ch === "/" && BEFORE_REGEX.has(lastToken)) {
      // A regular expression: up to the next "/" that is not escaped and not inside [ ].
      let j = i + 1;
      let inClass = false;
      while (j < text.length && text[j] !== "\n" && (inClass || text[j] !== "/")) {
        if (text[j] === "\\") j++;
        else if (text[j] === "[") inClass = true;
        else if (text[j] === "]") inClass = false;
        j++;
      }
      i = Math.min(text.length, j + 1);
      while (i < text.length && /[a-z]/.test(text[i])) i++;
      lastToken = "regex";
      continue;
    }

    if (ch === "{" || ch === "(" || ch === "[") {
      open.push(ch === "{" && lastToken === "try" ? "{try" : ch);
      lastToken = ch;
      i++;
      continue;
    }
    if (ch === "}" || ch === ")" || ch === "]") {
      if (here === null || BRACKET_CLOSER[here] !== ch) {
        // Is anything open that this bracket could close? If not, it is simply one too many.
        const at = ch === "}" ? Math.max(open.lastIndexOf("{"), open.lastIndexOf("{try")) : open.lastIndexOf(ch === ")" ? "(" : "[");
        if (stray === null) stray = { offset: i, found: ch, wanted: here === null || at === -1 ? null : closerOf(here) };
        // Keep going with the best guess: drop the opener that this closer was meant for.
        if (at !== -1) open.length = at;
      } else {
        open.pop();
      }
      lastToken = ch;
      i++;
      continue;
    }

    if (WORD.test(ch)) {
      let j = i;
      while (j < text.length && WORD.test(text[j])) j++;
      lastToken = text.slice(i, j);
      i = j;
      continue;
    }

    // Punctuation. "=>" matters as one token: it asks for a body.
    if (ch === "=" && text[i + 1] === ">") {
      lastToken = "=>";
      i += 2;
      continue;
    }
    lastToken = ch;
    i++;
  }

  const trimmed = text.trimEnd();
  return { open, stray, unterminated, lastChar: trimmed.slice(-1), lastToken };
}

/** The closers for what is still open, innermost first. */
export function closersOf(open: Opener[]): string[] {
  const out: string[] = [];
  for (let i = open.length - 1; i >= 0; i--) out.push(closerOf(open[i]));
  return out;
}

/** The kind of an opener: every JSX element counts the same, whatever its tag. */
function kindOf(opener: Opener): string {
  if (isElement(opener)) return "<>";
  if (isOpenTag(opener)) return "<";
  return opener;
}

/** Two pieces of code are at the same depth when the same things are open in both. */
export function sameDepth(a: Opener[], b: Opener[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (kindOf(a[i]) !== kindOf(b[i])) return false;
  }
  return true;
}
