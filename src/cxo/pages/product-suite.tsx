"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SuiteBanner } from "@/components/brand/suite-banner";
import { DecisionCard, refreshAfterDecision, useProductActions } from "@/components/intelligence/intelligence";
import { Icon } from "@/components/ui/icons";
import {
  Alert,
  Button,
  buttonClass,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Pill,
  Spinner,
  Stat,
  Textarea,
} from "@/components/ui/primitives";
import { useBillingSummary, useDashboard, useTickets } from "@/lib/api/queries";
import type { ProductDecision, SuiteId } from "@/lib/api/types";
import { ago, count, money } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useSession } from "@/lib/session";
import { ROLE_LABEL, TICKET_STATUS_LABEL, TICKET_STATUS_TONE } from "@/lib/status";
import { setBranch } from "@/lib/branch";
import { setBusiness, useBusiness } from "@/lib/business";
import { useAccess } from "@/lib/use-access";
import { SUITE_BY_ID } from "@/lib/suites";

const HANDOFF_MS = 1600;

export default function SuitePage() {
  const { suite: id } = useParams<{ suite: string }>();
  const suite = SUITE_BY_ID[id as SuiteId];
  const business = useBusiness();
  const access = useAccess();
  const billing = useBillingSummary();

  // a deep link to an MIE product while XDS is selected (or vice versa) flips the switch to match
  useEffect(() => {
    if (suite && suite.business !== business) setBusiness(suite.business);
  }, [suite, business]);
  const user = useSession()!.user;

  if (!suite) {
    return (
      <Card>
        <EmptyState
          title="Couldn't find that product"
          description="Check the link, or pick a product from the list."
          action={
            <Link href="/products" className={buttonClass("secondary")}>
              See all products
            </Link>
          }
        />
      </Card>
    );
  }

  const hasAccess = access.suites.includes(suite.id);
  const elsewhere = access.elsewhere(suite.id);
  const orgHas = billing.data?.subscriptions.find((s) => s.suite === suite.id)?.status === "active";

  return (
    <div className="space-y-6">
      <Link href="/products" className="inline-flex min-h-9 items-center gap-1 rounded text-[13px] font-semibold text-muted hover:text-ink">
        <Icon.ChevronLeft className="h-4 w-4" /> All products
      </Link>

      <div className="overflow-hidden rounded-3xl shadow-card">
        <SuiteBanner suite={suite} tall>
          <div className="flex h-full min-h-[180px] flex-col justify-end gap-2 p-6 md:min-h-[220px] md:p-8">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] md:text-hero">{suite.name}</h1>
            <p className="max-w-xl text-[14px] leading-relaxed text-white/85">{suite.description}</p>
          </div>
        </SuiteBanner>
      </div>

      {hasAccess ? (
        <Launch suiteId={suite.id} branchName={access.branch?.name} />
      ) : elsewhere.length > 0 ? (
        <Alert
          tone="info"
          title={`${suite.name} isn't available at ${access.branch?.name ?? "this division"}`}
          action={
            <Button variant="secondary" size="sm" onClick={() => setBranch(elsewhere[0].id)}>
              Switch to {elsewhere[0].name}
            </Button>
          }
        >
          You can open it at {elsewhere.map((b) => b.name).join(" and ")}, where your role includes it.
        </Alert>
      ) : orgHas ? (
        <Alert tone="info" title={`Your roles don't include ${suite.name}`}>
          Your organisation has {suite.name}, but none of your division roles include it. Ask your admin to change your role
          or add the product to your division.
        </Alert>
      ) : billing.isPending ? null : (
        <RequestAccess suiteId={suite.id} />
      )}
      <SuiteDetails suiteId={suite.id} hasAccess={hasAccess} roleLabel={ROLE_LABEL[user.role]} canLaunch={can(user.role, "products.launch")} />
    </div>
  );
}

