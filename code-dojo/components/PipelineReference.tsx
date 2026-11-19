import { PIPELINE_CONCEPTS, SYSTEM_NAME, type CiSystem } from "@/data/pipelines";
import { Mixed } from "./Mixed";

function Snippet({ system, code, current }: { system: CiSystem; code: string; current: boolean }) {
  return (
    <figure className="min-w-0">
      <figcaption
        dir="ltr"
        className={"mb-1 text-left text-xs font-semibold " + (current ? "text-gold" : "text-mut")}
      >
        {SYSTEM_NAME[system]}
      </figcaption>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

/**
 * The same nine ideas in GitHub Actions and in Azure Pipelines, side by
 * side: trigger, job, step, runner, variables, secrets, cache, artifact,
 * environment. GitHub Actions is always on the left.
 */
export function PipelineReference({ current }: { current: CiSystem }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-mut">
        نفس الفكرة في النظامين. النظام اللي بتكتب بيه دلوقتي اسمه متلوّن.
      </p>
      {PIPELINE_CONCEPTS.map((concept) => (
        <section key={concept.id} aria-labelledby={"concept-" + concept.id} className="rounded-xl border border-line bg-raised p-3">
          <h3 id={"concept-" + concept.id} className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
            <bdi dir="ltr" lang="en">
              {concept.title}
            </bdi>
            <span className="text-xs font-normal text-mut">{concept.titleAr}</span>
          </h3>
          {/* Left-to-right, so GitHub Actions stays on the left on every screen. */}
          <div dir="ltr" className="mt-2 grid gap-3 md:grid-cols-2">
            <Snippet system="github" code={concept.github} current={current === "github"} />
            <Snippet system="azure" code={concept.azure} current={current === "azure"} />
          </div>
          <p className="mt-2 text-sm leading-7">
            <Mixed text={concept.note} />
          </p>
        </section>
      ))}
    </div>
  );
}
