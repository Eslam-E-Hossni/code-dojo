"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { Tier } from "@/lib/learn";
import {
  applyCodeFont,
  BASE_OPTIONS,
  isConfigLanguage,
  prepareMonaco,
  setSyntaxChecks,
  THEME,
  withConfigHelp,
  type EditorLanguage,
} from "@/lib/monaco";

export interface DojoEditorHandle {
  /** What the learner has typed for the current step. */
  getInput(): string;
  focus(): void;
}

export interface EditorRange {
  startLine: number;
  endLine: number;
  tone: Tier | "header";
}

/** A range inside the learner's input, as string offsets. */
export interface EditorMark {
  start: number;
  end: number;
}

interface Props {
  ref?: Ref<DojoEditorHandle>;
  /** JavaScript, JavaScript with JSX, or the language of a config file. */
  language: EditorLanguage;
  /** The document is rebuilt only when this changes. */
  docKey: string;
  /** Finished lines. The learner cannot edit them. */
  locked: string;
  ranges: EditorRange[];
  /** Indentation typed for the learner on the new line. */
  prefill: string;
  /** How many lines the current step has. */
  expectedLines: number;
  /** True when the problem is finished: the whole editor is read-only. */
  done: boolean;
  /** The first wrong token of the last check. */
  mark: EditorMark | null;
  onSubmit: (input: string) => void;
  /** Ctrl/Cmd+Enter. */
  onRun?: () => void;
}

function countCodeLines(text: string): number {
  const lines = text.split("\n");
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") count++;
  }
  return count;
}

const OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
  ...BASE_OPTIONS,
  // In Learn mode every character is typed by hand.
  autoClosingBrackets: "never",
  autoClosingQuotes: "never",
  autoSurround: "never",
  // A block stays open across steps, so an unclosed bracket is not an error.
  // (The model-level switch for this is set in handleMount.)
  bracketPairColorization: { enabled: false },
  matchBrackets: "never",
};

const CONFIG_OPTIONS = withConfigHelp(OPTIONS);

