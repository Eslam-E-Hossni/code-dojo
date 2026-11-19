"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { problems } from "@/data/problems";
import type { ReactProblem } from "@/data/types";
import { readOfflineProgress, workerUrl, type OfflineProgress, type PrecacheManifest } from "@/lib/offline";
import { solutionText } from "@/lib/steps";

// Sandpack is large, so it is loaded only if the preview still has to be prepared.
const ReactPreview = lazy(() => import("./ReactPreview"));

const IS_DEV = process.env.NODE_ENV !== "production";
const POLL_MS = 2500;
/** Give the page time to settle before the hidden preview starts. */
const WARM_UP_DELAY_MS = 3000;
/** Stop the hidden preview after this long, saved or not. */
const WARM_UP_LIMIT_MS = 90_000;

type Phase = "starting" | "unsupported" | "no-build" | "ready";

/** The worker needs Cache Storage and a secure page: https, or localhost. */
function isSupported(): boolean {
  return "serviceWorker" in navigator && "caches" in window && window.isSecureContext;
}

function firstReactProblem(): ReactProblem | null {
  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];
    if (problem.kind === "react") return problem;
  }
  return null;
}

async function loadManifest(): Promise<PrecacheManifest | null> {
  try {
    const response = await fetch("/precache.json", { cache: "no-store" });
    if (!response.ok) return null;
    const manifest = (await response.json()) as PrecacheManifest;
    return typeof manifest.version === "string" && Array.isArray(manifest.urls) ? manifest : null;
  } catch {
    return null;
  }
}

/**
 * Registers the service worker and says, in one line, how ready the app is
 * to work with no connection.
 *
 * The live React preview is the one part that cannot be listed ahead of
 * time: its bundler decides what to download as it runs. So once, while
 * online, a preview is run out of sight here, and the worker saves what it
 * asked for.
 */
export function OfflineStatus() {
  // This component is drawn in the browser only (see Home), so `navigator` is there.
  const [phase, setPhase] = useState<Phase>(() => (isSupported() ? "starting" : "unsupported"));
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [controlled, setControlled] = useState(false);
  // True when the list of files could not be fetched: there is no connection to the server.
  const [fromSaved, setFromSaved] = useState(false);
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    if (!isSupported()) return;

    let stopped = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const onControl = () => setControlled(navigator.serviceWorker.controller !== null);
    navigator.serviceWorker.addEventListener("controllerchange", onControl);

    (async () => {
      // A production build has a list of its files. Offline, the list cannot
      // be fetched: then the worker that is already installed stays as it is.
      const manifest = IS_DEV ? null : await loadManifest();
      if (stopped) return;
      if (!IS_DEV && manifest === null && navigator.serviceWorker.controller === null) {
        setPhase("no-build");
        return;
      }
      if (!IS_DEV && manifest === null) setFromSaved(true);
      if (IS_DEV || manifest !== null) {
        try {
          await navigator.serviceWorker.register(workerUrl(manifest));
        } catch {
          if (stopped) return;
          setPhase("unsupported");
          return;
        }
      }
      if (stopped) return;
      setPhase("ready");
      onControl();

      const refresh = async () => {
        try {
          const next = await readOfflineProgress(manifest);
          if (!stopped) setProgress(next);
        } catch {
          // Cache Storage can be blocked. The line then keeps its last state.
        }
      };
      await refresh();
      poll = setInterval(refresh, POLL_MS);
    })();

    return () => {
      stopped = true;
      clearInterval(poll);
      navigator.serviceWorker.removeEventListener("controllerchange", onControl);
    };
  }, []);

  // Run one preview out of sight, once, so its files get saved.
  const needsWarmUp = phase === "ready" && controlled && progress !== null && !progress.preview;
  useEffect(() => {
    if (!needsWarmUp || !navigator.onLine) return;
    const start = setTimeout(() => setWarming(true), WARM_UP_DELAY_MS);
    const stop = setTimeout(() => setWarming(false), WARM_UP_DELAY_MS + WARM_UP_LIMIT_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
      setWarming(false);
    };
  }, [needsWarmUp]);

  if (phase === "starting") return <p>بنشوف حالة الشغل من غير نت…</p>;
  if (phase === "unsupported") {
    return <p>المتصفح ده مش بيسمح بالتخزين للشغل من غير نت (محتاج localhost أو https).</p>;
  }
  if (phase === "no-build") {
    return <p>الشغل من غير نت محتاج نسخة مبنية بـ npm run build.</p>;
  }

  const app = progress?.app ?? null;
  const appReady = app !== null && app.saved >= app.total;
  const previewReady = progress?.preview === true;
  const demo = warming ? firstReactProblem() : null;

  return (
    <>
      <p role="status" className="leading-7">
        <span className="font-semibold text-ink">الشغل من غير نت: </span>
        {IS_DEV ? (
          "وضع التطوير، الصفحات بتيجي من السيرفر اللي على جهازك."
        ) : fromSaved ? (
          <span className="text-ok">مفيش اتصال بالسيرفر دلوقتي، وإنت شغال من النسخة المتخزنة.</span>
        ) : app === null ? (
          "بنحسب…"
        ) : appReady ? (
          <span className="text-ok">الصفحات والـ editor متخزنين كلهم.</span>
        ) : (
          <>
            بنخزّن الصفحات والـ editor{" "}
            <bdi dir="ltr">
              {app.saved} / {app.total}
            </bdi>
          </>
        )}{" "}
        {previewReady ? (
          <span className="text-ok">الـ preview بتاع React جاهز.</span>
        ) : warming ? (
          "بنجهّز الـ preview بتاع React في الخلفية…"
        ) : (
          "الـ preview بتاع React لسه محتاج نت أول مرة."
        )}
      </p>
      {demo && (
        // Out of sight and out of reach, but with a real size so the preview runs.
        <div aria-hidden="true" inert className="pointer-events-none fixed -left-[2000px] top-0 h-[240px] w-[360px] opacity-0">
          <Suspense fallback={null}>
            <ReactPreview problem={demo} code={solutionText(demo)} />
          </Suspense>
        </div>
      )}
    </>
  );
}
