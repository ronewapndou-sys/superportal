import type { Invoice } from "@/lib/api/types";
import { SUITE_LABEL } from "@/lib/suites";

/**
 * Demo download: builds a CSV summary of the invoice in the browser. When
 * the billing system is connected this becomes a signed link to the real
 * PDF, so the button label and call site stay the same.
 */
export function downloadInvoice(inv: Invoice) {
  const rows = [
    ["Invoice", inv.number],
    ["Period", inv.periodLabel],
    ["Issued", inv.issuedAt.slice(0, 10)],
    ["Due", inv.dueAt.slice(0, 10)],
    [],
    ["Product", "Description", "Amount (ZAR, incl. VAT)"],
    ...inv.lines.map((l) => [SUITE_LABEL[l.suite], l.description, (l.amountCents / 100).toFixed(2)]),
    [],
    ["Total", "", (inv.amountCents / 100).toFixed(2)],
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.number}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** VAT is included in every Mettus amount; show the split for information. */
export const VAT_RATE = 0.15;
export function vatSplit(totalCents: number) {
  const excl = Math.round(totalCents / (1 + VAT_RATE));
  return { exclCents: excl, vatCents: totalCents - excl };
}
