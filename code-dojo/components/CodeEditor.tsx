"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
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

const CONFIG_OPTIONS = withConfigHelp(BASE_OPTIONS);

export interface CodeEditorHandle {
  getValue(): string;
  focus(): void;
}

/** A line of the file with something to say about it: underlined, with the message on hover. */
export interface EditorMarker {
  line: number;
  /** The last line of the mark, when it covers more than one. */
  endLine?: number;
  message: string;
  severity: "error" | "warning";
}

interface Props {
  ref?: Ref<CodeEditorHandle>;
  /** JavaScript, JavaScript with JSX, or the language of a config file. */
  language: EditorLanguage;
  /** The text the editor starts with. Later changes to it are ignored. */
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  /** Ctrl/Cmd+Enter. */
  onRun: () => void;
  /**
   * For code that is only read: long lines wrap instead of scrolling
   * sideways, and the height the text needs is reported, so the box around
   * the editor can fit it.
   */
  onContentHeight?: (height: number) => void;
  /** Config files: the lines the rule check points at. */
  markers?: EditorMarker[];
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

  // Underline the lines the rule check points at.
  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!ready || !monaco || !model || markers === undefined) return;
    const lineCount = model.getLineCount();
    monaco.editor.setModelMarkers(
      model,
      "dojo-rules",
      markers.map((marker) => {
        const line = Math.min(Math.max(1, marker.line), lineCount);
        const endLine = Math.min(Math.max(line, marker.endLine ?? line), lineCount);
        return {
          severity: marker.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          message: marker.message,
          startLineNumber: line,
          startColumn: model.getLineFirstNonWhitespaceColumn(line) || 1,
          endLineNumber: endLine,
          endColumn: model.getLineMaxColumn(endLine),
        };
      }),
    );
  }, [markers, ready]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // A complete solution is expected here, so syntax errors get underlined.
    setSyntaxChecks(monaco, true);
    applyCodeFont(editor, monaco);
    editor.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);
    editor.updateOptions({ readOnly: latest.current.readOnly });

    if (latest.current.onContentHeight) {
      editor.updateOptions({ wordWrap: "on", wrappingIndent: "indent", scrollBeyondLastLine: false });
      latest.current.onContentHeight(editor.getContentHeight());
      editor.onDidContentSizeChange((event) => {
        if (event.contentHeightChanged) latest.current.onContentHeight?.(event.contentHeight);
      });
    }

    editor.addAction({
      id: "dojo-run",
      label: "Run",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => latest.current.onRun(),
    });
    setReady(true);
  };

  return (
    <div dir="ltr" className="ltr h-full">
      <Editor
        height="100%"
        defaultLanguage={props.language}
        defaultValue={initialValue}
        theme={THEME}
        options={isConfigLanguage(props.language) ? CONFIG_OPTIONS : BASE_OPTIONS}
        beforeMount={prepareMonaco}
        onMount={handleMount}
        onChange={(value) => latest.current.onChange(value ?? "")}
        loading={<p className="text-sm text-mut">بنجهّز الـ editor…</p>}
      />
    </div>
  );
}
