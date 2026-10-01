"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icons";
import { MenuItem, Popover } from "@/components/ui/overlay";

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * Row actions menu. The popover is portalled into a fixed box laid over the
 * trigger, because the table sits in an overflow-x container that would
 * otherwise clip it. Esc returns focus to the trigger; ↑/↓ move between items.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const open = rect !== null;

  useEffect(() => {
    if (!open) return;
    boxRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    const close = () => setRect(null);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    const els = Array.from(boxRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
      els[next]?.focus();
    } else if (e.key === "Escape") {
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setRect(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        // keeps the document-level outside-click handler from closing and
        // then instantly reopening the menu when the trigger itself is clicked
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setRect(open ? null : (triggerRef.current?.getBoundingClientRect() ?? null))}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <Icon.More />
      </button>
      {open &&
        createPortal(
          <div
            ref={boxRef}
            className="fixed z-40"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          >
            <Popover open onClose={() => setRect(null)} anchorRef={boxRef} className="w-56 p-1.5">
              <div role="menu" aria-label={label} onKeyDown={onMenuKey}>
                {items.map((item) => (
                  <MenuItem
                    key={item.label}
                    danger={item.danger}
                    onClick={() => {
                      setRect(null);
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </div>
            </Popover>
          </div>,
          document.body
        )}
    </>
  );
}
