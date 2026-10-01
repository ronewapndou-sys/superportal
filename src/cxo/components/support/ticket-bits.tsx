"use client";

import { cx } from "@/components/ui/primitives";
import type { Ticket } from "@/lib/api/types";
import { dateAndTime, timeLeft } from "@/lib/format";

/** SLA text for a ticket: due in / overdue by / "–" once resolved. */
export function SlaLabel({ ticket, className }: { ticket: Ticket; className?: string }) {
  if (ticket.status === "resolved") return <span className={cx("text-muted", className)}>Closed</span>;
  const { overdue, label } = timeLeft(ticket.slaDueAt);
  return (
    <span
      className={cx("tabular-nums whitespace-nowrap", overdue ? "font-semibold text-danger" : "text-muted", className)}
      title={`SLA target ${dateAndTime(ticket.slaDueAt)}`}
    >
      {overdue ? `Overdue by ${label}` : `Response due in ${label}`}
    </span>
  );
}

/** Plain note that tickets mirror the support desk — no decorative "live" dot. */
export function SyncIndicator() {
  return <span className="text-xs text-muted">Tickets sync with the support desk automatically.</span>;
}

export function Time({ iso, children }: { iso: string; children: React.ReactNode }) {
  return (
    <time dateTime={iso} title={dateAndTime(iso)}>
      {children}
    </time>
  );
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
