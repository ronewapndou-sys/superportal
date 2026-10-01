import { useLayoutEffect, useRef, useState } from 'react';
import './charts.css';

/*
 * Small inline-SVG charts. Mark specs: 2px lines, 10% area wash, bars <= 24px with 4px rounded
 * data-ends, 2px surface gaps between stacked segments, hairline recessive grid, hover tooltips.
 * Text always uses text colours; only marks carry series colour.
 */

export const CHART_BLUE = '#164df2';
export const CHART_RED = '#c0303a';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Rounds up to a clean axis maximum (1, 2, 2.5 or 5 × a power of ten). */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

const fmt = (n: number) => n.toLocaleString('en-US');
const M = { top: 12, right: 12, bottom: 26, left: 52 };

function Grid({ w, h, max, ticks = 4, format }: { w: number; h: number; max: number; ticks?: number; format: (n: number) => string }) {
  return (
    <g>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i;
        const y = M.top + h - (v / max) * h;
        return (
          <g key={i}>
            <line x1={M.left} x2={M.left + w} y1={y} y2={y} className="chart-grid" />
            <text x={M.left - 8} y={y} className="chart-tick" textAnchor="end" dominantBaseline="middle">{format(v)}</text>
          </g>
        );
      })}
    </g>
  );
}

/** Single-series area chart with a crosshair tooltip. The card title names the series, so there's no legend. */
export function AreaChart({ labels, values, height = 200, format = fmt, unit, label }: { labels: string[]; values: number[]; height?: number; format?: (n: number) => string; unit: string; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(0, width - M.left - M.right);
  const h = height - M.top - M.bottom;
  const max = niceMax(Math.max(...values));
  const x = (i: number) => M.left + (values.length === 1 ? 0 : (i / (values.length - 1)) * w);
  const y = (v: number) => M.top + h - (v / max) * h;
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  const area = `${line}L${x(values.length - 1)},${M.top + h}L${x(0)},${M.top + h}Z`;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setHover(Math.max(0, Math.min(values.length - 1, Math.round(((px - M.left) / w) * (values.length - 1)))));
  };

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <Grid w={w} h={h} max={max} format={format} />
          {labels.map((l, i) => i % 4 === 0 && (
            <text key={l} x={x(i)} y={height - 8} className="chart-tick" textAnchor="middle">{l}</text>
          ))}
          <path d={area} fill={CHART_BLUE} opacity={0.1} />
          <path d={line} fill="none" stroke={CHART_BLUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={4} fill={CHART_BLUE} stroke="var(--mt-card-bg)" strokeWidth={2} />
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + h} className="chart-cross" />
              <circle cx={x(hover)} cy={y(values[hover])} r={5} fill={CHART_BLUE} stroke="var(--mt-card-bg)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(x(hover) + 12, width - 150), top: M.top }}>
          <div className="chart-tip-title">{labels[hover]}</div>
          <div><strong>{format(values[hover])}</strong> {unit}</div>
        </div>
      )}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Stacked columns with a legend, 2px gaps between segments and a per-column tooltip. */
export function StackedColumns({ labels, series, values, height = 220, label }: { labels: string[]; series: { name: string; color: string }[]; values: number[][]; height?: number; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(0, width - M.left - M.right);
  const h = height - M.top - M.bottom;
  const totals = values.map((v) => v.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(...totals));
  const band = w / labels.length;
  const colW = Math.min(24, band * 0.6);
  const GAP = 2;

  return (
    <div className="chart" ref={ref}>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
          <Grid w={w} h={h} max={max} format={fmt} />
          {labels.map((l, i) => {
            const cx = M.left + band * i + band / 2;
            let top = M.top + h;
            const topIndex = values[i].reduce((last, v, j) => (v > 0 ? j : last), -1);
            return (
              <g key={l} onPointerEnter={() => setHover(i)}>
                <rect x={cx - band / 2} y={M.top} width={band} height={h} className={`chart-band${hover === i ? ' on' : ''}`} />
                {values[i].map((v, j) => {
                  if (v <= 0) return null;
                  const segH = Math.max(1, (v / max) * h - (j > 0 ? GAP : 0));
                  const yTop = top - segH - (j > 0 ? GAP : 0);
                  const d = j === topIndex ? roundedTop(cx - colW / 2, yTop, colW, segH, 4) : `M${cx - colW / 2},${yTop}h${colW}v${segH}h${-colW}Z`;
                  top = yTop;
                  return <path key={j} d={d} fill={series[j].color} />;
                })}
                {(i % 2 === 0 || labels.length <= 12) && (
                  <text x={cx} y={height - 8} className="chart-tick" textAnchor="middle">{l}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(M.left + band * hover + band / 2 + 16, width - 170), top: 36 }}>
          <div className="chart-tip-title">{labels[hover]}</div>
          {series.map((s, j) => (
            <div key={s.name} className="chart-tip-row"><i style={{ background: s.color }} />{s.name}<strong>{fmt(values[hover][j])}</strong></div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tiny trend line for tables. The row's own numbers carry the values. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const W = 96, H = 28, P = 5;
  const max = Math.max(...values) || 1;
  const x = (i: number) => P + (i / (values.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  return (
    <svg width={W} height={H} role="img" aria-label={label} className="sparkline">
      <title>{label}</title>
      <path d={values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')} fill="none" stroke={CHART_BLUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3} fill={CHART_BLUE} stroke="var(--mt-card-bg)" strokeWidth={1.5} />
    </svg>
  );
}

/** Horizontal bars, one hue, value at the tip. */
export function BarList({ items, unit }: { items: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...items.map((i) => i.value)) || 1;
  return (
    <ul className="barlist">
      {items.map((it) => (
        <li key={it.label} title={`${it.label}: ${fmt(it.value)} ${unit}`}>
          <span className="barlist-label">{it.label}</span>
          <span className="barlist-track">
            <span className="barlist-bar" style={{ width: `${(it.value / max) * 100}%` }} />
            <span className="barlist-value">{fmt(it.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export type DayStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';
const DAY_LABEL: Record<DayStatus, string> = { operational: 'No issues', degraded: 'Degraded', outage: 'Outage', maintenance: 'Maintenance' };

/** 30-day status strip. Each day has a text label in its tooltip, and the legend names every colour. */
export function UptimeStrip({ days }: { days: DayStatus[] }) {
  return (
    <div>
      <div className="uptime">
        {days.map((d, i) => (
          <span key={i} className={`uptime-day ${d}`} title={`${days.length - i - 1 === 0 ? 'Today' : `${days.length - i - 1} days ago`}: ${DAY_LABEL[d]}`} />
        ))}
      </div>
      <div className="uptime-axis"><span>30 days ago</span><span>Today</span></div>
      <div className="chart-legend small">
        {(Object.keys(DAY_LABEL) as DayStatus[]).map((k) => (
          <span key={k}><i className={`uptime-key ${k}`} />{DAY_LABEL[k]}</span>
        ))}
      </div>
    </div>
  );
}

/** "View as table" toggle so every chart's numbers are readable without the graphic. */
export function TableToggle({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="table-toggle">
      <button type="button" className="link-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? 'Hide table' : 'View as table'}
      </button>
      {open && (
        <div className="table-toggle-wrap">
          <table className="table">
            <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === 'number' ? 'tnum' : undefined}>{typeof c === 'number' ? fmt(c) : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
