import type { CodeProblem, TestCase } from "@/data/types";
import type { ConsoleEntry } from "@/lib/runner/protocol";
import { countPassed, type RunView, type TestView } from "@/lib/runner/useRunner";

const LEVEL_STYLE: Record<ConsoleEntry["level"], string> = {
  log: "text-ink",
  info: "text-ink",
  warn: "border-warn/30 bg-warn/10 text-warn",
  error: "border-bad/30 bg-bad/10 text-bad",
};

function Lines({ entries }: { entries: ConsoleEntry[] }) {
  return (
    <ol dir="ltr" className="ltr space-y-1 font-mono text-[13px] leading-6">
      {entries.map((entry, i) => (
        <li
          key={i}
          className={"whitespace-pre-wrap break-words rounded-md border border-transparent px-2 " + LEVEL_STYLE[entry.level]}
        >
          {entry.text}
        </li>
      ))}
    </ol>
  );
}

interface ConsoleProps {
  view: RunView;
  /** Shown before the first run. */
  idleHint: string;
}

/** What the learner's own code printed, and the error that stopped it. */
export function ConsoleView({ view, idleHint }: ConsoleProps) {
  if (view.phase === "idle") return <p className="text-sm leading-7 text-mut">{idleHint}</p>;

  const empty = view.console.length === 0 && view.fatal === null;
  return (
    <div className="space-y-2">
      {view.console.length > 0 && <Lines entries={view.console} />}
      {view.fatal && (
        <p
          dir="ltr"
          role="alert"
          className="ltr whitespace-pre-wrap break-words rounded-md border border-bad/40 bg-bad/10 px-2 py-1 font-mono text-[13px] leading-6 text-bad"
        >
          {view.fatal.message}
          {view.fatal.line !== null && " (line " + view.fatal.line + ")"}
        </p>
      )}
      {empty && view.phase === "running" && <p className="text-sm text-mut">بيشتغل…</p>}
      {empty && view.phase === "done" && (
        <p className="text-sm leading-7 text-mut">
          الكود اشتغل ومطبعش حاجة. لو عايز تجرّب بإيدك، نادي الدالة جوه <code className="inline-code">console.log</code>.
        </p>
      )}
    </div>
  );
}

const STATUS: Record<TestView["status"], { mark: string; tone: string; label: string }> = {
  waiting: { mark: "·", tone: "text-faint", label: "مستني" },
  running: { mark: "…", tone: "text-gold", label: "بيشتغل" },
  pass: { mark: "✓", tone: "text-ok", label: "عدّى" },
  fail: { mark: "✗", tone: "text-bad", label: "وقع" },
  timeout: { mark: "⏱", tone: "text-warn", label: "الوقت خلص" },
  skipped: { mark: "–", tone: "text-faint", label: "متشغّلش" },
};

function TestRow({ test, result }: { test: TestCase; result: TestView }) {
  const status = STATUS[result.status];
  const failed = result.status === "fail" || result.status === "timeout";
  return (
    <li className={"rounded-xl border px-3 py-2 " + (failed ? "border-bad/30 bg-bad/5" : "border-line bg-raised")}>
      <div className="flex items-start gap-2.5">
        <span className={"mt-0.5 w-4 shrink-0 text-center font-bold " + status.tone} title={status.label}>
          {status.mark}
          <span className="sr-only">{status.label}</span>
        </span>
        <span dir="ltr" lang="en" className="ltr min-w-0 flex-1 text-sm leading-6">
          {test.name}
        </span>
      </div>
      {result.message !== "" && (
        <pre
          dir="ltr"
          className={
            "ltr mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg/60 px-2.5 py-1.5 font-mono text-[12.5px] leading-6 " +
            (result.status === "skipped" ? "text-mut" : "text-ink")
          }
        >
          {result.message}
        </pre>
      )}
      {result.logs.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-mut">
            الكود طبع <bdi dir="ltr">{result.logs.length}</bdi> سطر في الـ test ده
          </summary>
          <div className="mt-1.5">
            <Lines entries={result.logs} />
          </div>
        </details>
      )}
    </li>
  );
}

interface TestsProps {
  problem: CodeProblem;
  view: RunView;
  /** Shown before the first run. */
  idleHint: string;
}

/** Pass or fail for every hidden test. The test code itself is never shown. */
export function TestsView({ problem, view, idleHint }: TestsProps) {
  if (view.phase === "idle") {
    return (
      <p className="text-sm leading-7 text-mut">
        فيه <bdi dir="ltr">{problem.tests.length}</bdi> test مستخبي. {idleHint}
      </p>
    );
  }

  const passed = countPassed(view);
  const total = problem.tests.length;
  const allPassed = view.phase === "done" && passed === total;
  const multiPart = problem.parts.length > 1;

  return (
    <div className="space-y-3">
      <p
        role="status"
        className={"text-sm font-semibold " + (allPassed ? "text-ok" : view.phase === "running" ? "text-gold" : "text-ink")}
      >
        {view.phase === "running" ? "بيشتغل… " : ""}
        <bdi dir="ltr">
          {passed} / {total}
        </bdi>{" "}
        عدّوا
      </p>

      {problem.parts.map((part) => {
        const rows: React.ReactNode[] = [];
        for (let i = 0; i < problem.tests.length; i++) {
          const test = problem.tests[i];
          if (multiPart && test.part !== part.id) continue;
          rows.push(<TestRow key={test.name} test={test} result={view.tests[i]} />);
        }
        if (rows.length === 0) return null;
        return (
          <div key={part.id}>
            {multiPart && (
              <h3 dir="ltr" lang="en" className="ltr mb-1.5 text-xs font-semibold text-gold">
                {part.title}
              </h3>
            )}
            <ul className="space-y-1.5">{rows}</ul>
          </div>
        );
      })}
    </div>
  );
}

/** The small count next to the Tests tab label. */
export function TestsBadge({ view, total }: { view: RunView; total: number }) {
  if (view.phase === "idle") {
    return (
      <bdi dir="ltr" className="rounded-full bg-raised px-1.5 text-[11px] font-normal text-mut">
        {total}
      </bdi>
    );
  }
  const passed = countPassed(view);
  const tone =
    view.phase === "running" ? "bg-gold/15 text-gold" : passed === total ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad";
  return (
    <bdi dir="ltr" className={"rounded-full px-1.5 text-[11px] font-semibold " + tone}>
      {passed}/{total}
    </bdi>
  );
}