export default function DojoEditor(props: Props) {
  const { ref, docKey, mark } = props;
  const [ready, setReady] = useState(false);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const lockedDeco = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const markDeco = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const enterKeySeen = useRef(false);

  // The editor listeners live as long as the editor, so they read the
  // newest props from here.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // What the document is made of: the locked prefix and the learner's input.
  const doc = useRef({ prefix: "", current: "", lockedLines: 0, applying: false });

  useImperativeHandle(ref, () => ({
    getInput: () => doc.current.current,
    focus: () => editorRef.current?.focus(),
  }));

  /** Writes prefix + input into the editor and repaints the decorations. */
  const write = (current: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const p = latest.current;
    const d = doc.current;
    d.prefix = p.locked === "" || p.done ? p.locked : p.locked + "\n";
    d.current = p.done ? "" : current;
    d.lockedLines = p.locked === "" ? 0 : p.locked.split("\n").length;

    d.applying = true;
    // setValue also clears the undo history, so undo cannot reach locked lines.
    model.setValue(d.prefix + d.current);
    model.setEOL(monaco.editor.EndOfLineSequence.LF);
    d.applying = false;

    editor.updateOptions({ readOnly: p.done });

    const decorations: Monaco.editor.IModelDeltaDecoration[] = [];
    for (let i = 0; i < p.ranges.length; i++) {
      const r = p.ranges[i];
      decorations.push({
        range: new monaco.Range(r.startLine, 1, r.endLine, 1),
        options: {
          isWholeLine: true,
          className: p.done ? undefined : "dojo-locked",
          linesDecorationsClassName:
            r.tone === "header" ? undefined : "dojo-bar dojo-bar-" + r.tone,
        },
      });
    }
    lockedDeco.current?.clear();
    lockedDeco.current = editor.createDecorationsCollection(decorations);
    markDeco.current?.clear();

    const lastLine = model.getLineCount();
    if (p.done) {
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.revealLine(1);
    } else {
      editor.setPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) });
      editor.revealLine(lastLine);
    }
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Bracket colouring is stored on the model, and it would paint every
    // still-open "{" red.
    editor.getModel()?.updateOptions({
      bracketColorizationOptions: { enabled: false, independentColorPoolPerBracketType: false },
    });

    // Half-written code is the normal state here, so no red squiggles.
    setSyntaxChecks(monaco, false);
    applyCodeFont(editor, monaco);

    // Ctrl/Cmd+Enter runs the tests. There is something to run only once
    // the last line is in.
    editor.addAction({
      id: "dojo-run",
      label: "Run",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => latest.current.onRun?.(),
    });

    const isComplete = (input: string) =>
      countCodeLines(input) >= latest.current.expectedLines;

    // 1. Keep the locked lines intact, and track the learner's input.
    editor.onDidChangeModelContent((event) => {
      const d = doc.current;
      if (d.applying || latest.current.done) return;
      const model = editor.getModel();
      if (!model) return;

      const value = model.getValue(monaco.editor.EndOfLinePreference.LF);
      if (!value.startsWith(d.prefix)) {
        // An edit reached a locked line (for example "move line up"). Undo it.
        const keep = d.current;
        window.setTimeout(() => write(keep), 0);
        return;
      }

      const before = d.current;
      d.current = value.slice(d.prefix.length);
      markDeco.current?.clear();

      // Some touch keyboards add the line break without an Enter key event.
      // Treat that as Enter too.
      const sawKey = enterKeySeen.current;
      enterKeySeen.current = false;
      const change = event.changes[0];
      const onlyLineBreak =
        event.changes.length === 1 &&
        change.rangeLength === 0 &&
        /^\r?\n[ \t]*$/.test(change.text);
      if (onlyLineBreak && !sawKey && isComplete(before)) {
        window.setTimeout(() => {
          write(before);
          latest.current.onSubmit(before);
        }, 0);
      }
    });

    // 2. Keep the cursor out of the locked lines.
    editor.onDidChangeCursorSelection((event) => {
      const d = doc.current;
      if (d.applying || latest.current.done) return;
      const first = d.lockedLines + 1;
      const s = event.selection;
      if (s.startLineNumber >= first) return;
      const model = editor.getModel();
      if (!model) return;
      if (s.endLineNumber < first) {
        const lastLine = model.getLineCount();
        editor.setPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) });
      } else {
        editor.setSelection(new monaco.Selection(first, 1, s.endLineNumber, s.endColumn));
      }
    });

    // 3. When the coach panel grows, the editor gets shorter. Keep the line
    //    being typed on screen.
    editor.onDidLayoutChange(() => {
      if (latest.current.done) return;
      const position = editor.getPosition();
      if (position) editor.revealLine(position.lineNumber);
    });

    // 4. Enter on a finished line checks it.
    editor.onKeyDown((event) => {
      const d = doc.current;
      if (latest.current.done) return;

      if (event.keyCode === monaco.KeyCode.Enter) {
        enterKeySeen.current = true;
        // Shift+Enter always adds a line.
        if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
        const position = editor.getPosition();
        const model = editor.getModel();
        if (!position || !model) return;
        const onBlankLine = model.getLineContent(position.lineNumber).trim() === "";
        // A two-line step needs its first Enter as a real line break.
        if (isComplete(d.current) || onBlankLine) {
          event.preventDefault();
          event.stopPropagation();
          latest.current.onSubmit(d.current);
        }
        return;
      }

      if (event.keyCode === monaco.KeyCode.Backspace && d.lockedLines > 0) {
        const s = editor.getSelection();
        const atStart =
          s !== null && s.isEmpty() && s.startLineNumber === d.lockedLines + 1 && s.startColumn === 1;
        if (atStart) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    });

    setReady(true);
  };

  // Rebuild the document when the step changes (or after a reset).
  useEffect(() => {
    if (!ready) return;
    // `write` reads everything else from `latest`; only docKey decides when.
    write(latest.current.prefill);
  }, [docKey, ready]);

  // Underline the first wrong token of the last check.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!ready || !editor || !monaco || !model) return;
    markDeco.current?.clear();
    if (!mark) return;

    const base = doc.current.prefix.length;
    const from = model.getPositionAt(base + mark.start);
    const to = model.getPositionAt(base + mark.end);
    const range = new monaco.Range(from.lineNumber, from.column, to.lineNumber, to.column);
    markDeco.current = editor.createDecorationsCollection([
      mark.start === mark.end
        ? {
            range,
            options: {
              showIfCollapsed: true,
              after: { content: " ⋯", inlineClassName: "dojo-missing" },
            },
          }
        : { range, options: { inlineClassName: "dojo-wrong" } },
    ]);
  }, [mark, ready]);

  return (
    <div dir="ltr" className="ltr h-full">
      <Editor
        height="100%"
        defaultLanguage={props.language}
        defaultValue=""
        theme={THEME}
        options={isConfigLanguage(props.language) ? CONFIG_OPTIONS : OPTIONS}
        beforeMount={prepareMonaco}
        onMount={handleMount}
        loading={<p className="text-sm text-mut">بنجهّز الـ editor…</p>}
      />
    </div>
  );
}
