import { useSyncExternalStore } from "react";
import type { Session } from "./api/types";

/**
 * In-memory session holder — nothing goes to browser storage. There's no
 * login screen: on load the portal asks the backend for the session the host
 * portal already established (see SessionGate). In production the
 * token should live in an httpOnly cookie set by the backend.
 */
let current: Session | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setSession(session: Session) {
  current = session;
  emit();
}

export function getSession() {
  return current;
}

export function clearSession() {
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession() {
  return useSyncExternalStore(subscribe, getSession, () => null);
}
