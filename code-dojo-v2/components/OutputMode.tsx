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
import { useAwayCount } from "@/lib/useAwayCount";
import { useRunShortcut } from "@/lib/useRunShortcut";
import { BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import { ReadOnlyCode } from "./CodeViews";
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
          <span aria-hidden="true" className="mt-0.5 font-bold text-ok">
            ✓
          </span>
          <code className="flex-1 font-mono text-[13px] leading-6">{row.actual}</code>
        </div>
        {why && <p className="mt-1 pl-6 text-sm leading-6 text-mut">{why}</p>}
      </li>
    );
  }

  if (row.kind === "missing") {
    return (
      <li className="rounded-xl border border-bad/40 bg-bad/5 px-3 py-2">
        <p className="text-xs font-semibold text-bad">The code printed this line. You did not write it here.</p>
        <div className="mt-1 flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-0.5 font-bold text-bad">
            ✗
          </span>
          <code className="flex-1 font-mono text-[13px] leading-6">{row.actual}</code>
        </div>
        {why && <p className="mt-1 pl-6 text-sm leading-6 text-mut">{why}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-bad/40 bg-bad/5 px-3 py-2">
      <p className="text-xs font-semibold text-bad">You wrote this line. The code did not print it here.</p>
      <div className="mt-1 flex items-start gap-2.5">
        <span aria-hidden="true" className="mt-0.5 font-bold text-bad">
          ✗
        </span>
        <code className="flex-1 font-mono text-[13px] leading-6 text-mut line-through">{row.predicted}</code>
      </div>
    </li>
  );
}

/**
 * "What does this print?" The learner reads the code, types the output
 * they expect, and only then runs it. The code runs in the same Web Worker
 * as everything else, and its console lines are compared with the
 * prediction. Only the first check gives points: after it the answer is
 * on the screen.
 */
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

  // The editor that shows the code is built again when the page comes back from the background.
  const editorLife = useAwayCount(() => {
    // A run that was cut by leaving the page must not leave the button on "Running".
    setRunning(false);
  });

  // Stop a run that is still going, and drop a pending save, when leaving.
  useEffect(
    () => () => {
      handle.current?.cancel();
      handle.current = null;
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
  const perfect =
    result !== null && result.fatal === null && matches === result.actual.length && matches === result.rows.length;

  const whyFor = (actualIndex: number, actual: string): string | null => {
    const line = problem.output[actualIndex];
    return line && normalizeLine(line.text) === normalizeLine(actual) ? line.why : null;
  };

  return (
    <div className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
      {/* On a phone the code comes first, and these sections follow it. */}
      <aside className="order-2 flex min-w-0 flex-col gap-3 lg:sticky lg:top-[4.5rem] lg:order-1 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto">
        <StatementSection problem={problem} />
        <AskSections problem={problem} />
      </aside>

      <div className="order-1 min-w-0 space-y-3 lg:order-2">
        <section
          aria-label="Predict the output"
          className={"rounded-2xl border bg-panel p-4 " + (perfect ? "border-ok/40" : "border-line")}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold">What does this code print?</h2>
              <p className="mt-0.5 text-sm leading-6 text-mut">
                Read the code and type what it prints, in order, one line of output per line. Then run it and compare.
              </p>
            </div>
            {result && (
              <p className="text-center">
                <span className={"block text-2xl font-bold " + (perfect ? "text-ok" : "text-gold")}>
                  {matches} / {result.actual.length}
                </span>
                <span className="text-xs text-mut">lines right</span>
              </p>
            )}
          </div>
        </section>

        <div
          className="overflow-hidden rounded-2xl border border-line bg-editor"
          style={{ height: Math.min(codeHeight ?? codeLines * LINE_HEIGHT + 28, 560) }}
        >
          <ReadOnlyCode
            key={editorLife}
            code={problem.code}
            language={JS}
            onContentHeight={(height) => setCodeHeight(height + 4)}
          />
        </div>

        <section className="rounded-2xl border border-line bg-panel p-4">
          <label htmlFor={"prediction-" + problem.id} className="text-sm font-semibold">
            Your prediction
          </label>
          <textarea
            id={"prediction-" + problem.id}
            ref={input}
            value={text}
            onChange={(event) => onType(event.target.value)}
            rows={Math.max(5, Math.min(12, text.split("\n").length + 1))}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={"first line\nsecond line"}
            className="mt-2 block w-full resize-y rounded-xl border border-line bg-editor p-3 font-mono text-[13px] leading-6 text-ink placeholder:text-faint"
          />
          {notice && (
            <p role="status" className="mt-2 text-sm leading-6 text-warn">
              Type your prediction first. If you run the code before you predict, you see the answer and get no practice.
            </p>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={run} disabled={running} className={BUTTON_PRIMARY}>
            {running ? "Running…" : result ? "Run and compare again" : "Run and compare"}
            <kbd className="hidden rounded bg-bg/20 px-1.5 py-0.5 font-mono text-[11px] sm:inline">Ctrl+Enter</kbd>
          </button>
          <button type="button" onClick={reset} className={BUTTON_PLAIN}>
            Reset
          </button>
          <span className="ml-auto">
            <Link href={next ? next.href : "/"} className={BUTTON_PLAIN}>
              {next ? "Next problem" : "All problems"}
              {next && <span className="text-xs font-normal text-mut">{next.title}</span>}
            </Link>
          </span>
        </div>

        {result && (
          <section aria-label="Comparison" className="rounded-2xl border border-line bg-panel p-4">
            <h2 className="text-sm font-semibold text-mut">
              {perfect
                ? "All right, and in the right order. These are the reasons. Say them out loud:"
                : "What the code really printed, line by line, and why:"}
            </h2>
            {result.fatal && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-bad/40 bg-bad/10 px-2 py-1 font-mono text-[13px] leading-6 text-bad"
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
