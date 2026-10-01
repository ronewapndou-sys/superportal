"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/overlay";
import { Icon } from "@/components/ui/icons";
import {
  Alert,
  Button,
  buttonClass,
  Card,
  CardHeader,
  ErrorState,
  PendingState,
  Pill,
} from "@/components/ui/primitives";
import { billingApi } from "@/lib/api/endpoints";
import { qk, usePaymentMethods } from "@/lib/api/queries";
import type { BillingSummary, PaymentMethod } from "@/lib/api/types";
import { count, date, money } from "@/lib/format";
import { SUITE_BY_ID } from "@/lib/suites";

export function SubscriptionsCard({ summary }: { summary: BillingSummary }) {
  return (
    <Card className="p-5 md:p-6" aria-labelledby="subs-title">
      <CardHeader
        id="subs-title"
        title="Subscriptions"
        description="Your monthly plan for each Mettus product. Enquiries over the bundle are charged per enquiry."
      />
      <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
        {summary.subscriptions.map((s) => {
          const suite = SUITE_BY_ID[s.suite];
          const active = s.status === "active";
          return (
            <li key={s.suite} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
                  {suite.name}
                  {active ? <Pill tone="neutral" dot={false}>{s.plan} plan</Pill> : <Pill tone="neutral" dot={false}>Not subscribed</Pill>}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {active
                    ? `${count(s.includedEnquiries)} enquiries included · renews ${date(s.renewsAt)}`
                    : "Add this product to your account to start using it."}
                </p>
              </div>
              {active ? (
                <p className="text-[14px] font-semibold text-ink tabular-nums">
                  {money(s.monthlyFeeCents)}
                  <span className="text-xs font-normal text-muted"> / month</span>
                </p>
              ) : (
                <Link href={`/products/${s.suite}`} className={buttonClass("secondary", "sm")}>
                  Find out more <Icon.ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const METHOD_ICON: Record<PaymentMethod["kind"], keyof typeof Icon> = {
  card: "Card",
  debit_order: "Bank",
  instant_eft: "Bank",
  eft: "Bank",
};

export function PaymentMethodsCard({ canManage }: { canManage: boolean }) {
  const methods = usePaymentMethods();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const makeDefault = useMutation({
    mutationFn: billingApi.setDefaultMethod,
    onSuccess: (list) => qc.setQueryData(qk.paymentMethods, list),
  });
  const newDefault = makeDefault.isSuccess ? makeDefault.data.find((m) => m.isDefault) : undefined;

  return (
    <Card className="p-5 md:p-6" aria-labelledby="pm-title">
      <CardHeader
        id="pm-title"
        title="Payment methods"
        description="Your default method pays invoices and card top-ups."
        action={
          canManage && (
            <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
              <Icon.Plus className="h-4 w-4" /> Add method
            </Button>
          )
        }
      />
      {methods.isPending ? (
        <PendingState label="Loading payment methods…" className="py-10" />
      ) : methods.isError ? (
        <ErrorState message="Couldn't load your payment methods." onRetry={() => methods.refetch()} />
      ) : (
        <>
          {newDefault && (
            <Alert tone="success" className="mt-5">
              {newDefault.label} is now your default payment method.
            </Alert>
          )}
          {makeDefault.error && (
            <Alert tone="danger" className="mt-5">
              {makeDefault.error.message}
            </Alert>
          )}
          <ul className="mt-5 space-y-3">
            {methods.data.map((m) => {
              const Glyph = Icon[METHOD_ICON[m.kind]];
              const pending = makeDefault.isPending && makeDefault.variables === m.id;
              return (
                <li key={m.id} className="flex flex-col gap-3 rounded-lg border border-line p-3.5 sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                      <Glyph className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                        {m.label}
                        {m.isDefault && <Pill tone="neutral" dot={false}>Default</Pill>}
                      </span>
                      <span className="block text-xs text-muted">{m.detail}</span>
                    </span>
                  </span>
                  {canManage && !m.isDefault && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={pending}
                      disabled={makeDefault.isPending && !pending}
                      onClick={() => makeDefault.mutate(m.id)}
                    >
                      Make default
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a payment method"
        description="Card and bank details are captured on our payment provider's secure page, never in the portal."
        footer={
          <Button variant="secondary" onClick={() => setAddOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-[13px] leading-relaxed text-muted">
          <p>
            When the payment provider is connected, choosing <span className="font-semibold text-ink">Add card</span> or{" "}
            <span className="font-semibold text-ink">Set up a debit order</span> opens its hosted page. You come back here once the
            method is verified.
          </p>
          <Alert tone="info">This isn&apos;t available in the demo yet, because the payment provider hasn&apos;t been chosen.</Alert>
        </div>
      </Dialog>
    </Card>
  );
}

export function BillingContactCard({ summary, orgName }: { summary: BillingSummary; orgName: string }) {
  return (
    <Card className="p-5 md:p-6" aria-labelledby="contact-title">
      <CardHeader id="contact-title" title="Billing details" description="Where invoices and statements are sent." />
      <dl className="mt-5 space-y-3.5 text-[13px]">
        <div>
          <dt className="text-xs font-medium text-muted">Billed to</dt>
          <dd className="mt-1 font-semibold text-ink">{orgName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Billing contact</dt>
          <dd className="mt-1 text-ink">
            {summary.billingContact.name}
            <span className="block text-muted">{summary.billingContact.email}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">VAT number</dt>
          <dd className="mt-1 text-ink tabular-nums">{summary.vatNumber}</dd>
        </div>
      </dl>
      <Link href="/support/new" className={buttonClass("secondary", "sm", "mt-5")}>
        Ask to change these details
      </Link>
    </Card>
  );
}
