import type { Metadata } from "next";
import { Suspense } from "react";
import { ProblemScreen, ScreenShell } from "@/components/ProblemScreen";
import { codeProblems, getProblem } from "@/data/problems";

const MODE_NAMES: Record<string, string> = { recall: "Recall", exam: "Exam" };

export function generateStaticParams() {
  const params: { id: string; mode: string }[] = [];
  // An output question has one screen only, so it has no Recall or Exam page.
  for (const problem of codeProblems) {
    for (const mode of Object.keys(MODE_NAMES)) {
      params.push({ id: problem.id, mode });
    }
  }
  return params;
}

export async function generateMetadata(props: PageProps<"/problem/[id]/[mode]">): Promise<Metadata> {
  const { id, mode } = await props.params;
  const problem = getProblem(id);
  if (!problem || problem.kind !== "code" || !MODE_NAMES[mode]) return { title: "Not found" };
  return { title: problem.title + " · " + MODE_NAMES[mode] };
}

/** Recall and Exam. Learn is at /problem/[id]. */
export default function ProblemModePage(props: PageProps<"/problem/[id]/[mode]">) {
  return (
    <Suspense fallback={<ScreenShell />}>
      <ProblemScreen params={props.params} />
    </Suspense>
  );
}
