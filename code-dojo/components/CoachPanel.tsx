import type { Diff, Rename } from "@/lib/check";
import { POINTS, tierFor, type StepResult } from "@/lib/learn";
import type { FlatStep } from "@/lib/steps";
import { Mixed } from "./Mixed";

export type Feedback =
  | { kind: "wrong"; input: string; diff: Diff }
  | { kind: "rename"; renames: Rename[] }
  | { kind: "empty" };

interface Props {
  step: FlatStep;
  stepCount: number;
  misses: number;
  sessionPoints: number;
  showPartTitle: boolean;
  /** The step finished just before this one, with its result. */
  previous: { step: FlatStep; result: StepResult; viaAccept: boolean } | null;
  feedback: Feedback | null;
}

function AttemptPips({ misses }: { misses: number }) {
  const worth = [POINTS.first, POINTS.second, POINTS.third];
  return (
    <div dir="ltr" className="flex items-center gap-1" aria-hidden="true">
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

function DiffView({ feedback, revealed }: { feedback: Extract<Feedback, { kind: "wrong" }>; revealed: boolean }) {
  const { input, diff } = feedback;
  const lead = input.length - input.trimStart().length;
  const before = input.slice(lead, diff.start);
  const wrong = input.slice(diff.start, diff.end);
  const after = input.slice(diff.end).trimEnd();

  // In YAML the first thing compared is the indentation: "4 spaces".
  const indentation = diff.kind === "wrong" && diff.want !== null ? /^(\d+) spaces$/.exec(diff.want) : null;

  let message: string;
  if (indentation) message = "المسافات اللي في أول السطر مش مظبوطة. في YAML هي اللي بتحدد السطر ده جوه إيه.";
  else if (diff.kind === "missing") message = "اللي كتبته صح، بس السطر لسه ناقص.";
  else if (diff.kind === "extra") message = "السطر صح لحد الأخضر، واللي بعد كده زيادة.";
  else message = "مش مظبوط. اللي بالأخضر صح، وأول غلطة عند الأحمر.";

  return (
    <div role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3">
      <p className="text-sm font-medium text-bad">{message}</p>
      <pre dir="ltr" className="ltr mt-2 overflow-x-auto whitespace-pre font-mono text-[13px] leading-6">
        <span className="text-ok">{before}</span>
        {wrong && <span className="rounded bg-bad/25 px-0.5 text-bad underline decoration-wavy underline-offset-4">{wrong}</span>}
        {diff.kind === "missing" && <span className="font-bold text-bad"> ⋯</span>}
        <span className="text-faint">{after}</span>
      </pre>
      {revealed && indentation && (
        <p className="mt-2 text-sm text-mut">
          عدد المسافات المفروض في أول السطر: <bdi dir="ltr">{indentation[1]}</bdi>
        </p>
      )}
      {revealed && !indentation && diff.want !== null && (
        <p className="mt-2 text-sm text-mut">
          المفروض هنا: <code className="inline-code">{diff.want}</code>
        </p>
      )}
    </div>
  );
}

export function CoachPanel({ step, stepCount, misses, sessionPoints, showPartTitle, previous, feedback }: Props) {
  const revealed = misses >= 3;
  const progress = Math.round((step.index / stepCount) * 100);

  return (
    <section aria-label="المدرب" className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="h-1 bg-raised">
        <div className="h-full bg-gold transition-[width] duration-300" style={{ width: progress + "%" }} />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-mut">
          <span>
            الخطوة <bdi dir="ltr">{step.index + 1}</bdi> من <bdi dir="ltr">{stepCount}</bdi>
          </span>
          {showPartTitle && (
            <bdi dir="ltr" lang="en" className="min-w-0 text-gold">
              {step.partTitle}
            </bdi>
          )}
          <span className="ms-auto flex items-center gap-3">
            {revealed ? (
              <span className="rounded-md border border-bad/40 bg-bad/10 px-2 py-0.5 text-xs font-semibold text-bad">
                من غير نقط
              </span>
            ) : (
              <AttemptPips misses={misses} />
            )}
            <span className="font-semibold text-gold">
              <bdi dir="ltr">{sessionPoints}</bdi> نقطة
            </span>
          </span>
        </div>

        {/* The reward for the last line. It steps aside once this line needs help. */}
        {previous && misses === 0 && feedback?.kind !== "wrong" && (
          <div className="rounded-xl border border-ok/30 bg-ok/10 px-3 py-2 text-sm">
            <div className="flex items-start gap-2">
              <span dir="ltr" className="shrink-0 font-semibold text-ok">
                ✓ +{previous.result.points}
              </span>
              <p dir="ltr" lang="en" className="ltr flex-1 text-ink/90">
                {previous.step.explain}
              </p>
            </div>
            {previous.viaAccept && (
              <p className="mt-1.5 text-xs text-mut">
                إجابتك مقبولة. ثبّتنا السطر المرجعي في الـ editor علشان باقي الخطوات مبنية عليه.
              </p>
            )}
          </div>
        )}

        <p aria-live="polite" className="text-lg font-medium leading-9">
          <Mixed text={step.coach} />
        </p>

        {feedback?.kind === "empty" && (
          <p role="status" className="text-sm text-mut">
            اكتب السطر في الـ editor الأول، وبعدين دوس Enter.
          </p>
        )}

        {feedback?.kind === "rename" && (
          <div role="status" className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm leading-7">
            <p className="font-medium text-gold">الفكرة صح، بس الاسم مختلف عن الحل المرجعي.</p>
            <ul className="mt-1 space-y-0.5">
              {feedback.renames.map((r) => (
                <li key={r.want}>
                  خلّيه <code className="inline-code">{r.want}</code> بدل{" "}
                  <code className="inline-code">{r.got}</code>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-mut">
              باقي الخطوات بتستخدم الأسماء دي. غيّرها وكمّل، ودي مش محسوبة عليك.
            </p>
          </div>
        )}

        {feedback?.kind === "wrong" && <DiffView feedback={feedback} revealed={revealed} />}

        {/* One help box at a time, so the editor stays in view. */}
        {misses === 1 && (
          <div className="rounded-xl border border-line bg-raised p-3">
            <p className="text-xs font-semibold text-gold">تلميح 1 · الفكرة</p>
            <p className="mt-1 text-[15px] leading-7">
              <Mixed text={step.hint1} />
            </p>
          </div>
        )}

        {misses === 2 && (
          <div className="rounded-xl border border-line bg-raised p-3">
            <p className="text-xs font-semibold text-gold">تلميح 2 · شكل السطر</p>
            <pre className="code-block mt-2">
              <code>{step.hint2}</code>
            </pre>
            <p className="mt-2 text-sm leading-6 text-mut">
              <Mixed text={step.hint1} />
            </p>
          </div>
        )}

        {revealed && (
          <div className="rounded-xl border border-bad/40 bg-bad/10 p-3">
            <p className="text-xs font-semibold text-bad">السطر المرجعي</p>
            <pre className="code-block mt-2">
              <code>{step.expected.split("\n").map((line) => line.trim()).join("\n")}</code>
            </pre>
            <p dir="ltr" lang="en" className="ltr mt-2 text-sm text-ink/90">
              {step.explain}
            </p>
            <p className="mt-2 text-sm text-mut">
              اتسجّل كسطر ضعيف وهيرجعلك الأول المرة الجاية. اكتبه بإيدك دلوقتي علشان نكمّل.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** What the next request for a hint costs, for the Hint button label. */
export function hintLabel(misses: number): string {
  if (misses >= 3) return "السطر مكشوف";
  if (misses === 2) return "اكشف السطر";
  return "تلميح";
}

export function hintCost(misses: number): string {
  if (misses >= 3) return "";
  const next = POINTS[tierFor(misses + 1)];
  return next === 0 ? "من غير نقط" : "السطر هيبقى بـ " + next;
}
