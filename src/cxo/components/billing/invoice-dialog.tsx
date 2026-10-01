"use client";

import { Dialog } from "@/components/ui/overlay";
import { Icon } from "@/components/ui/icons";
import { Button, Pill, TableWrap, TD, TH } from "@/components/ui/primitives";
import { useBranches } from "@/lib/api/queries";
import type { Invoice } from "@/lib/api/types";
import { date, money } from "@/lib/format";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/lib/status";
import { SUITE_LABEL } from "@/lib/suites";
import { downloadInvoice, vatSplit } from "./download";

export function InvoiceDialog({
  invoice,
  onClose,
  canPay,
  paying,
  onPay,
  onDownloaded,
}: {
  invoice: Invoice | undefined;
  onClose: () => void;
  canPay: boolean;
  paying: boolean;
  onPay: (inv: Invoice) => void;
  onDownloaded: (inv: Invoice) => void;
}) {
  const divisions = useBranches().data;
  if (!invoice) return null;
  const division = divisions?.find((d) => d.id === invoice.branchId);
  const { exclCents, vatCents } = vatSplit(invoice.amountCents);
  const payable = canPay && invoice.status !== "paid";

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Invoice ${invoice.number}`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          {division ? `${division.name} (account ${division.code}). ` : ""}{invoice.periodLabel}. Issued {date(invoice.issuedAt)}, due {date(invoice.dueAt)}.
          <Pill tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Pill>
        </span>
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              downloadInvoice(invoice);
              onDownloaded(invoice);
            }}
          >
            <Icon.Download className="h-4 w-4" /> Download
          </Button>
          {payable && (
            <Button loading={paying} onClick={() => onPay(invoice)}>
              Pay {money(invoice.amountCents)}
            </Button>
          )}
        </>
      }
    >
      <div className="rounded-lg border border-line">
        <TableWrap label={`Line items for ${invoice.number}`}>
          <table className="w-full min-w-[520px]">
            <thead className="border-b border-line bg-surface-2/60">
              <tr>
                <th scope="col" className={TH}>Product</th>
                <th scope="col" className={TH}>Description</th>
                <th scope="col" className={`${TH} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.description} className="border-b border-line last:border-0">
                  <td className={`${TD} font-semibold whitespace-nowrap`}>{SUITE_LABEL[l.suite]}</td>
                  <td className={`${TD} text-muted`}>{l.description}</td>
                  <td className={`${TD} text-right whitespace-nowrap tabular-nums`}>{money(l.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </div>

      <dl className="mt-5 ml-auto max-w-xs space-y-2 text-[13px]">
        <div className="flex justify-between gap-4 text-muted">
          <dt>Subtotal (excl. VAT)</dt>
          <dd className="tabular-nums">{money(exclCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted">
          <dt>VAT at 15%</dt>
          <dd className="tabular-nums">{money(vatCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-ink/10 pt-2 text-[15px] font-bold text-ink">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(invoice.amountCents)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted">
        Line amounts include VAT. The VAT split is shown for information. Your tax invoice PDF is the legal record.
      </p>
    </Dialog>
  );
}
