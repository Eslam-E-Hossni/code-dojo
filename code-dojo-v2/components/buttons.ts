/** Button looks shared by the practice screens. */

const BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_PRIMARY = BUTTON + " border-gold bg-gold text-bg hover:bg-gold/90";
export const BUTTON_PLAIN = BUTTON + " border-line bg-panel text-ink hover:bg-raised";
export const BUTTON_DANGER = BUTTON + " border-bad/50 bg-bad/10 text-bad hover:bg-bad/20";
