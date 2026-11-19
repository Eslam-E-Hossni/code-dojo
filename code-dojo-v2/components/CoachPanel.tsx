import type { FlatStep, TestReport } from "@/lib/checker/check";
import { changedNames, renameCode, renameText } from "@/lib/checker/names";
import { blockPoints, MAX_MISSES, POINTS, tierFor } from "@/lib/learn";
import type { Block } from "@/lib/store";
import { Text } from "./Text";

/** What the coach says about the last check. */
export type Feedback =
  /** Enter with nothing typed. */
  | { kind: "empty" }
  /** Right so far, not finished. Not a miss. */
  | { kind: "partial"; message: string }
  /** The hidden tests or the AI judge are being asked. */
  | { kind: "checking" }
  | {
      kind: "wrong";
      message: string;
      /** What was typed, with the wrong part as offsets in it. */
      input: string;
      range: { start: number; end: number } | null;
      tests: TestReport | null;
      judge: string | null;
      /**
       * True when the line only differs from the reference: it may still be
       * part of a right solution written in another way.
       */
      ownWay: boolean;
    };

interface Props {
  step: FlatStep;
  stepCount: number;
  misses: number;
  sessionPoints: number;
  showPartTitle: boolean;
  /** The learner's names, to speak with them. */
  names: Record<string, string>;
  /** What was accepted just before this step, with the steps it covered. */
  previous: { block: Block; steps: FlatStep[]; note: string | null; tests: TestReport | null } | null;
  feedback: Feedback | null;
}

function AttemptPips({ misses }: { misses: number }) {
  const worth = [POINTS.first, POINTS.second, POINTS.third];
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {worth.map((points, i) => (
        <span
          key={points}
          className={
            "grid h-6 min-w-8 place-items-center rounded-md border px-1.5 text-xs font-semibold " +
            (i === misses
              ? "border-gold bg-gold/15 text-gold"
              : i < misses
                ? "border-line text-faint line-through"
                : "border-line text-faint")
          }
        >
          +{points}
        </span>
      ))}
    </div>
  );
}

function TestsLine({ tests }: { tests: TestReport }) {
  if (tests.fatal !== null) {
    return (
      <p className="mt-2 text-sm text-mut">
        The hidden tests could not run this code: {tests.fatal} The Console tab shows the error.
      </p>
    );
  }
  const first = tests.failures[0];
  return (
    <p className="mt-2 text-sm text-mut">
      Hidden tests: {tests.passed} of {tests.total} pass.
      {first !== undefined && <> First to fail: {first.name}. The Tests tab shows each one.</>}
    </p>
  );
}

function WrongView({ feedback }: { feedback: Extract<Feedback, { kind: "wrong" }> }) {
  const { input, range } = feedback;
  // Show the line with the wrong part marked. For a long block, the editor shows the mark.
  const short = input.trim().split("\n").length <= 3;
  return (
    <div role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3">
      <p className="text-[15px] font-medium leading-7 text-bad">
        <Text text={feedback.message} />
      </p>
      {short && range !== null && (
        <pre className="mt-2 overflow-x-auto whitespace-pre font-mono text-[13px] leading-6">
          <span className="text-mut">{input.slice(0, range.start)}</span>
          <span className="rounded bg-bad/25 px-0.5 text-bad underline decoration-wavy underline-offset-4">
            {input.slice(range.start, range.end)}
          </span>
          <span className="text-mut">{input.slice(range.end)}</span>
        </pre>
      )}
      {feedback.tests !== null && <TestsLine tests={feedback.tests} />}
      {feedback.judge !== null && <p className="mt-2 text-sm text-mut">AI judge: {feedback.judge}</p>}
      {feedback.ownWay && (
        <p className="mt-2 text-xs leading-5 text-faint">
          Solving it in another way? Write the whole function, then check: the hidden tests decide.
        </p>
      )}
    </div>
  );
}

const VIA: Record<Block["via"], string | null> = {
  match: null,
  tests: "Accepted by the hidden tests.",
  judge: "Accepted by the AI judge.",
};

