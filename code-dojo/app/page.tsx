import { Suspense } from "react";
import Home, { HomeFallback } from "@/components/Home";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <p dir="ltr" className="ltr text-sm font-bold tracking-wide text-gold">
        Code Dojo
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">اكتب الحل من دماغك يا إسلام</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-8 text-mut">
        المدرب بيقولك المطلوب في كل سطر وليه، وإنت اللي بتكتب الكود. مفيش قراءة حلول، فيه كتابة وبس.
      </p>
      {/* Progress and today's date are known only in the browser. Until then the list shows without them. */}
      <Suspense fallback={<HomeFallback />}>
        <Home />
      </Suspense>
    </main>
  );
}
