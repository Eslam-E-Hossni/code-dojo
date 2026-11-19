import type { Metadata } from "next";
import Link from "next/link";
import { SelfCheck } from "@/components/SelfCheck";

export const metadata: Metadata = { title: "Self-check" };

export default function SelfCheckPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/" className="inline-block rounded-lg py-2 text-sm font-bold tracking-wide text-gold">
        Code Dojo
      </Link>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Self-check</h1>
      <p className="mt-3 max-w-2xl leading-8 text-mut">
        This page checks the app in the browser you have open now. It runs the reference solution of every problem
        against its hidden tests in the Web Worker, sends every reference line through the smart checker, and runs the
        code of every output question to compare it with its stored lines. If everything is green, the runner and the
        checker work here as they should.
      </p>
      <SelfCheck />
    </main>
  );
}
