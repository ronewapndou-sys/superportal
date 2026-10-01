"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Button, cx, Field, Input, Tabs } from "@/components/ui/primitives";
import type { Granularity, ReportRange, UsageQuery } from "@/lib/api/types";
import { date } from "@/lib/format";

const DAY = 86_400_000;
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const today = () => isoDay(new Date());

/** How far back the ledger goes in this build (mirrors the mock's 2-year history). */
export const HISTORY_MONTHS = 24;
export const earliestDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - (HISTORY_MONTHS * 365) / 12 + 1);
  return isoDay(d);
};

/** Daily points get unreadable past ~6 months, so longer ranges are monthly only. */
export const MAX_DAILY_DAYS = 186;

export const PRESETS: { id: ReportRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "12m", label: "12 months" },
  { id: "custom", label: "Custom" },
];

export function presetQuery(range: Exclude<ReportRange, "custom">): UsageQuery {
  const to = new Date();
  if (range === "12m") {
    // whole calendar months: the 1st of the month eleven months ago → today
    const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
    return { from: isoDay(new Date(from.getTime() - from.getTimezoneOffset() * 60_000)), to: isoDay(to), granularity: "month" };
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return { from: isoDay(new Date(to.getTime() - (days - 1) * DAY)), to: isoDay(to), granularity: "day" };
}

export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY) + 1;

/** "the last 30 days" / "1 Jun 2026 – 30 Sept 2026" */
export function describeRange(range: ReportRange, q: UsageQuery) {
  if (range === "7d" || range === "30d" || range === "90d") return `the last ${range.replace("d", " days")}`;
  if (range === "12m") return "the last 12 months";
  return `${date(q.from)} to ${date(q.to)}`;
}

const monthShort = new Intl.DateTimeFormat("en-ZA", { month: "short", year: "2-digit" });
const monthLong = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" });
const monthDate = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1);
};
export const formatMonthShort = (ym: string) => monthShort.format(monthDate(ym));
export const formatMonthLong = (ym: string) => monthLong.format(monthDate(ym));

/**
 * Date controls for the usage report: preset tabs, a custom from/to range
 * (validated before it's applied, so a half-typed date never fires a
 * request) and a daily/monthly switch.
 */
export function DateRangeFilter({
  range,
  query,
  onChange,
}: {
  range: ReportRange;
  query: UsageQuery;
  onChange: (range: ReportRange, query: UsageQuery) => void;
}) {
  const [from, setFrom] = useState(query.from);
  const [to, setTo] = useState(query.to);
  const [error, setError] = useState<string | null>(null);
  const min = earliestDate();
  const max = today();
  const span = daysBetween(query.from, query.to);
  const dailyAllowed = span <= MAX_DAILY_DAYS;

  function pickPreset(id: ReportRange) {
    setError(null);
    if (id === "custom") {
      // open the custom editor seeded with whatever is showing now
      setFrom(query.from);
      setTo(query.to);
      onChange("custom", query);
      return;
    }
    const q = presetQuery(id);
    setFrom(q.from);
    setTo(q.to);
    onChange(id, q);
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return setError("Choose both a start date and an end date.");
    if (from > to) return setError("The start date needs to be on or before the end date.");
    if (to > max) return setError("The end date can't be in the future.");
    if (from < min) return setError(`Reports go back to ${date(min)}. Choose a later start date.`);
    setError(null);
    const days = daysBetween(from, to);
    // keep the chosen granularity unless the range is too long for daily points
    const granularity: Granularity = days > MAX_DAILY_DAYS ? "month" : query.granularity;
    onChange("custom", { from, to, granularity });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs label="Date range" tabs={PRESETS} value={range} onChange={pickPreset} />
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-ink" id="granularity-label">
            Show
          </span>
          <div role="radiogroup" aria-labelledby="granularity-label" className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(["day", "month"] as Granularity[]).map((g) => {
              const disabled = g === "day" && !dailyAllowed;
              const active = query.granularity === g;
              return (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  title={disabled ? `Daily view is available for ranges up to ${MAX_DAILY_DAYS} days` : undefined}
                  onClick={() => onChange(range, { ...query, granularity: g })}
                  className={cx(
                    "min-h-9 rounded-lg px-3.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
                  )}
                >
                  {g === "day" ? "Daily" : "Monthly"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {range === "custom" && (
        <form noValidate onSubmit={applyCustom} className="rounded-xl border border-line bg-surface-2/50 p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="From">
              <Input
                type="date"
                value={from}
                min={min}
                max={max}
                onChange={(e) => setFrom(e.target.value)}
                aria-invalid={!!error}
              />
            </Field>
            <Field label="To">
              <Input type="date" value={to} min={min} max={max} onChange={(e) => setTo(e.target.value)} aria-invalid={!!error} />
            </Field>
            <Button type="submit">
              <Icon.Calendar className="h-4 w-4" /> Apply dates
            </Button>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              Reports go back to {date(min)}. Ranges longer than {MAX_DAILY_DAYS} days show monthly totals.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
