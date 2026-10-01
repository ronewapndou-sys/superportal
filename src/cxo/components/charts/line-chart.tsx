"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/primitives";
import { count, dayMonth } from "@/lib/format";

export interface LineSeries {
  key: string;
  label: string;
  /** a CSS colour expression, e.g. "var(--chart-blue)" — never raw hex */
  color: string;
  values: number[];
}

const PAD = { top: 14, right: 14, bottom: 30, left: 46 };

/** Round up to a friendly axis maximum (4 ticks of 1/2/2.5/5 × 10ⁿ). */
function niceMax(max: number) {
  if (max <= 0) return 4;
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  return step * 4;
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));

/**
 * Multi-series line + soft area chart in hand-written SVG. The viewBox is
 * sized to the measured container width so text never stretches. Pointer
 * hover or ←/→ on focus moves a crosshair and tooltip across the days.
 */
export function LineChart({
  dates,
  series,
  height = 260,
  label,
  formatDate = dayMonth,
  unit = "day",
}: {
  dates: string[];
  series: LineSeries[];
  height?: number;
  label: string;
  /** axis + tooltip label for one point; monthly charts pass a month formatter */
  formatDate?: (d: string) => string;
  unit?: "day" | "month";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const shown = series.filter((s) => !hidden.has(s.key));
  const n = dates.length;
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const maxY = niceMax(Math.max(0, ...shown.flatMap((s) => s.values)));
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => PAD.top + plotH - (v / maxY) * plotH;

  const paths = shown.map((s) => {
    const line = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const area = `${line} L${x(n - 1).toFixed(1)},${PAD.top + plotH} L${x(0).toFixed(1)},${PAD.top + plotH} Z`;
    return { ...s, line, area };
  });

  const maxLabels = Math.max(2, Math.floor(plotW / 72));
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels));
  const yTicks = [0, 1, 2, 3, 4].map((t) => (maxY / 4) * t);

  const totals = series.map((s) => s.values.reduce((a, b) => a + b, 0));
  const summary = `${label}. ${series.map((s, i) => `${s.label}: ${count(totals[i])} enquiries`).join(", ")}, from ${
    dates[0] ? formatDate(dates[0]) : ""
  } to ${dates[n - 1] ? formatDate(dates[n - 1]) : ""}. Focus the chart and use the arrow keys to read each ${unit}.`;

  function pick(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const px = ((clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - PAD.left) / plotW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (n === 0) return;
    const cur = active ?? n - 1;
    const next =
      e.key === "ArrowLeft" ? cur - 1 : e.key === "ArrowRight" ? cur + 1 : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next === null) return;
    e.preventDefault();
    setActive(Math.min(n - 1, Math.max(0, next)));
  }

  const tipLeft = active === null ? 0 : Math.min(width - 88, Math.max(88, x(active)));
  const activeTotal = active === null ? 0 : shown.reduce((s, ser) => s + (ser.values[active] ?? 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Show or hide products">
        {series.map((s) => {
          const on = !hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setHidden((h) => {
                  const next = new Set(h);
                  if (next.has(s.key)) next.delete(s.key);
                  else next.add(s.key);
                  return next;
                })
              }
              className={cx(
                "inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                on ? "border-line bg-surface text-ink" : "border-dashed border-line bg-transparent text-muted line-through"
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: on ? s.color : "var(--steel)" }} aria-hidden />
              {s.label}
            </button>
          );
        })}
      </div>

      <div
        ref={wrapRef}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        className="relative rounded-lg"
      >
        {shown.length === 0 ? (
          <div className="flex items-center justify-center text-[13px] text-muted" style={{ height }}>
            Pick at least one product above to plot it.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMinYMin meet"
            className="block h-auto w-full select-none"
            aria-hidden
          >
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} style={{ stroke: "var(--line)" }} strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} style={{ fill: "var(--muted)" }}>
                  {compact(t)}
                </text>
              </g>
            ))}
            {dates.map((d, i) =>
              i % labelEvery === 0 || (n <= 7 && i === n - 1) ? (
                <text key={d} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} style={{ fill: "var(--muted)" }}>
                  {formatDate(d)}
                </text>
              ) : null
            )}
            {paths.map((p) => (
              <path key={`a-${p.key}`} d={p.area} style={{ fill: p.color }} opacity={0.07} />
            ))}
            {paths.map((p) => (
              <path
                key={`l-${p.key}`}
                d={p.line}
                fill="none"
                style={{ stroke: p.color }}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {active !== null && (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  style={{ stroke: "var(--field-line)" }}
                  strokeDasharray="3 3"
                />
                {shown.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(active)}
                    cy={y(s.values[active] ?? 0)}
                    r={4.5}
                    style={{ fill: s.color, stroke: "var(--surface)" }}
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerMove={(e) => pick(e.clientX)}
              onPointerDown={(e) => pick(e.clientX)}
              onPointerLeave={() => {
                if (document.activeElement !== wrapRef.current) setActive(null);
              }}
            />
          </svg>
        )}

        {active !== null && shown.length > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-modal dark:bg-surface-2"
            style={{ left: `${(tipLeft / width) * 100}%` }}
            aria-hidden
          >
            <p className="font-semibold text-ink">{formatDate(dates[active])}</p>
            <ul className="mt-1.5 space-y-1">
              {shown.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="flex-1">{s.label}</span>
                  <span className="font-semibold text-ink tabular-nums">{count(s.values[active] ?? 0)}</span>
                </li>
              ))}
            </ul>
            {shown.length > 1 && (
              <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-muted">
                Total <span className="font-semibold text-ink tabular-nums">{count(activeTotal)}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* announce the focused day for screen-reader users moving with the arrow keys */}
      <p className="sr-only" aria-live="polite">
        {active !== null
          ? `${formatDate(dates[active])}: ${shown.map((s) => `${s.label} ${count(s.values[active] ?? 0)}`).join(", ")}`
          : ""}
      </p>
    </div>
  );
}
