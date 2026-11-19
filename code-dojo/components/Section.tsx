"use client";

import { useState, type ReactNode } from "react";

interface Props {
  title: ReactNode;
  /** Open on phones before the learner touches it. Always open on laptops. */
  openOnMobile?: boolean;
  /** On laptops, take the free height of the column and scroll inside. */
  fill?: boolean;
  /** Folded on every screen size until the learner opens it. */
  startClosed?: boolean;
  children: ReactNode;
}

const FILL_ROOT = " lg:flex lg:min-h-44 lg:flex-1 lg:flex-col";
const FILL_BODY = "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col";

/** A card that can be folded away. On small screens it saves room for the editor. */
export function Section({ title, openOnMobile = false, fill = false, startClosed = false, children }: Props) {
  // null = not touched yet: CSS picks the default for the screen size.
  const [open, setOpen] = useState<boolean | null>(startClosed ? false : null);

  const toggle = () => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const current = open ?? (isDesktop || openOnMobile);
    setOpen(!current);
  };

  const shown = "block " + (fill ? FILL_BODY : "");
  const auto = openOnMobile ? shown : "hidden " + (fill ? FILL_BODY : "lg:block");
  const bodyClass = open === null ? auto : open ? shown : "hidden";

  const chevronClass =
    open === null
      ? openOnMobile
        ? "rotate-180"
        : "lg:rotate-180"
      : open
        ? "rotate-180"
        : "";

  return (
    <section
      className={
        "rounded-2xl border border-line bg-panel" + (fill && open !== false ? FILL_ROOT : " shrink-0")
      }
    >
      <h2>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open ?? undefined}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-start text-sm font-semibold text-mut"
        >
          <span>{title}</span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={"size-4 shrink-0 transition-transform " + chevronClass}
          >
            <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </h2>
      <div className={bodyClass + " px-4 pb-4"}>{children}</div>
    </section>
  );
}
