import Link from "next/link";
import { SYSTEM_NAME, systemOfGroup } from "@/data/pipelines";
import { getProblem } from "@/data/problems";
import type { Problem } from "@/data/types";
import { countText, RULES } from "@/lib/arabic";
import { problemHref } from "@/lib/routes";
import type { Mode } from "@/lib/store";
import { Section } from "./Section";

function EnglishList({ items }: { items: string[] }) {
  return (
    <ul dir="ltr" lang="en" className="ltr list-disc space-y-1.5 pl-5 text-sm leading-6">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * The statement and its examples. In Recall and Exam it also names the
 * functions or components to write: the hidden tests and the preview
 * look for them by name.
 */
export function StatementSection({ problem, mode }: { problem: Problem; mode: Mode }) {
  // An output question has no parts: there is nothing to write.
  const parts = problem.kind === "output" ? [] : problem.parts;
  const multiPart = parts.length > 1;
  // A pipeline exercise has the same exercise in the other CI system.
  const twin = problem.kind === "config" && problem.twin !== undefined ? getProblem(problem.twin) : undefined;
  const twinSystem = twin ? systemOfGroup(twin.group) : null;

  return (
    <Section title="المطلوب" openOnMobile>
      <p dir="ltr" lang="en" className="ltr text-[15px] leading-7">
        {problem.statement}
      </p>
      {problem.examples && problem.examples.length > 0 && (
        <pre className="code-block mt-3">
          <code>{problem.examples.join("\n")}</code>
        </pre>
      )}
      {problem.kind === "test" && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs font-semibold text-mut">الملفات</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className="flex flex-wrap items-baseline gap-x-2">
              <code className="inline-code">{problem.testFile.slice(1)}</code>
              <span className="text-xs text-mut">الاختبار، وده اللي بتكتبه</span>
            </li>
            {Object.keys(problem.subject).map((path) => (
              <li key={path} className="flex flex-wrap items-baseline gap-x-2">
                <code className="inline-code">{path.slice(1)}</code>
                <span className="text-xs text-mut">الكود اللي بتختبره، في التاب اللي جنب الـ editor</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-mut">
            التمرين بيتحل لما اختبارك ينجح على الكود ده، ويفشل على <bdi dir="ltr">{problem.buggy.length}</bdi> نسخ
            فيها bug.
          </p>
        </div>
      )}
      {problem.kind === "config" && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs font-semibold text-mut">الملف</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className="flex flex-wrap items-baseline gap-x-2">
              <code className="inline-code">{problem.file}</code>
              <span className="text-xs text-mut">
                {problem.starter === undefined
                  ? "بتكتبه إنت"
                  : mode === "learn"
                    ? "النسخة المتصلّحة، بتكتبها إنت"
                    : "بيفتح بالمشاكل اللي فيه، وإنت بتصلّحه"}
              </span>
            </li>
            {problem.starter !== undefined && mode === "learn" && (
              <li className="flex flex-wrap items-baseline gap-x-2">
                <code className="inline-code">{problem.file}.broken</code>
                <span className="text-xs text-mut">الملف البايظ، في التاب اللي جنب الـ editor</span>
              </li>
            )}
            {problem.given !== undefined && (
              <li className="flex flex-wrap items-baseline gap-x-2">
                <code className="inline-code">{problem.given.file}</code>
                <span className="text-xs text-mut">الملف اللي بتترجمه، في التاب اللي جنب الـ editor</span>
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs leading-5 text-mut">
            مفيش حاجة بتتبني أو بتتشغّل هنا. التمرين بيتحل لما الملف يعدّي {countText(problem.rules.length, RULES)}.
          </p>
          {twin && twinSystem && (
            <p className="mt-2 text-xs leading-5 text-mut">
              نفس الـ pipeline في <bdi dir="ltr">{SYSTEM_NAME[twinSystem]}</bdi>:{" "}
              <Link href={problemHref(twin, mode)} dir="ltr" lang="en" className="text-gold hover:underline">
                {twin.title}
              </Link>
            </p>
          )}
        </div>
      )}
      {mode !== "learn" && problem.kind !== "test" && problem.kind !== "config" && parts.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs font-semibold text-mut">
            {problem.kind === "react" ? "المطلوب تكتبه، بالأسماء دي" : "الـ tests هتنادي الدوال بالأسماء دي"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {parts.map((part) => (
              <li key={part.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <code className="inline-code">{part.signature}</code>
                {multiPart && (
                  <bdi dir="ltr" lang="en" className="text-xs text-mut">
                    {part.title}
                  </bdi>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/** Questions to ask first, and the edge cases. Not shown in Exam. */
export function AskSections({ problem, startClosed = false }: { problem: Problem; startClosed?: boolean }) {
  return (
    <>
      <Section title="اسأل الأول" startClosed={startClosed}>
        <EnglishList items={problem.askFirst} />
      </Section>
      <Section title="Edge cases" startClosed={startClosed}>
        <EnglishList items={problem.edgeCases} />
      </Section>
    </>
  );
}
