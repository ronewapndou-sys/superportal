/**
 * ZAR as South African business documents write it: R 12 450.00 — space
 * thousands, point decimals. (Intl's en-ZA uses a decimal comma, which
 * clients read as a thousands separator on invoices.) Non-breaking spaces
 * keep the amount on one line.
 */
const NBSP = "\u00a0";
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

export function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}R${NBSP}${group(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, "0")}`;
}

export function moneyWhole(cents: number) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}R${NBSP}${group(Math.round(Math.abs(cents) / 100))}`;
}

export const count = (n: number) => group(Math.round(n));

const dateFmt = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" });
const dateShort = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" });
const dateTime = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const date = (iso: string) => dateFmt.format(new Date(iso));
export const dayMonth = (iso: string) => dateShort.format(new Date(iso));
export const dateAndTime = (iso: string) => dateTime.format(new Date(iso));

/** "3 min ago", "2 h ago", "4 days ago" — for activity feeds. */
export function ago(iso: string, now = Date.now()) {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ${d === 1 ? "day" : "days"} ago`;
  return date(iso);
}

/** Time left until `iso`, or how long overdue. */
export function timeLeft(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const label = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { overdue: diff < 0, label };
}
