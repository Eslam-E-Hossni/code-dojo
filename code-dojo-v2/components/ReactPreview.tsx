"use client";

import { SandpackConsole, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { useEffect, useMemo, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CodeProblem } from "@/data/types";
import { buildPreviewFiles, type PreviewFile } from "@/lib/sandpack";

/** The page of the bundler inside this app (see next.config.ts). */
const BUNDLER_PAGE = "/sandpack/index.html";

interface SandboxProps {
  files: Record<string, PreviewFile>;
  showConsole: boolean;
}

function Sandbox({ files, showConsole }: SandboxProps) {
  return (
    <SandpackProvider
      template="react"
      theme="dark"
      files={files}
      options={{
        // The bundler is served by this app, not by codesandbox.io. It
        // expects to sit at the root of a site; next.config.ts sends its
        // requests to public/sandpack.
        bundlerURL: window.location.origin + "/",
        recompileMode: "delayed",
        recompileDelay: 300,
      }}
      style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}
    >
      <SandpackPreview
        // Without this the frame would open "/", which is this app's home page.
        startRoute={BUNDLER_PAGE}
        showOpenInCodeSandbox={false}
        showRefreshButton
        showNavigator={false}
        style={{ flex: 1, minHeight: 0 }}
      />
      {showConsole && <SandpackConsole standalone={false} resetOnPreviewRestart style={{ height: 130, flexShrink: 0 }} />}
    </SandpackProvider>
  );
}

interface Props {
  problem: CodeProblem;
  /** The code to run as /App.js. */
  code: string;
}

/**
 * The live preview of a React problem, built with Sandpack.
 *
 * Sandpack runs in a React root of its own. In development this app is in
 * StrictMode, which mounts every component twice; Sandpack's loading screen
 * then never goes away. A separate root is not in StrictMode.
 */
export default function ReactPreview({ problem, code }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<Root | null>(null);
  const files = useMemo(() => buildPreviewFiles(problem, code), [problem, code]);
  const showConsole = problem.react?.preview.console === true;

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const container = document.createElement("div");
    container.style.height = "100%";
    parent.appendChild(container);
    const created = createRoot(container);
    root.current = created;

    return () => {
      root.current = null;
      // A root cannot be unmounted while React is busy rendering another one.
      window.setTimeout(() => {
        created.unmount();
        container.remove();
      }, 0);
    };
  }, []);

  // Runs after the effect above, also the first time: the root is there by then.
  useEffect(() => {
    root.current?.render(<Sandbox files={files} showConsole={showConsole} />);
  }, [files, showConsole]);

  return <div ref={host} className="h-full min-h-0" />;
}
