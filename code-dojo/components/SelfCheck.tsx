"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { problems } from "@/data/problems";
import type { Problem } from "@/data/types";
import { checkConfig } from "@/lib/config";
import { normalizeLine } from "@/lib/output";
import { startRun, type RunHandle } from "@/lib/runner/client";
import { solutionText } from "@/lib/steps";
import { checkTest } from "@/lib/testing/check";
import { runTestsInFrame } from "@/lib/testing/client";
import { BUTTON_PRIMARY } from "./buttons";

interface Row {
  id: string;
  title: string;
  /** Hidden tests for a code problem, printed lines for an output question. */
  total: number;
  unit: string;
  /** null = not run yet. */
  passed: number | null;
  /** What did not pass, with the reason. */
  problemsFound: string[];
}

/** React problems are not here: they run in the Sandpack preview, not in the worker. */
function checkable(): Problem[] {
  return problems.filter((problem) => problem.kind !== "react");
}

function emptyRows(): Row[] {
  return checkable().map((problem) => ({
    id: problem.id,
    title: problem.title,
    total:
      problem.kind === "code"
        ? problem.tests.length
        : problem.kind === "output"
          ? problem.output.length
          : problem.kind === "test"
            ? problem.buggy.length + 1
            : problem.kind === "config"
              ? problem.rules.length
              : 0,
    unit:
      problem.kind === "output"
        ? "lines"
        : problem.kind === "test"
          ? "versions"
          : problem.kind === "config"
            ? "rules"
            : "tests",
    passed: null,
    problemsFound: [],
  }));
}

/**
 * Checks the runner in this browser's real Web Worker:
 * - every reference solution must pass its hidden tests
 * - every output question must print exactly the lines stored for it
 * - every reference test of the Testing track must pass on the correct code
 *   and fail on every buggy version, in the real test frame
 * - every reference config file must pass all of its rules
 * `npm test` does the same in Node; this page answers the question "does it
 * also work in the browser I am using right now?".
 */
export function SelfCheck() {
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const current = useRef<RunHandle | null>(null);
  const cancelled = useRef(false);

  useEffect(
    () => () => {
      cancelled.current = true;
      current.current?.cancel();
    },
    [],
  );

  const run = async () => {
    cancelled.current = false;
    setRows(emptyRows());
    setPhase("running");

    for (const problem of checkable()) {
      if (cancelled.current) return;
      let passed = 0;
      const found: string[] = [];
      const printed: string[] = [];

      if (problem.kind === "config") {
        // The reference file, handed in as finished, must pass every one of its rules.
        const report = checkConfig(problem.rules, solutionText(problem), { strict: true });
        for (const diagnostic of report.diagnostics) {
          found.push("line " + diagnostic.line + ": " + diagnostic.message);
        }
        for (const rule of report.rules) {
          if (rule.status === "pass") passed++;
          else found.push(rule.id + ": " + (rule.detail ?? rule.status));
        }
        setRows((before) =>
          before.map((row) => (row.id === problem.id ? { ...row, passed, problemsFound: found } : row)),
        );
        continue;
      }

      if (problem.kind === "test") {
        // The reference test must pass on the correct code and fail on every buggy version.
        const check = await checkTest(problem, solutionText(problem), runTestsInFrame, true);
        if (cancelled.current) return;
        if (check.correctPassed) passed++;
        else {
          found.push("correct code: " + (check.correct.fatal ?? "a test failed"));
          for (const test of check.correct.tests) {
            if (test.status === "fail") found.push(test.name + ": " + test.message.slice(0, 300));
          }
        }
        for (const verdict of check.buggy) {
          if (verdict.caught) passed++;
          else found.push("the test did not fail on the buggy version " + verdict.id);
        }
        setRows((before) =>
          before.map((row) => (row.id === problem.id ? { ...row, passed, problemsFound: found } : row)),
        );
        continue;
      }

      const handle = startRun(
        problem.kind === "code"
          ? { code: solutionText(problem), tests: problem.tests }
          : { code: problem.kind === "output" ? problem.code : "", tests: [] },
        (event) => {
          if (event.type === "fatal") found.push(event.error.message);
          if (event.type === "console") printed.push(event.entry.text);
          if (event.type === "test-end" && problem.kind === "code") {
            if (event.result.status === "pass") passed++;
            else found.push(problem.tests[event.index].name + ": " + event.result.message);
          }
        },
      );
      current.current = handle;
      await handle.done;
      if (cancelled.current) return;

      if (problem.kind === "output") {
        const wanted = problem.output;
        for (let i = 0; i < wanted.length; i++) {
          if (printed[i] !== undefined && normalizeLine(printed[i]) === normalizeLine(wanted[i].text)) passed++;
          else found.push("line " + (i + 1) + ": wanted " + wanted[i].text + ", printed " + String(printed[i]));
        }
        if (printed.length > wanted.length) {
          passed = Math.min(passed, wanted.length - 1);
          found.push("printed " + (printed.length - wanted.length) + " extra line(s)");
        }
      }

      setRows((before) =>
        before.map((row) => (row.id === problem.id ? { ...row, passed, problemsFound: found } : row)),
      );
    }
    setPhase("done");
  };

  let done = 0;
  let passedChecks = 0;
  let totalChecks = 0;
  let failedProblems = 0;
  for (const row of rows) {
    totalChecks += row.total;
    if (row.passed === null) continue;
    done++;
    passedChecks += row.passed;
    if (row.passed !== row.total) failedProblems++;
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="button" onClick={run} disabled={phase === "running"} className={BUTTON_PRIMARY}>
          {phase === "running" ? "بيشتغل…" : phase === "done" ? "شغّل تاني" : "شغّل الفحص"}
        </button>
        {phase !== "idle" && (
          <p role="status" className={"text-sm font-semibold " + (failedProblems > 0 ? "text-bad" : "text-ok")}>
            <bdi dir="ltr">
              {done} / {rows.length}
            </bdi>{" "}
            مسألة ·{" "}
            <bdi dir="ltr">
              {passedChecks} / {totalChecks}
            </bdi>{" "}
            فحص عدّوا
          </p>
        )}
      </div>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => {
          const ok = row.passed === row.total;
          return (
            <li
              key={row.id}
              className={
                "rounded-xl border bg-panel px-3 py-2 " +
                (row.passed === null ? "border-line" : ok ? "border-ok/30" : "border-bad/50")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <Link href={"/problem/" + row.id} dir="ltr" lang="en" className="min-w-0 truncate text-sm hover:text-gold">
                  {row.title}
                </Link>
                <bdi
                  dir="ltr"
                  className={
                    "shrink-0 font-mono text-xs " + (row.passed === null ? "text-faint" : ok ? "text-ok" : "text-bad")
                  }
                >
                  {(row.passed === null ? "–" : row.passed) + " / " + row.total + " " + row.unit}
                </bdi>
              </div>
              {row.problemsFound.length > 0 && (
                <ul dir="ltr" className="ltr mt-1.5 space-y-1 font-mono text-xs text-bad">
                  {row.problemsFound.map((text) => (
                    <li key={text} className="whitespace-pre-wrap break-words">
                      {text}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
