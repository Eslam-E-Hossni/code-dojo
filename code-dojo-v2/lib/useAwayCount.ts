"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Next keeps a page that was just left in the document, hidden, and brings
 * it back as it was on Back or Forward. When a page is put away like that,
 * its effects are cleaned up, and the cleanup of a Monaco editor throws
 * the editor away. The page that comes back would then hold a dead editor.
 *
 * So an editor gets this number as its React key. It goes up each time the
 * page is put away, and a fresh editor is built for the page that comes
 * back. `onAway` runs at that moment, to keep what the editor held and to
 * close what should not stay open.
 */
export function useAwayCount(onAway: () => void): number {
  const [count, setCount] = useState(0);
  const latest = useRef({ onAway });
  useEffect(() => {
    latest.current.onAway = onAway;
  });

  useLayoutEffect(() => {
    const box = latest.current;
    return () => {
      box.onAway();
      setCount((n) => n + 1);
    };
  }, []);

  return count;
}
