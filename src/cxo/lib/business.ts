import { useSyncExternalStore } from "react";
import type { Business } from "./api/types";

/**
 * Which Mettus business's products the portal is showing: XDS or MIE.
 * A per-viewer preference, so it lives in localStorage (wrapped — private
 * browsing just falls back to XDS). Everything product-shaped reads it.
 */
const KEY = "mettus-business";
const listeners = new Set<() => void>();

function read(): Business {
  try {
    return localStorage.getItem(KEY) === "mie" ? "mie" : "xds";
  } catch {
    return "xds";
  }
}

export function setBusiness(b: Business) {
  try {
    localStorage.setItem(KEY, b);
  } catch {
    /* storage blocked — the switch still works for this page view */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useBusiness(): Business {
  return useSyncExternalStore(subscribe, read, () => "xds");
}
