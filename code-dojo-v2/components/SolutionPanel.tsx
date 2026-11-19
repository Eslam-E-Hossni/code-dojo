"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { CodeProblem } from "@/data/types";
import { flattenSteps, solutionText } from "@/lib/checker/check";
import { editorLanguage } from "@/lib/monaco";
import { BUTTON_PLAIN } from "./buttons";
import { CodeDiff, ReadOnlyCode } from "./CodeViews";
import { Text } from "./Text";

type TabId = "solution" | "walkthrough" | "compare" | "notes";

const TABS: { id: TabId; label: string }[] = [
  { id: "solution", label: "Solution" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "compare", label: "Compare" },
  { id: "notes", label: "Complexity & follow-ups" },
];

interface Props {
  problem: CodeProblem;
  /** The learner's code right now: what was accepted plus what is being typed. */
  myCode: string;
  /**
   * Shown at the top when opening the panel changes how the attempt is
   * counted (Recall and Exam). Null in Learn, where it is always free.
   */
  assistedNote: string | null;
  onClose: () => void;
}

/**
 * The reference solution, next to the learner's work: a side panel on a
 * laptop, a bottom sheet on a phone. Opening it is always allowed, and
 * closing it gives the code back unchanged.
 */
export function SolutionPanel({ problem, myCode, assistedNote, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("solution");
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const uid = useId();

  const reference = solutionText(problem);
  const language = editorLanguage(problem.language);
  const steps = flattenSteps(problem);

  // Focus moves into the panel when it opens, and goes back where it was when it closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => before?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  const onTabKey = (event: KeyboardEvent) => {
    const at = TABS.findIndex((item) => item.id === tab);
    let target = -1;
    if (event.key === "ArrowRight") target = (at + 1) % TABS.length;
    if (event.key === "ArrowLeft") target = (at - 1 + TABS.length) % TABS.length;
    if (target === -1) return;
    event.preventDefault();
    setTab(TABS[target].id);
    buttons.current[TABS[target].id]?.focus();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // The clipboard can be blocked. The code is still there to select by hand.
    }
  };

  return (
    <div className="fixed inset-0 z-40" onKeyDown={onKeyDown}>
      <button type="button" aria-label="Close the solution" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={"Solution: " + problem.title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex h-[88dvh] flex-col rounded-t-2xl border border-line bg-panel shadow-2xl outline-none md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[min(760px,92vw)] md:rounded-none md:rounded-l-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="min-w-0 truncate text-base font-semibold">Solution · {problem.title}</h2>
          <button type="button" onClick={onClose} className={BUTTON_PLAIN + " h-9"}>
            Close
            <kbd className="hidden rounded bg-raised px-1.5 py-0.5 font-mono text-[11px] text-mut sm:inline">Esc</kbd>
          </button>
        </div>

        {assistedNote !== null && (
          <p className="shrink-0 border-b border-warn/30 bg-warn/10 px-4 py-2 text-sm leading-6 text-warn">{assistedNote}</p>
        )}

        <div role="tablist" aria-label="Solution" onKeyDown={onTabKey} className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 pt-1.5">
          {TABS.map((item) => {
            const selected = item.id === tab;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  buttons.current[item.id] = node;
                }}
                type="button"
                role="tab"
                id={uid + "-tab-" + item.id}
                aria-selected={selected}
                aria-controls={uid + "-panel-" + item.id}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={
                  "-mb-px shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold " +
                  (selected ? "border-gold text-ink" : "border-transparent text-mut hover:text-ink")
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={uid + "-panel-" + tab}
          aria-labelledby={uid + "-tab-" + tab}
          className="flex min-h-0 flex-1 flex-col"
        >
          {tab === "solution" && (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2">
                <p className="text-sm text-mut">The full reference solution. Read it, then close this and write it yourself.</p>
                <button type="button" onClick={copy} className={BUTTON_PLAIN + " h-9"}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="min-h-0 flex-1 border-t border-line bg-editor">
                <ReadOnlyCode code={reference} language={language} />
              </div>
            </>
          )}

          {tab === "walkthrough" && (
            <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {steps.map((step) => (
                <li key={step.key}>
                  {problem.parts.length > 1 && step.firstOfPart && (
                    <h3 className="pb-2 pt-1 text-sm font-semibold text-gold">{step.partTitle}</h3>
                  )}
                  <div className="rounded-xl border border-line bg-raised p-3">
                    <p className="text-[15px] leading-7">
                      <span className="mr-2 text-xs font-semibold text-faint">{step.index + 1}</span>
                      <Text text={step.coach} />
                    </p>
                    <pre className="code-block mt-2">
                      <code>
                        {step.expected
                          .split("\n")
                          .map((line) => line.trim())
                          .join("\n")}
                      </code>
                    </pre>
                    <p className="mt-2 text-sm leading-6 text-mut">{step.explain}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {tab === "compare" && (
            <>
              {/* Two columns on a wide screen. On a narrow one, the two are mixed in one column. */}
              <div className="hidden shrink-0 grid-cols-2 gap-3 px-4 py-2 text-xs font-semibold text-mut min-[900px]:grid">
                <span>Your code</span>
                <span>Reference</span>
              </div>
              <p className="shrink-0 px-4 py-2 text-xs leading-5 text-mut min-[900px]:hidden">
                One column: lines marked <span className="font-semibold text-bad">−</span> are yours, lines marked{" "}
                <span className="font-semibold text-ok">+</span> are the reference.
              </p>
              {myCode.trim() === "" ? (
                <p className="p-4 text-sm leading-7 text-mut">
                  You have not written anything yet, so there is nothing to compare. Write a few lines and open this tab again.
                </p>
              ) : (
                <div className="min-h-0 flex-1 border-t border-line bg-editor">
                  <CodeDiff mine={myCode} reference={reference} language={language} />
                </div>
              )}
            </>
          )}

          {tab === "notes" && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <section>
                <h3 className="text-sm font-semibold text-mut">Complexity</h3>
                <p className="mt-1 text-[15px] leading-7">{problem.complexity}</p>
              </section>
              <section>
                <h3 className="text-sm font-semibold text-mut">Follow-up questions</h3>
                <dl className="mt-2 space-y-2">
                  {problem.followUps.map((item) => (
                    <div key={item.question} className="rounded-xl border border-line bg-raised p-3">
                      <dt className="font-medium">{item.question}</dt>
                      <dd className="mt-1 text-[15px] leading-7 text-ink/90">{item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
