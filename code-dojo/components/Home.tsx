"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { browser } from "react-dom";
import { groups } from "@/data/groups";
import { problems } from "@/data/problems";
import { countText, DAYS, PROBLEMS, WEAK_LINES } from "@/lib/arabic";
import { countWeakSteps } from "@/lib/drill";
import { isValidSession, MAX_POINTS_PER_STEP } from "@/lib/learn";
import { POINTS_PER_LINE } from "@/lib/output";
import {
  activeDays,
  countMastery,
  dayOf,
  dueToday,
  nextUp,
  reviewAll,
  streakOf,
  suggestedMode,
  type Mastery,
  type ReviewItem,
} from "@/lib/review";
import { MODE_LABEL, problemHref } from "@/lib/routes";
import { flattenSteps } from "@/lib/steps";
import { EMPTY_STORE, useStore, type Store } from "@/lib/store";
import { BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";
import { DifficultyChip, TagChip } from "./Chips";
import { OfflineStatus } from "./OfflineStatus";

const MASTERY: Record<Mastery, { label: string; dot: string; card: string; text: string }> = {
  new: { label: "جديدة", dot: "bg-faint", card: "border-s-line", text: "text-faint" },
  learning: { label: "بتتعلّم", dot: "bg-gold", card: "border-s-gold", text: "text-gold" },
  strong: { label: "قوية", dot: "bg-ok", card: "border-s-ok", text: "text-ok" },
};
const MASTERY_ORDER: Mastery[] = ["new", "learning", "strong"];

/** When the next review is, in words. `dueIn` is in days from today. */
function dueText(dueIn: number): string {
  if (dueIn === 0) return "النهارده";
  if (dueIn === 1) return "بكرة";
  if (dueIn > 1) return "بعد " + countText(dueIn, DAYS);
  return "متأخرة " + countText(-dueIn, DAYS);
}

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-3">
      <p className="text-xs text-mut">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-8">{children}</p>
      {note && <p className="mt-1 text-xs leading-5 text-mut">{note}</p>}
    </div>
  );
}

