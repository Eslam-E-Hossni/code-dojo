"use client";

import { useEffect, useRef } from "react";
import type { StepResult, Tier } from "@/lib/learn";
import type { FlatStep } from "@/lib/steps";
import { Mixed } from "./Mixed";

const TONE: Record<Tier, string> = {
  first: "border-ok/50 bg-ok/15 text-ok",
  second: "border-warn/50 bg-warn/15 text-warn",
  third: "border-warn/50 bg-warn/15 text-warn",
  revealed: "border-bad/50 bg-bad/15 text-bad",
};

interface Props {
  steps: FlatStep[];
  /** The step being typed, or steps.length when finished. */
  index: number;
  results: StepResult[];
  /** Keys of steps that were revealed in an earlier session. */
  weak: string[];
  showPartTitles: boolean;
}

export function StepList({ steps, index, results, weak, showPartTitles }: Props) {
  const box = useRef<HTMLOListElement>(null);
  const current = useRef<HTMLLIElement>(null);

  // Keep the current step in view inside the list, without moving the page.
  useEffect(() => {
    const list = box.current;
    const item = current.current;
    if (!list || !item) return;
    // The list is `relative`, so offsetTop is measured from its own top.
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - 8;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight + 8;
    }
  }, [index]);

  return (
    <ol ref={box} className="relative max-h-80 space-y-1 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
      {steps.map((step) => {
        const result = results[step.index];
        const isCurrent = step.index === index;
        const wasWeak = weak.includes(step.key);

        return (
          <li key={step.key} ref={isCurrent ? current : undefined}>
            {showPartTitles && step.firstOfPart && (
              <p dir="ltr" lang="en" className="ltr px-1 pb-1 pt-3 text-xs font-semibold text-gold first:pt-0">
                {step.partTitle}
              </p>
            )}
            <div
              aria-current={isCurrent ? "step" : undefined}
              className={
                "flex items-start gap-2.5 rounded-xl px-2 py-1.5 " +
                (isCurrent ? "bg-raised ring-1 ring-gold/60" : "")
              }
            >
              <span
                className={
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold " +
                  (result
                    ? TONE[result.tier]
                    : isCurrent
                      ? "border-gold bg-gold text-bg"
                      : "border-line text-faint")
                }
              >
                {step.index + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-6">
                {result || isCurrent ? (
                  <span className={isCurrent ? "text-ink" : "text-mut"}>
                    <Mixed text={step.coach} />
                  </span>
                ) : (
                  <span className="text-faint">لسه</span>
                )}
                {wasWeak && (!result || result.tier !== "first") && (
                  <span className="ms-2 rounded bg-bad/15 px-1.5 py-0.5 text-[11px] text-bad">
                    سطر ضعيف
                  </span>
                )}
              </span>
              {result && (
                <span dir="ltr" className="mt-0.5 shrink-0 text-xs font-semibold text-mut">
                  +{result.points}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
