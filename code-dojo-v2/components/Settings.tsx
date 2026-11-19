"use client";

import Link from "next/link";
import { use, useState } from "react";
import { browser } from "react-dom";
import type { JudgeQuestion } from "@/lib/checker/check";
import { createJudge, JUDGE_MODEL, lastJudgeProblem } from "@/lib/checker/judge";
import { updateStore, useStore } from "@/lib/store";
import { BUTTON_DANGER, BUTTON_PLAIN, BUTTON_PRIMARY } from "./buttons";

/** The fixed sample that "Test the judge" sends. It has nothing of the learner's in it. */
const SAMPLE: JudgeQuestion = {
  codeSoFar: "function sum(list) {\n  let total = 0;",
  expected: "  for (let i = 0; i < list.length; i++) {",
  line: "  for (const i in list) {",
};

type TestState =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "answer"; equivalent: boolean; reason: string }
  | { kind: "failed"; problem: string };

/** Shows only the start and the end of the key. */
function masked(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  return key.slice(0, 7) + "…" + key.slice(-4);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function SettingsFallback() {
  return <p className="mt-6 text-mut">Reading your settings…</p>;
}

export default function Settings() {
  // Settings are in localStorage, so this part renders in the browser only.
  use(browser("Settings are saved in localStorage."));
  const store = useStore();
  const { judgeEnabled, apiKey } = store.settings;

  const [draft, setDraft] = useState("");
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [confirmErase, setConfirmErase] = useState(false);
  const [erased, setErased] = useState(false);

  const hasKey = apiKey !== "";

  const saveKey = () => {
    const key = draft.trim();
    if (key === "") return;
    updateStore((s) => ({ ...s, settings: { ...s.settings, apiKey: key } }));
    setDraft("");
    setTest({ kind: "idle" });
  };

  const removeKey = () => {
    // Without a key the judge cannot work, so it goes off with it.
    updateStore((s) => ({ ...s, settings: { judgeEnabled: false, apiKey: "" } }));
    setTest({ kind: "idle" });
  };

  const setEnabled = (on: boolean) => {
    updateStore((s) => ({ ...s, settings: { ...s.settings, judgeEnabled: on } }));
  };

  const testJudge = async () => {
    setTest({ kind: "asking" });
    const answer = await createJudge(apiKey)(SAMPLE);
    if (answer === null) setTest({ kind: "failed", problem: lastJudgeProblem() ?? "The AI judge could not be asked." });
    else setTest({ kind: "answer", equivalent: answer.equivalent, reason: answer.reason });
  };

  const eraseProgress = () => {
    updateStore((s) => ({ ...s, points: 0, problems: {} }));
    setConfirmErase(false);
    setErased(true);
  };

  return (
    <div className="mt-6 space-y-4">
      <Card title="AI judge (optional)">
        <p className="text-[15px] leading-7 text-mut">
          The checker decides almost every line by itself, in this browser. Sometimes it cannot tell if your line does
          the same job as the expected one. With the AI judge on, that one line is sent to Claude, and the answer and
          its reason are shown to you. It is off by default.
        </p>

        <div className="rounded-xl border border-line bg-raised p-3 text-sm leading-6">
          <p className="font-semibold">What is sent, and nothing else:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink/90">
            <li>the line you wrote,</li>
            <li>the expected line,</li>
            <li>the code you wrote so far for that function.</li>
          </ul>
          <p className="mt-2 text-mut">
            It goes straight from this browser to the Anthropic API (model <code className="inline-code">{JUDGE_MODEL}</code>
            ). Your API key is saved only in this browser&apos;s localStorage. If there is no key, or the call fails,
            the line is simply not accepted and you get the usual hints.
          </p>
        </div>

        {hasKey ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              Saved key: <code className="inline-code">{masked(apiKey)}</code>
            </p>
            <button type="button" onClick={removeKey} className={BUTTON_DANGER + " h-9"}>
              Remove key
            </button>
          </div>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveKey();
            }}
          >
            <label className="min-w-0 flex-1 basis-64 text-sm">
              <span className="font-semibold">Anthropic API key</span>
              <input
                type="password"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-ant-…"
                className="mt-1 block h-10 w-full rounded-xl border border-line bg-bg px-3 font-mono text-sm text-ink placeholder:text-faint"
              />
            </label>
            <button type="submit" disabled={draft.trim() === ""} className={BUTTON_PRIMARY}>
              Save key
            </button>
          </form>
        )}

        <label className={"flex items-start gap-3 rounded-xl border border-line bg-raised p-3 " + (hasKey ? "cursor-pointer" : "opacity-60")}>
          <input
            type="checkbox"
            checked={judgeEnabled && hasKey}
            disabled={!hasKey}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-gold"
          />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Use the AI judge</span>
            <span className="mt-0.5 block text-sm leading-6 text-mut">
              {hasKey
                ? "Asked only when the checker and the hidden tests cannot decide."
                : "Save a key first. Without a key the judge stays off."}
            </span>
          </span>
        </label>

        {hasKey && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void testJudge()} disabled={test.kind === "asking"} className={BUTTON_PLAIN}>
                {test.kind === "asking" ? "Asking…" : "Test the judge"}
              </button>
              <p className="min-w-0 flex-1 basis-56 text-xs leading-5 text-mut">
                Sends one fixed sample question (shown below), to see that the key works. It uses a few tokens of your
                API credit.
              </p>
            </div>
            <pre className="code-block text-[12px]">
              <code>
                {"code so far:\n" + SAMPLE.codeSoFar + "\n\nexpected line:\n" + SAMPLE.expected + "\n\nline to judge:\n" + SAMPLE.line}
              </code>
            </pre>
            {test.kind === "answer" && (
              <p role="status" className="rounded-xl border border-ok/40 bg-ok/10 px-3 py-2 text-sm leading-6">
                <span className="font-semibold text-ok">The key works.</span> The judge said{" "}
                <code className="inline-code">{"equivalent: " + String(test.equivalent)}</code>: {test.reason}
              </p>
            )}
            {test.kind === "failed" && (
              <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm leading-6 text-bad">
                {test.problem}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card title="Self-check">
        <p className="text-[15px] leading-7 text-mut">
          Runs every reference solution against its hidden tests, and every reference line through the checker, in this
          browser. Use it if something looks wrong, to see if the runner works here.
        </p>
        <Link href="/self-check" className={BUTTON_PLAIN}>
          Open the self-check
        </Link>
      </Card>

      <Card title="Saved data">
        <p className="text-[15px] leading-7 text-mut">
          Your progress and these settings are kept in this browser&apos;s localStorage. Nothing is sent to a server:
          the app has no backend.
        </p>
        {confirmErase ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-mut">Erase all points and progress? This cannot be undone.</span>
            <button type="button" onClick={eraseProgress} className={BUTTON_DANGER}>
              Yes, erase
            </button>
            <button type="button" onClick={() => setConfirmErase(false)} className={BUTTON_PLAIN}>
              No
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setErased(false);
                setConfirmErase(true);
              }}
              className={BUTTON_PLAIN}
            >
              Erase all progress
            </button>
            {erased && (
              <span role="status" className="text-sm text-ok">
                Progress erased. Your settings were kept.
              </span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
