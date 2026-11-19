import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Drill from "@/components/Drill";

export const metadata: Metadata = { title: "دريل 5 دقايق" };

/** The 5-minute drill: three weak steps from three different problems. */
export default function DrillPage() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
          <Link href="/" dir="ltr" className="rounded-lg font-bold text-gold" aria-label="Code Dojo، كل المسائل">
            Code Dojo
          </Link>
          <span aria-hidden="true" className="text-faint">
            /
          </span>
          <h1 className="text-base font-semibold">دريل 5 دقايق</h1>
          <span className="ms-auto text-xs text-mut">3 سطور ضعيفة من 3 مسائل مختلفة</span>
        </div>
      </header>
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
            <p className="rounded-2xl border border-line bg-panel p-4 text-mut">بنختار السطور…</p>
          </main>
        }
      >
        <Drill />
      </Suspense>
    </>
  );
}
