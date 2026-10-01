"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { cx, IconButton } from "./primitives";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Close on Escape and on pointer-down outside `ref`. Shared by menus,
 * popovers and the mobile drawer so every overlay dismisses the same way.
 */
export function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  options: { outside?: boolean } = {}
) {
  const { outside = true } = options;
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    if (outside) document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, ref, outside]);
}

/** Keep Tab / Shift+Tab inside `ref` while active. */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = node.querySelector<HTMLElement>("[data-autofocus]") ?? node.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      // hand focus back to whatever opened the overlay
      previouslyFocused?.focus?.();
    };
  }, [active, ref]);
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDismiss(ref, open, onClose, { outside: false });
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-brand-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "pop-in relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-modal sm:rounded-2xl dark:bg-surface-2",
          size === "md" ? "sm:max-w-lg" : "sm:max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-[-0.3px] text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
            <Icon.X />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Anchored dropdown panel. Caller owns the trigger and `open` state. */
export function Popover({
  open,
  onClose,
  children,
  className,
  align = "right",
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  useDismiss(anchorRef, open, onClose);
  if (!open) return null;
  return (
    <div
      className={cx(
        "pop-in absolute top-full z-40 mt-2 rounded-2xl border border-line bg-surface text-ink shadow-modal dark:bg-surface-2",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  href,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const cls = cx(
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-colors",
    danger ? "text-danger hover:bg-danger-bg" : "text-ink hover:bg-ink/5"
  );
  if (href)
    return (
      <Link href={href} className={cls} onClick={onClick} role="menuitem">
        {children}
      </Link>
    );
  return (
    <button type="button" className={cls} onClick={onClick} role="menuitem">
      {children}
    </button>
  );
}
