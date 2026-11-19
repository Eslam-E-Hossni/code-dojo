"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { browser } from "react-dom";
import type { CodeProblem, TestCase } from "@/data/types";
import { check, flattenSteps, learnerCode, solutionText, type Deps, type TestReport, type Verdict } from "@/lib/checker/check";
import { createJudge } from "@/lib/checker/judge";
import { MAX_MISSES, MAX_POINTS_PER_STEP, sessionPoints, tierFor, tierOfStep } from "@/lib/learn";
import { editorLanguage } from "@/lib/monaco";
import { useRunner, type RunView } from "@/lib/runner/useRunner";
import { buildLocked, indentAfter, indentOf } from "@/lib/session";
import {
  isValidSession,
  NEW_SESSION,
  progressOf,
  updateStore,
  useStore,
  withProgress,
  type Block,
  type LearnSession,
} from "@/lib/store";
import { useAwayCount } from "@/lib/useAwayCount";
import { useRunShortcut } from "@/lib/useRunShortcut";
import { BottomPanel, type TabId } from "./BottomPanel";
import { BUTTON_DANGER, BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import { CoachPanel, hintCost, hintLabel, type Feedback } from "./CoachPanel";
import { AfterFinish, FinishSummary } from "./FinishPanel";
import LearnEditor, { type LearnEditorHandle } from "./LearnEditor";
import { PreviewBox } from "./PreviewBox";
import { AskSections, StarterSection, StatementSection, TryItSection } from "./ProblemInfo";
import { ConsoleView, TestsBadge, TestsView } from "./RunOutput";
import { SayAloud } from "./SayAloud";
import { Section } from "./Section";
import { SolutionPanel } from "./SolutionPanel";
import { StepList } from "./StepList";

const NOT_YET = "Half a function cannot run. The tests start by themselves when a function is finished.";
const NOT_YET_REACT = "Half a component cannot run. The tests start by themselves when a part is finished.";

interface Props {
  problem: CodeProblem;
  next: { href: string; title: string } | null;
}

/** A finished session. The saved one is cleared at the end, so the screen keeps its own copy. */
interface Finished {
  session: LearnSession;
  /** The hidden tests on the whole of the learner's code. Null while they run. */
  tests: TestReport | null;
}

/** What a run says about some of the tests, in the short form the checker uses. */
function reportOf(problem: CodeProblem, view: RunView, wanted: Set<TestCase>): TestReport {
  const report: TestReport = {
    passed: 0,
    total: wanted.size,
    failures: [],
    fatal: view.fatal === null ? null : view.fatal.message,
  };
  for (let i = 0; i < problem.tests.length; i++) {
    const test = problem.tests[i];
    if (!wanted.has(test)) continue;
    const result = view.tests[i];
    if (result.status === "pass") report.passed++;
    else report.failures.push({ name: test.name, message: result.message });
  }
  return report;
}

/**
 * Learn: one step at a time, with the coach, the hints and the smart
 * checker. The editor shows the learner's own code. A line is accepted
 * when it means the same as the reference, whatever its style or names.
 *
 * The hidden tests of a function run when the function is finished, and
 * Run runs them again. Their results are in the Tests and Console tabs.
 *
 * A React problem has a live preview next to the editor. It shows the
 * finished component while the learner writes, so the goal is in sight,
 * and the learner's own code once the last step is done.
 */
export default function LearnMode({ problem, next }: Props) {
  // Progress is in localStorage, so this part renders in the browser only.
  use(browser("Learn progress is saved in localStorage."));

  const steps = useMemo(() => flattenSteps(problem), [problem]);
  const store = useStore();
  const progress = progressOf(store, problem.id);
  const runner = useRunner(problem);

  const [runId, setRunId] = useState(0);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lastAccept, setLastAccept] = useState<{ note: string | null; tests: TestReport | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tab, setTab] = useState<TabId>("say");
  /** The learner's code at the moment the Solution panel was opened. Null = closed. */
  const [solutionFor, setSolutionFor] = useState<string | null>(null);
  const editor = useRef<LearnEditorHandle>(null);

  // What is typed for the current step. If the page is put in the background
  // and comes back, the editor is built again, and this text is put back in it.
  const typed = useRef<string | null>(null);
  const [carried, setCarried] = useState<string | null>(null);
  const editorLife = useAwayCount(() => {
    setCarried(typed.current);
    // A dialog and a question should not be waiting, open, on the page that comes back.
    setSolutionFor(null);
    setConfirmReset(false);
  });

  // A check can take a moment (hidden tests, AI judge). Its answer is dropped
  // when the session was reset, or the screen was left, in the meantime.
  const life = useRef({ check: 0, gone: false });
  useEffect(() => {
    const state = life.current;
    state.gone = false;
    return () => {
      state.gone = true;
    };
  }, []);

  const session =
    finished !== null ? finished.session : isValidSession(progress.learn, steps.length) ? progress.learn : NEW_SESSION;
  const done = finished !== null;
  const misses = done ? 0 : session.misses;
  const names = session.check.names;
  const multiPart = problem.parts.length > 1;
  const isReact = problem.react !== undefined;
  const notYet = isReact ? NOT_YET_REACT : NOT_YET;

  // The preview of a React problem: the goal while writing, the learner's own code at the end.
  const target = useMemo(() => (isReact ? solutionText(problem) : ""), [isReact, problem]);
  const previewCode = finished !== null ? learnerCode(problem, finished.session.check) : target;

  // The step to write now: the first one that is not done.
  const step = useMemo(() => {
    if (done) return null;
    const written = new Set(session.check.done);
    for (const item of steps) {
      if (!written.has(item.index)) return item;
    }
    return null;
  }, [done, session, steps]);

  const locked = useMemo(
    () => buildLocked(problem, session.blocks, step === null ? null : step.partId),
    [problem, session, step],
  );

  /** The functions that are whole: every step of them is done. Only these can run. */
  const whole = useMemo(() => {
    const written = new Set(session.check.done);
    const open = new Set<string>();
    for (const item of steps) {
      if (!written.has(item.index)) open.add(item.partId);
    }
    const ids = new Set<string>();
    const code: string[] = [];
    for (const part of problem.parts) {
      if (open.has(part.id)) continue;
      ids.add(part.id);
      code.push(session.check.code[part.id] ?? "");
    }
    return { ids, code: code.join("\n\n") };
  }, [problem, session, steps]);

  /** The id of the part a test belongs to. */
  const partOf = (test: TestCase) => test.part ?? problem.parts[0].id;

  const { judgeEnabled, apiKey } = store.settings;
  const judgeOn = judgeEnabled && apiKey !== "";
  const judge = useMemo(() => (judgeOn ? createJudge(apiKey) : null), [judgeOn, apiKey]);

  /**
   * The hidden tests for the checker. They go through the page's runner,
   * so the Tests and Console tabs show the same run. The tests of the
   * functions that are already whole run too, to keep the tab complete.
   */
  const runForCheck = async (code: string, tests: TestCase[]): Promise<TestReport> => {
    const wanted = new Set(tests);
    const only: number[] = [];
    for (let i = 0; i < problem.tests.length; i++) {
      const test = problem.tests[i];
      if (wanted.has(test) || whole.ids.has(partOf(test))) only.push(i);
    }
    const summary = await runner.run(code, only);
    return reportOf(problem, summary.view, wanted);
  };

  const recordMiss = () => {
    if (!step || session.misses >= MAX_MISSES) return;
    const count = session.misses + 1;
    const shownNow = count >= MAX_MISSES;
    updateStore((s) =>
      withProgress(s, problem.id, (p) => ({
        ...p,
        learn: { ...session, misses: count },
        // A line that had to be shown is weak: it comes back first next time.
        weak: shownNow && !p.weak.includes(step.key) ? [...p.weak, step.key] : p.weak,
      })),
    );
  };

  const accept = (verdict: Extract<Verdict, { kind: "accept" }>) => {
    const partId = steps[verdict.steps[0]].partId;
    const before = session.check.code[partId] ?? "";
    const after = verdict.state.code[partId] ?? "";
    const block: Block = {
      partId,
      steps: verdict.steps,
      // What this check added to the learner's code.
      text: before === "" ? after : after.slice(before.length + 1),
      tier: tierFor(session.misses),
      via: verdict.via,
    };
    const blocks = [...session.blocks, block];
    const nextSession: LearnSession = { check: verdict.state, misses: 0, blocks };
    const isLast = verdict.state.done.length === steps.length;
    const points = sessionPoints(blocks);

    // A step that was right at the first try is no longer weak.
    const strong = new Set<string>();
    for (const index of block.steps) {
      if (tierOfStep(block, index) === "first") strong.add(steps[index].key);
    }

    updateStore((s) => {
      const updated = withProgress(s, problem.id, (p) => ({
        ...p,
        weak: p.weak.filter((key) => !strong.has(key)),
        learn: isLast ? undefined : nextSession,
        runs: isLast
          ? [
              ...p.runs,
              {
                at: new Date().toISOString(),
                mode: "learn" as const,
                points,
                max: steps.length * MAX_POINTS_PER_STEP,
              },
            ]
          : p.runs,
      }));
      // Points count toward the total only when the problem is finished.
      return isLast ? { ...updated, points: updated.points + points } : updated;
    });

    setLastAccept({ note: verdict.note, tests: verdict.tests });
    setFeedback(null);
    typed.current = null;
    setCarried(null);
    if (!isLast) return;

    // The solution is complete now, so show that it really works.
    setTab("tests");
    // With one part, the check that closed it has already run every test.
    const known = multiPart ? null : verdict.tests;
    setFinished({ session: nextSession, tests: known });
    if (known !== null) return;
    const mine = life.current.check;
    void runner.run(learnerCode(problem, verdict.state)).then((summary) => {
      if (life.current.gone || life.current.check !== mine) return;
      const report = reportOf(problem, summary.view, new Set(problem.tests));
      setFinished((now) => (now !== null && now.session === nextSession ? { ...now, tests: report } : now));
    });
  };

  const submit = async (input: string) => {
    if (!step || busy) return;
    if (input.trim() === "") {
      setFeedback({ kind: "empty" });
      return;
    }

    const mine = ++life.current.check;
    const stillMine = () => !life.current.gone && life.current.check === mine;
    setBusy(true);
    // The fast layers answer at once. Say "checking" only when the tests or the judge are asked.
    const slow = window.setTimeout(() => {
      if (stillMine()) setFeedback({ kind: "checking" });
    }, 250);

    const deps: Deps = judge === null ? { runTests: runForCheck } : { runTests: runForCheck, judge };
    let verdict: Verdict | null = null;
    try {
      verdict = await check(problem, session.check, input, deps);
    } catch {
      verdict = null;
    }
    window.clearTimeout(slow);
    if (!stillMine()) {
      // Dropped because the page was left, not because of a reset: the page can
      // come back as it was, and Check must work again then.
      if (life.current.check === mine) {
        setBusy(false);
        setFeedback(null);
      }
      return;
    }
    setBusy(false);

    if (verdict === null) {
      // The checker itself failed. That is not the learner's miss.
      setFeedback({
        kind: "wrong",
        message: "The checker could not read this line. It was not counted as a try. Look at the line and try again.",
        input,
        range: null,
        tests: null,
        judge: null,
        ownWay: false,
      });
      return;
    }
    if (verdict.kind === "empty") {
      setFeedback({ kind: "empty" });
      return;
    }
    if (verdict.kind === "partial") {
      setFeedback({ kind: "partial", message: verdict.message });
      editor.current?.continueLine(indentAfter(input, step.expected));
      return;
    }
    if (verdict.kind === "accept") {
      accept(verdict);
      return;
    }
    recordMiss();
    // A finished function that fails its tests: the details are in the tabs.
    if (verdict.tests !== null) setTab(verdict.tests.fatal !== null ? "console" : "tests");
    setFeedback({
      kind: "wrong",
      message: verdict.message,
      input,
      range: verdict.range,
      tests: verdict.tests,
      judge: verdict.judge,
      ownWay: verdict.reason === "different",
    });
  };

  const checkLine = () => {
    void submit(editor.current?.getInput() ?? "");
    editor.current?.focus();
  };

  const hint = () => {
    recordMiss();
    setFeedback(null);
    editor.current?.focus();
  };

  const canRun = whole.ids.size > 0;
  const running = runner.view.phase === "running";

  /** Runs the functions that are whole against their hidden tests. */
  const runNow = () => {
    // Before the first function is finished, the tab says why nothing runs yet.
    setTab("tests");
    if (!canRun || busy || running) return;
    const only: number[] = [];
    for (let i = 0; i < problem.tests.length; i++) {
      if (whole.ids.has(partOf(problem.tests[i]))) only.push(i);
    }
    void runner.run(whole.code, only).then((summary) => {
      if (!life.current.gone && summary.fatal) setTab("console");
    });
  };
  useRunShortcut(runNow);

  const reset = () => {
    life.current.check++;
    updateStore((s) => withProgress(s, problem.id, (p) => ({ ...p, learn: undefined })));
    runner.clear();
    typed.current = null;
    setCarried(null);
    setFinished(null);
    setFeedback(null);
    setLastAccept(null);
    setBusy(false);
    setConfirmReset(false);
    setTab("say");
    setRunId((n) => n + 1);
  };

  const openSolution = () => {
    const typing = done ? "" : (editor.current?.getInput() ?? "");
    setSolutionFor(typing.trim() === "" ? locked.text : locked.text === "" ? typing : locked.text + "\n" + typing);
  };

  const hasProgress = session.blocks.length > 0 || misses > 0;
  const lastBlock = session.blocks.length > 0 ? session.blocks[session.blocks.length - 1] : null;
  const previous =
    !done && lastBlock !== null
      ? {
          block: lastBlock,
          steps: lastBlock.steps.map((index) => steps[index]),
          note: lastAccept === null ? null : lastAccept.note,
          tests: lastAccept === null ? null : lastAccept.tests,
        }
      : null;

  const runButton = (
    <button
      type="button"
      onClick={runNow}
      disabled={!canRun || busy || running}
      title={canRun ? "Run the hidden tests on what you finished" : notYet}
      className={BUTTON_PLAIN}
    >
      {running ? "Running…" : "Run"}
      <kbd className="hidden rounded bg-raised px-1.5 py-0.5 font-mono text-[11px] text-mut sm:inline">Ctrl+Enter</kbd>
    </button>
  );

  const editorBox = (
    <div
      className={
        "shrink-0 overflow-hidden rounded-2xl border border-line bg-editor " +
        (isReact ? "h-[340px] xl:h-auto xl:min-h-0" : "h-[260px] sm:h-[360px] lg:h-auto lg:min-h-40 lg:flex-1 lg:shrink")
      }
    >
      <LearnEditor
        key={editorLife}
        ref={editor}
        language={editorLanguage(problem.language)}
        docKey={runId + ":" + session.check.done.length}
        locked={locked.text}
        ranges={locked.ranges}
        prefill={step ? (carried ?? indentOf(step.expected)) : ""}
        done={done}
        mark={feedback?.kind === "wrong" ? feedback.range : null}
        onSubmit={(input) => void submit(input)}
        onRun={runNow}
        onInput={(input) => {
          typed.current = input;
        }}
      />
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
      {/* On a phone the coach and the editor come first, and these sections follow them. */}
      <aside className="order-2 flex min-w-0 flex-col gap-3 lg:sticky lg:top-[4.5rem] lg:order-1 lg:h-[calc(100dvh-5.5rem)] lg:overflow-y-auto">
        <StatementSection problem={problem} />
        <StarterSection problem={problem} />
        <AskSections problem={problem} />
        <TryItSection problem={problem} startClosed />
        <Section fill title={"Steps · " + session.check.done.length + " of " + steps.length}>
          <StepList
            steps={steps}
            current={step === null ? -1 : step.index}
            blocks={session.blocks}
            weak={progress.weak}
            names={names}
            showPartTitles={multiPart}
          />
        </Section>
      </aside>

      <div className="order-1 min-w-0 space-y-3 lg:order-2">
        {/* On a phone the full task is further down, so its one sentence is repeated here. */}
        <p className="px-1 text-sm leading-6 text-mut lg:hidden">{problem.statement}</p>
        {/* On a laptop the coach, the editor and the buttons share one screen. */}
        <div
          className={
            "flex flex-col gap-3 " +
            (isReact ? "xl:h-[calc(100dvh-5.5rem)] xl:min-h-[36rem]" : "lg:h-[calc(100dvh-5.5rem)] lg:min-h-[30rem]")
          }
        >
          <div
            className={
              "shrink-0 " +
              (isReact ? "xl:max-h-[50%] xl:overflow-y-auto xl:rounded-2xl" : "lg:max-h-[58%] lg:overflow-y-auto lg:rounded-2xl")
            }
          >
            {step ? (
              <CoachPanel
                step={step}
                stepCount={steps.length}
                misses={misses}
                sessionPoints={sessionPoints(session.blocks)}
                showPartTitle={multiPart}
                names={names}
                previous={previous}
                feedback={feedback}
              />
            ) : (
              <FinishSummary
                steps={steps}
                blocks={session.blocks}
                names={names}
                tests={finished === null ? null : finished.tests}
              />
            )}
          </div>

          {isReact ? (
            <div className="grid shrink-0 gap-3 xl:min-h-0 xl:flex-1 xl:shrink xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              {editorBox}
              <PreviewBox
                problem={problem}
                code={previewCode}
                caption={
                  done
                    ? "Your own code, running."
                    : "The finished solution, running. This is what we build, line by line."
                }
                className="h-[340px] xl:h-auto xl:min-h-0"
              />
            </div>
          ) : (
            editorBox
          )}

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {step ? (
              <>
                <button type="button" onClick={checkLine} disabled={busy} className={BUTTON_PRIMARY}>
                  Check line
                  <kbd className="rounded bg-bg/20 px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>
                </button>
                <button type="button" onClick={hint} disabled={busy || misses >= MAX_MISSES} className={BUTTON_PLAIN}>
                  {hintLabel(misses)}
                  {misses < MAX_MISSES && <span className="text-xs font-normal text-mut">{hintCost(misses)}</span>}
                </button>
              </>
            ) : (
              <button type="button" onClick={reset} className={BUTTON_PRIMARY}>
                Do it again
              </button>
            )}
            {runButton}
            <button type="button" onClick={openSolution} className={BUTTON_PLAIN}>
              Solution
            </button>

            <span className="ml-auto flex flex-wrap items-center gap-2">
              {step &&
                (confirmReset ? (
                  <>
                    <span className="text-sm text-mut">Start again from step 1?</span>
                    <button type="button" onClick={reset} className={BUTTON_DANGER}>
                      Yes, reset
                    </button>
                    <button type="button" onClick={() => setConfirmReset(false)} className={BUTTON_PLAIN}>
                      No
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => (hasProgress ? setConfirmReset(true) : reset())}
                    className={BUTTON_PLAIN}
                  >
                    Reset
                  </button>
                ))}
              <Link href={next ? next.href : "/"} className={BUTTON_PLAIN}>
                {next ? "Next problem" : "All problems"}
                {next && <span className="text-xs font-normal text-mut">{next.title}</span>}
              </Link>
            </span>
          </div>

          {step && (
            <p className="-mt-1 shrink-0 text-xs leading-5 text-faint">
              Enter at the end of the line checks it. Shift+Enter adds a line, to write several steps before checking.
              {canRun
                ? " Run tests what you finished."
                : isReact
                  ? " Run is ready when a part is finished."
                  : " Run is ready when a function is finished."}
              {judgeOn && " The AI judge is on: a line the checker cannot place is sent to it."}
            </p>
          )}
        </div>

        <BottomPanel
          active={tab}
          onSelect={setTab}
          className="max-h-[28rem]"
          tabs={[
            {
              id: "console",
              label: "Console",
              content: <ConsoleView view={runner.view} idleHint={"Nothing has run yet. " + notYet} freeCode={false} />,
            },
            {
              id: "tests",
              label: "Tests",
              badge: <TestsBadge view={runner.view} total={problem.tests.length} />,
              content: <TestsView problem={problem} view={runner.view} idleHint={notYet} />,
            },
            {
              id: "say",
              label: "Say it out loud",
              content: <SayAloud problem={problem} steps={steps} done={session.check.done} />,
            },
          ]}
        />

        {done && <AfterFinish problem={problem} />}
      </div>

      {solutionFor !== null && (
        <SolutionPanel
          problem={problem}
          myCode={solutionFor}
          assistedNote={null}
          onClose={() => setSolutionFor(null)}
        />
      )}
    </div>
  );
}
