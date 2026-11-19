"use client";

import Editor, { DiffEditor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { BASE_OPTIONS, prepareMonaco, THEME, type EditorLanguage } from "@/lib/monaco";

const LOADING = <p className="p-4 text-sm text-mut">Loading the editor…</p>;

interface ReadOnlyProps {
  code: string;
  language: EditorLanguage;
  /**
   * Told the height the text needs, now and when it changes (long lines
   * wrap on a narrow screen), so the box around the editor can fit it.
   */
  onContentHeight?: (height: number) => void;
}

/** Code to read, not to edit, in the same editor as the rest of the app. */
export function ReadOnlyCode({ code, language, onContentHeight }: ReadOnlyProps) {
  const latest = useRef(onContentHeight);
  useEffect(() => {
    latest.current = onContentHeight;
  });
  return (
    <Editor
      height="100%"
      language={language}
      value={code}
      theme={THEME}
      options={{ ...BASE_OPTIONS, readOnly: true, domReadOnly: true, wordWrap: "on", wrappingIndent: "indent" }}
      beforeMount={prepareMonaco}
      onMount={(editor) => {
        latest.current?.(editor.getContentHeight());
        editor.onDidContentSizeChange((event) => {
          if (event.contentHeightChanged) latest.current?.(event.contentHeight);
        });
      }}
      loading={LOADING}
    />
  );
}

/** True on a screen wide enough for two columns of code. */
function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const update = () => setWide(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

/**
 * The learner's code next to the reference. Side by side on a wide
 * screen, one column with the changes inline on a phone.
 */
export function CodeDiff({ mine, reference, language }: { mine: string; reference: string; language: EditorLanguage }) {
  const wide = useWide();

  // Left alone, the library frees the two texts before the editor that shows
  // them, and Monaco throws on that. So they are kept until the editor is
  // gone (the two keep... props), and freed here, one tick later.
  const held = useRef<{ models: Monaco.editor.IDiffEditorModel | null }>({ models: null });
  useEffect(() => {
    const box = held.current;
    return () => {
      const models = box.models;
      box.models = null;
      if (models === null) return;
      window.setTimeout(() => {
        models.original.dispose();
        models.modified.dispose();
      }, 0);
    };
  }, []);

  return (
    <DiffEditor
      height="100%"
      language={language}
      original={mine}
      modified={reference}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      onMount={(editor) => {
        held.current.models = editor.getModel();
      }}
      theme={THEME}
      options={{
        ...BASE_OPTIONS,
        readOnly: true,
        originalEditable: false,
        renderSideBySide: wide,
        // Monaco switches to one column by itself when its box is narrow; this keeps that choice ours.
        useInlineViewWhenSpaceIsLimited: false,
        renderOverviewRuler: false,
        ignoreTrimWhitespace: true,
      }}
      beforeMount={prepareMonaco}
      loading={LOADING}
    />
  );
}
