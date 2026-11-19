"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { applyCodeFont, BASE_OPTIONS, prepareMonaco, setSyntaxChecks, THEME, type EditorLanguage } from "@/lib/monaco";

export interface CodeEditorHandle {
  getValue(): string;
  focus(): void;
}

/** A place in the code with something to say about it. It is underlined in red. */
export interface EditorMarker {
  line: number;
  /** Columns from 1. Left out = the whole line. */
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
}

interface Props {
  ref?: Ref<CodeEditorHandle>;
  language: EditorLanguage;
  /** The text the editor starts with. Later changes to it are ignored. */
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  /** Ctrl/Cmd+Enter. */
  onRun: () => void;
  /** What the last run pointed at: the line of an error, or a banned pattern. */
  markers: EditorMarker[];
}

/** A plain editor for Recall and Exam: the whole solution, typed freely. */
export default function CodeEditor(props: Props) {
  const { ref, initialValue, readOnly, markers } = props;
  const [ready, setReady] = useState(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  // The editor's listeners outlive a render, so they read the newest props here.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() ?? "",
    focus: () => editorRef.current?.focus(),
  }));

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly });
  }, [readOnly]);

  // A complete solution is expected here, so syntax errors get underlined. The
  // switch is shared by every editor, and a page can come back from the
  // background without mounting again, so it is set in an effect, not at mount.
  useEffect(() => {
    if (ready && monacoRef.current) setSyntaxChecks(monacoRef.current, true);
  }, [ready]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!ready || !monaco || !model) return;
    const lineCount = model.getLineCount();
    monaco.editor.setModelMarkers(
      model,
      "dojo-run",
      markers.map((marker) => {
        const line = Math.min(Math.max(1, marker.line), lineCount);
        const endLine = Math.min(Math.max(line, marker.endLine ?? line), lineCount);
        return {
          severity: monaco.MarkerSeverity.Error,
          message: marker.message,
          startLineNumber: line,
          startColumn: marker.column ?? (model.getLineFirstNonWhitespaceColumn(line) || 1),
          endLineNumber: endLine,
          endColumn: marker.endColumn ?? model.getLineMaxColumn(endLine),
        };
      }),
    );
  }, [markers, ready]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyCodeFont(editor, monaco);
    editor.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);
    editor.updateOptions({ readOnly: latest.current.readOnly });

    editor.addAction({
      id: "dojo-run",
      label: "Run",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => latest.current.onRun(),
    });
    setReady(true);
  };

  return (
    <div className="h-full">
      <Editor
        height="100%"
        defaultLanguage={props.language}
        defaultValue={initialValue}
        theme={THEME}
        options={BASE_OPTIONS}
        beforeMount={prepareMonaco}
        onMount={handleMount}
        onChange={(value) => latest.current.onChange(value ?? "")}
        loading={<p className="p-4 text-sm text-mut">Loading the editor…</p>}
      />
    </div>
  );
}
