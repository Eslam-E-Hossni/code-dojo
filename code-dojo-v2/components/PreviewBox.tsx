"use client";

import { lazy, Suspense } from "react";
import type { CodeProblem } from "@/data/types";

// Sandpack is large, so it is loaded only on the pages of React problems.
const ReactPreview = lazy(() => import("./ReactPreview"));

interface Props {
  problem: CodeProblem;
  /** The code that runs in the preview. */
  code: string;
  /** Says whose code this is: the finished solution, or the learner's own. */
  caption: string;
  /** Shown instead of the preview while there is no code to run yet. */
  emptyHint?: string;
  className?: string;
}

/** The framed live preview that sits next to the editor of a React problem. */
export function PreviewBox({ problem, code, caption, emptyHint, className = "" }: Props) {
  // Empty code would only show a bundler error, so nothing runs until there is something to run.
  const empty = code.trim() === "";
  return (
    <section
      aria-label="Preview"
      className={"flex flex-col overflow-hidden rounded-2xl border border-line bg-editor " + className}
    >
      <p className="flex shrink-0 flex-wrap items-baseline gap-x-2 border-b border-line px-3 py-1.5 text-xs text-mut">
        <span className="font-semibold text-ink">Preview</span>
        <span>{caption}</span>
      </p>
      <div className="min-h-0 flex-1">
        {empty ? (
          <p className="p-4 text-sm leading-7 text-mut">{emptyHint ?? "There is no code to show yet."}</p>
        ) : (
          <Suspense fallback={<p className="p-3 text-sm text-mut">Loading the preview…</p>}>
            <ReactPreview problem={problem} code={code} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
