"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { browser, createPortal } from "react-dom";
import type { CodeProblem } from "@/data/types";
import { flattenSteps } from "@/lib/checker/check";
import { editorLanguage } from "@/lib/monaco";
import { bannedIn, formatDuration, practicePoints, type BannedFinding, type PracticeMode as Kind } from "@/lib/practice";
import { useRunner } from "@/lib/runner/useRunner";
import { progressOf, updateStore, useStore, withProgress, type PracticeDraft } from "@/lib/store";
import { useAwayCount } from "@/lib/useAwayCount";
import { useRunShortcut } from "@/lib/useRunShortcut";
import { BottomPanel, type PanelTab, type TabId } from "./BottomPanel";
import { BUTTON_DANGER, BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import CodeEditor, { type CodeEditorHandle, type EditorMarker } from "./CodeEditor";
import { useExamClockSlot } from "./ExamClock";
import { AfterFinish } from "./FinishPanel";
import { PreviewBox } from "./PreviewBox";
import { AskSections, StatementSection, TryItSection } from "./ProblemInfo";
import { ConsoleView, TestsBadge, TestsView } from "./RunOutput";
import { SayAloud } from "./SayAloud";
import { Section } from "./Section";
import { SolutionPanel } from "./SolutionPanel";
import { Text } from "./Text";

const SAVE_DELAY_MS = 400;
/** How long after the last keystroke the live preview of a React problem is built again. */
const PREVIEW_DELAY_MS = 600;
const NO_MARKERS: EditorMarker[] = [];

interface Props {
  problem: CodeProblem;
  mode: Kind;
  next: { href: string; title: string } | null;
}

interface Finish {
  points: number;
  /** How many times the tests were run. */
  runs: number;
  /** Exam only. */
  seconds: number | null;
  assisted: boolean;
}

const TITLE: Record<Kind, string> = { recall: "Recall", exam: "Exam" };

/** What the card above the editor says about the mode. */
function introOf(mode: Kind, isReact: boolean, hasStarter: boolean): string {
  if (hasStarter) {
    return mode === "recall"
      ? "The component with the bugs is in the editor. Fix it with the coach sentences as your guide. No hints, and no check line by line. Then run the hidden tests."
      : "The component with the bugs is in the editor. Fix everything that is wrong with it. No hints and no coach sentences.";
  }
  if (mode === "recall") {
    return isReact
      ? "Write the whole solution from the coach sentences, and watch it in the preview. No hints, and no check line by line. Then run the hidden tests."
      : "Write the whole solution from the coach sentences. No hints, and no check line by line. Then run the hidden tests.";
  }
  return isReact
    ? "A blank editor, the task and the preview. No hints and no coach sentences."
    : "A blank editor and the task. No hints and no coach sentences.";
}

const ASSISTED_NOW =
  "This attempt is now marked as assisted. Its score is saved separately, and the problem does not count as mastered by it.";

function AssistedBadge() {
  return (
    <span
      title="The Solution panel was opened in this attempt"
      className="rounded-full border border-warn/50 bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn"
    >
      assisted
    </span>
  );
}

function Clock({ seconds, running, className = "" }: { seconds: number; running: boolean; className?: string }) {
  return (
    <span
      role="timer"
      aria-label="Time"
      className={
        "rounded-xl border px-3 py-1 font-mono text-lg font-bold " +
        (running ? "border-gold/40 bg-gold/10 text-gold" : "border-line bg-raised text-ink") +
        " " +
        className
      }
    >
      {formatDuration(seconds)}
    </span>
  );
}

/**
 * Recall and Exam: the whole solution in a free editor, judged by the
 * hidden tests.
 * - Recall shows the coach sentences, and nothing else of the solution.
 * - Exam shows the task only, with a timer.
 * A banned pattern (map, forEach and the like, in a problem that asks for
 * plain loops) is refused with its reason even when every test passes. So
 * is a risky pattern in a React problem: a list without keys, an interval
 * that is never cleared, state changed in place.
 *
 * A React problem has a live preview of the learner's code next to the
 * editor. A "find the bugs" exercise starts from the code with the bugs.
 */
export default function PracticeMode({ problem, mode, next }: Props) {
  // Drafts and the exam timer are in localStorage, so this part renders in the browser only.
  use(browser("Drafts and the exam timer are saved in localStorage."));

  const steps = useMemo(() => flattenSteps(problem), [problem]);
  const store = useStore();
  const draft = progressOf(store, problem.id)[mode];
  const runner = useRunner(problem);
  const headerSlot = useExamClockSlot();
  const isReact = problem.react !== undefined;
  /** A "find the bugs" exercise starts from this code. Empty for every other problem. */
  const starter = problem.react?.starter ?? "";

  // What the editor starts with. It changes only on a reset.
  const [attempt, setAttempt] = useState(() => ({ id: 0, code: draft?.code ?? starter }));
  /** React problems: the code the preview is showing. It follows the typing, a little behind. */
  const [previewCode, setPreviewCode] = useState(attempt.code);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [tab, setTab] = useState<TabId>("tests");
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  /** What the last run found that the tests do not see. */
  const [banned, setBanned] = useState<BannedFinding | null>(null);
  /** The lines the last run pointed at. They go away with the next keystroke. */
  const [markers, setMarkers] = useState<EditorMarker[]>(NO_MARKERS);
  /** Said when Run is pressed on an empty editor. */
  const [emptyRun, setEmptyRun] = useState(false);
  /** The learner's code at the moment the Solution panel was opened. Null = closed. */
  const [solutionFor, setSolutionFor] = useState<string | null>(null);

  const editor = useRef<CodeEditorHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastCode = useRef(attempt.code);
  // If the page is put in the background and comes back, the editor is built
  // again: a new attempt id is its key, and it starts with the text typed so far.
  useAwayCount(() => {
    setAttempt((current) => ({ id: current.id + 1, code: lastCode.current }));
    // A dialog and a question should not be waiting, open, on the page that comes back.
    setSolutionFor(null);
    setConfirmReset(false);
  });

  const life = useRef({ gone: false });
  useEffect(() => {
    const state = life.current;
    state.gone = false;
    return () => {
      state.gone = true;
    };
  }, []);

  const isExam = mode === "exam";
  const done = finish !== null;
  const startedAt = draft?.startedAt;
  const started = !isExam || startedAt !== undefined || done;
  const running = runner.view.phase === "running";
  const assisted = finish !== null ? finish.assisted : draft?.assisted === true;
  const title = TITLE[mode];
  const intro = introOf(mode, isReact, starter !== "");
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
        [mode]: change(p[mode] ?? { code: "", runs: 0 }),
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
    // The marks are about the code that was run, not about the new text.
    if (markers.length > 0) setMarkers(NO_MARKERS);
    if (emptyRun) setEmptyRun(false);
  };

  // Leaving the page inside the delay must not lose the last keystrokes.
  const flushLatest = useRef(flush);
  useEffect(() => {
    flushLatest.current = flush;
  });
  useEffect(
    () => () => {
      if (saveTimer.current !== undefined) flushLatest.current();
      clearTimeout(previewTimer.current);
    },
    [],
  );

  const startExam = () => {
    const at = Date.now();
    setNow(at);
    saveDraft((current) => ({ ...current, startedAt: at }));
    window.setTimeout(() => editor.current?.focus(), 0);
  };

  const complete = (runs: number) => {
    const points = practicePoints(mode, runs);
    const seconds = isExam && startedAt !== undefined ? Math.round((Date.now() - startedAt) / 1000) : null;
    const wasAssisted = draft?.assisted === true;
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
            runs,
            ...(seconds === null ? {} : { seconds }),
            ...(wasAssisted ? { assisted: true } : {}),
          },
        ],
      }));
      // An assisted score is kept on the attempt only.
      return wasAssisted ? updated : { ...updated, points: updated.points + points };
    });
    setFinish({ points, runs, seconds, assisted: wasAssisted });
  };

  const run = async () => {
    if (!started || running) return;
    const code = editor.current?.getValue() ?? lastCode.current;
    lastCode.current = code;
    setTab("tests");

    if (code.trim() === "") {
      // Nothing to run. It does not count as a run.
      setEmptyRun(true);
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    // The preview follows the typing by itself. Run only skips the wait.
    clearTimeout(previewTimer.current);
    setPreviewCode(code);

    const found = bannedIn(problem, code);
    setBanned(found);

    // After the finish a run is only to look: nothing is counted.
    const runs = done ? 0 : (draft?.runs ?? 0) + 1;
    if (!done) saveDraft((current) => ({ ...current, code, runs }));

    const summary = await runner.run(code);
    if (life.current.gone) return;

    const marks: EditorMarker[] = [];
    const fatal = summary.view.fatal;
    if (fatal !== null && fatal.line !== null) marks.push({ line: fatal.line, message: fatal.message });
    if (found !== null) marks.push(found);
    setMarkers(marks.length === 0 ? NO_MARKERS : marks);

    if (summary.fatal) setTab("console");
    if (!done && summary.allPassed && found === null) complete(runs);
  };

  useRunShortcut(started ? () => void run() : null);

  const reset = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    clearTimeout(previewTimer.current);
    lastCode.current = starter;
    setPreviewCode(starter);
    updateStore((s) => withProgress(s, problem.id, (p) => ({ ...p, [mode]: undefined })));
    runner.clear();
    setFinish(null);
    setConfirmReset(false);
    setTab("tests");
    setBanned(null);
    setMarkers(NO_MARKERS);
    setEmptyRun(false);
    setAttempt((current) => ({ id: current.id + 1, code: starter }));
  };

  const openSolution = () => {
    const code = started ? (editor.current?.getValue() ?? lastCode.current) : lastCode.current;
    // Opening it is always allowed. During an attempt it marks the attempt.
    if (!done && draft?.assisted !== true) saveDraft((current) => ({ ...current, code, assisted: true }));
    setSolutionFor(code);
  };

  const elapsed = startedAt === undefined ? 0 : Math.max(0, Math.round((now - startedAt) / 1000));
  const shownSeconds = finish !== null && finish.seconds !== null ? finish.seconds : elapsed;
  const clockRunning = isExam && startedAt !== undefined && !done;
  const hasWork = (draft?.code ?? "").trim() !== "" || (draft?.runs ?? 0) > 0 || startedAt !== undefined || assisted;

  const idleHint =
    "Write the solution and press Run. You see pass or fail for each test" + (isExam ? ", and the time." : ".");

  const tabs: PanelTab[] = [
    {
      id: "tests",
      label: "Tests",
      badge: <TestsBadge view={runner.view} total={problem.tests.length} />,
      content: (
        <>
          {emptyRun && (
            <p role="status" className="mb-3 text-sm leading-6 text-warn">
              The editor is empty, so there is nothing to run. This did not count as a run.
            </p>
          )}
          <TestsView problem={problem} view={runner.view} idleHint={idleHint} />
        </>
      ),
    },
    {
      id: "console",
      label: "Console",
      content: (
        <ConsoleView
          view={runner.view}
          freeCode
          idleHint="What your code prints with console.log, console.warn or console.error shows up here when you press Run. Errors show up here too."
        />
      ),
    },
  ];
  if (done) {
    // The walkthrough would be a hint, so it shows only after the finish.
    tabs.push({
      id: "say",
      label: "Say it out loud",
      content: <SayAloud problem={problem} steps={steps} done={steps.map((step) => step.index)} />,
    });
  }

  const editorBox = (
    <div
      className={
        "shrink-0 overflow-hidden rounded-2xl border border-line bg-editor " +
        (isReact ? "h-[340px] xl:h-auto xl:min-h-0" : "h-[300px] sm:h-[380px] lg:h-auto lg:min-h-48 lg:flex-1 lg:shrink")
      }
    >
      {started ? (
        <CodeEditor
          key={attempt.id}
          ref={editor}
          language={editorLanguage(problem.language)}
          initialValue={attempt.code}
          readOnly={done}
          onChange={onChange}
          onRun={() => void run()}
          markers={markers}
        />
      ) : (
        <p className="grid h-full place-items-center px-6 text-center text-sm leading-7 text-mut">
          {starter === "" ? "The editor opens empty when you start." : "The component to review opens here when you start."}
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
      {/* The exam timer also sits in the page header, where the header stays in view. */}
      {isExam && headerSlot !== null && (started || done) && createPortal(<Clock seconds={shownSeconds} running={clockRunning} />, headerSlot)}

      {/* On a phone the editor comes first, and these sections follow it. */}
      <aside className="order-2 flex min-w-0 flex-col gap-3 lg:sticky lg:top-[4.5rem] lg:order-1 lg:h-[calc(100dvh-5.5rem)] lg:overflow-y-auto">
        <StatementSection problem={problem} />
        {mode === "recall" && (
          <Section fill openOnMobile title={"Coach sentences · " + steps.length}>
            <ol className="max-h-96 space-y-1.5 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {steps.map((step) => (
                <li key={step.key}>
                  {multiPart && step.firstOfPart && (
                    <p className="px-1 pb-1 pt-2 text-xs font-semibold text-gold">{step.partTitle}</p>
                  )}
                  <div className="flex items-start gap-2.5 px-1">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line text-xs font-semibold text-mut">
                      {step.index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-6">
                      <Text text={step.coach} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}
        {/* Folded in Recall, so the coach sentences get the room. Not in Exam at all. */}
        {mode === "recall" && <AskSections problem={problem} startClosed />}
        <TryItSection problem={problem} startClosed={mode === "recall"} />
      </aside>

      <div className="order-1 min-w-0 space-y-3 lg:order-2">
        {/* On a phone the full task is further down, so its one sentence is repeated here. */}
        <p className="px-1 text-sm leading-6 text-mut lg:hidden">{problem.statement}</p>
        {/* On a laptop everything needed to write and run shares one screen. */}
        <div
          className={
            "flex flex-col gap-3 " +
            (isReact ? "xl:h-[calc(100dvh-5.5rem)] xl:min-h-[38rem]" : "lg:h-[calc(100dvh-5.5rem)] lg:min-h-[34rem]")
          }
        >
          <section
            aria-label={title}
            className={"shrink-0 rounded-2xl border bg-panel p-4 " + (done ? "border-ok/40" : "border-line")}
          >
            {finish ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-ok">
                    Every test passes
                    {finish.assisted && <AssistedBadge />}
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-mut">
                    {finish.runs === 1
                      ? "At the first run. That is how an interview goes: there is no test button."
                      : "After " + finish.runs + " runs. Next time, read your code line by line before you run it."}
                    {finish.assisted &&
                      " This attempt was assisted, so its points are not added to your total, and the problem does not count as mastered by it."}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {finish.seconds !== null && (
                    <p className="text-center">
                      <span className="block font-mono text-2xl font-bold">{formatDuration(finish.seconds)}</span>
                      <span className="text-xs text-mut">time</span>
                    </p>
                  )}
                  <p className="text-center">
                    <span className={"block text-2xl font-bold " + (finish.assisted ? "text-mut" : "text-gold")}>
                      {finish.assisted ? finish.points : "+" + finish.points}
                    </span>
                    <span className="text-xs text-mut">{finish.assisted ? "points, assisted" : "points"}</span>
                  </p>
                </div>
              </div>
            ) : !started ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    {title}
                    {assisted && <AssistedBadge />}
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-mut">
                    {intro} The timer starts when you press the button, and stops when every test passes.
                  </p>
                </div>
                <button type="button" onClick={startExam} className={BUTTON_PRIMARY}>
                  Start the exam
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-base font-bold">
                    {title}
                    {assisted && <AssistedBadge />}
                  </h2>
                  <p className="mt-0.5 text-sm leading-6 text-mut">{intro}</p>
                </div>
                <div className="flex items-center gap-4">
                  {(draft?.runs ?? 0) > 0 && <p className="text-sm text-mut">Runs: {draft?.runs}</p>}
                  {/* On a phone the header scrolls away, so the timer is repeated here. */}
                  {isExam && <Clock seconds={elapsed} running={clockRunning} className="sm:hidden" />}
                </div>
              </div>
            )}
          </section>

          {banned !== null && (
            <div role="alert" className="shrink-0 rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3">
              <p className="text-[15px] font-medium leading-7 text-bad">
                <Text text={banned.message} />
              </p>
              <p className="mt-1 text-sm leading-6 text-mut">
                Line {banned.line}. The solution is not accepted with it, even when every test passes.{" "}
                {problem.plainLoops ? "Write the loop by hand and run again." : "Fix it and run again."}
              </p>
            </div>
          )}

          {isReact ? (
            <div className="grid shrink-0 gap-3 xl:min-h-0 xl:flex-1 xl:shrink xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              {editorBox}
              <PreviewBox
                problem={problem}
                code={started ? previewCode : ""}
                caption="Your code. It follows what you type."
                emptyHint={
                  started
                    ? "Start typing. The component shows up here when the code is complete. An error shows up here too."
                    : "The preview starts when you start the exam."
                }
                className="h-[340px] xl:h-auto xl:min-h-0"
              />
            </div>
          ) : (
            editorBox
          )}

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {done ? (
              <button type="button" onClick={reset} className={BUTTON_PRIMARY}>
                Try again
              </button>
            ) : (
              <button type="button" onClick={() => void run()} disabled={!started || running} className={BUTTON_PRIMARY}>
                {running ? "Running…" : "Run"}
                <kbd className="hidden rounded bg-bg/20 px-1.5 py-0.5 font-mono text-[11px] sm:inline">Ctrl+Enter</kbd>
              </button>
            )}
            {done && (
              <button type="button" onClick={() => void run()} disabled={running} className={BUTTON_PLAIN}>
                {running ? "Running…" : "Run again"}
              </button>
            )}
            <button type="button" onClick={openSolution} className={BUTTON_PLAIN}>
              Solution
              {!done && !assisted && <span className="text-xs font-normal text-mut">marks the attempt as assisted</span>}
            </button>

            <span className="ml-auto flex flex-wrap items-center gap-2">
              {!done &&
                (confirmReset ? (
                  <>
                    <span className="text-sm text-mut">
                      {isExam ? "Erase the code and set the timer back to zero?" : "Erase the code and start again?"}
                    </span>
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
                    onClick={() => (hasWork ? setConfirmReset(true) : reset())}
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
        </div>

        <BottomPanel active={tab} onSelect={setTab} className="max-h-[32rem]" tabs={tabs} />

        {done && <AfterFinish problem={problem} />}
      </div>

      {solutionFor !== null && (
        <SolutionPanel
          problem={problem}
          myCode={solutionFor}
          assistedNote={done ? null : ASSISTED_NOW}
          onClose={() => setSolutionFor(null)}
        />
      )}
    </div>
  );
}
