import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProblem, nextProblem } from "@/data/problems";
import type { Problem } from "@/data/types";
import { problemHref } from "@/lib/routes";
import type { Mode } from "@/lib/store";
import { DifficultyChip, TagChip } from "./Chips";
import { ExamClockProvider, ExamClockSlot } from "./ExamClock";
import LearnMode from "./LearnMode";
import OutputMode from "./OutputMode";
import PracticeMode from "./PracticeMode";
import { AskSections, StatementSection } from "./ProblemInfo";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "learn", label: "Learn", hint: "Learn: one step at a time, with the coach and the hints" },
  { id: "recall", label: "Recall", hint: "Recall: the coach sentences only, and you write the whole solution" },
  { id: "exam", label: "Exam", hint: "Exam: a blank editor, the task and a timer. No hints" },
];

/** The mode a URL asks for, or null if that page does not exist. */
function modeFor(problem: Problem, segment: string | undefined): Mode | null {
  // An output question has one screen: there is no code to write in three ways.
  if (problem.kind === "output") return segment === undefined ? "output" : null;
  if (segment === undefined) return "learn";
  if (segment === "recall" || segment === "exam") return segment;
  return null;
}

const GRID =
  "mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]";

const HEADER_ROW = "mx-auto flex min-h-14 w-full max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4";

function HomeLink() {
  return (
    <Link href="/" className="-my-1 rounded-lg py-2 font-bold text-gold" aria-label="Code Dojo, all problems">
      Code Dojo
    </Link>
  );
}

/** Shown until the browser has read the saved progress. */
function WorkspaceFallback({ problem, mode }: { problem: Problem; mode: Mode }) {
  return (
    <div className={GRID}>
      <aside className="order-2 flex min-w-0 flex-col gap-3 lg:order-1">
        <StatementSection problem={problem} />
        {(mode === "learn" || mode === "output") && <AskSections problem={problem} />}
      </aside>
      <div className="order-1 min-w-0 space-y-3 lg:order-2">
        <p className="px-1 text-sm leading-6 text-mut lg:hidden">{problem.statement}</p>
        <div className="rounded-2xl border border-line bg-panel p-4 text-mut">Getting the exercise ready…</div>
        <div className="h-[260px] rounded-2xl border border-line bg-editor sm:h-[360px] lg:h-[430px]" />
      </div>
    </div>
  );
}

/** The frame of the page, drawn at once while the URL is being read. */
export function ScreenShell() {
  return (
    <header className="border-b border-line bg-panel/90">
      <div className={HEADER_ROW}>
        <HomeLink />
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
    <ExamClockProvider>
      {/* On a phone the header scrolls away, to leave the screen to the coach and the editor. */}
      <header className="z-20 border-b border-line bg-panel/90 backdrop-blur sm:sticky sm:top-0">
        <div className={HEADER_ROW}>
          <HomeLink />
          <span aria-hidden="true" className="text-faint">
            /
          </span>
          <h1 className="min-w-0 truncate text-base font-semibold">{problem.title}</h1>
          <DifficultyChip value={problem.difficulty} />
          <TagChip value={problem.tag} />

          <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Exam mode puts its timer here. On a phone the timer is next to the editor. */}
            {mode === "exam" && <ExamClockSlot />}
            {problem.kind === "output" && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                Predict the output
              </span>
            )}
            <nav
              aria-label="Mode"
              className={problem.kind === "output" ? "hidden" : "flex rounded-full border border-line bg-bg p-0.5"}
            >
              {MODES.map((item) => {
                const active = item.id === mode;
                return (
                  <Link
                    key={item.id}
                    href={problemHref(problem, item.id)}
                    title={item.hint}
                    aria-current={active ? "page" : undefined}
                    className={
                      "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors " +
                      (active ? "bg-gold text-bg" : "text-mut hover:text-ink")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Link href="/settings" className="-my-1 rounded-lg py-2 text-sm font-semibold text-mut hover:text-ink">
              Settings
            </Link>
          </span>
        </div>
      </header>

      <Suspense fallback={<WorkspaceFallback problem={problem} mode={mode} />}>
        {/* The key gives every problem and every mode its own state. */}
        {problem.kind === "output" ? (
          <OutputMode key={problem.id} problem={problem} next={next} />
        ) : mode === "recall" || mode === "exam" ? (
          <PracticeMode key={problem.id + ":" + mode} problem={problem} mode={mode} next={next} />
        ) : (
          <LearnMode key={problem.id} problem={problem} next={next} />
        )}
      </Suspense>
    </ExamClockProvider>
  );
}
