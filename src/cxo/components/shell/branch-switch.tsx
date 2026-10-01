"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/overlay";
import { cx } from "@/components/ui/primitives";
import { setBranch } from "@/lib/branch";
import { SUITE_BY_ID } from "@/lib/suites";
import { useAccess } from "@/lib/use-access";

/**
 * Branch picker for people who work at more than one branch. With a single
 * branch it's a plain label; with none it's hidden.
 */
export function BranchSwitch({ className }: { className?: string }) {
  const { branch, myBranches, roleAt, access } = useAccess();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  if (!branch) return null;

  const label = (
    <>
      <Icon.Bank className="h-4 w-4 shrink-0 text-white/80" />
      <span className="max-w-[120px] truncate 2xl:max-w-[160px]">{branch.name}</span>
    </>
  );

  if (myBranches.length <= 1) {
    return (
      <span className={cx("inline-flex min-h-10 items-center gap-2 px-2 text-[13px] font-medium text-white/90", className)} title="Your division">
        {label}
      </span>
    );
  }

  return (
    <div ref={ref} className={cx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Division: ${branch.name}. Change division`}
        className="inline-flex min-h-10 items-center gap-2 rounded-[10px] px-2.5 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10"
      >
        {label}
        <Icon.ChevronDown className="h-4 w-4 text-white/70" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="left" className="w-80 p-2">
        <p className="px-3 pt-2 pb-2 text-xs text-muted">Choose the division you&apos;re working in. Products change to match its access.</p>
        <ul role="listbox" aria-label="Your divisions">
          {myBranches.map((b) => {
            const active = b.id === branch.id;
            const products = access[b.id] ?? [];
            return (
              <li key={b.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setBranch(b.id);
                    setOpen(false);
                  }}
                  className={cx(
                    "flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    active ? "bg-brand/[0.06]" : "hover:bg-ink/5"
                  )}
                >
                  <span className="mt-0.5 h-4 w-4 shrink-0 text-brand dark:text-kw">{active && <Icon.Check className="h-4 w-4" />}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">{b.name}</span>
                    <span className="block text-xs text-muted">
                      {b.code}. {roleAt(b.id)?.name ?? "No role"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {products.length
                        ? `${products.length} ${products.length === 1 ? "product" : "products"}: ${products
                            .slice(0, 3)
                            .map((p) => SUITE_BY_ID[p].short)
                            .join(", ")}${products.length > 3 ? " and more" : ""}`
                        : "No products at this division"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}
