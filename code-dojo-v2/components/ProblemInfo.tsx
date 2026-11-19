import type { Problem } from "@/data/types";
import { Section } from "./Section";
import { Text } from "./Text";

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * The statement, its examples, and the names that cannot change: the
 * hidden tests call the functions by these names. Every other name is
 * the learner's choice.
 */
export function StatementSection({ problem }: { problem: Problem }) {
  // An output question has nothing to write, so it has no names to keep.
  const parts = problem.kind === "code" ? problem.parts : [];
  const multiPart = parts.length > 1;
  // A React problem also says what must be on the page: the hidden tests look for it.
  const screen = problem.kind === "code" && problem.react !== undefined ? problem.react.screen : [];
  return (
    <Section title="The task" openOnMobile>
      <p className="text-[15px] leading-7">{problem.statement}</p>
      {problem.examples && problem.examples.length > 0 && (
        <pre className="code-block mt-3">
          <code>{problem.examples.join("\n")}</code>
        </pre>
      )}
      {parts.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs font-semibold text-mut">
            {multiPart ? "Write these, with these names" : "Write this, with this name"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {parts.map((part) => (
              <li key={part.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <code className="inline-code">{part.signature}</code>
                {multiPart && <span className="text-xs text-mut">{part.title}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-mut">
            The hidden tests {screen.length > 0 ? "use" : "call"} {multiPart ? "these names" : "this name"}. Every other
            name is your choice.
          </p>
        </div>
      )}
      {screen.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs font-semibold text-mut">What the hidden tests look for</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6">
            {screen.map((item) => (
              <li key={item}>
                <Text text={item} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/** Questions to ask before coding, and the edge cases. Not shown in Exam. */
export function AskSections({ problem, startClosed = false }: { problem: Problem; startClosed?: boolean }) {
  return (
    <>
      <Section title="Ask first" startClosed={startClosed}>
        <List items={problem.askFirst} />
      </Section>
      <Section title="Edge cases" startClosed={startClosed}>
        <List items={problem.edgeCases} />
      </Section>
    </>
  );
}

/** A React problem: what to try by hand in the live preview. Nothing for other problems. */
export function TryItSection({ problem, startClosed = false }: { problem: Problem; startClosed?: boolean }) {
  if (problem.kind !== "code" || problem.react === undefined || problem.react.tryIt.length === 0) return null;
  return (
    <Section title="Try it in the preview" startClosed={startClosed}>
      <List items={problem.react.tryIt} />
    </Section>
  );
}

/** A "find the bugs" exercise: the component as it was given, with its bugs. */
export function StarterSection({ problem }: { problem: Problem }) {
  if (problem.kind !== "code" || problem.react === undefined || problem.react.starter === undefined) return null;
  return (
    <Section title="The component to review" openOnMobile>
      <p className="text-xs leading-5 text-mut">This is the code with the bugs. We write the fixed one.</p>
      <pre className="code-block mt-2 max-h-80 overflow-auto text-xs leading-5">
        <code>{problem.react.starter}</code>
      </pre>
    </Section>
  );
}
