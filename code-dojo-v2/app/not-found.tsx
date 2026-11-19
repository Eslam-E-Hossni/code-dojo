import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-bold text-gold">404</p>
      <h1 className="text-2xl font-bold">This page does not exist</h1>
      <p className="text-mut">The link may be wrong, or the problem is not added yet.</p>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-xl border border-gold bg-gold px-4 text-sm font-semibold text-bg hover:bg-gold/90"
      >
        All problems
      </Link>
    </main>
  );
}
