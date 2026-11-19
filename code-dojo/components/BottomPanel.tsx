"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

/**
 * checks = the list of things to try in the preview of a React problem.
 * rules = the checklist of a config file, reference = what each instruction does.
 */
export type TabId = "console" | "tests" | "say" | "checks" | "rules" | "reference";

export interface PanelTab {
  id: TabId;
  label: string;
  /** A short count or mark next to the label. */
  badge?: ReactNode;
  content: ReactNode;
}

interface Props {
  tabs: PanelTab[];
  active: TabId;
  onSelect: (id: TabId) => void;
  /** Extra classes for the outer box, for example a fixed height. */
  className?: string;
}

/** The tabbed panel under the editor: Console, Tests, Say it out loud. */
export function BottomPanel({ tabs, active, onSelect, className = "" }: Props) {
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const shown = tabs.find((tab) => tab.id === active) ?? tabs[0];

  // Arrow keys move between tabs. The page is right-to-left, so "left" is next.
  const onKeyDown = (event: KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === shown.id);
    let target = -1;
    if (event.key === "ArrowLeft") target = (index + 1) % tabs.length;
    if (event.key === "ArrowRight") target = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = tabs.length - 1;
    if (target === -1) return;
    event.preventDefault();
    onSelect(tabs[target].id);
    buttons.current[tabs[target].id]?.focus();
  };

  return (
    <section className={"flex min-h-0 flex-col rounded-2xl border border-line bg-panel " + className}>
      <div
        role="tablist"
        aria-label="نتيجة التشغيل"
        onKeyDown={onKeyDown}
        className="flex shrink-0 gap-1 border-b border-line px-2 pt-1.5"
      >
        {tabs.map((tab) => {
          const selected = tab.id === shown.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttons.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={"tab-" + tab.id}
              aria-selected={selected}
              aria-controls={"panel-" + tab.id}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              className={
                "-mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold " +
                (selected ? "border-gold text-ink" : "border-transparent text-mut hover:text-ink")
              }
            >
              {tab.label}
              {tab.badge}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={"panel-" + shown.id}
        aria-labelledby={"tab-" + shown.id}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        {shown.content}
      </div>
    </section>
  );
}