function ProblemCard({ item, today }: { item: ReviewItem; today: string | null }) {
  const { problem, progress, review } = item;
  // A written problem is sized in steps, an output question in printed lines.
  const isOutput = problem.kind === "output";
  const stepCount = problem.kind === "output" ? problem.output.length : flattenSteps(problem).length;
  const maxPoints = stepCount * (isOutput ? POINTS_PER_LINE : MAX_POINTS_PER_STEP);
  const lastRun = progress.runs.length > 0 ? progress.runs[progress.runs.length - 1] : null;
  const inProgress = isValidSession(progress.learn, stepCount) && progress.learn.index > 0;
  const mastery = MASTERY[review.mastery];
  const due = today !== null && review.dueIn !== null && review.dueIn <= 0;

  let status: React.ReactNode = <span className="text-faint">لسه جديدة</span>;
  if (inProgress && progress.learn) {
    status = (
      <span className="text-gold">
        واقف عند الخطوة <bdi dir="ltr">{progress.learn.index + 1}</bdi> من <bdi dir="ltr">{stepCount}</bdi>
      </span>
    );
  } else if (lastRun) {
    status = (
      <span className="text-mut">
        آخر نتيجة ({MODE_LABEL[lastRun.mode]}){" "}
        <bdi dir="ltr">
          {lastRun.points} / {lastRun.max}
        </bdi>
      </span>
    );
  }

  return (
    <li>
      <Link
        href={"/problem/" + problem.id}
        className={
          "flex h-full flex-col gap-3 rounded-2xl border border-s-4 border-line bg-panel p-4 transition-colors hover:bg-raised " +
          mastery.card
        }
      >
        <span dir="ltr" lang="en" className="text-right text-lg font-semibold">
          {problem.title}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <DifficultyChip value={problem.difficulty} />
          <TagChip value={problem.tag} />
          <span className="text-xs text-mut">
            <bdi dir="ltr">{stepCount}</bdi> {isOutput ? "سطر" : "خطوة"} · <bdi dir="ltr">{maxPoints}</bdi> نقطة
          </span>
        </span>
        <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          {status}
          {progress.weak.length > 0 && (
            <span className="rounded bg-bad/15 px-2 py-0.5 text-xs text-bad">
              {countText(progress.weak.length, WEAK_LINES)}
            </span>
          )}
        </span>
        <span className="flex items-center justify-between gap-2 border-t border-line pt-2 text-xs">
          <span className={"inline-flex items-center gap-1.5 font-semibold " + mastery.text}>
            <span aria-hidden="true" className={"size-2 rounded-full " + mastery.dot} />
            {mastery.label}
          </span>
          {today !== null && review.dueIn !== null && (
            <span className={due ? "font-semibold text-gold" : "text-mut"}>المراجعة: {dueText(review.dueIn)}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

function DueCard({ item }: { item: ReviewItem }) {
  const { problem, progress, review } = item;
  const mode = suggestedMode(problem, progress, review);
  const dueIn = review.dueIn ?? 0;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-gold/40 bg-gold/5 px-4 py-3">
      <span className="min-w-0 flex-1">
        <bdi dir="ltr" lang="en" className="block truncate text-right font-semibold">
          {problem.title}
        </bdi>
        <span className="mt-0.5 block text-xs leading-5 text-mut">
          {dueIn === 0 ? "ميعادها النهارده" : dueText(dueIn)}
          {review.sooner && (
            <>
              {" · "}
              رجعت بدري علشان فيها {countText(progress.weak.length, WEAK_LINES)}
            </>
          )}
        </span>
      </span>
      <Link href={problemHref(problem, mode)} className={BUTTON_PRIMARY + " shrink-0"}>
        راجعها: {MODE_LABEL[mode]}
      </Link>
    </li>
  );
}

interface ViewProps {
  store: Store;
  /** Today as a local day. Null while the page is drawn before the browser knows the date. */
  today: string | null;
}

function HomeView({ store, today }: ViewProps) {
  const items = reviewAll(problems, store, today ?? "1970-01-01");
  const mastery = countMastery(items);
  const due = today === null ? [] : dueToday(items);
  const upcoming = today === null ? null : nextUp(items);
  const streak = today === null ? null : streakOf(activeDays(store), today);
  const weak = countWeakSteps(problems, store);
  const studied = problems.length - mastery.new;

  let streakNote = "أول تمرين تخلّصه بيبدأ السلسلة.";
  if (streak && streak.doneToday) streakNote = "خلصت تمرين النهارده.";
  else if (streak && streak.count > 0) streakNote = "خلّص أي تمرين النهارده علشان السلسلة تكمل.";

  let drillNote = "الدريل بيشتغل بعد ما تخلّص أول مسألة.";
  if (weak.steps > 0) {
    drillNote =
      "عندك " + countText(weak.steps, WEAK_LINES) + " في " + countText(weak.problems, PROBLEMS) + ". الدريل بيبدأ بيهم.";
  } else if (studied > 0) {
    drillNote = "مفيش سطور ضعيفة دلوقتي، فالدريل هيراجع سطور من المسائل اللي خلصتها.";
  }

  return (
    <>
      <section aria-label="ملخص" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="أيام ورا بعض" note={streakNote}>
          <bdi dir="ltr" className="text-gold">
            {streak ? streak.count : "–"}
          </bdi>
        </Stat>
        <Stat label="مجموع النقط" note="من كل مسألة ودريل خلصتهم.">
          <bdi dir="ltr" className="text-gold">
            {store.points}
          </bdi>
        </Stat>
        <Stat label="مراجعات النهارده" note={due.length === 0 ? "مفيش حاجة مستنياك." : "تحت، بالترتيب."}>
          <bdi dir="ltr" className={due.length > 0 ? "text-gold" : ""}>
            {today === null ? "–" : due.length}
          </bdi>
        </Stat>
        <Stat label="المسائل القوية" note={"بتتعلّم " + mastery.learning + " · جديدة " + mastery.new}>
          {/* One left-to-right run, so it reads "1 / 52" and not the other way round. */}
          <bdi dir="ltr">
            <span className="text-ok">{mastery.strong}</span>
            <span className="text-base font-medium text-mut">{" / " + problems.length}</span>
          </bdi>
        </Stat>
      </section>

      <section
        aria-label="دريل 5 دقايق"
        className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-panel px-4 py-4"
      >
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="text-lg font-bold">دريل 5 دقايق</h2>
          <p className="mt-1 text-sm leading-6 text-mut">
            3 سطور ضعيفة من 3 مسائل مختلفة. تكتب كل سطر من دماغك زي وضع التعلّم. {drillNote}
          </p>
        </div>
        <Link href="/drill" className={BUTTON_PRIMARY + " shrink-0"}>
          ابدأ الدريل
        </Link>
      </section>

      <section aria-labelledby="due-title" className="mt-8">
        <h2 id="due-title" className="flex items-baseline gap-2 text-lg font-bold">
          مراجعات النهارده
          {due.length > 0 && (
            <bdi dir="ltr" className="rounded-full bg-gold/15 px-2 text-sm text-gold">
              {due.length}
            </bdi>
          )}
        </h2>
        {due.length > 0 ? (
          <ul className="mt-3 grid gap-2 lg:grid-cols-2">
            {due.map((item) => (
              <DueCard key={item.problem.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-2xl border border-line bg-panel px-4 py-3 text-sm leading-7 text-mut">
            {today === null && "بنحسب مراجعات النهارده…"}
            {today !== null && studied === 0 && "لما تخلّص مسألة، هترجعلك هنا تاني يوم، وبعدها بعد 3 أيام، وبعدها بعد 7."}
            {today !== null && studied > 0 && (
              <>
                مفيش مراجعات النهارده.
                {upcoming && upcoming.review.dueIn !== null && (
                  <>
                    {" "}
                    أقرب مراجعة {dueText(upcoming.review.dueIn)}:{" "}
                    <bdi dir="ltr" lang="en" className="font-semibold text-ink">
                      {upcoming.problem.title}
                    </bdi>
                    . تقدر تبدأ مسألة جديدة من تحت.
                  </>
                )}
              </>
            )}
          </p>
        )}
      </section>

      <section aria-labelledby="grid-title" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 id="grid-title" className="text-lg font-bold">
            كل المسائل
          </h2>
          <ul aria-label="مستوى الحفظ" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {MASTERY_ORDER.map((level) => (
              <li key={level} className="inline-flex items-center gap-1.5 text-mut">
                <span aria-hidden="true" className={"size-2.5 rounded-full " + MASTERY[level].dot} />
                {MASTERY[level].label}
                <bdi dir="ltr" className="font-semibold text-ink">
                  {mastery[level]}
                </bdi>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-1 text-sm leading-6 text-mut">
          المسألة بتبقى قوية لما توصل لمراجعة كل 7 أيام ومفيش فيها سطور ضعيفة.
        </p>

        {groups.map((group) => {
          const inGroup = items.filter((item) => item.problem.group === group.id);
          // A group shows up only when it has finished problems in it.
          if (inGroup.length === 0) return null;
          return (
            <div key={group.id} className="mt-6">
              <h3 className="flex items-baseline gap-2 text-sm font-semibold text-mut">
                <bdi dir="ltr" lang="en" className="text-base text-ink">
                  {group.title}
                </bdi>
                <span>{group.titleAr}</span>
              </h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inGroup.map((item) => (
                  <ProblemCard key={item.problem.id} item={item} today={today} />
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </>
  );
}

/** The page before the browser has read the saved progress: every problem, nothing personal. */
export function HomeFallback() {
  return <HomeView store={EMPTY_STORE} today={null} />;
}

/** The home page: what is due today, the streak, the points and every problem by mastery. */
export default function Home() {
  // Progress is in localStorage and the reviews depend on today's date, so
  // this part renders in the browser only.
  use(browser("Progress is saved in localStorage, and reviews depend on the current date."));

  const store = useStore();
  const [today, setToday] = useState(() => dayOf(new Date()));

  // A tab left open over midnight must not keep showing yesterday's reviews.
  useEffect(() => {
    const refresh = () => setToday(dayOf(new Date()));
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <>
      <HomeView store={store} today={today} />
      <footer className="mt-12 space-y-2 border-t border-line pt-4 text-sm text-mut">
        <OfflineStatus />
        <p>
          <Link href="/self-check" className={BUTTON_PLAIN + " h-9 px-3 font-normal"}>
            فحص ذاتي: شغّل كل الحلول المرجعية في المتصفح ده
          </Link>
        </p>
      </footer>
    </>
  );
}
