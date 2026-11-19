import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProblem, nextProblem } from "@/data/problems";
import type { Problem } from "@/data/types";
import { problemHref } from "@/lib/routes";
import type { Mode } from "@/lib/store";
import { DifficultyChip, TagChip } from "./Chips";
import LearnMode from "./LearnMode";
import OutputMode from "./OutputMode";
import PracticeMode from "./PracticeMode";
import { AskSections, StatementSection } from "./ProblemInfo";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "learn", label: "تعلّم", hint: "Learn: سطر سطر مع المدرب والتلميحات" },
  { id: "recall", label: "استرجاع", hint: "Recall: جمل المدرب بس، وإنت تكتب الحل كله" },
  { id: "exam", label: "امتحان", hint: "Exam: ورقة بيضا وتايمر، من غير تلميحات" },
];

/** The mode a URL asks for, or null if that page does not exist. */
function modeFor(problem: Problem, segment: string | undefined): Mode | null {
  if (problem.kind === "output") return segment === undefined ? "output" : null;
  if (segment === undefined) return "learn";
  if (segment === "recall" || segment === "exam") return segment;
  return null;
}

const GRID =
  "mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]";

/** Shown until the browser has read the saved progress. */
function WorkspaceFallback({ problem, mode }: { problem: Problem; mode: Mode }) {
  return (
    <div dir="ltr" className={GRID}>
      <aside dir="rtl" className="flex min-w-0 flex-col gap-3">
        <StatementSection problem={problem} mode={mode} />
        {(mode === "learn" || mode === "output") && <AskSections problem={problem} />}
      </aside>
      <div dir="rtl" className="min-w-0 space-y-3">
        <div className="rounded-2xl border border-line bg-panel p-4 text-mut">بنجهّز التمرين…</div>
        <div className="h-[300px] rounded-2xl border border-line bg-editor sm:h-[360px] lg:h-[430px]" />
      </div>
    </div>
  );
}

/** The frame of the page, drawn at once while the URL is being read. */
export function ScreenShell() {
  return (
    <header className="border-b border-line bg-panel/90">
      <div className="mx-auto flex min-h-14 w-full max-w-[1500px] items-center px-3 py-2 sm:px-4">
        <Link href="/" dir="ltr" className="rounded-lg font-bold text-gold" aria-label="Code Dojo، كل المسائل">
          Code Dojo
        </Link>
      </div>
    </header>
  );
}

interface Props {
  /** The route params. `mode` is missing on /problem/[id]. */
  params: Promise<{ id: string; mode?: string }>;
}

/** One problem in one mode: the header with the mode switch, then the workspace. */
export async function ProblemScreen({ params }: Props) {
  const { id, mode: segment } = await params;
  const problem = getProblem(id);
  if (!problem) notFound();
  const mode = modeFor(problem, segment);
  if (mode === null) notFound();

  const following = nextProblem(id);
  // The next problem opens in the same mode, when it has that mode.
  const next = following ? { href: problemHref(following, mode), title: following.title } : null;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
          <Link href="/" dir="ltr" className="rounded-lg font-bold text-gold" aria-label="Code Dojo، كل المسائل">
            Code Dojo
          </Link>
          <span aria-hidden="true" className="text-faint">
            /
          </span>
          <h1 dir="ltr" lang="en" className="min-w-0 truncate text-base font-semibold">
            {problem.title}
          </h1>
          <DifficultyChip value={problem.difficulty} />
          <TagChip value={problem.tag} />

          {problem.kind === "output" ? (
            <span className="ms-auto rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 text-xs font-semibold text-gold">
              توقّع الـ output
            </span>
          ) : (
            <nav aria-label="وضع التمرين" className="ms-auto flex rounded-full border border-line bg-bg p-0.5">
              {MODES.map((item) => {
                const active = item.id === mode;
                return (
                  <Link
                    key={item.id}
                    href={problemHref(problem, item.id)}
                    title={item.hint}
                    aria-current={active ? "page" : undefined}
                    className={
                      "rounded-full px-3.5 py-1 text-sm font-semibold transition-colors " +
                      (active ? "bg-gold text-bg" : "text-mut hover:text-ink")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <Suspense fallback={<WorkspaceFallback problem={problem} mode={mode} />}>
        {problem.kind === "output" ? (
          <OutputMode problem={problem} next={next} />
        ) : mode === "recall" || mode === "exam" ? (
          // The key gives Recall and Exam their own state when switching.
          <PracticeMode key={mode} problem={problem} mode={mode} next={next} />
        ) : (
          <LearnMode problem={problem} next={next} />
        )}
      </Suspense>
    </>
  );
}
