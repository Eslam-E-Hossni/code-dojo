"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";

/**
 * Exam mode shows its timer in the page header. The header and the
 * workspace are drawn in different places of the page, so the header
 * gives a slot here, and the workspace renders the timer into it.
 *
 * This goes through React, not through an id in the document: Next keeps
 * a page you just left in the document, hidden, so an id could point at
 * the header of another page.
 */
interface Slot {
  element: HTMLElement | null;
  setElement: (element: HTMLElement | null) => void;
}

const SlotContext = createContext<Slot | null>(null);

export function ExamClockProvider({ children }: { children: ReactNode }) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ element, setElement }), [element]);
  return <SlotContext value={value}>{children}</SlotContext>;
}

/** The place in the header. On a phone the header scrolls away, so the timer is next to the editor there. */
export function ExamClockSlot() {
  const slot = use(SlotContext);
  return <span ref={slot === null ? undefined : slot.setElement} className="hidden sm:block sm:empty:hidden" />;
}

/** The header slot of this page, or null while there is none. */
export function useExamClockSlot(): HTMLElement | null {
  const slot = use(SlotContext);
  return slot === null ? null : slot.element;
}
