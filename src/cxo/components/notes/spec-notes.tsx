"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { cx } from "@/components/ui/primitives";

/**
 * "Spec notes" — reviewer callouts that explain intent and list open
 * questions on each screen. There's no written spec yet, so these stand in
 * for one. Toggled from the account menu; per-viewer, remembered locally.
 */
const KEY = "mettus-spec-notes";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const NotesContext = createContext<{ on: boolean; toggle: () => void }>({ on: false, toggle: () => {} });

export function SpecNotesProvider({ children }: { children: React.ReactNode }) {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => {
    try {
      localStorage.setItem(KEY, read() ? "off" : "on");
    } catch {
      /* storage blocked — notes just won't persist */
    }
    listeners.forEach((l) => l());
  }, []);
  return <NotesContext.Provider value={{ on, toggle }}>{children}</NotesContext.Provider>;
}

export const useSpecNotes = () => useContext(NotesContext);

export function SpecNote({
  title,
  children,
  questions,
  className,
}: {
  title: string;
  children: React.ReactNode;
  questions?: string[];
  className?: string;
}) {
  const { on } = useSpecNotes();
  if (!on) return null;
  return (
    <aside
      className={cx("rounded-xl border border-dashed border-brand/40 bg-brand/[0.04] p-4 text-[13px] leading-relaxed text-ink", className)}
      aria-label={`Spec note: ${title}`}
    >
      <p className="text-xs font-semibold text-brand dark:text-kw">Spec note · {title}</p>
      <div className="mt-1.5 text-muted">{children}</div>
      {questions && questions.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold text-ink">Open questions</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
