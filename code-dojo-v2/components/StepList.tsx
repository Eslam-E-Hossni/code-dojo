"use client";

import { useEffect, useRef } from "react";
import type { FlatStep } from "@/lib/checker/check";
import { renameText } from "@/lib/checker/names";
import { tierOfStep, type Tier } from "@/lib/learn";
import type { Block } from "@/lib/store";
import { Text } from "./Text";

const TONE: Record<Tier, string> = {
  first: "border-ok/50 bg-ok/15 text-ok",
  second: "border-warn/50 bg-warn/15 text-warn",
  third: "border-warn/50 bg-warn/15 text-warn",
  revealed: "border-bad/50 bg-bad/15 text-bad",
};

interface Props {
  steps: FlatStep[];
  /** The step being written, or -1 when the problem is finished. */
  current: number;
  /** What the learner wrote, in the order they wrote it. */
  blocks: Block[];
  /** Keys of steps that were revealed in an earlier session. */
  weak: string[];
  names: Record<string, string>;
  showPartTitles: boolean;
}

/**
 * The steps of the problem. A finished step shows the learner's own code,
 * not the reference. A step that is still to come shows nothing: its coach
 * sentence would say too much too early.
 */
export function StepList({ steps, current, blocks, weak, names, showPartTitles }: Props) {
  const box = useRef<HTMLOListElement>(null);
  const currentItem = useRef<HTMLLIElement>(null);

  // Keep the current step in view inside the list, without moving the page.
  useEffect(() => {
    const list = box.current;
    const item = currentItem.current;
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - 8;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 8;
  }, [current]);

  /** For every finished step: the block it is in. */
  const blockOf = new Map<number, Block>();
  for (const block of blocks) {
    for (const index of block.steps) blockOf.set(index, block);
  }

  return (
    <ol ref={box} className="relative max-h-80 space-y-1 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
      {steps.map((step) => {
        const block = blockOf.get(step.index);
        const isCurrent = step.index === current;
        const wasWeak = weak.includes(step.key);
        // A block of several steps shows its code once, under the first of them.
        const first = block !== undefined && block.steps[0] === step.index;

        return (
          <li key={step.key} ref={isCurrent ? currentItem : undefined}>
            {showPartTitles && step.firstOfPart && (
              <p className="px-1 pb-1 pt-3 text-xs font-semibold text-gold first:pt-0">{step.partTitle}</p>
            )}
            <div
              aria-current={isCurrent ? "step" : undefined}
              className={
                "flex items-start gap-2.5 rounded-xl px-2 py-1.5 " +
                (isCurrent ? "border border-gold/50 bg-gold/10" : "border border-transparent")
              }
            >
              <span
                className={
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold " +
                  (block !== undefined ? TONE[tierOfStep(block, step.index)] : isCurrent ? "border-gold text-gold" : "border-line text-faint")
                }
              >
                {step.index + 1}
              </span>
              <div className="min-w-0 flex-1">
                {block !== undefined ? (
                  first ? (
                    <pre className="overflow-x-auto whitespace-pre font-mono text-[12.5px] leading-5 text-ink/90">
                      {block.text
                        .split("\n")
                        .map((line) => line.trim())
                        .join("\n")}
                    </pre>
                  ) : (
                    <p className="text-xs leading-6 text-faint">written together with step {block.steps[0] + 1}</p>
                  )
                ) : isCurrent ? (
                  <p className="text-sm leading-6">
                    <Text text={renameText(step.coach, names)} />
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-faint">…</p>
                )}
                {wasWeak && block === undefined && (
                  <p className="mt-0.5 text-xs text-bad">weak last time</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
