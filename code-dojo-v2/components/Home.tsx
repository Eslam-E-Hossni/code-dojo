"use client";

import Link from "next/link";
import { use } from "react";
import { browser } from "react-dom";
import { groups } from "@/data/groups";
import { problems } from "@/data/problems";
import type { Problem } from "@/data/types";
import { flattenSteps } from "@/lib/checker/check";
import { POINTS_PER_LINE } from "@/lib/output";
import { formatDuration, type PracticeMode } from "@/lib/practice";
import { isValidSession, progressOf, useStore, type ProblemProgress } from "@/lib/store";
import { DifficultyChip, TagChip } from "./Chips";

const EMPTY_PROGRESS: ProblemProgress = { weak: [], runs: [] };

/** Where the learner is with one problem, in a few words. */
function statusOf(progress: ProblemProgress, stepCount: number): { text: string; tone: string } {
  if (isValidSession(progress.learn, stepCount) && progress.learn.check.done.length > 0) {
    return { text: "Learn in progress · step " + (progress.learn.check.done.length + 1) + " of " + stepCount, tone: "text-gold" };
  }
  const learned = progress.runs.filter((run) => run.mode === "learn");
  if (learned.length > 0) {
    let best = learned[0];
    for (const run of learned) {
      if (run.points > best.points) best = run;
    }
    const times = learned.length === 1 ? "once" : learned.length + " times";
    return { text: "Learn finished " + times + " · best " + best.points + " / " + best.max, tone: "text-ok" };
  }
  return { text: "Not started", tone: "text-faint" };
}

const MODE_NAME: Record<PracticeMode, string> = { recall: "Recall", exam: "Exam" };

/**
 * Where the learner is with Recall or Exam, or null when it was never
 * opened. An attempt with the Solution panel open is "assisted": it is
 * shown as such, and it does not count as passed.
 */
function practiceMark(progress: ProblemProgress, mode: PracticeMode): { text: string; tone: string } | null {
  let passed = false;
  let assisted = false;
  let bestSeconds: number | null = null;
  for (const run of progress.runs) {
    if (run.mode !== mode) continue;
    if (run.assisted === true) {
      assisted = true;
      continue;
    }
    passed = true;
    if (run.seconds !== undefined && (bestSeconds === null || run.seconds < bestSeconds)) bestSeconds = run.seconds;
  }
  const name = MODE_NAME[mode];
  if (passed) {
    return { text: name + (bestSeconds === null ? " passed" : " passed in " + formatDuration(bestSeconds)), tone: "border-ok/40 text-ok" };
  }
  if (progress[mode] !== undefined) return { text: name + " in progress", tone: "border-gold/40 text-gold" };
  if (assisted) return { text: name + " assisted", tone: "border-warn/40 text-warn" };
  return null;
}

/** An output question: how the first check of the last try went. */
function outputStatus(progress: ProblemProgress): { text: string; tone: string } {
  let last = null;
  for (const run of progress.runs) {
    if (run.mode === "output") last = run;
  }
  if (last !== null) {
    const lines = last.max / POINTS_PER_LINE;
    const right = last.points / POINTS_PER_LINE;
    return { text: "Predicted " + right + " of " + lines + " lines", tone: right === lines ? "text-ok" : "text-gold" };
  }
  if (progress.prediction !== undefined && progress.prediction.trim() !== "") {
    return { text: "Prediction in progress", tone: "text-gold" };
  }
  return { text: "Not started", tone: "text-faint" };
}

function ProblemCard({ problem, progress }: { problem: Problem; progress: ProblemProgress | null }) {
  // A written problem is sized in steps, an output question in printed lines.
  const isOutput = problem.kind === "output";
  const stepCount = problem.kind === "output" ? problem.output.length : flattenSteps(problem).length;
  const status = progress === null ? null : isOutput ? outputStatus(progress) : statusOf(progress, stepCount);
  const weak = progress === null ? 0 : progress.weak.length;
  const marks: { text: string; tone: string }[] = [];
  if (progress !== null && !isOutput) {
    for (const mode of ["recall", "exam"] as const) {
      const mark = practiceMark(progress, mode);
      if (mark !== null) marks.push(mark);
    }
  }

  return (
    <li>
      <Link
        href={"/problem/" + problem.id}
        className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-panel p-4 transition-colors hover:border-gold/60 hover:bg-raised"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">{problem.title}</span>
          <DifficultyChip value={problem.difficulty} />
          <TagChip value={problem.tag} />
        </span>
        <span className="text-sm leading-6 text-mut">{problem.statement}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
          <span className="text-faint">
            {stepCount} {isOutput ? "lines of output" : "steps"}
          </span>
          {status !== null && <span className={"font-semibold " + status.tone}>{status.text}</span>}
          {weak > 0 && (
            <span className="font-semibold text-bad">
              {weak} weak {weak === 1 ? "step" : "steps"}
            </span>
          )}
        </span>
        {marks.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {marks.map((mark) => (
              <span key={mark.text} className={"rounded-full border px-2 py-0.5 text-xs font-semibold " + mark.tone}>
                {mark.text}
              </span>
            ))}
          </span>
        )}
      </Link>
    </li>
  );
}

function ProblemList({ progressFor }: { progressFor: ((id: string) => ProblemProgress) | null }) {
  return (
    <div className="mt-8 space-y-8">
      {groups.map((group) => {
        const own = problems.filter((problem) => problem.group === group.id);
        if (own.length === 0) return null;
        return (
          <section key={group.id} aria-labelledby={"group-" + group.id}>
            <h2 id={"group-" + group.id} className="text-xl font-bold">
              {group.title}
            </h2>
            <p className="mt-1 text-sm text-mut">{group.about}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {own.map((problem) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  progress={progressFor === null ? null : progressFor(problem.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** The list without progress, shown until the browser has read localStorage. */
export function HomeFallback() {
  return <ProblemList progressFor={null} />;
}

export default function Home() {
  // Progress is in localStorage, so this part renders in the browser only.
  use(browser("Progress is saved in localStorage."));
  const store = useStore();

  let finished = 0;
  for (const problem of problems) {
    // Finished = Learn done at least once, or Recall or Exam passed without help.
    const runs = (store.problems[problem.id] ?? EMPTY_PROGRESS).runs;
    if (runs.some((run) => run.assisted !== true)) finished++;
  }

  return (
    <>
      <dl className="mt-6 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-line bg-panel px-4 py-3">
          <dt className="text-xs text-mut">Points</dt>
          <dd className="mt-1 text-2xl font-bold text-gold">{store.points}</dd>
        </div>
        <div className="rounded-2xl border border-line bg-panel px-4 py-3">
          <dt className="text-xs text-mut">Problems finished</dt>
          <dd className="mt-1 text-2xl font-bold">
            {finished}
            <span className="text-base text-faint"> / {problems.length}</span>
          </dd>
        </div>
      </dl>
      <ProblemList progressFor={(id) => progressOf(store, id)} />
    </>
  );
}
