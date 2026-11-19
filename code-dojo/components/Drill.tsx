"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { browser } from "react-dom";
import { problems } from "@/data/problems";
import { checkLine } from "@/lib/check";
import { DRILL_SECONDS, DRILL_SIZE, pickDrill, type DrillItem, type DrillReason } from "@/lib/drill";
import { MAX_MISSES, MAX_POINTS_PER_STEP, POINTS, tierFor, totalPoints, type StepResult, type Tier } from "@/lib/learn";
import { languageOf } from "@/lib/monaco";
import { formatDuration } from "@/lib/practice";
import { withStepResult } from "@/lib/review";
import { buildLocked, indentOf, syntaxOf } from "@/lib/steps";
import { getStore, updateStore, useStore, withProgress } from "@/lib/store";
import { BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import { CoachPanel, hintCost, hintLabel, type Feedback } from "./CoachPanel";
import DojoEditor, { type DojoEditorHandle, type EditorRange } from "./DojoEditor";

const REASON: Record<DrillReason, { label: string; tone: string }> = {
  weak: { label: "سطر ضعيف: اتكشف قبل كده", tone: "border-bad/40 bg-bad/10 text-bad" },
  shaky: { label: "احتجت فيه تلميح قبل كده", tone: "border-gold/40 bg-gold/10 text-gold" },
  random: { label: "مراجعة من مسألة خلصتها", tone: "border-line bg-raised text-mut" },
};

const TIER_TEXT: Record<Tier, string> = {
  first: "من أول مرة",
  second: "بعد تلميح",
  third: "بعد تلميحين",
  revealed: "اتكشف",
};

interface Round {
  id: number;
  items: DrillItem[];
  startedAt: number;
}

function newRound(id: number): Round {
  return { id, items: pickDrill(problems, getStore(), Math.random), startedAt: Date.now() };
}

/** The 5-minute drill: three steps, each from a different problem, weak ones first. */
export default function Drill() {
  // The steps are picked at random from saved progress, so this renders in the browser only.
  use(browser("The drill is picked at random from progress saved in localStorage."));

  const store = useStore();
  const [round, setRound] = useState(() => newRound(0));
  const [position, setPosition] = useState(0);
  const [misses, setMisses] = useState(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const editor = useRef<DojoEditorHandle>(null);

  const { items } = round;
  const done = items.length > 0 && position >= items.length;
  const item = done || items.length === 0 ? null : items[position];

  // The clock stops when the drill is finished.
  useEffect(() => {
    if (finishedAt !== null || items.length === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [finishedAt, items.length]);

  const locked = useMemo(
    () => (item ? buildLocked(item.problem, item.steps, item.step.index) : { text: "", ranges: [] }),
    [item],
  );
  const ranges = useMemo(() => {
    const out: EditorRange[] = [];
    // The lines above are only there to give the step its place. They carry no result.
    for (const range of locked.ranges) out.push({ startLine: range.startLine, endLine: range.endLine, tone: "header" });
    return out;
  }, [locked]);

  const restart = () => {
    setRound(newRound(round.id + 1));
    setPosition(0);
    setMisses(0);
    setResults([]);
    setFeedback(null);
    setFinishedAt(null);
    setNow(Date.now());
  };

  const recordMiss = () => {
    if (!item) return;
    const next = Math.min(MAX_MISSES, misses + 1);
    if (next >= MAX_MISSES && misses < MAX_MISSES) {
      // Revealed: the line is weak (again), so it will come back.
      updateStore((s) => withProgress(s, item.problem.id, (p) => withStepResult(p, item.step.key, "revealed")));
    }
    setMisses(next);
  };

  const submit = (input: string) => {
    if (!item) return;
    const result = checkLine(input, item.step, syntaxOf(item.problem));

    if (!result.ok && result.empty) {
      setFeedback({ kind: "empty" });
      return;
    }
    if (!result.ok) {
      if (result.rename) {
        setFeedback({ kind: "rename", renames: result.rename });
        return;
      }
      recordMiss();
      setFeedback({ kind: "wrong", input, diff: result.diff });
      return;
    }

    const tier = tierFor(misses);
    const nextResults = [...results, { tier, points: POINTS[tier] }];
    const isLast = position + 1 === items.length;
    const earned = totalPoints(nextResults);

    updateStore((s) => {
      const updated = withProgress(s, item.problem.id, (p) => withStepResult(p, item.step.key, tier));
      if (!isLast) return updated;
      // A finished drill adds its points and counts as today's practice.
      const record = { at: new Date().toISOString(), points: earned, max: items.length * MAX_POINTS_PER_STEP };
      return { ...updated, points: updated.points + earned, drills: [...(updated.drills ?? []), record].slice(-365) };
    });

    setResults(nextResults);
    setMisses(0);
    setFeedback(null);
    setPosition(position + 1);
    if (isLast) setFinishedAt(Date.now());
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

  const shell = "mx-auto w-full max-w-3xl flex-1 space-y-3 px-3 py-4 sm:px-4 sm:py-6";

  if (items.length === 0) {
    return (
      <main className={shell}>
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="text-xl font-bold">لسه مفيش حاجة تتراجع</h2>
          <p className="mt-2 leading-8 text-mut">
            الدريل بياخد سطور من المسائل اللي اشتغلت عليها: السطور الضعيفة الأول، وبعدها اللي احتجت فيها تلميح. خلّص
            أول مسألة في وضع التعلّم، وارجع هنا.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={"/problem/" + problems[0].id} className={BUTTON_PRIMARY}>
              ابدأ بأول مسألة
              <bdi dir="ltr" className="text-xs font-normal">
                {problems[0].title}
              </bdi>
            </Link>
            <Link href="/" className={BUTTON_PLAIN}>
              كل المسائل
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const elapsed = Math.max(0, Math.round(((finishedAt ?? now) - round.startedAt) / 1000));
  const left = DRILL_SECONDS - elapsed;
  const points = totalPoints(results);
  const max = items.length * MAX_POINTS_PER_STEP;

  if (!item) {
    return (
      <main className={shell}>
        <section aria-label="نتيجة الدريل" className="overflow-hidden rounded-2xl border border-ok/40 bg-panel">
          <div className="h-1 bg-ok" />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold">خلصت الدريل يا إسلام</h2>
              <p className="text-mut">
                <bdi dir="ltr" className="text-2xl font-bold text-gold">
                  {points}
                </bdi>{" "}
                <bdi dir="ltr">/ {max}</bdi> نقطة · في <bdi dir="ltr">{formatDuration(elapsed)}</bdi>
              </p>
            </div>
            <ul className="space-y-2">
              {items.map((entry, i) => {
                const result = results[i];
                const stillWeak = (store.problems[entry.problem.id]?.weak ?? []).includes(entry.step.key);
                return (
                  <li key={entry.problem.id} className="rounded-xl border border-line bg-raised px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={"/problem/" + entry.problem.id}
                        dir="ltr"
                        lang="en"
                        className="min-w-0 truncate font-semibold hover:text-gold"
                      >
                        {entry.problem.title}
                      </Link>
                      <span className={"text-sm font-semibold " + (result.tier === "first" ? "text-ok" : "text-mut")}>
                        {TIER_TEXT[result.tier]} · <bdi dir="ltr">+{result.points}</bdi>
                      </span>
                    </div>
                    <p dir="ltr" lang="en" className="ltr mt-1 text-sm text-ink/90">
                      {entry.step.explain}
                    </p>
                    <p className="mt-1 text-xs text-mut">
                      {stillWeak
                        ? "لسه في السطور الضعيفة، وهيرجعلك في دريل جاي."
                        : entry.reason === "weak" || entry.reason === "shaky"
                          ? result.tier === "first"
                            ? "كتبته من أول مرة، فاتشال من قايمة المراجعة."
                            : "اتحسب، بس هيفضل في قايمة المراجعة لحد ما تكتبه من أول مرة."
                          : result.tier === "first"
                            ? "ثابت عندك."
                            : "اتضاف لقايمة المراجعة علشان احتاج تلميح."}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={restart} className={BUTTON_PRIMARY}>
                دريل تاني
              </button>
              <Link href="/" className={BUTTON_PLAIN}>
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const previous = position > 0 ? { step: items[position - 1].step, result: results[position - 1], viaAccept: false } : null;

  return (
    <main className={shell}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-panel px-4 py-3">
        <span className="text-sm text-mut">
          سطر <bdi dir="ltr">{position + 1}</bdi> من <bdi dir="ltr">{items.length}</bdi>
        </span>
        <bdi dir="ltr" lang="en" className="min-w-0 truncate font-semibold">
          {item.problem.title}
        </bdi>
        <span className={"rounded-full border px-2.5 py-0.5 text-xs font-medium " + REASON[item.reason].tone}>
          {REASON[item.reason].label}
        </span>
        <span
          role="timer"
          className={"ms-auto text-sm " + (left <= 0 ? "text-mut" : left <= 60 ? "text-warn" : "text-mut")}
        >
          {left > 0 ? (
            <>
              فاضل{" "}
              <bdi dir="ltr" className="font-mono font-semibold text-ink">
                {formatDuration(left)}
              </bdi>
            </>
          ) : (
            "الـ 5 دقايق خلصوا. كمّل السطر اللي في إيدك."
          )}
        </span>
      </div>

      {items.length < DRILL_SIZE && position === 0 && (
        <p className="rounded-xl border border-line bg-panel px-4 py-2 text-sm leading-6 text-mut">
          الدريل بياخد سطر واحد من كل مسألة، ولسه عندك <bdi dir="ltr">{items.length}</bdi> بس من المسائل اللي اشتغلت
          عليها. كل ما تخلّص مسائل أكتر هيكمل لـ <bdi dir="ltr">{DRILL_SIZE}</bdi>.
        </p>
      )}

      <CoachPanel
        step={item.step}
        stepCount={item.steps.length}
        misses={misses}
        sessionPoints={points}
        showPartTitle={item.problem.parts.length > 1}
        previous={previous}
        feedback={feedback}
      />

      <p className="px-1 text-xs leading-5 text-mut">
        السطور اللي فوق في الـ editor هي الحل لحد الخطوة دي، علشان تعرف إنت فين. اكتب السطر اللي بعدها.
      </p>

      <div className="h-[300px] overflow-hidden rounded-2xl border border-line bg-editor sm:h-[340px]">
        <DojoEditor
          // The editor takes its language when it is created, and the drill
          // goes from plain JavaScript to JSX or a Dockerfile and back.
          key={languageOf(item.problem)}
          ref={editor}
          language={languageOf(item.problem)}
          docKey={round.id + ":" + position}
          locked={locked.text}
          ranges={ranges}
          prefill={indentOf(item.step)}
          expectedLines={item.step.lines}
          done={false}
          mark={feedback?.kind === "wrong" ? feedback.diff : null}
          onSubmit={submit}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={check} className={BUTTON_PRIMARY}>
          راجع السطر
          <kbd dir="ltr" className="rounded bg-bg/20 px-1.5 py-0.5 font-mono text-[11px]">
            Enter
          </kbd>
        </button>
        <button type="button" onClick={hint} disabled={misses >= MAX_MISSES} className={BUTTON_PLAIN}>
          {hintLabel(misses)}
          {misses < MAX_MISSES && <span className="text-xs font-normal text-mut">{hintCost(misses)}</span>}
        </button>
        <Link href="/" className={BUTTON_PLAIN + " ms-auto"}>
          اخرج من الدريل
        </Link>
      </div>
    </main>
  );
}
