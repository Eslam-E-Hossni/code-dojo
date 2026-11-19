/**
 * Layer 6: the optional AI judge.
 *
 * It is off by default. When the learner turns it on in Settings and pastes
 * their own Anthropic API key, a line that the other layers could not place
 * is sent to Claude with one question: does it do the same job as the
 * expected line?
 *
 * Only three things are ever sent: the line, the expected line, and the
 * code so far. No name, no progress, nothing else. The key stays in this
 * browser (localStorage) and goes only to the Anthropic API, straight from
 * the browser.
 *
 * Any failure (no key, no network, a refusal, a wrong key) gives null,
 * and the app falls back to "not accepted" with the usual hints.
 */

import type { JudgeAnswer, JudgeQuestion } from "./check";

/** The model that judges. */
export const JUDGE_MODEL = "claude-opus-5-5";

/** What the judge is told. The question itself is built in `questionText`. */
export const JUDGE_SYSTEM = [
  "You check one step of a coding exercise for a learner who writes a known solution from memory, line by line.",
  "You get the code written so far, the line the reference solution has next, and the line the learner wrote.",
  "Say whether the learner's line can replace the expected line: with it, the finished solution must still be correct and behave the same in every case that matters for this exercise.",
  "Different names, formatting and style do not matter. A different result, a missing case, or a line that does only part of the job does matter.",
  "When in doubt, answer false.",
  "Give the reason in one short sentence of simple English, for the learner. Do not show the expected line in the reason.",
].join(" ");

export function questionText(question: JudgeQuestion): string {
  return [
    "Code so far:",
    "```",
    question.codeSoFar === "" ? "(nothing yet)" : question.codeSoFar,
    "```",
    "",
    "Expected next line:",
    "```",
    question.expected.trim(),
    "```",
    "",
    "The learner wrote:",
    "```",
    question.line.trim(),
    "```",
  ].join("\n");
}

/** Why the last call did not give an answer, for the Settings page. Null after a call that worked. */
let lastProblem: string | null = null;

export function lastJudgeProblem(): string | null {
  return lastProblem;
}

/**
 * Makes the judge for one API key. The SDK is loaded only when the judge
 * is really asked, so it costs nothing while the judge is off.
 */
export function createJudge(apiKey: string): (question: JudgeQuestion) => Promise<JudgeAnswer | null> {
  return async (question) => {
    const [{ default: Anthropic }, { betaZodOutputFormat }, { z }] = await Promise.all([
      import("@anthropic-ai/sdk"),
      import("@anthropic-ai/sdk/helpers/beta/zod"),
      import("zod"),
    ]);

    const Verdict = z.object({ equivalent: z.boolean(), reason: z.string() });
    // The key is the learner's own, typed into their own browser, so the browser may hold it.
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 30_000 });

    try {
      const response = await client.beta.messages.parse({
        model: JUDGE_MODEL,
        // Room for a little thinking and one short JSON object.
        max_tokens: 2000,
        system: JUDGE_SYSTEM,
        messages: [{ role: "user", content: questionText(question) }],
        output_config: { effort: "low", format: betaZodOutputFormat(Verdict) },
        // If the model declines the request, the API retries it on its default fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

      if (response.stop_reason === "refusal") {
        lastProblem = "The model declined to answer this one.";
        return null;
      }
      const verdict = response.parsed_output;
      if (verdict === null) {
        lastProblem = "The answer was not in the expected shape.";
        return null;
      }
      lastProblem = null;
      return { equivalent: verdict.equivalent, reason: verdict.reason.trim() };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) lastProblem = "The API key was not accepted.";
      else if (error instanceof Anthropic.PermissionDeniedError) lastProblem = "This API key may not use this model.";
      else if (error instanceof Anthropic.RateLimitError) lastProblem = "Too many requests right now. Try again in a moment.";
      else if (error instanceof Anthropic.APIConnectionError) lastProblem = "The Anthropic API could not be reached. Check the connection.";
      else if (error instanceof Anthropic.APIError) lastProblem = "The API answered with an error (" + String(error.status) + ").";
      else lastProblem = "The AI judge could not be asked.";
      return null;
    }
  };
}
