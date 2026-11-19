import { PHASE_LABEL, QUERY_NOTE, QUERY_TABLE } from "@/data/testing";
import type { TestingProblem } from "@/data/types";
import { countPhases, splitByPhase, type Phase } from "@/lib/testing/aaa";

const TONE: Record<Phase, { bar: string; tag: string; text: string }> = {
  arrange: { bar: "border-s-gold", tag: "text-gold", text: "text-ink" },
  act: { bar: "border-s-warn", tag: "text-warn", text: "text-ink" },
  assert: { bar: "border-s-ok", tag: "text-ok", text: "text-ink" },
  frame: { bar: "border-s-transparent", tag: "text-faint", text: "text-faint" },
};

const SHORT: Record<Phase, string> = { arrange: "Arrange", act: "Act", assert: "Assert", frame: "" };

interface Props {
  problem: TestingProblem;
  /** The test the learner wrote. */
  testCode: string;
}

/**
 * Shown after a Testing exercise: the test split into Arrange, Act and
 * Assert, the table of the three query families, and one sentence to say
 * in an interview.
 */
export function TestCard({ problem, testCode }: Props) {
  const lines = splitByPhase(testCode);
  const count = countPhases(lines);

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-panel p-4">
      <div>
        <h2 className="text-sm font-semibold text-mut">الاختبار اللي كتبته: Arrange / Act / Assert</h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {(["arrange", "act", "assert"] as const).map((phase) => (
            <li key={phase} dir="ltr" lang="en" className="ltr">
              <span className={"font-semibold " + TONE[phase].tag}>{PHASE_LABEL[phase].title}</span>{" "}
              <span className="text-mut">
                {PHASE_LABEL[phase].note} ({count[phase]})
              </span>
            </li>
          ))}
        </ul>
        <div dir="ltr" className="ltr mt-2 max-h-[26rem] overflow-auto rounded-xl border border-line bg-editor py-2">
          {lines.map((line, i) => (
            <div key={i} className={"flex border-s-2 ps-2 font-mono text-[12.5px] leading-[1.6] " + TONE[line.phase].bar}>
              <span className={"w-14 shrink-0 select-none text-[11px] " + TONE[line.phase].tag}>{SHORT[line.phase]}</span>
              <span className={"whitespace-pre " + TONE[line.phase].text}>{line.text === "" ? " " : line.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-mut">getBy / queryBy / findBy</h2>
        <div dir="ltr" className="ltr mt-2 overflow-x-auto">
          <table lang="en" className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-mut">
                <th scope="col" className="border-b border-line px-2 py-1.5 font-medium">Query</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 font-medium">No match</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 font-medium">One match</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 font-medium">More than one</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 font-medium">Waits?</th>
                <th scope="col" className="border-b border-line px-2 py-1.5 font-medium">Use it for</th>
              </tr>
            </thead>
            <tbody>
              {QUERY_TABLE.map((row) => (
                <tr key={row.query}>
                  <th scope="row" className="border-b border-line px-2 py-1.5 font-mono font-semibold text-gold">
                    {row.query}
                  </th>
                  <td className="border-b border-line px-2 py-1.5">{row.noMatch}</td>
                  <td className="border-b border-line px-2 py-1.5">{row.oneMatch}</td>
                  <td className="border-b border-line px-2 py-1.5">{row.manyMatches}</td>
                  <td className="border-b border-line px-2 py-1.5">{row.waits}</td>
                  <td className="border-b border-line px-2 py-1.5">{row.useFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p dir="ltr" lang="en" className="ltr mt-2 text-xs leading-5 text-mut">
          {QUERY_NOTE}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-mut">جملة للمقابلة</h2>
        <p dir="ltr" lang="en" className="ltr mt-2 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2 text-[15px] leading-7">
          {problem.interview}
        </p>
      </div>
    </section>
  );
}
