"use client";

import { useEffect, useState } from "react";

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** formatted value shown at the end of the row */
  display: string;
  /** a CSS colour expression, e.g. "var(--chart-green)" */
  color: string;
  sub?: string;
}

/**
 * Horizontal bars. Values are real text, so the list reads fine without the
 * bars. Bars grow with transform: scaleX — never by animating width.
 */
export function HBarChart({ items, label }: { items: BarItem[]; label: string }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul aria-label={label} className="space-y-4">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-medium text-ink">{item.label}</span>
            <span className="shrink-0 font-semibold text-ink tabular-nums">{item.display}</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <span
              className="absolute inset-0 origin-left rounded-full transition-transform duration-700 ease-mettus"
              style={{ backgroundColor: item.color, transform: `scaleX(${grown ? item.value / max : 0})` }}
            />
          </div>
          {item.sub && <p className="mt-1 text-xs text-muted">{item.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
