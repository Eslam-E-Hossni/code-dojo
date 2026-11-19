"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { SYSTEM_NAME, systemOfGroup, type CiSystem } from "@/data/pipelines";
import { getProblem } from "@/data/problems";
import type { ConfigProblem } from "@/data/types";
import { solutionText } from "@/lib/steps";
import { DockerReference } from "./DockerReference";
import { PipelineReference } from "./PipelineReference";

/** The CI system of a pipeline exercise, or null for any other config file. */
function systemOf(problem: ConfigProblem): CiSystem | null {
  return systemOfGroup(problem.group);
}

/** The reference tab of a config exercise, when its track has one. */
export function configReference(problem: ConfigProblem): { label: string; content: ReactNode } | null {
  const system = systemOf(problem);
  if (system !== null) return { label: "المقارنة", content: <PipelineReference current={system} /> };
  if (problem.language === "dockerfile") return { label: "الأوامر", content: <DockerReference /> };
  return null;
}

export interface SideFiles {
  /** The files to read next to the editor, by path. */
  files: Record<string, string>;
  notes: { own: string; other: string };
}

/**
 * The read-only files of a config exercise:
 * - the pipeline to translate, in every mode
 * - the broken file of "fix this file", in Learn only (Recall and Exam open it in the editor)
 */
export function sideFiles(problem: ConfigProblem, learning: boolean): SideFiles | null {
  if (problem.given !== undefined) {
    return {
      files: { ["/" + problem.given.file]: problem.given.code },
      notes: { own: "بتكتبه إنت", other: "الملف اللي بتترجمه، للقراءة بس" },
    };
  }
  if (learning && problem.starter !== undefined) {
    return {
      files: { ["/" + problem.file + ".broken"]: problem.starter },
      notes: { own: "النسخة المتصلّحة، بتكتبها إنت", other: "الملف البايظ، للقراءة بس" },
    };
  }
  return null;
}

function TwinFile({ problem, current }: { problem: ConfigProblem; current: boolean }) {
  const system = systemOf(problem);
  return (
    <figure className="min-w-0">
      <figcaption dir="ltr" className={"mb-1 text-left text-xs font-semibold " + (current ? "text-gold" : "text-mut")}>
        {system ? SYSTEM_NAME[system] : ""} · <span className="font-mono font-normal">{problem.file}</span>
      </figcaption>
      <pre className="code-block max-h-[32rem] overflow-y-auto">
        <code>{solutionText(problem)}</code>
      </pre>
    </figure>
  );
}

/**
 * After a pipeline exercise: the same pipeline in the other CI system, next
 * to the one just written. It stays folded until asked for, so it does not
 * give the other exercise away by accident.
 */
export function TwinCard({ problem }: { problem: ConfigProblem }) {
  const [open, setOpen] = useState(false);
  const twin = problem.twin === undefined ? undefined : getProblem(problem.twin);
  const system = systemOf(problem);
  if (!twin || twin.kind !== "config" || system === null) return null;
  const other = systemOf(twin);
  if (other === null) return null;

  const github = system === "github" ? problem : twin;
  const azure = system === "github" ? twin : problem;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="text-sm font-semibold text-mut">
        نفس الـ pipeline في <bdi dir="ltr">{SYSTEM_NAME[other]}</bdi>
      </h2>
      {open ? (
        // Left-to-right, so GitHub Actions stays on the left on every screen.
        <div dir="ltr" className="mt-3 grid gap-3 lg:grid-cols-2">
          <TwinFile problem={github} current={system === "github"} />
          <TwinFile problem={azure} current={system === "azure"} />
        </div>
      ) : (
        <p className="mt-2 text-[15px] leading-7">
          قبل ما تبص: قول بصوت عالي إيه اللي هيتغير لو كتبت الملف ده في <bdi dir="ltr">{SYSTEM_NAME[other]}</bdi>. وبعدين
          قارن.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-line px-3 py-1 text-sm text-gold hover:bg-raised"
          >
            وريني الملفين جنب بعض
          </button>
        )}
        <Link href={"/problem/" + twin.id} className="rounded-lg border border-line px-3 py-1 text-sm hover:bg-raised">
          اكتبه بنفسك:{" "}
          <bdi dir="ltr" lang="en" className="text-mut">
            {twin.title}
          </bdi>
        </Link>
      </div>
    </section>
  );
}
