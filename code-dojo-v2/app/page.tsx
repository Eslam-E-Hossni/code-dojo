import Link from "next/link";
import { Suspense } from "react";
import Home, { HomeFallback } from "@/components/Home";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold tracking-wide text-gold">Code Dojo</p>
        <Link href="/settings" className="rounded-lg py-2 text-sm font-semibold text-mut hover:text-ink">
          Settings
        </Link>
      </div>
      <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">Write the solution from memory</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-8 text-mut">
        The coach says what we need next and why. You write the code, one line at a time. A line passes when it is
        correct, in your own style and with your own names.
      </p>
      {/* Progress is known only in the browser. Until then the list shows without it. */}
      <Suspense fallback={<HomeFallback />}>
        <Home />
      </Suspense>
    </main>
  );
}
