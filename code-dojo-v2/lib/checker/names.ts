/**
 * Name freedom: the learner picks their own names for variables, and the
 * app then speaks with those names.
 *
 * The checker fills a map "reference name -> learner's name". This file
 * applies it to a line of reference code (when a line is revealed) and to
 * the code terms of a coach sentence (the parts in backticks).
 *
 * One kind of key is not a name: the item of a counting loop, written
 * `arr[i]`. A learner who wrote for...of has a variable in its place, so
 * the map then holds "arr[i]" -> "item".
 */

const WORD = /[A-Za-z_$][\w$]*/y;

/**
 * Renames identifiers in code. A name after a dot (obj.name) and a key of
 * an object ({ name: 1 }) are not variables, so they are left alone.
 */
export function renameCode(code: string, names: Record<string, string>): string {
  let out = "";
  let i = 0;
  /** The last character that is not a space, in what was read so far. */
  let before = "";
  /** Keys that are a piece of code, like "arr[i]", and not one name. */
  const pieces: string[] = [];
  for (const key of Object.keys(names)) {
    if (key.includes("[")) pieces.push(key);
  }

  while (i < code.length) {
    const ch = code[i];

    let piece: string | null = null;
    if (pieces.length > 0 && before !== "." && !/[\w$]/.test(i > 0 ? code[i - 1] : "")) {
      for (const key of pieces) {
        if (code.startsWith(key, i)) piece = key;
      }
    }
    if (piece !== null) {
      out += names[piece];
      i += piece.length;
      before = piece.slice(-1);
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) j += code[j] === "\\" ? 2 : 1;
      j = Math.min(code.length, j + 1);
      // Inside ${ } of a template string there is code again.
      const text = code.slice(i, j);
      out += ch === "`" ? text.replace(/\$\{([^}]*)\}/g, (_, inner: string) => "${" + renameCode(inner, names) + "}") : text;
      i = j;
      before = ch;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      let j = i;
      while (j < code.length && code[j] !== "\n") j++;
      out += code.slice(i, j);
      i = j;
      continue;
    }

    WORD.lastIndex = i;
    const word = WORD.exec(code);
    if (word !== null) {
      const name = word[0];
      let after = i + name.length;
      while (after < code.length && code[after] === " ") after++;
      const isProperty = before === ".";
      const isKey = code[after] === ":" && (before === "{" || before === ",");
      const mine = Object.prototype.hasOwnProperty.call(names, name) ? names[name] : name;
      out += isProperty || isKey ? name : mine;
      i += name.length;
      before = name.slice(-1);
      continue;
    }

    out += ch;
    if (ch !== " " && ch !== "\n" && ch !== "\t") before = ch;
    i++;
  }
  return out;
}

/** Renames the code terms of a sentence: only what is written in backticks. */
export function renameText(text: string, names: Record<string, string>): string {
  const parts = text.split("`");
  for (let i = 1; i < parts.length; i += 2) parts[i] = renameCode(parts[i], names);
  return parts.join("`");
}

/** The pairs where the learner's name is different from the reference name. */
export function changedNames(names: Record<string, string>): { expected: string; mine: string }[] {
  const out: { expected: string; mine: string }[] = [];
  for (const expected of Object.keys(names)) {
    if (names[expected] !== expected) out.push({ expected, mine: names[expected] });
  }
  return out;
}
