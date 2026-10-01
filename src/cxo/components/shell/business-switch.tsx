"use client";

import { useQueryClient } from "@tanstack/react-query";
import { cx } from "@/components/ui/primitives";
import type { Business } from "@/lib/api/types";
import { setBusiness, useBusiness } from "@/lib/business";
import { BUSINESSES } from "@/lib/suites";

/**
 * XDS / MIE switch. Changes which business's products, invoices, tickets and
 * reports the portal shows; the wallet, users and profile stay shared.
 * `tone="brand"` sits on the navy navbar, `tone="surface"` on cards.
 */
export function BusinessSwitch({ tone = "brand", className }: { tone?: "brand" | "surface"; className?: string }) {
  const business = useBusiness();
  const qc = useQueryClient();
  const onBrand = tone === "brand";

  function pick(b: Business) {
    if (b === business) return;
    setBusiness(b);
    // product-scoped screens refetch for the new business; cached data for the old one stays warm
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Show products from"
      className={cx(
        "inline-flex shrink-0 gap-0.5 rounded-xl p-1",
        onBrand ? "border border-white/20 bg-white/10" : "bg-surface-2",
        className
      )}
    >
      {(Object.keys(BUSINESSES) as Business[]).map((b) => {
        const active = b === business;
        return (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={active}
            title={BUSINESSES[b].description}
            onClick={() => pick(b)}
            className={cx(
              "min-h-8 rounded-lg px-3 text-[12px] font-bold tracking-[0.6px] transition-colors duration-200 ease-mettus",
              onBrand
                ? active
                  ? "bg-white text-brand-navy"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
                : active
                  ? "bg-surface text-ink shadow-card"
                  : "text-muted hover:text-ink"
            )}
          >
            {BUSINESSES[b].name}
          </button>
        );
      })}
    </div>
  );
}
