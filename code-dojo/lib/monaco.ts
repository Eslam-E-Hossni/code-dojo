"use client";

import { loader, type BeforeMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { instructionHelp, timeNoteFor } from "@/data/docker";
import type { StepProblem } from "@/data/types";

// Monaco is served from /public/monaco (see scripts/copy-assets.mjs), not a CDN.
if (typeof window !== "undefined") {
  loader.config({ paths: { vs: window.location.origin + "/monaco/vs" } });
}

export const THEME = "dojo-dark";

/** The editor language for plain JavaScript problems. */
export const JS = "javascript";
/** The editor language for React problems: JavaScript with JSX highlighting. */
export const JSX = "dojo-jsx";
/** Config files. Monaco knows the first two; the third is defined below. */
export const DOCKERFILE = "dockerfile";
export const YAML = "yaml";
export const IGNORE = "dojo-ignore";
export type EditorLanguage = typeof JS | typeof JSX | typeof DOCKERFILE | typeof YAML | typeof IGNORE;

/** The editor language of a problem. */
export function languageOf(problem: StepProblem): EditorLanguage {
  if (problem.kind === "code") return JS;
  if (problem.kind !== "config") return JSX;
  if (problem.language === "dockerfile") return DOCKERFILE;
  return problem.language === "yaml" ? YAML : IGNORE;
}

export function isConfigLanguage(language: EditorLanguage): boolean {
  return language === DOCKERFILE || language === YAML || language === IGNORE;
}

const KEYWORDS = [
  "async", "await", "break", "case", "catch", "class", "const", "continue",
  "debugger", "default", "delete", "do", "else", "export", "extends", "false",
  "finally", "for", "from", "function", "if", "import", "in", "instanceof",
  "let", "new", "null", "of", "return", "static", "super", "switch", "this",
  "throw", "true", "try", "typeof", "undefined", "var", "void", "while", "yield",
];

/**
 * Monaco's own JavaScript colouring does not know JSX: a closing tag like
 * </div> is read as the start of a regular expression. This grammar is
 * JavaScript plus tags, attributes and the {expressions} inside them.
 *
 * A tag starts at "<" followed directly by a name, so "i < n" (with spaces)
 * is still a comparison.
 */
const JSX_GRAMMAR: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".jsx",
  keywords: KEYWORDS,
  symbols: /[=><!~?:&|+\-*/^%]+/,
  tokenizer: {
    root: [
      [/(<\/)([A-Za-z_$][\w$.]*)(\s*)(>)/, ["delimiter.tag", "tag", "", "delimiter.tag"]],
      [/<\/?>/, "delimiter.tag"],
      [/(<)([A-Za-z_$][\w$.]*)/, ["delimiter.tag", { token: "tag", next: "@jsxTag" }]],
      { include: "@common" },
    ],
    // Inside an opening tag: attributes until ">" or "/>".
    jsxTag: [
      [/\s+/, ""],
      [/\/>/, "delimiter.tag", "@pop"],
      [/>/, "delimiter.tag", "@pop"],
      [/[A-Za-z_$][\w$-]*/, "attribute.name"],
      [/=/, "delimiter"],
      [/"/, "string", "@stringDouble"],
      [/'/, "string", "@stringSingle"],
      [/\{/, "delimiter.bracket", "@jsxExpression"],
    ],
    // attribute={ ...any JavaScript, with its own braces... }
    jsxExpression: [
      [/\{/, "delimiter.bracket", "@jsxExpression"],
      [/\}/, "delimiter.bracket", "@pop"],
      { include: "@root" },
    ],
    common: [
      [/[A-Za-z_$][\w$]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/\s+/, ""],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
      [/\d+(\.\d+)?/, "number"],
      [/[{}()[\]]/, "delimiter.bracket"],
      [/[;,.]/, "delimiter"],
      [/@symbols/, "delimiter"],
      [/"/, "string", "@stringDouble"],
      [/'/, "string", "@stringSingle"],
      [/`/, "string", "@stringBacktick"],
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
    stringDouble: [
      [/[^\\"]+$/, "string", "@pop"],
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],
    stringSingle: [
      [/[^\\']+$/, "string", "@pop"],
      [/[^\\']+/, "string"],
      [/\\./, "string.escape"],
      [/'/, "string", "@pop"],
    ],
    stringBacktick: [
      [/\$\{/, "delimiter.bracket", "@templateExpression"],
      [/[^\\`$]+/, "string"],
      [/\\./, "string.escape"],
      [/\$/, "string"],
      [/`/, "string", "@pop"],
    ],
    templateExpression: [
      [/\{/, "delimiter.bracket", "@templateExpression"],
      [/\}/, "delimiter.bracket", "@pop"],
      { include: "@common" },
    ],
  },
};

function registerJsx(monaco: typeof Monaco): void {
  const known = monaco.languages.getLanguages();
  for (let i = 0; i < known.length; i++) {
    if (known[i].id === JSX) return;
  }

  monaco.languages.register({ id: JSX });
  monaco.languages.setMonarchTokensProvider(JSX, JSX_GRAMMAR);
  monaco.languages.setLanguageConfiguration(JSX, {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string", "comment"] },
      { open: "`", close: "`", notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      // Indent after an open bracket, or after an opening tag like <div>.
      increaseIndentPattern: /^.*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*|<[A-Za-z][^<>/]*>)$/,
      decreaseIndentPattern: /^\s*([}\])]|<\/)/,
    },
  });
}

/** A .dockerignore file: comments, "!" to bring a path back, and the wildcards. */
function registerIgnore(monaco: typeof Monaco): void {
  const known = monaco.languages.getLanguages();
  for (let i = 0; i < known.length; i++) {
    if (known[i].id === IGNORE) return;
  }

  monaco.languages.register({ id: IGNORE });
  monaco.languages.setMonarchTokensProvider(IGNORE, {
    defaultToken: "",
    tokenizer: {
      root: [
        [/^\s*#.*$/, "comment"],
        [/^\s*!/, "keyword"],
        [/\*\*?|\?/, "keyword"],
        [/\//, "delimiter"],
        [/[^*?/\s]+/, "string"],
      ],
    },
  });
  monaco.languages.setLanguageConfiguration(IGNORE, { comments: { lineComment: "#" } });
}

/** The Monaco instances that already have the Dockerfile help. */
const WITH_DOCKER_HELP = new WeakSet<object>();

/**
 * Hover help in a Dockerfile: one line for the instruction under the
 * mouse, and for ARG, ENV and NEXT_PUBLIC_ the "build time or run time" note.
 * The text lives in data/docker.ts.
 */
function registerDockerHelp(monaco: typeof Monaco): void {
  if (WITH_DOCKER_HELP.has(monaco)) return;
  WITH_DOCKER_HELP.add(monaco);

  monaco.languages.registerHoverProvider(DOCKERFILE, {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber);
      let start = position.column - 1;
      let end = start;
      while (start > 0 && !/\s/.test(line[start - 1])) start--;
      while (end < line.length && !/\s/.test(line[end])) end++;
      if (start === end) return null;

      const word = line.slice(start, end);
      // An instruction is the first word of its line.
      const isFirstWord = line.slice(0, start).trim() === "";
      const help = isFirstWord ? instructionHelp(word) : null;
      const note = isFirstWord || word.includes("NEXT_PUBLIC_") ? timeNoteFor(word) : null;
      if (!help && !note) return null;

      // Every paragraph starts with an Arabic word or is a name alone, so
      // each one gets its own direction (see .monaco-hover in globals.css).
      const paragraphs: string[] = [];
      if (help) paragraphs.push("**" + help.keyword + "**", help.text);
      if (note) {
        if (!help) paragraphs.push("**`" + note.name + "`**");
        paragraphs.push("**إمتى موجود؟** " + note.when, note.text);
      }
      return {
        range: new monaco.Range(position.lineNumber, start + 1, position.lineNumber, end + 1),
        contents: [{ value: paragraphs.join("\n\n") }],
      };
    },
  });
}

/**
 * A config file shows help on hover: what an instruction does, and the
 * message of a marked line. Code editors keep hover off, where it would
 * only show type information.
 */
export function withConfigHelp(
  options: Monaco.editor.IStandaloneEditorConstructionOptions,
): Monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    ...options,
    hover: { enabled: true, delay: 250 },
    // The help may be taller than the room above the line. Without this
    // the box around the editor would cut it off.
    fixedOverflowWidgets: true,
  };
}

export const prepareMonaco: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "tag", foreground: "4ec9b0" },
      { token: "delimiter.tag", foreground: "808b9c" },
      { token: "attribute.name", foreground: "9cdcfe" },
    ],
    colors: {
      "editor.background": "#0f141b",
      "editorGutter.background": "#0f141b",
      "editor.lineHighlightBackground": "#182130",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#465163",
      "editorLineNumber.activeForeground": "#f2b84b",
      "editorCursor.foreground": "#f2b84b",
    },
  });
  registerJsx(monaco);
  registerIgnore(monaco);
  registerDockerHelp(monaco);
};

/**
 * Red squiggles for syntax errors. Off in Learn mode, where half-written
 * code is the normal state. Type checking is always off: this is plain JS.
 */
export function setSyntaxChecks(monaco: typeof Monaco, on: boolean): void {
  monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: !on,
    noSuggestionDiagnostics: true,
  });
}

/** Uses the app's code font, and measures it again once it has loaded. */
export function applyCodeFont(editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco): void {
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-jetbrains")
    .trim();
  if (!family) return;
  editor.updateOptions({ fontFamily: family + ", Consolas, monospace" });
  document.fonts.ready.then(() => monaco.editor.remeasureFonts());
}

/**
 * Options shared by every editor in the app. No autocomplete anywhere: the
 * point is to write from memory.
 */
export const BASE_OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  lineHeight: 23,
  fontLigatures: false,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: "off",
  snippetSuggestions: "none",
  tabCompletion: "off",
  acceptSuggestionOnEnter: "off",
  parameterHints: { enabled: false },
  inlineSuggest: { enabled: false },
  hover: { enabled: false },
  links: false,
  contextmenu: false,
  folding: false,
  glyphMargin: false,
  lineDecorationsWidth: 12,
  lineNumbersMinChars: 3,
  renderLineHighlight: "line",
  occurrencesHighlight: "off",
  selectionHighlight: false,
  showUnused: false,
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  stickyScroll: { enabled: false },
  dragAndDrop: false,
  formatOnType: false,
  formatOnPaste: false,
  padding: { top: 12, bottom: 12 },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false },
};
