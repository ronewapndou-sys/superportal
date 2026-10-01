"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BillingContactCard, PaymentMethodsCard, SubscriptionsCard } from "@/components/billing/account-cards";
import { DocumentCentre } from "@/components/billing/document-centre";
import { InvoiceDialog } from "@/components/billing/invoice-dialog";
import { InvoicesCard } from "@/components/billing/invoices-card";
import { SpecNote } from "@/components/notes/spec-notes";
import { Alert, Button, Card, ErrorState, Field, PageHeader, PendingState, Select, Stat } from "@/components/ui/primitives";
import { billingApi } from "@/lib/api/endpoints";
import { qk, useBillingSummary, useBranches, useInvoices } from "@/lib/api/queries";
import type { Invoice } from "@/lib/api/types";
import { date, money } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useBusiness } from "@/lib/business";
import { useSession } from "@/lib/session";
import { BUSINESSES } from "@/lib/suites";
import { useAccess } from "@/lib/use-access";
import { useDivisionId } from "@/lib/use-division";

function BillingContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const user = useSession()?.user;
  const canPay = can(user?.role, "billing.pay");

  const biz = BUSINESSES[useBusiness()];

  // Invoices are issued to each division's own account. Show the division you are working in, or every division
  // consolidated (admins and finance only). Changing division in the top bar resets this.
  const access = useAccess();
  const allDivisions = useBranches().data ?? [];
  const companyWide = can(user?.role, "users.manage") || can(user?.role, "billing.pay");
  const choices = companyWide ? allDivisions : access.myBranches;
  const current = useDivisionId();
  const [scopeChoice, setScopeChoice] = useState<string | null>(null);
  useEffect(() => setScopeChoice(null), [current]);
  const scope = scopeChoice ?? current ?? "all";
  const division = scope === "all" ? undefined : scope;
  const scopeDivision = allDivisions.find((d) => d.id === division);

  const summary = useBillingSummary(division);
  const invoices = useInvoices(division);
  const [notice, setNotice] = useState<string | null>(null);

  // the open invoice lives in the URL (?invoice=<id>) so the assistant and
  // notifications can deep-link straight to it
  const openId = params.get("invoice");
  const openInvoice = openId ? invoices.data?.find((i) => i.id === openId) : undefined;
  const openView = (inv: Invoice) => router.push(`${pathname}?invoice=${inv.id}`, { scroll: false });
  const closeView = () => router.replace(pathname, { scroll: false });

  const pay = useMutation({
    mutationFn: billingApi.payInvoice,
    onSuccess: (inv) => {
      setNotice(`${inv.number} is paid. Thank you. A receipt is on its way to your billing contact.`);
      qc.invalidateQueries({ queryKey: qk.invoices });
      qc.invalidateQueries({ queryKey: qk.billing });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });

  const overdue = invoices.data?.filter((i) => i.status === "overdue") ?? [];
  const s = summary.data;
  const spendTrend = s && s.spendLastMonthCents > 0 ? ((s.spendThisMonthCents - s.spendLastMonthCents) / s.spendLastMonthCents) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${biz.name} billing`}
        description={`See what ${scopeDivision ? scopeDivision.name : "your divisions"} owe${scopeDivision ? "s" : ""} ${biz.name}, download its invoices and manage how you pay. ${biz.name} bills each division's account separately, from its own company, so switch at the top to see your ${biz.name === "XDS" ? "MIE" : "XDS"} invoices.`}
      />

      {(choices.length > 1 || companyWide) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Show billing for" className="sm:w-80">
            <Select value={scope} onChange={(e) => setScopeChoice(e.target.value)}>
              {companyWide && <option value="all">All divisions, consolidated</option>}
              {choices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <p className="pb-3 text-[13px] text-muted">
            {scopeDivision
              ? `Account ${scopeDivision.code}${scopeDivision.costCentre ? `. Cost centre ${scopeDivision.costCentre}` : ""}`
              : `${allDivisions.length} division accounts, added together`}
          </p>
        </div>
      )}

      {summary.isPending ? (
        <Card>
          <PendingState label="Loading your billing summary…" />
        </Card>
      ) : summary.isError ? (
        <Card>
          <ErrorState message="Couldn't load your billing summary." onRetry={() => summary.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Outstanding"
              value={money(s!.outstandingCents)}
              sub={
                s!.overdueCents > 0 ? (
                  <span className="font-semibold text-danger">{money(s!.overdueCents)} overdue</span>
                ) : (
                  "Nothing overdue"
                )
              }
            />
            <Stat
              label="Spend this month"
              value={money(s!.spendThisMonthCents)}
              trend={spendTrend}
              trendInvert
              sub={`vs ${money(s!.spendLastMonthCents)} last month`}
            />
            <Stat label="Next invoice" value={date(s!.nextInvoiceAt)} sub="Issued on the 1st of each month" />
          </div>

          {notice && (
            <Alert tone="success" onDismiss={() => setNotice(null)}>
              {notice}
            </Alert>
          )}
          {pay.error && <Alert tone="danger">{pay.error.message} Your card hasn&apos;t been charged.</Alert>}

          {overdue.length > 0 && (
            <Alert
              tone="danger"
              title={overdue.length === 1 ? `${overdue[0].number} is overdue` : `${overdue.length} invoices are overdue`}
              action={
                canPay && (
                  <Button
                    size="sm"
                    loading={pay.isPending && pay.variables === overdue[0].id}
                    onClick={() => pay.mutate(overdue[0].id)}
                  >
                    Pay {money(overdue[0].amountCents)} now
                  </Button>
                )
              }
            >
              It was due on {date(overdue[0].dueAt)}. Overdue accounts may lose access to enquiries after 14 days.
              {!canPay && " Ask an admin or billing user to pay it."}
            </Alert>
          )}
        </>
      )}

      <SpecNote
        title="Billing"
        questions={[
          "Which system is the source of invoices and PDFs: the ERP (e.g. Sage/SAP) or a billing platform?",
          "Can clients pay invoices by card in the portal, or only by EFT or debit order?",
          "What happens to product access when an account is overdue, and after how many days?",
          "XDS and MIE are separate entities with separate VAT numbers. Do clients want one combined statement as well?",
          "Can an overdue XDS invoice block MIE products (or the other way round), or do the businesses stay independent?",
        ]}
      >
        Read-only mirror of the billing system, plus paying an overdue invoice with the default method. The demo download is
        a CSV. In production it is the tax invoice PDF behind a short-lived signed link.
      </SpecNote>

      <DocumentCentre />

      <InvoicesCard divisionId={division} onView={openView} onDownloaded={(inv) => setNotice(`${inv.number} downloaded.`)} />

      {s && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SubscriptionsCard summary={s} />
          </div>
          <div className="space-y-6 lg:col-span-2">
            <PaymentMethodsCard canManage={canPay} />
            <BillingContactCard summary={s} orgName={user?.orgName ?? ""} />
          </div>
        </div>
      )}

      <SpecNote
        title="Payment methods"
        questions={[
          "Which payment provider: PayFast, Peach Payments, Stitch or the bank's own gateway?",
          "Do we store card tokens for invoice payments, or only for top-ups?",
        ]}
      >
        Card details never touch the portal. &ldquo;Add method&rdquo; hands over to the provider&apos;s hosted page, and we keep only a token
        and the last four digits.
      </SpecNote>

      <InvoiceDialog
        invoice={openInvoice}
        onClose={closeView}
        canPay={canPay}
        paying={pay.isPending && pay.variables === openInvoice?.id}
        onPay={(inv) => pay.mutate(inv.id, { onSuccess: closeView })}
        onDownloaded={(inv) => setNotice(`${inv.number} downloaded.`)}
      />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<PendingState label="Loading billing…" />}>
      <BillingContent />
    </Suspense>
  );
}
