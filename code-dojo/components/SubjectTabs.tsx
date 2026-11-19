"use client";

import { useState, type ReactNode } from "react";
import { JSX, type EditorLanguage } from "@/lib/monaco";
import CodeEditor from "./CodeEditor";

interface Props {
  /** The file the learner writes: "/Counter.test.js". */
  testFile: string;
  /** The files to read, by path: the code under test, or the file to fix. Read-only. */
  subject: Record<string, string>;
  /** The language of the read-only files. Default: JavaScript with JSX. */
  language?: EditorLanguage;
  /** The small note next to each kind of tab. */
  notes?: { own: string; other: string };
  /** The learner's editor. It stays mounted while another tab is open. */
  children: ReactNode;
}

const NOTES = { own: "بتكتبه إنت", other: "للقراءة بس" };

const NOOP = () => {};

/**
 * An editor with tabs: one tab for the file the learner writes, and one
 * read-only tab for every file to read next to it. A Testing exercise shows
 * the code under test there, and "fix this file" shows the broken file.
 */
export function SubjectTabs({ testFile, subject, language = JSX, notes = NOTES, children }: Props) {
  const [active, setActive] = useState(testFile);
  // A read-only editor is created the first time its tab is opened, then kept.
  const [opened, setOpened] = useState<string[]>([]);
  const paths = Object.keys(subject);

  const select = (path: string) => {
    setActive(path);
    if (path !== testFile && !opened.includes(path)) setOpened([...opened, path]);
  };

  const tab = (path: string, note: string) => {
    const selected = active === path;
    return (
      <button
        key={path}
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={() => select(path)}
        className={
          "flex shrink-0 items-baseline gap-1.5 border-b-2 px-3 py-1.5 text-[13px] " +
          (selected ? "border-gold text-ink" : "border-transparent text-mut hover:text-ink")
        }
      >
        <span className="font-mono">{path.slice(1)}</span>
        <span dir="rtl" className="text-[11px] text-faint">
          {note}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div dir="ltr" role="tablist" aria-label="ملفات التمرين" className="flex shrink-0 overflow-x-auto border-b border-line bg-panel">
        {tab(testFile, notes.own)}
        {paths.map((path) => tab(path, notes.other))}
      </div>
      <div className="relative min-h-0 flex-1">
        <div className={"h-full " + (active === testFile ? "" : "hidden")}>{children}</div>
        {opened.map((path) => (
          <div key={path} className={"h-full " + (active === path ? "" : "hidden")}>
            <CodeEditor language={language} initialValue={subject[path]} readOnly onChange={NOOP} onRun={NOOP} />
          </div>
        ))}
      </div>
    </div>
  );
}
