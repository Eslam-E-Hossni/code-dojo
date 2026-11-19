import type { Difficulty, Tag } from "@/data/types";

const DIFFICULTY: Record<Difficulty, { label: string; tone: string }> = {
  easy: { label: "سهل", tone: "border-ok/40 text-ok" },
  medium: { label: "متوسط", tone: "border-warn/40 text-warn" },
  hard: { label: "صعب", tone: "border-bad/40 text-bad" },
};

const TAG_HELP: Record<Tag, string> = {
  reported: "اتسألت فعلًا في مقابلات",
  likely: "مرشّحة لمستوى Senior",
  polyfill: "اكتب نسختك من دالة جاهزة",
};

const CHIP = "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium";

export function DifficultyChip({ value }: { value: Difficulty }) {
  const item = DIFFICULTY[value];
  return <span className={CHIP + " " + item.tone}>{item.label}</span>;
}

export function TagChip({ value }: { value: Tag }) {
  return (
    <span dir="ltr" title={TAG_HELP[value]} className={CHIP + " border-line text-mut"}>
      {value}
    </span>
  );
}
