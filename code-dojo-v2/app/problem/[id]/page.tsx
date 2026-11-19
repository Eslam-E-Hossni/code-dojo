import type { Metadata } from "next";
import { Suspense } from "react";
import { ProblemScreen, ScreenShell } from "@/components/ProblemScreen";
import { getProblem, problems } from "@/data/problems";

export function generateStaticParams() {
  return problems.map((problem) => ({ id: problem.id }));
}

export async function generateMetadata(props: PageProps<"/problem/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const problem = getProblem(id);
  return { title: problem ? problem.title : "Not found" };
}

export default function ProblemPage(props: PageProps<"/problem/[id]">) {
  // The id comes from the URL, so it is read inside Suspense: the page
  // frame can then show at once on navigation.
  return (
    <Suspense fallback={<ScreenShell />}>
      <ProblemScreen params={props.params} />
    </Suspense>
  );
}
