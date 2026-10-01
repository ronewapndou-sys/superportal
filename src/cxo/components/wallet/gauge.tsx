"use client";

import { useId } from "react";

/**
 * Circular score gauge (style guide: brand-gradient stroke, tnum value in
 * the centre). `value` is 0–1. The ring is decorative; the numbers are
 * repeated as text for assistive tech via `label`.
 */
export function Gauge({
  value,
  label,
  children,
  size = 188,
}: {
  value: number;
  label: string;
  children: React.ReactNode;
  size?: number;
}) {
  const raw = useId();
  const id = `g${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--brand-blue)" }} />
            <stop offset="100%" style={{ stopColor: "var(--brand-mid)" }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${id})`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-mettus"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
