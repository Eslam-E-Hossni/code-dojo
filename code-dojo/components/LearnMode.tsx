"use client";

import Link from "next/link";
import { use, useMemo, useRef, useState } from "react";
import { browser } from "react-dom";
import type { StepProblem } from "@/data/types";
import { checkLine } from "@/lib/check";
import { checkConfig } from "@/lib/config";
import {
  isValidSession,
  MAX_MISSES,
  MAX_POINTS_PER_STEP,
  newSession,
  totalPoints,
  withMiss,
  withPass,
  type StepResult,
} from "@/lib/learn";
import { languageOf } from "@/lib/monaco";
import { withStepResult } from "@/lib/review";
import type { RunnerTest } from "@/lib/runner/protocol";
import { countPassed, useRunner } from "@/lib/runner/useRunner";
import { buildLocked, flattenSteps, indentOf, syntaxOf } from "@/lib/steps";
import { useTestCheck } from "@/lib/testing/useTestCheck";
import { progressOf, updateStore, useStore, withProgress } from "@/lib/store";
import { useRunShortcut } from "@/lib/useRunShortcut";
import { BottomPanel, type PanelTab, type TabId } from "./BottomPanel";
import { BUTTON_DANGER, BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import { CoachPanel, hintCost, hintLabel, type Feedback } from "./CoachPanel";
import { configReference, sideFiles } from "./ConfigExtras";
import DojoEditor, { type DojoEditorHandle, type EditorRange } from "./DojoEditor";
import { AfterFinish, FinishSummary } from "./FinishPanel";
import { PreviewBox } from "./PreviewBox";
import { AskSections, StatementSection } from "./ProblemInfo";
import { RulesBadge, RulesView } from "./RulesView";
import { ConsoleView, TestsBadge, TestsView } from "./RunOutput";
import { Section } from "./Section";
import { StepList } from "./StepList";
import { SubjectTabs } from "./SubjectTabs";
import { TestCheckBadge, TestCheckView } from "./TestCheckView";
import { Walkthrough } from "./Walkthrough";

const FRESH = newSession();
const NO_TESTS: RunnerTest[] = [];

const NOT_YET = "نص دالة مبيشتغلش، فالتشغيل بيبدأ لوحده أول ما تخلّص آخر سطر.";

interface Props {
  problem: StepProblem;
  next: { href: string; title: string } | null;
}

/**
 * Learn: one line at a time, with the coach and the hints.
 * - A code problem runs its hidden tests when the last line is in.
 * - A React problem shows the finished component in a live preview from the
 *   start, so the learner sees what they are building.
 * - A Testing exercise shows the code under test in a second tab. When the
 *   last line is in, the test runs on the correct code and on every buggy
 *   version.
 * - A config file (Dockerfile, YAML) is not run at all. Its rule list is
 *   checked after every finished line, and turns green rule by rule.
 */
export default function LearnMode({ problem, next }: Props) {
  // Progress is in localStorage, so this part renders in the browser only.
  use(browser("Learn progress is saved in localStorage."));

  const steps = useMemo(() => flattenSteps(problem), [problem]);
  const store = useStore();
  const progress = progressOf(store, problem.id);
  const runner = useRunner(problem.kind === "code" ? problem.tests : NO_TESTS);
  const testCheck = useTestCheck(problem.kind === "test" ? problem : null);

  const [runId, setRunId] = useState(0);
  const [finished, setFinished] = useState<StepResult[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [viaAccept, setViaAccept] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // A config file opens on its rule list: watching it turn green is the point.
  const firstTab: TabId = problem.kind === "config" ? "rules" : "say";
  const [tab, setTab] = useState<TabId>(firstTab);
  const editor = useRef<DojoEditorHandle>(null);

  const session = isValidSession(progress.learn, steps.length) ? progress.learn : FRESH;
  const done = finished !== null;
  const index = done ? steps.length : session.index;
  const results = done ? finished : session.results;
  const misses = done ? 0 : session.misses;
  const step = done ? null : steps[index];
  const multiPart = problem.parts.length > 1;
  const isReact = problem.kind === "react";

  const locked = useMemo(() => buildLocked(problem, steps, index), [problem, steps, index]);
  const solution = useMemo(() => buildLocked(problem, steps, steps.length).text, [problem, steps]);
  // A config file: the rules, checked on the lines finished so far.
  const report = useMemo(
    () => (problem.kind === "config" ? checkConfig(problem.rules, locked.text) : null),
    [problem, locked],
  );
  const ranges = useMemo(() => {
    const out: EditorRange[] = [];
    for (const range of locked.ranges) {
      const result = range.stepIndex === null ? undefined : results[range.stepIndex];
      out.push({
        startLine: range.startLine,
        endLine: range.endLine,
        tone: result ? result.tier : "header",
      });
    }
    return out;
  }, [locked, results]);

  /**
   * Code: runs the finished solution against the hidden tests.
   * Testing: runs the finished test on the correct code and the buggy versions.
   */
  const runTests = () => {
    setTab("tests");
    if (problem.kind === "test") void testCheck.run(solution);
    else void runner.run(solution);
  };

  const recordMiss = () => {
    if (!step) return;
    const nextSession = withMiss(session);
    const justRevealed = nextSession.misses >= MAX_MISSES && session.misses < MAX_MISSES;
    updateStore((s) =>
      withProgress(s, problem.id, (p) => ({
        ...p,
        learn: nextSession,
        // A revealed line is weak: it comes back first next time.
        weak: justRevealed && !p.weak.includes(step.key) ? [...p.weak, step.key] : p.weak,
      })),
    );
  };

  const submit = (input: string) => {
    if (!step) return;
    const result = checkLine(input, step, syntaxOf(problem));

    if (!result.ok && result.empty) {
      setFeedback({ kind: "empty" });
      return;
    }

    if (result.ok) {
      const nextSession = withPass(session);
      const earned = nextSession.results[nextSession.results.length - 1];
      const isLast = nextSession.index === steps.length;
      const sessionPoints = totalPoints(nextSession.results);

      updateStore((s) => {
        const updated = withProgress(s, problem.id, (p) => ({
          // Right at the first try: the line is no longer weak. With a hint: it is shaky.
          ...withStepResult(p, step.key, earned.tier),
          learn: isLast ? undefined : nextSession,
          runs: isLast
            ? [
                ...p.runs,
                {
                  at: new Date().toISOString(),
                  mode: "learn" as const,
                  points: sessionPoints,
                  max: steps.length * MAX_POINTS_PER_STEP,
                },
              ]
            : p.runs,
        }));
        // Points count toward the total only when the problem is finished.
        return isLast ? { ...updated, points: updated.points + sessionPoints } : updated;
      });

      if (isLast) {
        setFinished(nextSession.results);
        // The solution is complete now, so show that it really works.
        if (problem.kind === "config") setTab("rules");
        else if (problem.kind !== "react") runTests();
      }
      setViaAccept(result.via === "accept");
      setFeedback(null);
      return;
    }

    if (result.rename) {
      // Right idea, different name: ask for the reference name, no penalty.
      setFeedback({ kind: "rename", renames: result.rename });
      return;
    }

    recordMiss();
    setFeedback({ kind: "wrong", input, diff: result.diff });
  };

  const check = () => {
    submit(editor.current?.getInput() ?? "");
    editor.current?.focus();
  };

  const hint = () => {
    recordMiss();
    setFeedback(null);
    editor.current?.focus();
  };

  const reset = () => {
    updateStore((s) => withProgress(s, problem.id, (p) => ({ ...p, learn: undefined })));
    runner.clear();
    testCheck.clear();
    setFinished(null);
    setFeedback(null);
    setViaAccept(false);
    setConfirmReset(false);
    setTab(firstTab);
    setRunId((n) => n + 1);
  };

  // A React problem has its preview, and a config file is never run.
  const canRun = done && problem.kind !== "react" && problem.kind !== "config";
  useRunShortcut(canRun ? runTests : null);

  const hasProgress = index > 0 || misses > 0;
  const running = runner.view.phase === "running" || testCheck.state.phase === "running";
  const previous =
    !done && index > 0
      ? { step: steps[index - 1], result: results[index - 1], viaAccept }
      : null;

  const tabs: PanelTab[] = [];
  if (problem.kind === "code") {
    tabs.push(
      { id: "console", label: "Console", content: <ConsoleView view={runner.view} idleHint={NOT_YET} /> },
      {
        id: "tests",
        label: "Tests",
        badge: <TestsBadge view={runner.view} total={problem.tests.length} />,
        content: <TestsView problem={problem} view={runner.view} idleHint={NOT_YET} />,
      },
    );
  }
  if (problem.kind === "test") {
    tabs.push({
      id: "tests",
      label: "Tests",
      badge: <TestCheckBadge problem={problem} state={testCheck.state} />,
      content: (
        <TestCheckView
          problem={problem}
          state={testCheck.state}
          idleHint="اختبارك هيتشغّل لوحده أول ما تخلّص آخر سطر: على الكود الصح، وبعده على كل نسخة فيها bug."
        />
      ),
    });
  }
  if (problem.kind === "config") {
    tabs.push({
      id: "rules",
      label: "القواعد",
      badge: <RulesBadge report={report} />,
      content: (
        <>
          <p className="mb-3 text-sm leading-7 text-mut">
            القايمة دي بتتراجع على الملف بعد كل سطر بتخلّصه. القاعدة بتبقى خضرا أول ما الجزء بتاعها يتكتب صح، ودوس
            «ليه؟» علشان تعرف سببها.
          </p>
          <RulesView report={report} idleHint="" />
        </>
      ),
    });
    const reference = configReference(problem);
    if (reference) tabs.push({ id: "reference", label: reference.label, content: reference.content });
  }
  tabs.push({
    id: "say",
    label: "قولها بصوت عالي",
    content: <Walkthrough problem={problem} steps={steps} index={index} />,
  });

  // Testing: 1 for the correct code, and 1 for every buggy version the test caught.
  let asItShould = 0;
  if (testCheck.state.phase === "done") {
    if (testCheck.state.result.correctPassed) asItShould++;
    for (const verdict of testCheck.state.result.buggy) {
      if (verdict.caught) asItShould++;
    }
  }

  const dojoEditor = (
      <DojoEditor
        ref={editor}
        language={languageOf(problem)}
        docKey={runId + ":" + index}
        locked={locked.text}
        ranges={ranges}
        prefill={step ? indentOf(step) : ""}
        expectedLines={step ? step.lines : 1}
        done={done}
        mark={feedback?.kind === "wrong" ? feedback.diff : null}
        onSubmit={submit}
        onRun={canRun ? runTests : undefined}
      />
  );

  // The broken file of "fix this file", or the pipeline to translate: read-only, in a tab.
  const side = problem.kind === "config" ? sideFiles(problem, true) : null;

  const editorBox = (
    <div
      className={
        "shrink-0 overflow-hidden rounded-2xl border border-line bg-editor " +
        (isReact ? "h-[340px] xl:h-auto xl:min-h-0" : "h-[300px] sm:h-[360px] lg:h-auto lg:min-h-40 lg:flex-1 lg:shrink")
      }
    >
      {problem.kind === "test" ? (
        <SubjectTabs testFile={problem.testFile} subject={problem.subject}>
          {dojoEditor}
        </SubjectTabs>
      ) : problem.kind === "config" && side !== null ? (
        <SubjectTabs testFile={"/" + problem.file} subject={side.files} language={languageOf(problem)} notes={side.notes}>
          {dojoEditor}
        </SubjectTabs>
      ) : (
        dojoEditor
      )}
    </div>
  );

  return (
    <div
      dir="ltr"
      className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]"
    >
      <aside
        dir="rtl"
        className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[4.5rem] lg:h-[calc(100dvh-5.5rem)] lg:overflow-y-auto"
      >
        <StatementSection problem={problem} mode="learn" />
        <AskSections problem={problem} />
        <Section
          fill
          title={
            <>
              الخطوات · <bdi dir="ltr">{index}</bdi> من <bdi dir="ltr">{steps.length}</bdi>
            </>
          }
        >
          <StepList
            steps={steps}
            index={index}
            results={results}
            weak={progress.weak}
            showPartTitles={multiPart}
          />
        </Section>
      </aside>

      <div dir="rtl" className="min-w-0 space-y-3">
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
              (isReact ? "xl:max-h-[52%] xl:overflow-y-auto xl:rounded-2xl" : "lg:max-h-[58%] lg:overflow-y-auto lg:rounded-2xl")
            }
          >
            {step ? (
              <CoachPanel
                step={step}
                stepCount={steps.length}
                misses={misses}
                sessionPoints={totalPoints(results)}
                showPartTitle={multiPart}
                previous={previous}
                feedback={feedback}
              />
            ) : (
              <FinishSummary
                steps={steps}
                results={results}
                tests={
                  problem.kind === "code"
                    ? {
                        passed: countPassed(runner.view),
                        total: problem.tests.length,
                        running: runner.view.phase !== "done",
                      }
                    : problem.kind === "test"
                      ? {
                          passed: asItShould,
                          total: problem.buggy.length + 1,
                          running: testCheck.state.phase !== "done",
                        }
                      : report !== null
                        ? { passed: report.passed, total: report.rules.length, running: false }
                        : null
                }
                testsLabel={
                  problem.kind === "test"
                    ? "اختبارك اتشغّل على الكود الصح، وعلى كل نسخة فيها bug:"
                    : problem.kind === "config"
                      ? "الملف اللي كتبته اتراجع على القواعد:"
                      : undefined
                }
                testsWord={problem.kind === "test" ? "زي المفروض" : problem.kind === "config" ? "اتحققوا" : undefined}
              />
            )}
          </div>

          {problem.kind === "react" ? (
            <div className="grid shrink-0 gap-3 xl:min-h-0 xl:flex-1 xl:shrink xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              {editorBox}
              <PreviewBox
                problem={problem}
                code={solution}
                caption="ده الحل النهائي شغال: اللي هنوصله سطر سطر"
                className="h-[340px] xl:h-auto xl:min-h-0"
              />
            </div>
          ) : (
            editorBox
          )}

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {step ? (
              <>
                <button type="button" onClick={check} className={BUTTON_PRIMARY}>
                  راجع السطر
                  <kbd dir="ltr" className="rounded bg-bg/20 px-1.5 py-0.5 font-mono text-[11px]">
                    Enter
                  </kbd>
                </button>
                <button
                  type="button"
                  onClick={hint}
                  disabled={misses >= MAX_MISSES}
                  className={BUTTON_PLAIN}
                >
                  {hintLabel(misses)}
                  {misses < MAX_MISSES && (
                    <span className="text-xs font-normal text-mut">{hintCost(misses)}</span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={reset} className={BUTTON_PRIMARY}>
                  كرّرها تاني
                </button>
                {canRun && (
                  <button type="button" onClick={runTests} disabled={running} className={BUTTON_PLAIN}>
                    {running ? "بيشتغل…" : "شغّل الـ tests"}
                    <kbd dir="ltr" className="hidden rounded bg-raised px-1.5 py-0.5 font-mono text-[11px] text-mut sm:inline">
                      Ctrl+Enter
                    </kbd>
                  </button>
                )}
              </>
            )}

            <span className="ms-auto flex flex-wrap items-center gap-2">
              {step &&
                (confirmReset ? (
                  <>
                    <span className="text-sm text-mut">هتبدأ من الخطوة 1. متأكد؟</span>
                    <button type="button" onClick={reset} className={BUTTON_DANGER}>
                      أيوه، امسح
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className={BUTTON_PLAIN}
                    >
                      لأ
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => (hasProgress ? setConfirmReset(true) : reset())}
                    className={BUTTON_PLAIN}
                  >
                    ابدأ من الأول
                  </button>
                ))}
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
        </div>

        <BottomPanel active={tab} onSelect={setTab} className="max-h-[28rem]" tabs={tabs} />

        {done && <AfterFinish problem={problem} testCode={problem.kind === "test" ? solution : undefined} />}
      </div>
    </div>
  );
}
