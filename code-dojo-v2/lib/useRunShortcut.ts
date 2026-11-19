"use client";

import { useEffect, useRef } from "react";

/**
 * Ctrl+Enter (Cmd+Enter on a Mac) runs from anywhere on the page.
 * Inside the editor, Monaco's own action handles the same keys, so events
 * that start there are left alone. Pass null while there is nothing to run.
 */
export function useRunShortcut(run: (() => void) | null): void {
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
      if (event.target instanceof Element && event.target.closest(".monaco-editor")) return;
      if (latest.current === null) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
