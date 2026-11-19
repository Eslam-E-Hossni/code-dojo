"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { Tier } from "@/lib/learn";
import { applyCodeFont, BASE_OPTIONS, prepareMonaco, setSyntaxChecks, THEME, type EditorLanguage } from "@/lib/monaco";

export interface LearnEditorHandle {
  /** What the learner has typed for the current step. */
  getInput(): string;
  focus(): void;
  /** Starts a new line under what was typed, for a step that is not finished yet. */
  continueLine(indent: string): void;
}

export interface EditorRange {
  startLine: number;
  endLine: number;
  /** The colour of the bar next to the lines. "header" has no bar: a part title. */
  tone: Tier | "header";
}

/** A range inside the learner's input, as string offsets. */
export interface EditorMark {
  start: number;
  end: number;
}

interface Props {
  ref?: Ref<LearnEditorHandle>;
  language: EditorLanguage;
  /** The document is rebuilt only when this changes. */
  docKey: string;
  /** The learner's own accepted code. It cannot be edited. */
  locked: string;
  ranges: EditorRange[];
  /** Indentation typed for the learner on the new line. */
  prefill: string;
  /** True when the problem is finished: the whole editor is read-only. */
  done: boolean;
  /** The first wrong part of the last check. */
  mark: EditorMark | null;
  /** Enter at the end of the text. */
  onSubmit: (input: string) => void;
  /** Ctrl/Cmd+Enter. */
  onRun: () => void;
  /** Told what the learner's input is, whenever it changes. */
  onInput: (input: string) => void;
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

/**
 * The editor of Learn mode: the code accepted so far, locked, and under it
 * the line being written. Enter at the end checks the line. Shift+Enter
 * adds a line without checking, to write several steps at once.
 * Ctrl/Cmd+Enter runs the hidden tests.
 */
export default function LearnEditor(props: Props) {
  const { ref, docKey, mark } = props;
  const [ready, setReady] = useState(false);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const lockedDeco = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const markDeco = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const enterKeySeen = useRef(false);

  // The editor listeners live as long as the editor, so they read the newest props from here.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // What the document is made of: the locked prefix and the learner's input.
  const doc = useRef({ prefix: "", current: "", lockedLines: 0, applying: false });

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
          linesDecorationsClassName: r.tone === "header" ? undefined : "dojo-bar dojo-bar-" + r.tone,
        },
      });
    }
    lockedDeco.current?.clear();
    lockedDeco.current = editor.createDecorationsCollection(decorations);
    markDeco.current?.clear();

    p.onInput(d.current);

    const lastLine = model.getLineCount();
    if (p.done) {
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.revealLine(1);
    } else {
      editor.setPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) });
      editor.revealLine(lastLine);
    }
  };

  useImperativeHandle(ref, () => ({
    getInput: () => doc.current.current,
    focus: () => editorRef.current?.focus(),
    continueLine: (indent: string) => {
      write(doc.current.current.replace(/\s+$/, "") + "\n" + indent);
      editorRef.current?.focus();
    },
  }));

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Bracket colouring is stored on the model, and it would paint every still-open "{" red.
    editor.getModel()?.updateOptions({
      bracketColorizationOptions: { enabled: false, independentColorPoolPerBracketType: false },
    });

    applyCodeFont(editor, monaco);

    // Ctrl/Cmd+Enter runs the tests, as in the other modes.
    editor.addAction({
      id: "dojo-run",
      label: "Run",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => latest.current.onRun(),
    });

    /** True when the cursor is after the last thing that was typed. */
    const atEnd = () => {
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model || !selection || !selection.isEmpty()) return false;
      const after = model.getValueInRange({
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: model.getLineCount(),
        endColumn: model.getLineMaxColumn(model.getLineCount()),
      });
      return after.trim() === "";
    };

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
      latest.current.onInput(d.current);
      markDeco.current?.clear();

      // Some touch keyboards add the line break without an Enter key event.
      // At the end of the text that is an Enter too.
      const sawKey = enterKeySeen.current;
      enterKeySeen.current = false;
      const change = event.changes[0];
      const onlyLineBreak = event.changes.length === 1 && change.rangeLength === 0 && /^\r?\n[ \t]*$/.test(change.text);
      const wasAtEnd = d.current.slice(before.trimEnd().length).trim() === "";
      if (onlyLineBreak && !sawKey && wasAtEnd && before.trim() !== "") {
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

    // 3. When the coach panel grows, the editor gets shorter. Keep the line being typed on screen.
    editor.onDidLayoutChange(() => {
      if (latest.current.done) return;
      const position = editor.getPosition();
      if (position) editor.revealLine(position.lineNumber);
    });

    // 4. Enter at the end checks. Shift+Enter, and Enter in the middle of the text, add a line.
    editor.onKeyDown((event) => {
      const d = doc.current;
      if (latest.current.done) return;

      if (event.keyCode === monaco.KeyCode.Enter) {
        enterKeySeen.current = true;
        if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
        if (atEnd()) {
          event.preventDefault();
          event.stopPropagation();
          latest.current.onSubmit(d.current);
        }
        return;
      }

      if (event.keyCode === monaco.KeyCode.Backspace && d.lockedLines > 0) {
        const s = editor.getSelection();
        const atStart = s !== null && s.isEmpty() && s.startLineNumber === d.lockedLines + 1 && s.startColumn === 1;
        if (atStart) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    });

    setReady(true);
  };

  // Half-written code is the normal state here, so no red squiggles. The switch
  // is shared by every editor, and a page can come back from the background
  // without mounting again, so it is set in an effect, not at mount.
  useEffect(() => {
    if (ready && monacoRef.current) setSyntaxChecks(monacoRef.current, false);
  }, [ready]);

  // Rebuild the document when the step changes (or after a reset).
  useEffect(() => {
    if (!ready) return;
    // `write` reads everything else from `latest`; only docKey decides when.
    write(latest.current.prefill);
  }, [docKey, ready]);

  // Underline the first wrong part of the last check.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!ready || !editor || !monaco || !model) return;
    markDeco.current?.clear();
    if (!mark || mark.end <= mark.start) return;

    const base = doc.current.prefix.length;
    const from = model.getPositionAt(base + mark.start);
    const to = model.getPositionAt(base + mark.end);
    markDeco.current = editor.createDecorationsCollection([
      {
        range: new monaco.Range(from.lineNumber, from.column, to.lineNumber, to.column),
        options: { inlineClassName: "dojo-wrong" },
      },
    ]);
  }, [mark, ready]);

  return (
    <div className="h-full">
      <Editor
        height="100%"
        defaultLanguage={props.language}
        defaultValue=""
        theme={THEME}
        options={OPTIONS}
        beforeMount={prepareMonaco}
        onMount={handleMount}
        loading={<p className="text-sm text-mut">Loading the editor…</p>}
      />
    </div>
  );
}
