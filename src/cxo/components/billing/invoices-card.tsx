"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PendingState,
  Pill,
  SearchInput,
  TableWrap,
  Tabs,
  TD,
  TH,
  TR,
} from "@/components/ui/primitives";
import { useBranches, useInvoices } from "@/lib/api/queries";
import type { Invoice, InvoiceStatus } from "@/lib/api/types";
import { date, money } from "@/lib/format";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/lib/status";
import { downloadInvoice } from "./download";

type Filter = "all" | InvoiceStatus;

export function InvoicesCard({
  divisionId,
  onView,
  onDownloaded,
}: {
  /** one division's invoices, or every division's when not given */
  divisionId?: string;
  onView: (inv: Invoice) => void;
  onDownloaded: (inv: Invoice) => void;
}) {
  const invoices = useInvoices(divisionId);
  const divisions = useBranches().data ?? [];
  const divisionOf = (inv: Invoice) => divisions.find((d) => d.id === inv.branchId);
  const showDivision = !divisionId;
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const list = useMemo(() => invoices.data ?? [], [invoices.data]);
  const counts = useMemo(
    () => ({
      all: list.length,
      due: list.filter((i) => i.status === "due").length,
      overdue: list.filter((i) => i.status === "overdue").length,
      paid: list.filter((i) => i.status === "paid").length,
    }),
    [list]
  );
  const q = query.trim().toLowerCase();
  const rows = list.filter(
    (i) =>
      (filter === "all" || i.status === filter) &&
      (!q || i.number.toLowerCase().includes(q) || i.periodLabel.toLowerCase().includes(q) || (divisions.find((d) => d.id === i.branchId)?.name.toLowerCase().includes(q) ?? false))
  );

  return (
    <Card aria-labelledby="invoices-title">
      <div className="p-5 md:p-6">
        <CardHeader
          id="invoices-title"
          title="Invoices"
          description={divisionId ? "Monthly tax invoices for this division's account." : "Monthly tax invoices, one for each division's account."}
        />
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs<Filter>
            label="Filter invoices by status"
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: "All", count: counts.all },
              { id: "due", label: "Due", count: counts.due },
              { id: "overdue", label: "Overdue", count: counts.overdue },
              { id: "paid", label: "Paid", count: counts.paid },
            ]}
          />
          <SearchInput
            className="md:w-72"
            placeholder="Search by number, month or division"
            aria-label="Search invoices"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {invoices.isPending ? (
        <PendingState label="Loading your invoices…" />
      ) : invoices.isError ? (
        <ErrorState message="Couldn't load your invoices." onRetry={() => invoices.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No invoices match"
          description={q ? `Nothing matches “${query.trim()}” with this filter. Try another search or show all invoices.` : "There are no invoices with this status."}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
            >
              Show all invoices
            </Button>
          }
        />
      ) : (
        <TableWrap label="Invoices">
          <table className="w-full min-w-[860px] border-t border-line">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>Invoice</th>
                {showDivision && <th scope="col" className={TH}>Division</th>}
                <th scope="col" className={TH}>Period</th>
                <th scope="col" className={TH}>Issued</th>
                <th scope="col" className={TH}>Due</th>
                <th scope="col" className={`${TH} text-right`}>Amount</th>
                <th scope="col" className={TH}>Status</th>
                <th scope="col" className={`${TH} text-right`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className={TR}>
                  <td className={`${TD} font-semibold whitespace-nowrap tabular-nums`}>{inv.number}</td>
                  {showDivision && (
                    <td className={`${TD} whitespace-nowrap`}>
                      {divisionOf(inv)?.name ?? "Unknown division"}
                      <span className="block text-xs text-muted">{divisionOf(inv)?.code}</span>
                    </td>
                  )}
                  <td className={`${TD} whitespace-nowrap`}>{inv.periodLabel}</td>
                  <td className={`${TD} whitespace-nowrap text-muted`}>
                    <time dateTime={inv.issuedAt}>{date(inv.issuedAt)}</time>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-muted`}>
                    <time dateTime={inv.dueAt}>{date(inv.dueAt)}</time>
                  </td>
                  <td className={`${TD} text-right font-semibold whitespace-nowrap tabular-nums`}>{money(inv.amountCents)}</td>
                  <td className={TD}>
                    <Pill tone={INVOICE_STATUS_TONE[inv.status]}>{INVOICE_STATUS_LABEL[inv.status]}</Pill>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onView(inv)} aria-label={`View ${inv.number}`}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          downloadInvoice(inv);
                          onDownloaded(inv);
                        }}
                        aria-label={`Download ${inv.number}`}
                      >
                        <Icon.Download className="h-4 w-4" /> Download
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}