export function CoachPanel({ step, stepCount, misses, sessionPoints, showPartTitle, names, previous, feedback }: Props) {
  const revealed = misses >= MAX_MISSES;
  const progress = Math.round((step.index / stepCount) * 100);
  const renamed = changedNames(names);

  return (
    <section aria-label="Coach" className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="h-1 bg-raised">
        <div className="h-full bg-gold transition-[width] duration-300" style={{ width: progress + "%" }} />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-mut">
          <span>
            Step {step.index + 1} of {stepCount}
          </span>
          {showPartTitle && <span className="min-w-0 text-gold">{step.partTitle}</span>}
          <span className="ml-auto flex items-center gap-3">
            {revealed ? (
              <span className="rounded-md border border-bad/40 bg-bad/10 px-2 py-0.5 text-xs font-semibold text-bad">
                no points
              </span>
            ) : (
              <AttemptPips misses={misses} />
            )}
            <span className="font-semibold text-gold">{sessionPoints} points</span>
          </span>
        </div>

        {/* The reward for the last line. It steps aside once this line needs help. */}
        {previous && misses === 0 && feedback?.kind !== "wrong" && (
          <div className="rounded-xl border border-ok/30 bg-ok/10 px-3 py-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="shrink-0 font-semibold text-ok">
                ✓ +{blockPoints(previous.block)}
              </span>
              <p className="flex-1 text-ink/90">{previous.steps.map((done) => done.explain).join(" ")}</p>
            </div>
            {previous.steps.length > 1 && (
              <p className="mt-1.5 text-xs text-mut">That covered {previous.steps.length} steps at once.</p>
            )}
            {(previous.note ?? VIA[previous.block.via]) !== null && (
              <p className="mt-1.5 text-xs text-mut">{previous.note ?? VIA[previous.block.via]}</p>
            )}
            {previous.tests !== null && previous.tests.fatal === null && (
              <p className={"mt-1.5 text-xs " + (previous.tests.passed === previous.tests.total ? "text-ok" : "text-warn")}>
                Hidden tests for this function: {previous.tests.passed} of {previous.tests.total} pass.
              </p>
            )}
          </div>
        )}

        <p aria-live="polite" className="text-lg font-medium leading-8">
          <Text text={renameText(step.coach, names)} />
        </p>

        {renamed.length > 0 && (
          <p className="text-xs leading-5 text-faint">
            Your names:{" "}
            {renamed.map((pair, i) => (
              <span key={pair.expected}>
                {i > 0 && ", "}
                <code className="inline-code">{pair.mine}</code> for {pair.expected}
              </span>
            ))}
          </p>
        )}

        {feedback?.kind === "empty" && (
          <p role="status" className="text-sm text-mut">
            Type the line in the editor first, then press Enter.
          </p>
        )}
        {feedback?.kind === "partial" && (
          <p role="status" className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm leading-6 text-gold">
            {feedback.message}
          </p>
        )}
        {feedback?.kind === "checking" && (
          <p role="status" className="text-sm text-mut">
            Checking…
          </p>
        )}
        {feedback?.kind === "wrong" && <WrongView feedback={feedback} />}

        {/* One help box at a time, so the editor stays in view. */}
        {misses === 1 && (
          <div className="rounded-xl border border-line bg-raised p-3">
            <p className="text-xs font-semibold text-gold">Hint 1 · the idea</p>
            <p className="mt-1 text-[15px] leading-7">
              <Text text={renameText(step.hint1, names)} />
            </p>
          </div>
        )}

        {misses === 2 && (
          <div className="rounded-xl border border-line bg-raised p-3">
            <p className="text-xs font-semibold text-gold">Hint 2 · the shape of the line</p>
            <pre className="code-block mt-2">
              <code>{step.hint2}</code>
            </pre>
            <p className="mt-2 text-sm leading-6 text-mut">
              <Text text={renameText(step.hint1, names)} />
            </p>
          </div>
        )}

        {revealed && (
          <div className="rounded-xl border border-bad/40 bg-bad/10 p-3">
            <p className="text-xs font-semibold text-bad">The line</p>
            <pre className="code-block mt-2">
              <code>
                {renameCode(step.expected, names)
                  .split("\n")
                  .map((line) => line.trim())
                  .join("\n")}
              </code>
            </pre>
            <p className="mt-2 text-sm text-ink/90">{step.explain}</p>
            <p className="mt-2 text-sm text-mut">
              It is marked as a weak step and will come back first next time. Type it yourself now to go on.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** The label of the Hint button for the next request. */
export function hintLabel(misses: number): string {
  if (misses >= MAX_MISSES) return "Line shown";
  if (misses === MAX_MISSES - 1) return "Show the line";
  return "Hint";
}

/** What the next hint costs, for the Hint button. */
export function hintCost(misses: number): string {
  if (misses >= MAX_MISSES) return "";
  const next = POINTS[tierFor(misses + 1)];
  return next === 0 ? "no points" : "step worth " + next;
}
