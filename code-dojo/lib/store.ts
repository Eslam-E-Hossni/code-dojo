"use client";

import { useSyncExternalStore } from "react";
import type { LearnSession } from "./learn";

/** All progress lives in one localStorage entry. */
const STORAGE_KEY = "code-dojo:v1";

/** learn, recall and exam are the three modes. output is the single mode of an output question. */
export type Mode = "learn" | "recall" | "exam" | "output";

export interface RunRecord {
  /** ISO date of when the session finished. */
  at: string;
  mode: Mode;
  points: number;
  max: number;
  /** Recall and Exam: how many times the tests were run before all passed. */
  runs?: number;
  /** Exam: the time taken. */
  seconds?: number;
}

/** Unfinished work in Recall or Exam. */
export interface PracticeDraft {
  code: string;
  /** How many times the tests were run in this attempt. */
  runs: number;
  /** Exam only: when the timer started, in ms since 1970. */
  startedAt?: number;
}

export interface ProblemProgress {
  /** An unfinished Learn session, so a reload does not lose it. */
  learn?: LearnSession;
  recall?: PracticeDraft;
  exam?: PracticeDraft;
  /** The prediction typed so far in an output question. */
  prediction?: string;
  /** Keys of steps that had to be revealed. They come back first. */
  weak: string[];
  /** Keys of steps that needed a hint. The drill uses them when no step is weak. */
  shaky?: string[];
  /** Finished sessions, oldest first. */
  runs: RunRecord[];
}

/** A finished 5-minute drill. */
export interface DrillRecord {
  /** ISO date of when the drill finished. */
  at: string;
  points: number;
  max: number;
}

export interface Store {
  version: 1;
  /** Points from finished sessions and drills. */
  points: number;
  problems: Record<string, ProblemProgress>;
  /** Finished drills, oldest first. They count for the streak. */
  drills?: DrillRecord[];
}

const EMPTY: Store = { version: 1, points: 0, problems: {} };
/** A store with no progress: what a first visit looks like. */
export const EMPTY_STORE = EMPTY;
const EMPTY_PROGRESS: ProblemProgress = { weak: [], runs: [] };

let cache: Store | null = null;
const listeners = new Set<() => void>();

function read(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Store;
    if (parsed.version !== 1 || typeof parsed.problems !== "object") return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): Store {
  if (cache === null) cache = read();
  return cache;
}

function getServerSnapshot(): Store {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep two open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The saved progress right now, outside of React. */
export function getStore(): Store {
  return getSnapshot();
}

export function updateStore(change: (store: Store) => Store): void {
  const next = change(getSnapshot());
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked. The session still works in memory.
  }
  for (const listener of listeners) listener();
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function progressOf(store: Store, problemId: string): ProblemProgress {
  return store.problems[problemId] ?? EMPTY_PROGRESS;
}

/** Returns a new store with one problem's progress changed. */
export function withProgress(
  store: Store,
  problemId: string,
  change: (progress: ProblemProgress) => ProblemProgress,
): Store {
  return {
    ...store,
    problems: {
      ...store.problems,
      [problemId]: change(progressOf(store, problemId)),
    },
  };
}
