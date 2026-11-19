import { Fragment, type ReactNode } from "react";

/**
 * A run of Latin text inside an Arabic sentence: it starts with a letter or
 * digit, may contain code punctuation and spaces, and ends on a letter,
 * digit or closing bracket. "fn.apply(this, args)" is one run.
 */
const LATIN_RUN =
  /[A-Za-z0-9_$][A-Za-z0-9_$.\-()[\]{}=<>+*/!&|,:;'"?%^~ ]*[A-Za-z0-9_$)\]}'"]|[A-Za-z0-9_$]/g;

function isolateLatin(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    const at = match.index;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <bdi key={at} dir="ltr">
        {match[0]}
      </bdi>,
    );
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Arabic text that may contain English terms and code.
 * - `backticks` become inline code, left-to-right.
 * - Any other Latin run is isolated, so the sentence never gets reordered.
 */
export function Mixed({ text }: { text: string }) {
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="inline-code">
            {part}
          </code>
        ) : (
          <Fragment key={i}>{isolateLatin(part)}</Fragment>
        ),
      )}
    </>
  );
}
