"use client";

import { useState, type ReactNode } from "react";
import { interviewTemplate } from "@/data/template";
import type { FollowUp, Problem } from "@/data/types";
import type { FlatStep, TestReport } from "@/lib/checker/check";
import { renameCode, renameText } from "@/lib/checker/names";
import { countTier, MAX_POINTS_PER_STEP, sessionPoints, tierOfStep } from "@/lib/learn";
import type { Block } from "@/lib/store";
import { Text } from "./Text";

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-center">
      <p className={"text-xl font-bold " + tone}>{value}</p>
      <p className="text-xs text-mut">{label}</p>
    </div>
  );
}

interface FinishSummaryProps {
  steps: FlatStep[];
  blocks: Block[];
  names: Record<string, string>;
  /** The hidden tests, run on the learner's finished code. Null while they run. */
  tests: TestReport | null;
}

/** Shown in place of the coach when the last step is done. */
export function FinishSummary({ steps, blocks, names, tests }: FinishSummaryProps) {
  const points = sessionPoints(blocks);
  const max = steps.length * MAX_POINTS_PER_STEP;
  const ratio = max === 0 ? 0 : points / max;

  const revealed: FlatStep[] = [];
  let byTests = 0;
  let byJudge = 0;
  for (const block of blocks) {
    if (block.via === "tests") byTests += block.steps.length;
    if (block.via === "judge") byJudge += block.steps.length;
    for (const index of block.steps) {
      if (tierOfStep(block, index) === "revealed") revealed.push(steps[index]);
    }
  }

  let message = "That is normal at the start. Do it again now, while the lines are fresh.";
  if (ratio >= 0.9) message = "Very good. This solution is in your hands now.";
  else if (ratio >= 0.6) message = "Good. Do it one more time, so the lines that stopped you stay in memory.";

  return (
    <section aria-label="Result" className="overflow-hidden rounded-2xl border border-ok/40 bg-panel">
      <div className="h-1 bg-ok" />
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">Problem finished</h2>
            <p className="mt-1 text-[15px] leading-7 text-mut">{message}</p>
            <p className="mt-1 text-sm text-mut">
              Your code on the hidden tests:{" "}
              {tests === null ? (
                "running…"
              ) : tests.fatal !== null ? (
                <span className="font-semibold text-bad">it could not run: {tests.fatal}</span>
              ) : (
                <span className={"font-semibold " + (tests.passed === tests.total ? "text-ok" : "text-bad")}>
                  {tests.passed} of {tests.total} pass
                </span>
              )}
            </p>
            {tests !== null && tests.failures.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-bad">
                {tests.failures.map((failure) => (
                  <li key={failure.name}>
                    {failure.name}: <span className="text-mut">{failure.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-3xl font-bold text-gold">
            {points}
            <span className="text-lg text-faint"> / {max}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="first try" value={countTier(blocks, "first")} tone="text-ok" />
          <Stat label="after 1 miss" value={countTier(blocks, "second")} tone="text-warn" />
          <Stat label="after 2 misses" value={countTier(blocks, "third")} tone="text-warn" />
          <Stat label="shown" value={revealed.length} tone="text-bad" />
        </div>

        {(byTests > 0 || byJudge > 0) && (
          <p className="text-sm leading-6 text-mut">
            {byTests > 0 && (
              <>
                {byTests} {byTests === 1 ? "step was" : "steps were"} written in your own way and accepted by the hidden
                tests.{" "}
              </>
            )}
            {byJudge > 0 && (
              <>
                {byJudge} {byJudge === 1 ? "step was" : "steps were"} accepted by the AI judge.
              </>
            )}
          </p>
        )}

        {revealed.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-bad">Weak steps: go over them again</h3>
            <ul className="mt-2 space-y-2">
              {revealed.map((step) => (
                <li key={step.key} className="rounded-xl border border-line bg-raised p-3">
                  <p className="text-sm leading-7">
                    <Text text={renameText(step.coach, names)} />
                  </p>
                  <pre className="code-block mt-2">
                    <code>
                      {renameCode(step.expected, names)
                        .split("\n")
                        .map((line) => line.trim())
                        .join("\n")}
                    </code>
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function FollowUpCard({ item }: { item: FollowUp }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-line bg-raised p-3">
      <p className="font-medium">{item.question}</p>
      {open ? (
        <p className="mt-2 text-[15px] leading-7 text-ink/90">{item.answer}</p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 rounded-lg border border-line px-3 py-1 text-sm text-gold hover:bg-panel"
        >
          Answer out loud, then show the answer
        </button>
      )}
    </li>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="text-sm font-semibold text-mut">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * After the last step: the complexity, the follow-up questions, and the
 * interview checklist. An output question has the rule behind its answer
 * in place of a complexity, and no checklist: there was no code to write.
 */
export function AfterFinish({ problem }: { problem: Problem }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const isOutput = problem.kind === "output";

  return (
    <div className="space-y-3">
      <Card title={isOutput ? "The rule" : "Complexity"}>
        <p className="text-[15px] leading-7">{problem.complexity}</p>
      </Card>

      {problem.followUps.length > 0 && (
        <Card title="Follow-up questions">
          <ul className="space-y-2">
            {problem.followUps.map((item) => (
              <FollowUpCard key={item.question} item={item} />
            ))}
          </ul>
        </Card>
      )}

      {!isOutput && (
      <Card title="The interview template: 7 steps for any problem">
        <p className="mb-3 text-sm text-mut">
          Go through the problem again in your head, as if you were in the interview, and tick every step you did.
        </p>
        <ol className="space-y-2">
          {interviewTemplate.map((item, i) => {
            const isChecked = checked[item.id] === true;
            return (
              <li key={item.id}>
                <label
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 " +
                    (isChecked ? "border-ok/40 bg-ok/10" : "border-line bg-raised")
                  }
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => setChecked({ ...checked, [item.id]: event.target.checked })}
                    className="mt-1.5 size-4 shrink-0 accent-ok"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">
                      {i + 1}. {item.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-6 text-mut">{item.note}</span>
                    <span className="mt-1.5 block rounded-lg bg-bg/60 px-2.5 py-1.5 text-sm">{item.say}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
      </Card>
      )}
    </div>
  );
}
