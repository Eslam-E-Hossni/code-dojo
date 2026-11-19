/**
 * Reads a YAML file for the rule checks: compose files and CI pipelines.
 *
 * The `yaml` library does the parsing, so a syntax or indentation error
 * comes back with its line. Each error gets a short Arabic explanation;
 * the library's own English message is kept next to it.
 */

import { LineCounter, isMap, isScalar, parseDocument, type Node } from "yaml";
import { PASS, fail, todo, type Diagnostic, type Rule } from "./types";

export type Path = (string | number)[];

export interface YamlFile {
  /** The file as plain data, or null when it could not be read. */
  data: unknown;
  diagnostics: Diagnostic[];
  /** The line where a value starts, by its path: lineOf(["services", "web", "ports"]). */
  lineOf(path: Path): number | undefined;
  /** The line where the key of a value is written. For a list item, the line of the item. */
  lineOfKey(path: Path): number | undefined;
}

/** What went wrong, for the error codes of the library that a learner really meets. */
const EXPLAIN: Record<string, string> = {
  BAD_INDENT: "المسافات اللي في أول السطر مش متسقة مع السطور اللي حواليه.",
  TAB_AS_INDENT: "فيه Tab في أول السطر. YAML بيقبل مسافات بس.",
  DUPLICATE_KEY: "المفتاح ده مكتوب مرتين في نفس المستوى.",
  MISSING_CHAR: "فيه حرف ناقص: غالبًا `:` أو علامة تنصيص أو قوس.",
  BLOCK_AS_IMPLICIT_KEY: "المسافات اللي في أول السطر هنا مش مظبوطة: فيه سطر داخل أكتر أو أقل من المفروض.",
  MULTILINE_IMPLICIT_KEY: "فيه مفتاح مش مكتوب صح: ناقصه `:`، أو السطر اللي بعده مسافاته غلط.",
  UNEXPECTED_TOKEN: "فيه حاجة مش متوقعة هنا: غالبًا المسافات اللي في أول السطر غلط.",
  BAD_SCALAR_START: "القيمة دي بتبدأ بحرف ليه معنى خاص في YAML. حطّها بين علامات تنصيص.",
  BLOCK_IN_FLOW: "جوه الأقواس `[ ]` أو `{ }` مينفعش تكتب سطور بالمسافات. اقفل القوس الأول.",
  BAD_DQ_ESCAPE: "جوه علامات التنصيص الدبل فيه `\\` وبعدها حرف مش مفهوم.",
};
const UNKNOWN = "YAML مش قادر يقرا السطر ده.";

export function parseYaml(text: string): YamlFile {
  const counter = new LineCounter();
  const document = parseDocument(text, { lineCounter: counter, prettyErrors: false });
  const lineCount = text.split("\n").length;
  const diagnostics: Diagnostic[] = [];
  // One mistake often makes the parser complain two or three times about
  // the same lines. Those are shown once, as one range of lines.
  for (const error of document.errors) {
    const line = counter.linePos(error.pos[0]).line;
    const endLine = Math.min(counter.linePos(error.pos[1]).line, lineCount);
    const last = diagnostics.length > 0 ? diagnostics[diagnostics.length - 1] : null;
    if (last && line <= (last.endLine ?? last.line)) {
      if (line === last.line && endLine > (last.endLine ?? last.line)) last.endLine = endLine;
      continue;
    }
    const diagnostic: Diagnostic = { line, message: EXPLAIN[error.code] ?? UNKNOWN, raw: error.message.split("\n")[0] };
    if (endLine > line) diagnostic.endLine = endLine;
    diagnostics.push(diagnostic);
  }

  const lineAt = (node: unknown): number | undefined => {
    const range = (node as Node | undefined)?.range;
    return range ? counter.linePos(range[0]).line : undefined;
  };

  const lineOf = (path: Path): number | undefined => lineAt(document.getIn(path, true));

  const lineOfKey = (path: Path): number | undefined => {
    if (path.length === 0) return undefined;
    const last = path[path.length - 1];
    const parent = path.length === 1 ? document.contents : document.getIn(path.slice(0, -1), true);
    if (isMap(parent)) {
      for (const pair of parent.items) {
        const key = isScalar(pair.key) ? pair.key.value : pair.key;
        if (key === last) return lineAt(pair.key);
      }
      return undefined;
    }
    return lineOf(path);
  };

  let data: unknown = null;
  if (diagnostics.length === 0) {
    try {
      data = document.toJS();
    } catch {
      data = null;
    }
  }
  return { data, diagnostics, lineOf, lineOfKey };
}

export type Dict = Record<string, unknown>;

/** The value as a map, or null when it is anything else. */
export function dict(value: unknown): Dict | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Dict) : null;
}

/** A value that may be one item or a list of items, as a list of strings. */
export function strings(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.filter((item) => item !== null && typeof item !== "object").map(String);
  return typeof value === "object" ? [] : [String(value)];
}

export function text(value: unknown): string {
  return value === undefined || value === null || typeof value === "object" ? "" : String(value);
}

/** "The file is valid YAML": the first rule of every CI exercise. */
export const validYamlRule: Rule<YamlFile> = {
  id: "ci-valid-yaml",
  title: "الملف YAML سليم",
  why: "في YAML المسافات اللي في أول السطر هي اللي بتحدد مين جوه مين. مسافة زيادة أو ناقصة بتغيّر المعنى، أو بتبوّظ الملف كله والـ pipeline مبيبدأش أصلًا.",
  check(file) {
    if (file.diagnostics.length > 0) return fail(file.diagnostics[0].message, file.diagnostics[0].line);
    return dict(file.data) ? PASS : todo("الملف لسه فاضي.");
  },
};
