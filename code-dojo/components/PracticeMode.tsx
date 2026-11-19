"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { browser } from "react-dom";
import type { StepProblem } from "@/data/types";
import { checkConfig, markersOf, syntaxErrors } from "@/lib/config";
import { languageOf } from "@/lib/monaco";
import { formatDuration, practicePoints, type PracticeMode as Kind } from "@/lib/practice";
import type { RunnerTest } from "@/lib/runner/protocol";
import { countPassed, useRunner } from "@/lib/runner/useRunner";
import { useTestCheck } from "@/lib/testing/useTestCheck";
import { flattenSteps } from "@/lib/steps";
import { progressOf, updateStore, useStore, withProgress, type PracticeDraft } from "@/lib/store";
import { useRunShortcut } from "@/lib/useRunShortcut";
import { BottomPanel, type PanelTab, type TabId } from "./BottomPanel";
import { BUTTON_DANGER, BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import CodeEditor, { type CodeEditorHandle } from "./CodeEditor";
import { configReference, sideFiles } from "./ConfigExtras";
import { AfterFinish } from "./FinishPanel";
import { Mixed } from "./Mixed";
import { PreviewBox } from "./PreviewBox";
import { AskSections, StatementSection } from "./ProblemInfo";
import { SubjectTabs } from "./SubjectTabs";
import { TestCheckBadge, TestCheckView } from "./TestCheckView";
import { DiagnosticsList, RulesBadge, RulesView } from "./RulesView";
import { ConsoleView, TestsBadge, TestsView } from "./RunOutput";
import { Section } from "./Section";
import { Walkthrough } from "./Walkthrough";

const SAVE_DELAY_MS = 400;
/** How long after the last keystroke the preview is rebuilt. */
const PREVIEW_DELAY_MS = 700;
/** A config file: how long after the last keystroke it is read again, for syntax errors and the rule list. */
const RULES_DELAY_MS = 300;
const NO_TESTS: RunnerTest[] = [];

interface Props {
  problem: StepProblem;
  mode: Kind;
  next: { href: string; title: string } | null;
}

interface Finish {
  points: number;
  /** How many times the tests were run, or a config file was handed in. 0 for a React problem. */
  runs: number;
  /** Exam only. */
  seconds: number | null;
}

const COPY: Record<Kind, { title: string; code: string; react: string; test: string; config: string; fix: string }> = {
  recall: {
    title: "وضع الاسترجاع",
    code: "اكتب الحل كله من جمل المدرب. مفيش تلميحات ولا مراجعة سطر بسطر.",
    react: "اكتب الـ component كله من جمل المدرب، وشوفه شغال في الـ preview. مفيش تلميحات.",
    test: "اكتب ملف الاختبار كله من جمل المدرب. الكود اللي بتختبره في التاب التاني. مفيش تلميحات.",
    config: "اكتب الملف كله من جمل المدرب. قايمة القواعد بتتحدّث وإنت بتكتب. مفيش تلميحات ولا مراجعة سطر بسطر.",
    fix: "الملف البايظ قدامك في الـ editor. صلّحه لحد ما كل القواعد تبقى خضرا. القايمة بتتحدّث وإنت بتكتب.",
  },
  exam: {
    title: "وضع الامتحان",
    code: "ورقة بيضا والمطلوب بس، من غير تلميحات ولا جمل المدرب.",
    react: "ورقة بيضا والمطلوب والـ preview بس، من غير تلميحات ولا جمل المدرب.",
    test: "ورقة بيضا والمطلوب والكود اللي بتختبره بس، من غير تلميحات ولا جمل المدرب.",
    config: "ورقة بيضا والمطلوب بس. القواعد مستخبية لحد ما تدوس «راجع الملف».",
    fix: "الملف البايظ والمطلوب بس. القواعد مستخبية لحد ما تدوس «راجع الملف»، فدوّر على المشاكل بعينك الأول.",
  },
};

/**
 * Recall and Exam: the whole solution in a free editor.
 * - A code problem is judged by the hidden tests.
 * - A React problem has no tests. It runs in a live preview, and the
 *   learner ticks off what to try there before calling it done.
 * - In a Testing exercise the learner's own test is judged: it must pass
 *   on the correct code and fail on every buggy version.
 * - A config file is judged by its rules, and nothing is run. In Recall the
 *   rule list follows the typing. In Exam it shows only what the last
 *   hand-in found, because the list itself says what a good file needs.
 *   Syntax errors are different: they are underlined while typing in both
 *   modes, like the syntax errors of code.
 */
export default function PracticeMode({ problem, mode, next }: Props) {
  // Drafts are in localStorage, so this part renders in the browser only.
  use(browser("Drafts and the exam timer are saved in localStorage."));

  const steps = useMemo(() => flattenSteps(problem), [problem]);
  const store = useStore();
  const draft = progressOf(store, problem.id)[mode];
  const runner = useRunner(problem.kind === "code" ? problem.tests : NO_TESTS);
  const check = useTestCheck(problem.kind === "test" ? problem : null);

  const isConfig = problem.kind === "config";
  /** An empty editor, except in "fix this file": there it is the broken file. */
  const blank = problem.kind === "config" ? (problem.starter ?? "") : "";
  /** In "fix this file" the file is complete from the start, so a rule that is not met is a problem. */
  const strict = problem.kind === "config" && problem.starter !== undefined;
  const firstTab: TabId = problem.kind === "react" ? "checks" : isConfig ? "rules" : "tests";

  // What the editor starts with. It changes only on a reset.
  const [attempt, setAttempt] = useState(() => ({ id: 0, code: draft?.code ?? blank }));
  const [finish, setFinish] = useState<Finish | null>(null);
  const [tab, setTab] = useState<TabId>(firstTab);
  // Config files: the editor's text, a moment after the last keystroke.
  const [liveText, setLiveText] = useState(attempt.code);
  // Config files in Exam: the text of the last hand-in. Null = not handed in yet.
  const [handedIn, setHandedIn] = useState<string | null>(null);
  /** The text the rule list is about. Recall follows the typing; Exam waits for a hand-in. */
  const checkedText = !isConfig ? null : mode === "recall" ? liveText : handedIn;
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // React problems: the code the preview is showing, and the ticked checks.
  const [previewCode, setPreviewCode] = useState(attempt.code);
  const [ticked, setTicked] = useState<Record<number, boolean>>({});

  const editor = useRef<CodeEditorHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rulesTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastCode = useRef(attempt.code);

  const report = useMemo(
    () =>
      problem.kind === "config" && checkedText !== null ? checkConfig(problem.rules, checkedText, { strict }) : null,
    [problem, checkedText, strict],
  );
  const liveErrors = useMemo(
    () => (problem.kind === "config" ? syntaxErrors(problem.rules, liveText) : []),
    [problem, liveText],
  );
  const markers = useMemo(() => {
    if (problem.kind !== "config") return undefined;
    // The broken rules are marked while the list is about the text on screen.
    if (report !== null && checkedText === liveText) return markersOf(report);
    return markersOf({ rules: [], diagnostics: liveErrors, passed: 0, ok: false });
  }, [problem, report, checkedText, liveText, liveErrors]);

  const isReact = problem.kind === "react";
  const isExam = mode === "exam";
  const done = finish !== null;
  const startedAt = draft?.startedAt;
  const started = !isExam || startedAt !== undefined || done;
  const running = runner.view.phase === "running" || check.state.phase === "running";
  const copy = COPY[mode];
  const intro =
    problem.kind === "react"
      ? copy.react
      : problem.kind === "test"
        ? copy.test
        : problem.kind === "config"
          ? problem.starter !== undefined
            ? copy.fix
            : copy.config
          : copy.code;
  const multiPart = problem.parts.length > 1;

  // The exam clock ticks once a second while the exam is open.
  useEffect(() => {
    if (!isExam || startedAt === undefined || done) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isExam, startedAt, done]);

  const saveDraft = (change: (current: PracticeDraft) => PracticeDraft) => {
    updateStore((s) =>
      withProgress(s, problem.id, (p) => ({
        ...p,
        [mode]: change(p[mode] ?? { code: blank, runs: 0 }),
      })),
    );
  };

  /** Writes the typed code to storage now, instead of after the delay. */
  const flush = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    if (done) return;
    const code = lastCode.current;
    saveDraft((current) => ({ ...current, code }));
  };

  const onChange = (value: string) => {
    lastCode.current = value;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
    if (isReact) {
      clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(() => setPreviewCode(value), PREVIEW_DELAY_MS);
    }
    if (isConfig) {
      clearTimeout(rulesTimer.current);
      rulesTimer.current = setTimeout(() => setLiveText(value), RULES_DELAY_MS);
    }
  };

  // Leaving the page inside the delay must not lose the last keystrokes.
  const flushLatest = useRef(flush);
  useEffect(() => {
    flushLatest.current = flush;
  });
  useEffect(
    () => () => {
      clearTimeout(previewTimer.current);
      clearTimeout(rulesTimer.current);
      if (saveTimer.current !== undefined) flushLatest.current();
    },
    [],
  );

  const startExam = () => {
    const at = Date.now();
    setNow(at);
    saveDraft((current) => ({ ...current, startedAt: at }));
  };

  const complete = (runs: number) => {
    const points = practicePoints(mode, Math.max(1, runs));
    const seconds = isExam && startedAt !== undefined ? Math.round((Date.now() - startedAt) / 1000) : null;
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    updateStore((s) => {
      const updated = withProgress(s, problem.id, (p) => ({
        ...p,
        [mode]: undefined,
        runs: [
          ...p.runs,
          {
            at: new Date().toISOString(),
            mode,
            points,
            max: practicePoints(mode, 1),
            ...(runs > 0 ? { runs } : {}),
            ...(seconds === null ? {} : { seconds }),
          },
        ],
      }));
      return { ...updated, points: updated.points + points };
    });
    setFinish({ points, runs, seconds });
  };

  const run = async () => {
    if (!started || running) return;
    const code = editor.current?.getValue() ?? lastCode.current;
    lastCode.current = code;

    if (isReact) {
      // The preview follows the typing by itself. Run only skips the wait.
      clearTimeout(previewTimer.current);
      setPreviewCode(code);
      if (!done) flush();
      return;
    }

    clearTimeout(saveTimer.current);

    if (problem.kind === "config") {
      // Nothing is run: the file is handed in and checked against its rules.
      clearTimeout(rulesTimer.current);
      setLiveText(code);
      setHandedIn(code);
      setTab("rules");
      if (done) return;
      const tries = (draft?.runs ?? 0) + 1;
      saveDraft((current) => ({ ...current, code, runs: tries }));
      if (checkConfig(problem.rules, code, { strict }).ok) complete(tries);
      return;
    }

    if (problem.kind === "test") {
      setTab("tests");
      if (done) {
        // Already solved: check again just to look, nothing is counted.
        void check.run(code);
        return;
      }
      const tries = (draft?.runs ?? 0) + 1;
      saveDraft((current) => ({ ...current, code, runs: tries }));
      const result = await check.run(code);
      if (result !== null && result.solved) complete(tries);
      return;
    }

    if (done) {
      // Already passed: run again just to look, nothing is counted.
      setTab("tests");
      void runner.run(code);
      return;
    }

    const runs = (draft?.runs ?? 0) + 1;
    saveDraft((current) => ({ ...current, code, runs }));
    setTab("tests");

    const summary = await runner.run(code);
    if (summary.fatal) setTab("console");
    if (summary.allPassed) complete(runs);
  };

  useRunShortcut(started ? run : null);

  const reset = () => {
    clearTimeout(saveTimer.current);
    clearTimeout(previewTimer.current);
    clearTimeout(rulesTimer.current);
    saveTimer.current = undefined;
    lastCode.current = blank;
    updateStore((s) => withProgress(s, problem.id, (p) => ({ ...p, [mode]: undefined })));
    runner.clear();
    check.clear();
    setFinish(null);
    setConfirmReset(false);
    setTab(firstTab);
    setPreviewCode("");
    setTicked({});
    setLiveText(blank);
    setHandedIn(null);
    setAttempt((current) => ({ id: current.id + 1, code: blank }));
  };

  const elapsed = startedAt === undefined ? 0 : Math.max(0, Math.round((now - startedAt) / 1000));
  const hasWork =
    (draft?.code ?? blank).trim() !== blank.trim() || (draft?.runs ?? 0) > 0 || startedAt !== undefined;
  const passed = countPassed(runner.view);
  const nextHref = next ? next.href : "/";

  const checks = problem.kind === "react" ? problem.checks : [];
  let tickedCount = 0;
  for (let i = 0; i < checks.length; i++) {
    if (ticked[i]) tickedCount++;
  }
  const allTicked = checks.length > 0 && tickedCount === checks.length;

  const tabs: PanelTab[] = [];
  if (problem.kind === "code") {
    tabs.push(
      {
        id: "tests",
        label: "Tests",
        badge: <TestsBadge view={runner.view} total={problem.tests.length} />,
        content: <TestsView problem={problem} view={runner.view} idleHint="اكتب الحل ودوس Run." />,
      },
      {
        id: "console",
        label: "Console",
        content: (
          <ConsoleView
            view={runner.view}
            idleHint="أي حاجة الكود بتاعك يطبعها بـ console.log هتظهر هنا لما تدوس Run."
          />
        ),
      },
    );
  } else if (problem.kind === "test") {
    tabs.push({
      id: "tests",
      label: "Tests",
      badge: <TestCheckBadge problem={problem} state={check.state} />,
      content: (
        <TestCheckView
          problem={problem}
          state={check.state}
          idleHint="اكتب الاختبار ودوس Run. هيتشغّل على الكود الصح، وبعده على كل نسخة فيها bug."
        />
      ),
    });
  } else if (problem.kind === "config") {
    tabs.push({
      id: "rules",
      label: "القواعد",
      badge: <RulesBadge report={report} />,
      content: (
        <>
          {report !== null && isExam && !done && (
            <p className="mb-3 text-xs leading-5 text-mut">
              دي نتيجة آخر مراجعة. عدّل الملف ودوس «راجع الملف» تاني علشان القايمة تتحدّث.
            </p>
          )}
          {/* Before the first hand-in the rules are hidden, but a file that cannot be read is said at once. */}
          {report === null && liveErrors.length > 0 && (
            <div className="mb-3">
              <DiagnosticsList diagnostics={liveErrors} />
            </div>
          )}
          <RulesView
            report={report}
            idleHint={
              blank === ""
                ? "القواعد هتظهر هنا بعد أول مراجعة. اكتب الملف، راجعه بعينك، وبعدين دوس «راجع الملف»."
                : "القواعد هتظهر هنا بعد أول مراجعة. صلّح اللي شايفه غلط في الملف، وبعدين دوس «راجع الملف»."
            }
          />
        </>
      ),
    });
    // The reference card is not the answer, but in Exam it waits until the end.
    const reference = mode === "recall" || done ? configReference(problem) : null;
    if (reference) tabs.push({ id: "reference", label: reference.label, content: reference.content });
  } else {
    tabs.push({
      id: "checks",
      label: "جرّب بنفسك",
      badge: (
        <bdi
          dir="ltr"
          className={
            "rounded-full px-1.5 text-[11px] font-semibold " +
            (allTicked ? "bg-ok/15 text-ok" : "bg-raised text-mut")
          }
        >
          {tickedCount}/{checks.length}
        </bdi>
      ),
      content: (
        <div>
          <p className="text-sm leading-7 text-mut">
            مفيش tests هنا. جرّب كل نقطة من دول في الـ preview، وعلّم عليها لما تتأكد إنها شغالة.
          </p>
          <ul className="mt-3 space-y-1.5">
            {checks.map((check, i) => (
              <li key={check}>
                <label
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 " +
                    (ticked[i] ? "border-ok/40 bg-ok/10" : "border-line bg-raised")
                  }
                >
                  <input
                    type="checkbox"
                    checked={ticked[i] === true}
                    disabled={!started || done}
                    onChange={(event) => setTicked({ ...ticked, [i]: event.target.checked })}
                    className="mt-1.5 size-4 shrink-0 accent-ok"
                  />
                  <span dir="ltr" lang="en" className="ltr min-w-0 flex-1 text-sm leading-6">
                    {check}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!done && (
            <button
              type="button"
              onClick={() => complete(0)}
              disabled={!started || !allTicked}
              className={BUTTON_PRIMARY + " mt-3"}
            >
              خلصت، كله شغال
            </button>
          )}
        </div>
      ),
    });
  }
  if (done) {
    // The English walkthrough would be a hint, so it shows only after finishing.
    tabs.push({
      id: "say",
      label: "قولها بصوت عالي",
      content: <Walkthrough problem={problem} steps={steps} index={steps.length} />,
    });
  }

  const freeEditor = (
    <CodeEditor
      key={attempt.id}
      ref={editor}
      language={languageOf(problem)}
      initialValue={attempt.code}
      readOnly={done}
      onChange={onChange}
      onRun={run}
      markers={markers}
    />
  );

  // The pipeline to translate: read-only, in a tab next to the editor.
  const side = problem.kind === "config" ? sideFiles(problem, false) : null;

  const editorBox = (
    <div
      className={
        "shrink-0 overflow-hidden rounded-2xl border border-line bg-editor " +
        (isReact ? "h-[340px] xl:h-auto xl:min-h-0" : "h-[320px] sm:h-[380px] lg:h-auto lg:min-h-48 lg:flex-1 lg:shrink")
      }
    >
      {started ? (
        problem.kind === "test" ? (
          <SubjectTabs testFile={problem.testFile} subject={problem.subject}>
            {freeEditor}
          </SubjectTabs>
        ) : problem.kind === "config" && side !== null ? (
          <SubjectTabs testFile={"/" + problem.file} subject={side.files} language={languageOf(problem)} notes={side.notes}>
            {freeEditor}
          </SubjectTabs>
        ) : (
          freeEditor
        )
      ) : (
        <p className="grid h-full place-items-center px-6 text-center text-sm leading-7 text-mut">
          {blank === "" ? "الـ editor هيفتح فاضي لما تبدأ." : "الملف البايظ هيفتح هنا لما تبدأ."}
        </p>
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
        <StatementSection problem={problem} mode={mode} />
        {mode === "recall" && (
          <Section
            fill
            openOnMobile
            title={
              <>
                جمل المدرب · <bdi dir="ltr">{steps.length}</bdi>
              </>
            }
          >
            <ol className="max-h-80 space-y-1.5 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {steps.map((step) => (
                <li key={step.key}>
                  {multiPart && step.firstOfPart && (
                    <p dir="ltr" lang="en" className="ltr px-1 pb-1 pt-2 text-xs font-semibold text-gold">
                      {step.partTitle}
                    </p>
                  )}
                  <div className="flex items-start gap-2.5 px-1">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line text-xs font-semibold text-mut">
                      {step.index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-6">
                      <Mixed text={step.coach} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}
        {/* Folded in Recall, so the coach sentences get the room. Not in Exam at all. */}
        {mode === "recall" && <AskSections problem={problem} startClosed />}
      </aside>

      <div dir="rtl" className="min-w-0 space-y-3">
        {/* On a laptop everything needed to write and run shares one screen. */}
        <div
          className={
            "flex flex-col gap-3 " +
            (isReact ? "xl:h-[calc(100dvh-5.5rem)] xl:min-h-[38rem]" : "lg:h-[calc(100dvh-5.5rem)] lg:min-h-[34rem]")
          }
        >
          <section
            aria-label={copy.title}
            className={"shrink-0 rounded-2xl border bg-panel p-4 " + (done ? "border-ok/40" : "border-line")}
          >
            {finish ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ok">
                    {isReact
                      ? "خلصت الـ component يا إسلام"
                      : problem.kind === "test"
                        ? "اختبارك اتقبل يا إسلام"
                        : isConfig
                          ? "الملف عدّى كل القواعد يا إسلام"
                          : "عدّيت كل الـ tests يا إسلام"}
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-mut">
                    {isReact ? (
                      "جرّبت كل النقط بإيدك. قارن الكود بتاعك بالحل المرجعي في وضع التعلّم لو عايز تتأكد."
                    ) : problem.kind === "test" && finish.runs === 1 ? (
                      "من أول Run: نجح على الكود الصح، وفشل على كل نسخة فيها bug."
                    ) : isConfig && finish.runs === 1 ? (
                      "من أول مراجعة: كل القواعد خضرا."
                    ) : isConfig ? (
                      <>
                        بعد <bdi dir="ltr">{finish.runs}</bdi> مرات مراجعة. جرّب المرة الجاية تراجع الملف بعينك سطر سطر
                        قبل ما تدوس.
                      </>
                    ) : finish.runs === 1 ? (
                      "من أول Run. ده اللي بيحصل في المقابلة: مفيش زرار تجربة."
                    ) : (
                      <>
                        بعد <bdi dir="ltr">{finish.runs}</bdi> مرات Run. جرّب المرة الجاية تراجع الكود بعينك قبل ما
                        تشغّله.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {finish.seconds !== null && (
                    <p className="text-center">
                      <bdi dir="ltr" className="block font-mono text-2xl font-bold">
                        {formatDuration(finish.seconds)}
                      </bdi>
                      <span className="text-xs text-mut">الوقت</span>
                    </p>
                  )}
                  <p className="text-center">
                    <bdi dir="ltr" className="block text-2xl font-bold text-gold">
                      +{finish.points}
                    </bdi>
                    <span className="text-xs text-mut">نقطة</span>
                  </p>
                </div>
              </div>
            ) : !started ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{copy.title}</h2>
                  <p className="mt-1 text-sm leading-7 text-mut">
                    {intro} التايمر بيبدأ أول ما تدوس الزرار، وبيقف لما{" "}
                    {isReact
                      ? "تعلّم على كل النقط."
                      : problem.kind === "test"
                        ? "اختبارك يتقبل."
                        : isConfig
                          ? "الملف يعدّي كل القواعد."
                          : "كل الـ tests تعدّي."}
                  </p>
                </div>
                <button type="button" onClick={startExam} className={BUTTON_PRIMARY}>
                  ابدأ الامتحان
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <h2 className="text-base font-bold">{copy.title}</h2>
                  <p className="mt-0.5 text-sm leading-6 text-mut">{intro}</p>
                </div>
                <div className="flex items-center gap-4">
                  {(draft?.runs ?? 0) > 0 && (
                    <p className="text-sm text-mut">
                      {isConfig ? "مرات المراجعة" : "مرات التشغيل"}: <bdi dir="ltr">{draft?.runs}</bdi>
                    </p>
                  )}
                  {isExam && (
                    <p
                      role="timer"
                      aria-label="الوقت"
                      dir="ltr"
                      className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-xl font-bold text-gold"
                    >
                      {formatDuration(elapsed)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {problem.kind === "react" ? (
            <div className="grid shrink-0 gap-3 xl:min-h-0 xl:flex-1 xl:shrink xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              {editorBox}
              <PreviewBox
                problem={problem}
                code={started ? previewCode : ""}
                caption="الكود بتاعك، بيتحدّث وإنت بتكتب"
                emptyHint={
                  started
                    ? "ابدأ اكتب، والمكوّن هيظهر هنا أول ما الكود يكمل. ولو فيه خطأ هيظهر هنا برضه."
                    : "الـ preview هيشتغل أول ما تبدأ."
                }
                className="h-[340px] xl:h-auto xl:min-h-0"
              />
            </div>
          ) : (
            editorBox
          )}

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={run} disabled={!started || running} className={BUTTON_PRIMARY}>
              {running ? "بيشتغل…" : isConfig ? "راجع الملف" : "Run"}
              {/* A phone has no Ctrl key. */}
              <kbd dir="ltr" className="hidden rounded bg-bg/20 px-1.5 py-0.5 font-mono text-[11px] sm:inline">
                Ctrl+Enter
              </kbd>
            </button>
            {problem.kind === "code" && runner.view.phase === "done" && !done && (
              <span className="text-sm text-mut">
                <bdi dir="ltr">
                  {passed} / {problem.tests.length}
                </bdi>{" "}
                عدّوا
              </span>
            )}

            <span className="ms-auto flex flex-wrap items-center gap-2">
              {confirmReset ? (
                <>
                  <span className="text-sm text-mut">هيتمسح اللي كتبته. متأكد؟</span>
                  <button type="button" onClick={reset} className={BUTTON_DANGER}>
                    أيوه، امسح
                  </button>
                  <button type="button" onClick={() => setConfirmReset(false)} className={BUTTON_PLAIN}>
                    لأ
                  </button>
                </>
              ) : done ? (
                <button type="button" onClick={reset} className={BUTTON_PLAIN}>
                  كرّرها تاني
                </button>
              ) : (
                started && (
                  <button
                    type="button"
                    onClick={() => (hasWork ? setConfirmReset(true) : reset())}
                    className={BUTTON_PLAIN}
                  >
                    ابدأ من الأول
                  </button>
                )
              )}
              <Link href={nextHref} className={BUTTON_PLAIN}>
                {next ? "المسألة اللي بعدها" : "كل المسائل"}
                {next && (
                  <bdi dir="ltr" className="text-xs font-normal text-mut">
                    {next.title}
                  </bdi>
                )}
              </Link>
            </span>
          </div>

          <BottomPanel
            tabs={tabs}
            active={tab}
            onSelect={setTab}
            className={
              "max-h-96 shrink-0 " +
              (isReact ? "xl:h-[30%] xl:max-h-none xl:min-h-44" : "lg:h-[34%] lg:max-h-none lg:min-h-44")
            }
          />
        </div>

        {done && (
          <AfterFinish problem={problem} testCode={check.state.phase === "done" ? check.state.code : undefined} />
        )}
      </div>
    </div>
  );
}
