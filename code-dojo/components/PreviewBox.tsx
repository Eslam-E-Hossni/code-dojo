"use client";

import { lazy, Suspense } from "react";
import type { ReactProblem } from "@/data/types";

// Sandpack is large, so it is loaded only on the pages of React problems.
const ReactPreview = lazy(() => import("./ReactPreview"));

interface Props {
  problem: ReactProblem;
  /** The code that runs in the preview. */
  code: string;
  /** Says whose code this is: the finished solution, or the learner's own. */
  caption: string;
  /** Shown instead of the preview while there is no code to run yet. */
  emptyHint?: string;
  className?: string;
}

/** The framed live preview that sits next to the editor. */
export function PreviewBox({ problem, code, caption, emptyHint, className = "" }: Props) {
  // Empty code would only show a bundler error, so nothing runs until there is something to run.
  const empty = code.trim() === "";
  return (
    <div className={"flex flex-col overflow-hidden rounded-2xl border border-line bg-editor " + className}>
      <p className="flex shrink-0 items-baseline gap-2 border-b border-line px-3 py-1.5 text-xs text-mut">
        <bdi dir="ltr" lang="en" className="font-semibold text-ink">
          Preview
        </bdi>
        <span>{caption}</span>
      </p>
      <div className="min-h-0 flex-1">
        {empty ? (
          <p className="p-4 text-sm leading-7 text-mut">{emptyHint ?? "مفيش كود يتعرض لسه."}</p>
        ) : (
          <Suspense fallback={<p className="p-3 text-sm text-mut">بنجهّز الـ preview…</p>}>
            <ReactPreview problem={problem} code={code} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
