"use client";

import { useState } from "react";
import type { CheckReport, Diagnostic, RuleResult } from "@/lib/config/types";
import { Mixed } from "./Mixed";

interface Props {
  /** Null before the first check: the list is not shown yet. */
  report: CheckReport | null;
  /** Shown in place of the list while `report` is null. */
  idleHint: string;
}

const MARK = "mt-0.5 w-4 shrink-0 text-center font-bold";

const TONE: Record<RuleResult["status"], { box: string; mark: string; sign: string; said: string }> = {
  pass: { box: "border-ok/30 bg-ok/5", mark: " text-ok", sign: "✓", said: "اتحققت" },
  todo: { box: "border-line bg-raised", mark: " text-faint", sign: "○", said: "لسه" },
  fail: { box: "border-bad/40 bg-bad/5", mark: " text-bad", sign: "✗", said: "محتاجة تتصلّح" },
};

function RuleRow({ rule }: { rule: RuleResult }) {
  const [open, setOpen] = useState(false);
  const tone = TONE[rule.status];
  // A broken rule always shows its reason. The others show it when asked.
  const showWhy = rule.status === "fail" || open;

  return (
    <li className={"rounded-xl border px-3 py-2 " + tone.box}>
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className={MARK + tone.mark}>
          {tone.sign}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-6">
            <Mixed text={rule.title} />
            <span className="sr-only"> ({tone.said})</span>
          </p>
          {rule.status !== "pass" && rule.detail && (
            <p className={"text-sm leading-6 " + (rule.status === "fail" ? "text-bad" : "text-mut")}>
              {rule.line !== undefined && (
                <>
                  سطر <bdi dir="ltr">{rule.line}</bdi>:{" "}
                </>
              )}
              <Mixed text={rule.detail} />
            </p>
          )}
          {showWhy && (
            <p className="mt-1 text-sm leading-7 text-ink/90">
              <span className="font-semibold text-gold">ليه؟ </span>
              <Mixed text={rule.why} />
            </p>
          )}
        </div>
        {rule.status !== "fail" && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="shrink-0 rounded-lg border border-line px-2 py-0.5 text-xs text-gold hover:bg-panel"
          >
            {open ? "اقفل" : "ليه؟"}
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * The checklist of a config file. A rule is green when the file follows
 * it, neutral while its part is not written yet, and red when the file
 * breaks it. Every rule can say why it exists.
 */
export function RulesView({ report, idleHint }: Props) {
  if (report === null) return <p className="text-sm leading-7 text-mut">{idleHint}</p>;

  const total = report.rules.length;
  let broken = 0;
  for (let i = 0; i < report.rules.length; i++) {
    if (report.rules[i].status === "fail") broken++;
  }

  return (
    <div className="space-y-3">
      <p
        role="status"
        className={
          "rounded-xl border px-3 py-2 text-sm font-semibold leading-6 " +
          (report.ok
            ? "border-ok/40 bg-ok/10 text-ok"
            : broken > 0 || report.diagnostics.length > 0
              ? "border-bad/40 bg-bad/10 text-bad"
              : "border-line bg-raised text-mut")
        }
      >
        {report.ok ? (
          "كل القواعد اتحققت."
        ) : (
          <>
            <bdi dir="ltr">
              {report.passed} / {total}
            </bdi>{" "}
            قاعدة اتحققت
            {broken > 0 && (
              <>
                ، و <bdi dir="ltr">{broken}</bdi> محتاجة تتصلّح
              </>
            )}
            {report.diagnostics.length > 0 && "، وفيه خطأ في كتابة الملف"}.
          </>
        )}
      </p>

      <DiagnosticsList diagnostics={report.diagnostics} />

      <ul className="space-y-1.5">
        {report.rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} />
        ))}
      </ul>
    </div>
  );
}

/** The syntax errors of the file, each with its line. Nothing when there are none. */
export function DiagnosticsList({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) return null;
  return (
    <section aria-label="أخطاء في كتابة الملف" className="rounded-xl border border-bad/40 bg-bad/5 px-3 py-2">
      <h3 className="text-sm font-semibold text-bad">الملف مش مقري صح</h3>
      <ul className="mt-1 space-y-1">
        {diagnostics.map((diagnostic, i) => (
          <li key={i} className="text-sm leading-6">
            سطر{" "}
            <bdi dir="ltr">
              {diagnostic.endLine === undefined ? diagnostic.line : diagnostic.line + "–" + diagnostic.endLine}
            </bdi>
            : <Mixed text={diagnostic.message} />
            {diagnostic.raw !== undefined && (
              <span dir="ltr" lang="en" className="ltr mt-0.5 block font-mono text-xs leading-5 text-mut">
                {diagnostic.raw}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The small count on the rules tab. */
export function RulesBadge({ report }: { report: CheckReport | null }) {
  if (report === null) return null;
  let broken = report.diagnostics.length > 0;
  for (let i = 0; i < report.rules.length; i++) {
    if (report.rules[i].status === "fail") broken = true;
  }
  return (
    <bdi
      dir="ltr"
      className={
        "rounded-full px-1.5 text-[11px] font-semibold " +
        (report.ok ? "bg-ok/15 text-ok" : broken ? "bg-bad/15 text-bad" : "bg-raised text-mut")
      }
    >
      {report.passed}/{report.rules.length}
    </bdi>
  );
}
