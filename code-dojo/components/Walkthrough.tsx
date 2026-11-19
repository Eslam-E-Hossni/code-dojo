import type { StepProblem } from "@/data/types";
import type { FlatStep } from "@/lib/steps";

interface Props {
  problem: StepProblem;
  steps: FlatStep[];
  /** Steps before this one are finished. */
  index: number;
}

/**
 * "Say it out loud": the explain lines joined into a short English
 * walkthrough. A sentence appears only when its line is done, so the tab
 * never gives away a line that is still to come.
 */
export function Walkthrough({ problem, steps, index }: Props) {
  const multiPart = problem.parts.length > 1;
  const remaining = steps.length - index;

  if (index === 0) {
    return (
      <p className="text-sm leading-7 text-mut">
        كل سطر تخلّصه، الجملة اللي تقولها عنه في المقابلة بتظهر هنا. في الآخر هيبقى معاك شرح الحل كله بالإنجليزي.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {problem.parts.map((part, p) => {
        const sentences: string[] = [];
        for (let i = 0; i < steps.length && i < index; i++) {
          if (steps[i].partIndex === p) sentences.push(steps[i].explain);
        }
        if (sentences.length === 0) return null;
        return (
          <div key={part.id} dir="ltr" lang="en" className="ltr">
            {multiPart && <h3 className="text-sm font-semibold text-gold">{part.title}</h3>}
            <p className="text-[15px] leading-8">{sentences.join(" ")}</p>
          </div>
        );
      })}
      {remaining > 0 && (
        <p className="text-xs text-faint">
          باقي <bdi dir="ltr">{remaining}</bdi> جملة، هتظهر مع سطورها.
        </p>
      )}
    </div>
  );
}
