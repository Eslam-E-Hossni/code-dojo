import type { Metadata } from "next";
import { Suspense } from "react";
import { ProblemScreen, ScreenShell } from "@/components/ProblemScreen";
import { getProblem, problems } from "@/data/problems";

const MODE_NAMES: Record<string, string> = { recall: "Recall", exam: "Exam" };

export function generateStaticParams() {
  const params: { id: string; mode: string }[] = [];
  for (const problem of problems) {
    if (problem.kind === "output") continue;
    for (const mode of Object.keys(MODE_NAMES)) {
      params.push({ id: problem.id, mode });
    }
  }
  return params;
}

export async function generateMetadata(props: PageProps<"/problem/[id]/[mode]">): Promise<Metadata> {
  const { id, mode } = await props.params;
  const problem = getProblem(id);
  if (!problem || problem.kind === "output" || !MODE_NAMES[mode]) return { title: "مش موجودة" };
  return { title: problem.title + " · " + MODE_NAMES[mode] };
}

/** Recall and Exam. */
export default function ProblemModePage(props: PageProps<"/problem/[id]/[mode]">) {
  return (
    <Suspense fallback={<ScreenShell />}>
      <ProblemScreen params={props.params} />
    </Suspense>
  );
}