function Launch({ suiteId, branchName }: { suiteId: SuiteId; branchName?: string }) {
  const suite = SUITE_BY_ID[suiteId];
  const user = useSession()!.user;
  const [state, setState] = useState<"idle" | "opening" | "opened">("idle");

  // mock of the token exchange + new-tab open; the real app would window.open(launchUrl + one-time code)
  useEffect(() => {
    if (state !== "opening") return;
    const t = setTimeout(() => setState("opened"), HANDOFF_MS);
    return () => clearTimeout(t);
  }, [state]);

  if (!can(user.role, "products.launch")) {
    return (
      <Alert tone="info" title={`Your role can't open ${suite.name}`}>
        {ROLE_LABEL[user.role]} users can see usage and billing for this product, but can&apos;t run enquiries. Ask your
        admin if you need product access.
      </Alert>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div className="min-w-0" role="status" aria-live="polite">
        {state === "opening" ? (
          <p className="flex items-center gap-3 text-[14px] font-semibold text-ink">
            <Spinner className="h-5 w-5" /> Opening {suite.name}…
          </p>
        ) : state === "opened" ? (
          <>
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <Icon.Check className="h-5 w-5 text-success" /> {suite.name} opened in a new tab
            </p>
            <p className="mt-1 text-[13px] text-muted">
              In demo mode nothing actually opens. In the live portal, {suite.launchUrl.replace("https://", "")} opens with
              your session already active.
            </p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-semibold text-ink">Ready to open {suite.name}</p>
            <p className="mt-1 text-[13px] text-muted">
              {branchName ? `Opens for ${branchName} in a new tab. You stay signed in here too.` : "It opens in a new tab and you stay signed in here too."}
            </p>
          </>
        )}
      </div>
      <Button onClick={() => setState("opening")} loading={state === "opening"} className="shrink-0">
        {state === "opened" ? "Open again" : `Open ${suite.name}`}
        {state !== "opening" && <Icon.External className="h-4 w-4" />}
      </Button>
    </Card>
  );
}

function RequestAccess({ suiteId }: { suiteId: SuiteId }) {
  const suite = SUITE_BY_ID[suiteId];
  const qc = useQueryClient();
  const actions = useProductActions();
  const [note, setNote] = useState("");
  const [reviewed, setReviewed] = useState<ProductDecision | null>(null);
  const request = useMutation({
    mutationFn: () => actions.request(suiteId, note),
    onSuccess: () => refreshAfterDecision(qc),
  });

  if (request.isSuccess) return <DecisionCard decision={reviewed ?? request.data} onChange={setReviewed} />;

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
          <Icon.Lock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-section font-semibold tracking-[-0.3px] text-ink">Your organisation doesn&apos;t have {suite.name} yet</h2>
          <p className="mt-1 text-[13px] text-muted">
            Tell us what you&apos;d use it for. We check your account and decide on the spot.
          </p>
        </div>
      </div>
      <form
        noValidate
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          request.mutate();
        }}
      >
        {request.error && <Alert tone="danger">{request.error.message}</Alert>}
        <Field label="What would you like to use it for?" hint="Optional. A sentence or two helps us prepare.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Checking director links before we approve business loans" />
        </Field>
        <div className="flex justify-end border-t border-ink/10 pt-5">
          <Button type="submit" loading={request.isPending}>
            Request access
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SuiteDetails({
  suiteId,
  hasAccess,
  roleLabel,
  canLaunch,
}: {
  suiteId: SuiteId;
  hasAccess: boolean;
  roleLabel: string;
  canLaunch: boolean;
}) {
  const suite = SUITE_BY_ID[suiteId];
  const dashboard = useDashboard();
  const billing = useBillingSummary();
  const tickets = useTickets();
  const sub = billing.data?.subscriptions.find((s) => s.suite === suiteId);
  const usage = dashboard.data?.usageBySuite[suiteId];
  const suiteTickets = (tickets.data ?? []).filter((t) => t.suite === suiteId).slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="p-5 md:p-6">
          <CardHeader title="What's included" />
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {suite.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13px] text-ink">
                <Icon.Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </Card>

        {hasAccess && (
          <Card className="p-5 md:p-6">
            <CardHeader
              title={`${suite.short} support tickets`}
              action={
                <Link href={`/support/new?suite=${suiteId}`} className={buttonClass("secondary", "sm")}>
                  <Icon.Plus className="h-4 w-4" /> Log a ticket
                </Link>
              }
            />
            {tickets.isPending ? (
              <div className="flex items-center gap-2 py-6 text-[13px] text-muted">
                <Spinner className="h-4 w-4" /> Loading tickets…
              </div>
            ) : suiteTickets.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted">No tickets for this product yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {suiteTickets.map((t) => (
                  <li key={t.key}>
                    <Link href={`/support/${t.key}`} className="-mx-2 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 hover:bg-surface-2/70">
                      <span className="text-[13px] font-bold text-ink tabular-nums">{t.key}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.subject}</span>
                      <Pill tone={TICKET_STATUS_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Pill>
                      <span className="text-xs text-muted">{ago(t.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <div className="space-y-6">
        {hasAccess && usage && (
          <Stat label="Enquiries · last 30 days" value={count(usage.enquiries)} trend={usage.trendPct} sub="vs previous 30 days" href="/reports" />
        )}
        <Card className="p-5 md:p-6">
          <CardHeader title="Your access" />
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Subscription</dt>
              <dd className="text-right font-semibold text-ink">{sub?.status === "active" ? `${sub.plan} plan` : "Not subscribed"}</dd>
            </div>
            {sub?.status === "active" && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Monthly fee</dt>
                  <dd className="text-right font-semibold text-ink tabular-nums">{money(sub.monthlyFeeCents)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Included enquiries</dt>
                  <dd className="text-right font-semibold text-ink tabular-nums">{count(sub.includedEnquiries)} a month</dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Your role</dt>
              <dd className="text-right font-semibold text-ink">
                {roleLabel}
                {!canLaunch && " (view only)"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
