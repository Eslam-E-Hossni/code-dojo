/**
 * Reference data shown after every exercise of the Testing track.
 */

export interface QueryRow {
  /** getBy, queryBy or findBy. */
  query: string;
  /** What happens when nothing matches. */
  noMatch: string;
  /** What happens with one match. */
  oneMatch: string;
  /** What happens with more than one match. */
  manyMatches: string;
  /** Does it wait? */
  waits: string;
  /** When to reach for it. */
  useFor: string;
}

/** The three families of queries in Testing Library. */
export const QUERY_TABLE: QueryRow[] = [
  {
    query: "getBy",
    noMatch: "throws",
    oneMatch: "returns it",
    manyMatches: "throws",
    waits: "no",
    useFor: "something that must be on the screen now",
  },
  {
    query: "queryBy",
    noMatch: "returns null",
    oneMatch: "returns it",
    manyMatches: "throws",
    waits: "no",
    useFor: "proving that something is not there",
  },
  {
    query: "findBy",
    noMatch: "rejects",
    oneMatch: "resolves with it",
    manyMatches: "rejects",
    waits: "yes, up to 1000 ms",
    useFor: "something that appears later, after a request or a timer",
  },
];

export const QUERY_NOTE =
  "For several elements use getAllBy, queryAllBy and findAllBy. They return an array, and queryAllBy returns an empty array when nothing matches.";

export const PHASE_LABEL = {
  arrange: { title: "Arrange", note: "set the scene: render, mocks, data" },
  act: { title: "Act", note: "do what the user or time does" },
  assert: { title: "Assert", note: "check what should be true now" },
} as const;
