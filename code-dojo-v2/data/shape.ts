/**
 * Makes the "shape with blanks" hint of a step from its code:
 *
 *   const [count, setCount] = useState(0);   ->   const [_____, ________] = ________(0);
 *
 * Names and the text inside strings become blanks of the same length.
 * Structure words (const, return, if ...), numbers and punctuation stay.
 * Indentation, empty lines and comments are left out.
 *
 * Use it for `hint2` when the plain shape is good enough:
 *   hint2: shape("  return result;\n}")
 */

/** Words that show the structure of a line. They stay visible. */
const KEEP = new Set([
  "import", "from", "export", "default", "function", "return", "const", "let", "var",
  "if", "else", "for", "while", "do", "of", "in", "new", "typeof", "instanceof",
  "async", "await", "try", "catch", "finally", "throw", "class", "extends", "this",
  "break", "continue", "switch", "case",
]);

const WORD = /[A-Za-z_$][\w$]*/y;

function blanks(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += "_";
  return out;
}

export interface ShapeOptions {
  /** Names that stay visible. */
  keep?: string[];
  /** Keep the indentation of every line. For YAML, where it is part of the meaning. */
  indent?: boolean;
  /** False for files where "//" is not a comment, like a Dockerfile with a URL in it. */
  slashComments?: boolean;
}

function shapeLine(line: string, keep: Set<string>, options: ShapeOptions): string {
  let out = "";
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    // A comment is not part of what the learner types.
    if (options.slashComments !== false && ch === "/" && line[i + 1] === "/") break;

    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let inner = "";
      while (j < line.length && line[j] !== ch) {
        inner += line[j] === " " ? " " : "_";
        j++;
      }
      out += ch + inner + (j < line.length ? ch : "");
      i = j + 1;
      continue;
    }

    WORD.lastIndex = i;
    const word = WORD.exec(line);
    if (word) {
      out += KEEP.has(word[0]) || keep.has(word[0]) ? word[0] : blanks(word[0].length);
      i += word[0].length;
      continue;
    }

    out += ch;
    i++;
  }

  return options.indent ? out.trimEnd() : out.trim();
}

/** A line with nothing to hide, like "}" or "return (", still needs a blank. */
function forceBlank(line: string): string {
  WORD.lastIndex = 0;
  for (let i = 0; i < line.length; i++) {
    WORD.lastIndex = i;
    const word = WORD.exec(line);
    if (word) return line.slice(0, i) + blanks(word[0].length) + line.slice(i + word[0].length);
  }
  return "_" + line.slice(1);
}

/**
 * `keep` adds names that stay visible, for a track where they are the frame
 * of every line (in a test: expect, screen, jest ...).
 */
export function shape(code: string, keepOrOptions: string[] | ShapeOptions = []): string {
  const options: ShapeOptions = Array.isArray(keepOrOptions) ? { keep: keepOrOptions } : keepOrOptions;
  const kept = new Set(options.keep ?? []);
  const lines = code.split("\n");
  const out: string[] = [];
  let hasBlank = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const line = shapeLine(lines[i], kept, options);
    if (line.includes("_")) hasBlank = true;
    out.push(line);
  }

  if (!hasBlank) {
    for (let i = 0; i < out.length; i++) out[i] = forceBlank(out[i]);
  }
  return out.join("\n");
}
