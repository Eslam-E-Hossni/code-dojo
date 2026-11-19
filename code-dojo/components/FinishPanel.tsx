"use client";

import { useState } from "react";
import { interviewTemplate } from "@/data/template";
import type { FollowUp, Problem } from "@/data/types";
import { countTier, MAX_POINTS_PER_STEP, totalPoints, type StepResult } from "@/lib/learn";
import type { FlatStep } from "@/lib/steps";
import { TwinCard } from "./ConfigExtras";
import { Mixed } from "./Mixed";
import { TestCard } from "./TestCard";

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-center">
      <p dir="ltr" className={"text-xl font-bold " + tone}>
        {value}
      </p>
      <p className="text-xs text-mut">{label}</p>
    </div>
  );
}

interface FinishSummaryProps {
  steps: FlatStep[];
  results: StepResult[];
  /** The hidden tests, run on the finished solution. Null when the problem has none. */
  tests: { passed: number; total: number; running: boolean } | null;
  /** Says what was run, when it is not the hidden tests. */
  testsLabel?: string;
  /** The word after the count. Default: "passed". */
  testsWord?: string;
}

/** Shown in place of the coach when the last line is done. */
export function FinishSummary({ steps, results, tests, testsLabel, testsWord = "عدّوا" }: FinishSummaryProps) {
  const points = totalPoints(results);
  const max = steps.length * MAX_POINTS_PER_STEP;
  const ratio = max === 0 ? 0 : points / max;
  const revealed = steps.filter((step) => results[step.index]?.tier === "revealed");

  let message = "عادي جدًا في الأول. كرّرها دلوقتي وإنت لسه فاكر السطور.";
  if (ratio >= 0.9) message = "ممتاز يا إسلام. الحل ده بقى في إيدك.";
  else if (ratio >= 0.6) message = "كويس يا إسلام. كرّرها مرة كمان علشان السطور اللي وقفت عندها تثبت.";

  return (
    <section aria-label="النتيجة" className="overflow-hidden rounded-2xl border border-ok/40 bg-panel">
      <div className="h-1 bg-ok" />
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">خلصت المسألة</h2>
            <p className="mt-1 text-[15px] leading-7 text-mut">{message}</p>
            {tests && (
            <p className="mt-1 text-sm text-mut">
              {testsLabel ?? "الحل اللي كتبته اتشغّل على الـ tests المستخبية:"}{" "}
              {tests.running ? (
                "بيشتغل…"
              ) : (
                <span className={tests.passed === tests.total ? "font-semibold text-ok" : "font-semibold text-bad"}>
                  <bdi dir="ltr">
                    {tests.passed} / {tests.total}
                  </bdi>{" "}
                  {testsWord}
                </span>
              )}
            </p>
            )}
          </div>
          <p dir="ltr" className="text-3xl font-bold text-gold">
            {points}
            <span className="text-lg text-faint"> / {max}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="من أول مرة" value={countTier(results, "first")} tone="text-ok" />
          <Stat label="بعد تلميح" value={countTier(results, "second")} tone="text-warn" />
          <Stat label="بعد تلميحين" value={countTier(results, "third")} tone="text-warn" />
          <Stat label="اتكشف" value={revealed.length} tone="text-bad" />
        </div>

        {revealed.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-bad">سطور ضعيفة، راجعها</h3>
            <ul className="mt-2 space-y-2">
              {revealed.map((step) => (
                <li key={step.key} className="rounded-xl border border-line bg-raised p-3">
                  <p className="text-sm leading-7">
                    <Mixed text={step.coach} />
                  </p>
                  <pre className="code-block mt-2">
                    <code>{step.expected.split("\n").map((line) => line.trim()).join("\n")}</code>
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

/** One line of an answer in the What / How / Example shape. */
function AnswerPart({ label, text, code = false }: { label: string; text: string; code?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[4.5rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-gold">{label}</dt>
      <dd className={"min-w-0 flex-1 " + (code ? "font-mono text-[13px] leading-6" : "text-[15px] leading-7")}>{text}</dd>
    </div>
  );
}

function FollowUpCard({ item }: { item: FollowUp }) {
  const [open, setOpen] = useState(false);
  const shaped = item.how !== undefined || item.example !== undefined;
  return (
    <li className="rounded-xl border border-line bg-raised p-3">
      <p dir="ltr" lang="en" className="ltr font-medium">
        {item.question}
      </p>
      {open ? (
        shaped ? (
          <dl dir="ltr" lang="en" className="ltr mt-2 space-y-1.5 text-ink/90">
            <AnswerPart label="What" text={item.answer} />
            {item.how && <AnswerPart label="How" text={item.how} />}
            {item.example && <AnswerPart label="Example" text={item.example} code />}
          </dl>
        ) : (
          <p dir="ltr" lang="en" className="ltr mt-2 text-[15px] leading-7 text-ink/90">
            {item.answer}
          </p>
        )
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 rounded-lg border border-line px-3 py-1 text-sm text-gold hover:bg-panel"
        >
          جاوب بصوت عالي، وبعدين وريني الإجابة
        </button>
      )}
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="text-sm font-semibold text-mut">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * Complexity, follow-up questions and the interview checklist. An output
 * question has a rule in place of a complexity, and no checklist: there is
 * no code to write.
 */
export function AfterFinish({ problem, testCode }: { problem: Problem; testCode?: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // An output question, a test and a config file have a rule to remember,
  // not a complexity, and the 7 steps for solving a problem do not apply to them.
  const isOutput = problem.kind === "output" || problem.kind === "test" || problem.kind === "config";

  return (
    <div className="space-y-3">
      {problem.kind === "test" && testCode !== undefined && <TestCard problem={problem} testCode={testCode} />}
      {/* A translate exercise had the other file open the whole time, so it needs no card. */}
      {problem.kind === "config" && problem.twin !== undefined && problem.given === undefined && (
        <TwinCard problem={problem} />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Card title={isOutput ? "القاعدة" : "Complexity"}>
          <p dir="ltr" lang="en" className="ltr text-[15px] leading-7">
            {problem.complexity}
          </p>
        </Card>
        <Card title="الفكرة">
          <p className="text-[15px] leading-7">
            <Mixed text={problem.idea} />
          </p>
        </Card>
      </div>

      {problem.followUps.length > 0 && (
        <Card title="أسئلة المتابعة">
          <ul className="space-y-2">
            {problem.followUps.map((item) => (
              <FollowUpCard key={item.question} item={item} />
            ))}
          </ul>
        </Card>
      )}

      {!isOutput && (
      <Card title="الاسطمبة: 7 خطوات لأي مسألة">
        <p className="mb-3 text-sm text-mut">
          عيد المسألة في دماغك كأنك في المقابلة، وعلّم على كل خطوة عملتها.
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
                      <bdi dir="ltr">{i + 1}.</bdi> <Mixed text={item.title} />
                    </span>
                    <span className="mt-0.5 block text-sm leading-6 text-mut">
                      <Mixed text={item.note} />
                    </span>
                    <span dir="ltr" lang="en" className="ltr mt-1.5 block rounded-lg bg-bg/60 px-2.5 py-1.5 text-sm">
                      {item.say}
                    </span>
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
