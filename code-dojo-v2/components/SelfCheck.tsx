"use client";

import { useEffect, useRef, useState } from "react";
import { problems } from "@/data/problems";
import type { Problem } from "@/data/types";
import { acceptSteps, checkFast, EMPTY_STATE, flattenSteps, solutionText } from "@/lib/checker/check";
import { normalizeLine } from "@/lib/output";
import { startRun, type RunHandle } from "@/lib/runner/client";
import { BUTTON_PRIMARY } from "./buttons";

interface Row {
  id: string;
  title: string;
  /** What is counted: hidden tests and steps for code, printed lines for an output question. */
  total: number;
  /** null = not run yet. */
  passed: number | null;
  /** What did not pass, with the reason. */
  found: string[];
}

function totalOf(problem: Problem): number {
  if (problem.kind === "output") return problem.output.length;
  return problem.tests.length + flattenSteps(problem).length;
}

function emptyRows(): Row[] {
  return problems.map((problem) => ({ id: problem.id, title: problem.title, total: totalOf(problem), passed: null, found: [] }));
}

/** Every reference step through the smart checker, as it runs in this browser. */
function checkSteps(problem: Problem, found: string[]): number {
  if (problem.kind !== "code") return 0;
  const steps = flattenSteps(problem);
  let state = EMPTY_STATE;
  let accepted = 0;
  for (const step of steps) {
    let verdict;
    try {
      verdict = checkFast(problem, state, step.expected);
    } catch (error) {
      found.push("step " + (step.index + 1) + ": the checker threw " + String(error));
      break;
    }
    if (verdict.kind !== "accept" || verdict.steps.length !== 1) {
      found.push(
        "step " + (step.index + 1) + ": " + (verdict.kind === "reject" ? verdict.message : "the checker said " + verdict.kind),
      );
      break;
    }
    state = acceptSteps(problem, state, step.expected, verdict.steps, verdict.names, null);
    accepted++;
  }
  return accepted;
}

/**
 * Checks the app in this browser, with its real Web Worker:
 * - every reference solution against its hidden tests,
 * - every reference line through the smart checker,
 * - every output question against its stored lines.
 * `npm test` does the same in Node. This page shows that the browser agrees.
 */
export function SelfCheck() {
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const handle = useRef<RunHandle | null>(null);
  const stopped = useRef(false);

  useEffect(
    () => () => {
      stopped.current = true;
      handle.current?.cancel();
    },
    [],
  );

  const runOne = (problem: Problem): Promise<{ passed: number; found: string[] }> =>
    new Promise((resolve) => {
      const found: string[] = [];
      let passed = 0;

      if (problem.kind === "output") {
        const printed: string[] = [];
        const current = startRun({ code: problem.code, tests: [] }, (event) => {
          if (event.type === "console") printed.push(event.entry.text);
          if (event.type === "fatal") found.push(event.error.message);
        });
        handle.current = current;
        void current.done.then(() => {
          for (let i = 0; i < problem.output.length; i++) {
            const wanted = problem.output[i].text;
            if (printed[i] !== undefined && normalizeLine(printed[i]) === normalizeLine(wanted)) passed++;
            else found.push("line " + (i + 1) + ": expected " + JSON.stringify(wanted) + ", printed " + JSON.stringify(printed[i]));
          }
          if (printed.length > problem.output.length) found.push("printed " + (printed.length - problem.output.length) + " more lines");
          resolve({ passed, found });
        });
        return;
      }

      const current = startRun({ code: solutionText(problem), tests: problem.tests }, (event) => {
        if (event.type === "fatal") found.push(event.error.message);
        if (event.type === "test-end") {
          if (event.result.status === "pass") passed++;
          else found.push(problem.tests[event.index].name + ": " + event.result.message);
        }
      });
      handle.current = current;
      void current.done.then(() => {
        passed += checkSteps(problem, found);
        resolve({ passed, found });
      });
    });

  const run = async () => {
    stopped.current = false;
    setPhase("running");
    setRows(emptyRows());
    for (let i = 0; i < problems.length; i++) {
      const result = await runOne(problems[i]);
      if (stopped.current) return;
      setRows((before) => before.map((row, at) => (at === i ? { ...row, passed: result.passed, found: result.found } : row)));
    }
    setPhase("done");
  };

  let done = 0;
  let good = 0;
  let checks = 0;
  let checksPassed = 0;
  for (const row of rows) {
    checks += row.total;
    if (row.passed === null) continue;
    done++;
    checksPassed += row.passed;
    if (row.passed === row.total && row.found.length === 0) good++;
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void run()} disabled={phase === "running"} className={BUTTON_PRIMARY}>
          {phase === "running" ? "Checking…" : phase === "done" ? "Check again" : "Run the check"}
        </button>
        <p
          role="status"
          data-phase={phase}
          data-good={good}
          data-problems={rows.length}
          data-checks-passed={checksPassed}
          data-checks={checks}
          className={"text-sm font-semibold " + (phase === "done" ? (good === rows.length ? "text-ok" : "text-bad") : "text-mut")}
        >
          {phase === "idle"
            ? rows.length + " problems, " + checks + " checks"
            : good + " of " + done + " problems pass · " + checksPassed + " of " + checks + " checks"}
        </p>
      </div>

      <ul className="mt-4 space-y-1.5">
        {rows.map((row) => {
          const ok = row.passed === row.total && row.found.length === 0;
          return (
            <li
              key={row.id}
              className={
                "rounded-xl border px-3 py-2 " +
                (row.passed === null ? "border-line bg-panel" : ok ? "border-ok/30 bg-ok/5" : "border-bad/40 bg-bad/5")
              }
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span aria-hidden="true" className={"w-4 font-bold " + (row.passed === null ? "text-faint" : ok ? "text-ok" : "text-bad")}>
                  {row.passed === null ? "·" : ok ? "✓" : "✗"}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">{row.title}</span>
                <span className="text-xs text-mut">
                  {row.passed === null ? row.total + " checks" : row.passed + " of " + row.total}
                </span>
              </div>
              {row.found.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-9 text-xs leading-5 text-bad">
                  {row.found.map((text, i) => (
                    <li key={i} className="whitespace-pre-wrap break-words">
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
