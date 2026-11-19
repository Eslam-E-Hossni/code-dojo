"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import type { OutputProblem } from "@/data/types";
import { JS } from "@/lib/monaco";
import {
  compareOutput,
  countMatches,
  normalizeLine,
  POINTS_PER_LINE,
  splitPrediction,
  type OutputRow,
} from "@/lib/output";
import { startRun, type RunHandle } from "@/lib/runner/client";
import { progressOf, updateStore, useStore, withProgress } from "@/lib/store";
import { useRunShortcut } from "@/lib/useRunShortcut";
import { BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import CodeEditor from "./CodeEditor";
import { AfterFinish } from "./FinishPanel";
import { AskSections, StatementSection } from "./ProblemInfo";

const SAVE_DELAY_MS = 400;
const LINE_HEIGHT = 23;

interface Result {
  rows: OutputRow[];
  /** What the code really printed. */
  actual: string[];
  /** An error that stopped the code, if any. */
  fatal: string | null;
}

interface Props {
  problem: OutputProblem;
  next: { href: string; title: string } | null;
}

function Row({ row, why }: { row: OutputRow; why: string | null }) {
  if (row.kind === "match") {
    return (
      <li className="rounded-xl border border-ok/30 bg-ok/5 px-3 py-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 font-bold text-ok">✓</span>
          <code dir="ltr" className="ltr flex-1 font-mono text-[13px] leading-6">
            {row.actual}
          </code>
        </div>
        {why && (
          <p dir="ltr" lang="en" className="ltr mt-1 pl-6 text-sm leading-6 text-mut">
            {why}
          </p>
        )}
      </li>
    );
  }

  if (row.kind === "missing") {
    return (
      <li className="rounded-xl border border-bad/40 bg-bad/5 px-3 py-2">
        <p className="text-xs font-semibold text-bad">الكود طبع السطر ده، وإنت ما كتبتهوش هنا</p>
        <div className="mt-1 flex items-start gap-2.5">
          <span className="mt-0.5 font-bold text-bad">✗</span>
          <code dir="ltr" className="ltr flex-1 font-mono text-[13px] leading-6">
            {row.actual}
          </code>
        </div>
        {why && (
          <p dir="ltr" lang="en" className="ltr mt-1 pl-6 text-sm leading-6 text-mut">
            {why}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-bad/40 bg-bad/5 px-3 py-2">
      <p className="text-xs font-semibold text-bad">إنت كتبت السطر ده، والكود ما طبعوش هنا</p>
      <div className="mt-1 flex items-start gap-2.5">
        <span className="mt-0.5 font-bold text-bad">✗</span>
        <code dir="ltr" className="ltr flex-1 font-mono text-[13px] leading-6 text-mut line-through">
          {row.predicted}
        </code>
      </div>
    </li>
  );
}

/** "What does this print?": read the code, type the output, run to compare. */
export default function OutputMode({ problem, next }: Props) {
  // The draft is in localStorage, so this part renders in the browser only.
  use(browser("The prediction draft is saved in localStorage."));

  const store = useStore();
  const saved = progressOf(store, problem.id).prediction;

  const [text, setText] = useState(() => saved ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState(false);
  // The height of the code, as the editor measures it. On a phone long lines wrap, so it grows.
  const [codeHeight, setCodeHeight] = useState<number | null>(null);

  const handle = useRef<RunHandle | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const input = useRef<HTMLTextAreaElement>(null);

  // Stop a run that is still going, and drop a pending save, when leaving.
  useEffect(
    () => () => {
      handle.current?.cancel();
      clearTimeout(saveTimer.current);
    },
    [],
  );

  const onType = (value: string) => {
    setText(value);
    setNotice(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateStore((s) => withProgress(s, problem.id, (p) => ({ ...p, prediction: value })));
    }, SAVE_DELAY_MS);
  };

  const run = () => {
    if (running) return;
    const predicted = splitPrediction(text);
    if (predicted.length === 0) {
      // Running first would give the answer away.
      setNotice(true);
      input.current?.focus();
      return;
    }

    setRunning(true);
    const actual: string[] = [];
    let fatal: string | null = null;
    const isFirstCheck = result === null;

    const current = startRun({ code: problem.code, tests: [] }, (event) => {
      if (event.type === "console") actual.push(event.entry.text);
      if (event.type === "fatal") {
        fatal = event.error.message + (event.error.line === null ? "" : " (line " + event.error.line + ")");
      }
    });
    handle.current = current;

    void current.done.then(() => {
      if (handle.current !== current) return;
      const rows = compareOutput(predicted, actual);
      setResult({ rows, actual, fatal });
      setRunning(false);

      // Only the first check counts: after it the answer is on the screen.
      if (!isFirstCheck) return;
      const points = countMatches(rows) * POINTS_PER_LINE;
      clearTimeout(saveTimer.current);
      updateStore((s) => {
        const updated = withProgress(s, problem.id, (p) => ({
          ...p,
          prediction: undefined,
          runs: [
            ...p.runs,
            {
              at: new Date().toISOString(),
              mode: "output" as const,
              points,
              max: actual.length * POINTS_PER_LINE,
            },
          ],
        }));
        return { ...updated, points: updated.points + points };
      });
    });
  };

  const reset = () => {
    handle.current?.cancel();
    handle.current = null;
    clearTimeout(saveTimer.current);
    updateStore((s) => withProgress(s, problem.id, (p) => ({ ...p, prediction: undefined })));
    setText("");
    setResult(null);
    setRunning(false);
    setNotice(false);
    input.current?.focus();
  };

  useRunShortcut(run);

  const codeLines = problem.code.split("\n").length;
  const matches = result ? countMatches(result.rows) : 0;
  const perfect = result !== null && result.fatal === null && matches === result.actual.length && matches === result.rows.length;

  const whyFor = (actualIndex: number, actual: string): string | null => {
    const line = problem.output[actualIndex];
    return line && normalizeLine(line.text) === normalizeLine(actual) ? line.why : null;
  };

  return (
    <div
      dir="ltr"
      className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]"
    >
      <aside
        dir="rtl"
        className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto"
      >
        <StatementSection problem={problem} mode="output" />
        <AskSections problem={problem} />
      </aside>

      <div dir="rtl" className="min-w-0 space-y-3">
        <section
          aria-label="توقّع الـ output"
          className={"rounded-2xl border bg-panel p-4 " + (perfect ? "border-ok/40" : "border-line")}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold">الكود ده هيطبع إيه؟</h2>
              <p className="mt-0.5 text-sm leading-6 text-mut">
                اقرا الكود واكتب اللي هيتطبع بالترتيب، كل سطر في سطر لوحده. وبعدين شغّله وقارن.
              </p>
            </div>
            {result && (
              <p className="text-center">
                <bdi dir="ltr" className={"block text-2xl font-bold " + (perfect ? "text-ok" : "text-gold")}>
                  {matches} / {result.actual.length}
                </bdi>
                <span className="text-xs text-mut">سطر صح</span>
              </p>
            )}
          </div>
        </section>

        <div
          className="overflow-hidden rounded-2xl border border-line bg-editor"
          style={{ height: Math.min(codeHeight ?? codeLines * LINE_HEIGHT + 28, 560) }}
        >
          <CodeEditor
            language={JS}
            initialValue={problem.code}
            readOnly
            onChange={() => {}}
            onRun={run}
            onContentHeight={(height) => setCodeHeight(height + 4)}
          />
        </div>

        <section className="rounded-2xl border border-line bg-panel p-4">
          <label htmlFor="prediction" className="text-sm font-semibold">
            توقّعك
          </label>
          <textarea
            id="prediction"
            ref={input}
            dir="ltr"
            value={text}
            onChange={(event) => onType(event.target.value)}
            rows={Math.max(5, Math.min(12, text.split("\n").length + 1))}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={"first line\nsecond line"}
            className="ltr mt-2 block w-full resize-y rounded-xl border border-line bg-editor p-3 font-mono text-[13px] leading-6 text-ink placeholder:text-faint"
          />
          {notice && (
            <p role="status" className="mt-2 text-sm text-warn">
              اكتب توقّعك الأول. لو شغّلت الكود قبل ما تتوقّع، الإجابة هتظهر ومش هتبقى اتمرّنت.
            </p>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={run} disabled={running} className={BUTTON_PRIMARY}>
            {running ? "بيشتغل…" : result ? "شغّل وقارن تاني" : "شغّل وقارن"}
            <kbd dir="ltr" className="hidden rounded bg-bg/20 px-1.5 py-0.5 font-mono text-[11px] sm:inline">
              Ctrl+Enter
            </kbd>
          </button>
          <button type="button" onClick={reset} className={BUTTON_PLAIN}>
            ابدأ من الأول
          </button>
          <span className="ms-auto">
            <Link href={next ? next.href : "/"} className={BUTTON_PLAIN}>
              {next ? "المسألة اللي بعدها" : "كل المسائل"}
              {next && (
                <bdi dir="ltr" className="text-xs font-normal text-mut">
                  {next.title}
                </bdi>
              )}
            </Link>
          </span>
        </div>

        {result && (
          <section aria-label="المقارنة" className="rounded-2xl border border-line bg-panel p-4">
            <h2 className="text-sm font-semibold text-mut">
              {perfect ? "كله صح وبالترتيب. دي الأسباب، قولها بصوت عالي:" : "اللي اتطبع فعلًا، سطر سطر، وليه:"}
            </h2>
            {result.fatal && (
              <p
                dir="ltr"
                role="alert"
                className="ltr mt-3 rounded-md border border-bad/40 bg-bad/10 px-2 py-1 font-mono text-[13px] leading-6 text-bad"
              >
                {result.fatal}
              </p>
            )}
            <ol className="mt-3 space-y-1.5">
              {result.rows.map((row, i) => (
                <Row key={i} row={row} why={row.kind === "extra" ? null : whyFor(row.actualIndex, row.actual)} />
              ))}
            </ol>
          </section>
        )}

        {result && <AfterFinish problem={problem} />}
      </div>
    </div>
  );
}
