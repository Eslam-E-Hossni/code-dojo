import type { TestingProblem } from "@/data/types";
import type { TestCheckState } from "@/lib/testing/useTestCheck";

interface Props {
  problem: TestingProblem;
  state: TestCheckState;
  /** Shown before the first run. */
  idleHint: string;
}

const MARK = "mt-0.5 w-4 shrink-0 text-center font-bold";

/**
 * The result of checking a test: every test with pass or fail and its
 * failure message, then the list of buggy versions, which turns green one
 * by one as the test catches them.
 */
export function TestCheckView({ problem, state, idleHint }: Props) {
  if (state.phase === "idle") return <p className="text-sm leading-7 text-mut">{idleHint}</p>;

  if (state.phase === "running") {
    return (
      <p role="status" className="text-sm leading-7 text-mut">
        بنشغّل اختبارك على الكود الصح، وبعده على <bdi dir="ltr">{problem.buggy.length}</bdi> نسخ فيها bug…
      </p>
    );
  }

  const { result } = state;
  const { correct } = result;
  let caught = 0;
  for (let i = 0; i < result.buggy.length; i++) {
    if (result.buggy[i].caught) caught++;
  }

  return (
    <div className="space-y-4">
      <p
        role="status"
        className={
          "rounded-xl border px-3 py-2 text-sm font-semibold leading-6 " +
          (result.solved ? "border-ok/40 bg-ok/10 text-ok" : "border-bad/40 bg-bad/10 text-bad")
        }
      >
        {result.solved
          ? "اتحلّ: اختبارك نجح على الكود الصح، وفشل على كل نسخة فيها bug."
          : !result.correctPassed
            ? "لسه: اختبارك لازم ينجح على الكود الصح الأول."
            : "لسه: اختبارك نجح على الكود الصح، بس عدّى كمان على نسخة فيها bug. يعني فيه سلوك مش بيتأكد منه."}
      </p>

      <section aria-label="اختبارك على الكود الصح">
        <h3 className="text-sm font-semibold">
          1. على الكود الصح{" "}
          <span className="font-normal text-mut">(المفروض كل اختبار ينجح)</span>
        </h3>

        {correct.fatal !== null && (
          <pre dir="ltr" className="ltr mt-2 whitespace-pre-wrap break-words rounded-xl border border-bad/40 bg-bad/10 p-3 font-mono text-[13px] leading-6 text-bad">
            {correct.fatal}
          </pre>
        )}
        {correct.fatal === null && correct.tests.length === 0 && (
          <p className="mt-2 text-sm leading-7 text-bad">
            الملف مفيهوش أي اختبار. اكتب اختبار واحد على الأقل بـ <code className="inline-code">it</code>.
          </p>
        )}

        <ul className="mt-2 space-y-1.5">
          {correct.tests.map((test, i) => {
            const passed = test.status === "pass";
            const skipped = test.status === "skip";
            return (
              <li
                key={i}
                className={
                  "rounded-xl border px-3 py-2 " +
                  (passed ? "border-ok/30 bg-ok/5" : skipped ? "border-line bg-raised" : "border-bad/40 bg-bad/5")
                }
              >
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className={MARK + (passed ? " text-ok" : skipped ? " text-mut" : " text-bad")}>
                    {passed ? "✓" : skipped ? "–" : "✗"}
                  </span>
                  <p dir="ltr" lang="en" className="ltr min-w-0 flex-1 text-sm leading-6">
                    {test.blocks.length > 0 && <span className="text-mut">{test.blocks.join(" › ")} › </span>}
                    {test.name}
                    <span className="sr-only">{passed ? " passed" : skipped ? " skipped" : " failed"}</span>
                  </p>
                </div>
                {test.status === "fail" && (
                  <pre dir="ltr" className="ltr mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-bg/60 p-2 font-mono text-[12.5px] leading-5 text-bad">
                    {test.message}
                  </pre>
                )}
                {passed && test.assertions === 0 && (
                  <p className="mt-1 ps-6 text-xs leading-5 text-warn">
                    الاختبار ده مفيهوش ولا <code className="inline-code">expect</code>، فهو بينجح من غير ما يتأكد من حاجة.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="هل اختبارك بيختبر حاجة فعلًا؟">
        <h3 className="text-sm font-semibold">
          2. على النسخ اللي فيها bug{" "}
          <span className="font-normal text-mut">
            (المفروض اختبارك يفشل على كل واحدة)
            {result.correctPassed && (
              <>
                {" · "}
                <bdi dir="ltr">
                  {caught} / {problem.buggy.length}
                </bdi>
              </>
            )}
          </span>
        </h3>

        {!result.correctPassed ? (
          <p className="mt-2 text-sm leading-7 text-mut">
            الجزء ده هيشتغل بعد ما اختبارك ينجح على الكود الصح. فيه <bdi dir="ltr">{problem.buggy.length}</bdi> نسخ
            مستنياه.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {problem.buggy.map((version, i) => {
              const verdict = result.buggy[i];
              const ok = verdict !== undefined && verdict.caught;
              return (
                <li
                  key={version.id}
                  className={"rounded-xl border px-3 py-2 " + (ok ? "border-ok/30 bg-ok/5" : "border-bad/40 bg-bad/5")}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className={MARK + (ok ? " text-ok" : " text-bad")}>
                      {ok ? "✓" : "✗"}
                    </span>
                    {ok ? (
                      <div className="min-w-0 flex-1">
                        <p dir="ltr" lang="en" className="ltr text-sm leading-6">
                          {version.bug}
                        </p>
                        {verdict.caughtBy.length > 0 && (
                          <p className="mt-0.5 text-xs leading-5 text-mut">
                            اتمسكت بالاختبار:{" "}
                            <bdi dir="ltr" lang="en">
                              {verdict.caughtBy[0]}
                            </bdi>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-6 text-bad">
                          نسخة <bdi dir="ltr">{i + 1}</bdi>: اختبارك عدّى عليها وهي بايظة
                        </p>
                        {/* The hint names the behaviour. It never shows the bug or the code. */}
                        <p className="mt-0.5 text-sm leading-7">{version.missed}</p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** The small count on the Tests tab. */
export function TestCheckBadge({ problem, state }: { problem: TestingProblem; state: TestCheckState }) {
  if (state.phase !== "done") return null;
  const total = problem.buggy.length + 1;
  let good = state.result.correctPassed ? 1 : 0;
  for (let i = 0; i < state.result.buggy.length; i++) {
    if (state.result.buggy[i].caught) good++;
  }
  return (
    <bdi
      dir="ltr"
      className={
        "rounded-full px-1.5 text-[11px] font-semibold " +
        (state.result.solved ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad")
      }
    >
      {good}/{total}
    </bdi>
  );
}
