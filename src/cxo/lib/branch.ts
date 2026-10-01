import { useSyncExternalStore } from "react";

/**
 * Which of the user's divisions they're working in. Per-viewer preference,
 * so localStorage (wrapped); `useAccess` falls back to a valid division when
 * the stored one isn't theirs any more.
 */
const KEY = "mettus-branch";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setBranch(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* storage blocked — the choice lasts for this page view */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const useStoredBranch = () => useSyncExternalStore(subscribe, read, () => "");
