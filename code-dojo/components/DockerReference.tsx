import { BUILD_VS_RUN, INSTRUCTION_HELP } from "@/data/docker";
import { Mixed } from "./Mixed";

/**
 * What every Dockerfile instruction does, in one line, and when ARG, ENV
 * and NEXT_PUBLIC_ variables exist. The same text shows on hover in the
 * editor; this tab is for a screen with no mouse, and for reading it all
 * at once.
 */
export function DockerReference() {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-mut">
        نفس الشرح بيظهر لما تقف بالماوس على أي instruction في الـ editor.
      </p>

      <dl className="space-y-1.5">
        {INSTRUCTION_HELP.map((item) => (
          <div key={item.keyword} className="flex items-start gap-3 rounded-xl border border-line bg-raised px-3 py-2">
            <dt dir="ltr" className="w-28 shrink-0 font-mono text-[13px] font-semibold leading-7 text-gold">
              {item.keyword}
            </dt>
            <dd className="min-w-0 flex-1 text-sm leading-7">
              <Mixed text={item.text} />
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="build-or-run">
        <h3 id="build-or-run" className="text-sm font-semibold">
          وقت الـ build ولا وقت التشغيل؟
        </h3>
        <dl className="mt-2 space-y-1.5">
          {BUILD_VS_RUN.map((note) => (
            <div key={note.name} className="rounded-xl border border-line bg-raised px-3 py-2">
              <dt className="flex flex-wrap items-baseline gap-x-2">
                <code className="inline-code font-semibold text-gold">{note.name}</code>
                <span className="text-xs font-semibold text-mut">
                  <Mixed text={note.when} />
                </span>
              </dt>
              <dd className="mt-1 text-sm leading-7">
                <Mixed text={note.text} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
