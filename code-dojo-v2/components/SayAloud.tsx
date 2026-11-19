import type { CodeProblem } from "@/data/types";
import type { FlatStep } from "@/lib/checker/check";

interface Props {
  problem: CodeProblem;
  steps: FlatStep[];
  /** The steps that are finished. */
  done: number[];
}

/**
 * "Say it out loud": the explain sentences of the finished steps, joined
 * into a short walkthrough to say in an interview. A sentence appears only
 * when its step is done, so this tab never gives away a line to come.
 */
export function SayAloud({ problem, steps, done }: Props) {
  const finished = new Set(done);
  const multiPart = problem.parts.length > 1;
  const remaining = steps.length - finished.size;

  if (finished.size === 0) {
    return (
      <p className="text-sm leading-7 text-mut">
        Every time you finish a step, the sentence to say about it in an interview appears here. At the end you have the
        whole solution explained in a few sentences. Read them out loud.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {problem.parts.map((part, p) => {
        const sentences: string[] = [];
        for (const step of steps) {
          if (step.partIndex === p && finished.has(step.index)) sentences.push(step.explain);
        }
        if (sentences.length === 0) return null;
        return (
          <div key={part.id}>
            {multiPart && <h3 className="text-sm font-semibold text-gold">{part.title}</h3>}
            <p className="text-[15px] leading-8">{sentences.join(" ")}</p>
          </div>
        );
      })}
      {remaining > 0 && (
        <p className="text-xs text-faint">
          {remaining} more {remaining === 1 ? "sentence" : "sentences"} to come, each with its step.
        </p>
      )}
    </div>
  );
}
