"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SpecNote } from "@/components/notes/spec-notes";
import { SuiteCard } from "@/components/products/suite-card";
import { Icon } from "@/components/ui/icons";
import {
  Alert,
  buttonClass,
  Card,
  CardHeader,
  ErrorState,
  PageHeader,
  PendingState,
  Stat,
} from "@/components/ui/primitives";
import { useDashboard } from "@/lib/api/queries";
import type { ActivityItem } from "@/lib/api/types";
import { ago, date, money, moneyWhole } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useSession } from "@/lib/session";
import { useBusiness } from "@/lib/business";
import { useAccess } from "@/lib/use-access";
import { BUSINESSES, suitesFor } from "@/lib/suites";
import { Recommendations } from "@/components/intelligence/intelligence";
import { AccessDeniedBanner, AttentionCard } from "../../features/home/AttentionCard";
import { useOrg as useTopBarOrg } from "../../shell/OrgContext";
import { useTickets as useSupportTickets } from "../../tickets/TicketsContext";

const ACTIVITY_ICON: Record<ActivityItem["kind"], keyof typeof Icon> = {
  billing: "Receipt",
  support: "Support",
  wallet: "Wallet",
  users: "Users",
  product: "Grid",
};

// greeting depends on the viewer's clock, so resolve it on the client only
function useGreeting() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      const h = new Date().getHours();
      return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    },
    () => "Welcome back"
  );
}

export default function HomePage() {
  const user = useSession()!.user;
  const greeting = useGreeting();
  const business = useBusiness();
  const biz = BUSINESSES[business];
  const access = useAccess();
  const { data, isPending, isError, refetch } = useDashboard();
  // "All organisations" has no single business to show: list both instead of silently staying on one.
  const { org } = useTopBarOrg();
  const showAll = org === "All organisations";
  const otherBusiness = business === "xds" ? "mie" : "xds";
  const otherBiz = BUSINESSES[otherBusiness];
  const other = useDashboard({ business: otherBusiness, enabled: showAll });
  // Tickets come from the shared Mettus Central support system (assistant, bell, support desk).
  const allSupport = useSupportTickets().tickets;
  const support = showAll ? allSupport : allSupport.filter((t) => t.company === (business === "mie" ? "MIE" : "XDS"));
  const openTickets = support.filter((t) => t.status !== "resolved").length;
  const waitingOnYou = support.filter((t) => t.status === "waiting-client").length;
  // only products you can open at this branch, busiest first
  const mine = suitesFor(business)
    .filter((s) => access.suites.includes(s.id))
    .sort((a, b) => (data?.usageBySuite[b.id]?.enquiries ?? 0) - (data?.usageBySuite[a.id]?.enquiries ?? 0));
  const otherMine = suitesFor(otherBusiness)
    .filter((s) => access.suites.includes(s.id))
    .sort((a, b) => (other.data?.usageBySuite[b.id]?.enquiries ?? 0) - (other.data?.usageBySuite[a.id]?.enquiries ?? 0));
  // Spend and invoices are per business; combine them when both are showing instead of just this one.
  const spendThisMonthCents = (data?.billing.spendThisMonthCents ?? 0) + (showAll ? (other.data?.billing.spendThisMonthCents ?? 0) : 0);
  const spendLastMonthCents = (data?.billing.spendLastMonthCents ?? 0) + (showAll ? (other.data?.billing.spendLastMonthCents ?? 0) : 0);
  const outstandingCents = (data?.billing.outstandingCents ?? 0) + (showAll ? (other.data?.billing.outstandingCents ?? 0) : 0);
  const nextInvoiceAt = showAll && other.data && other.data.billing.nextInvoiceAt < (data?.billing.nextInvoiceAt ?? "")
    ? other.data.billing.nextInvoiceAt
    : data?.billing.nextInvoiceAt;

  const quickActions = [
    { href: "/top-up", label: "Top up credits", icon: "Wallet" as const, show: can(user.role, "wallet.top_up") },
    { href: "/support/tickets?new=1", label: "Log a support ticket", icon: "Support" as const, show: can(user.role, "support.create") },
    { href: "/billing", label: "View invoices", icon: "Receipt" as const, show: can(user.role, "billing.view") },
    { href: "/users?invite=1", label: "Invite a colleague", icon: "Users" as const, show: can(user.role, "users.manage") },
    { href: "/reports", label: "See usage reports", icon: "Chart" as const, show: can(user.role, "reports.view") },
  ].filter((a) => a.show);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        description={
          showAll
            ? "Here's what's happening across your XDS and MIE products today."
            : `Here's what's happening across your ${biz.name} products today. Switch to ${business === "xds" ? "MIE" : "XDS"} at the top to see the rest of your account.`
        }
      />

      <AccessDeniedBanner />

      <SpecNote
        title="XDS and MIE in one portal"
        questions={[
          "XDS and MIE are separate legal entities. Is the wallet shared (as shown) or does each business need its own balance and top-ups?",
          "Should one person be able to see both businesses, or should an admin choose per user? (Today it follows product access.)",
          "MIE handles criminal records, which are special personal information under POPIA. Do MIE screens need extra access controls, masking or audit?",
          "One account manager per business, or one for the whole Mettus relationship?",
        ]}
      >
        The switch at the top changes the products, invoices, support tickets and reports you see. Picking "All
        organisations" combines both into one summary here on Home, instead of switching. Each business bills from
        its own entity with its own invoice numbers (INV- for XDS, MIE-INV- for MIE). Tickets go to separate Jira
        projects (MET- and MIE-). The wallet, users, profile and sign-in are shared across both.
      </SpecNote>

      <SpecNote
        title="Home"
        questions={[
          "Should the wallet be shared across products, or should each product have its own balance?",
          "Which alerts belong on Home, and which only in notifications?",
        ]}
      >
        Home is the landing page after sign-in. It shows account health at a glance (wallet, spend, tickets, next
        invoice) and one place to launch each suite. Every number links to the screen where you can act on it.
      </SpecNote>

      {isPending ? (
        <Card>
          <PendingState label="Loading your account…" />
        </Card>
      ) : isError ? (
        <Card>
          <ErrorState message="Couldn't load your account summary." onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          {data.wallet.balanceCents < data.wallet.lowBalanceThresholdCents && (
            <Alert
              tone="warning"
              title={`Your wallet is below ${moneyWhole(data.wallet.lowBalanceThresholdCents)}`}
              action={
                can(user.role, "wallet.top_up") ? (
                  <Link href="/top-up" className={buttonClass("primary", "sm")}>
                    Top up now
                  </Link>
                ) : undefined
              }
            >
              At your current usage your credits last about{" "}
              {Math.round(data.wallet.balanceCents / data.wallet.avgDailySpendCents)} days. Enquiries pause when the wallet
              runs out.
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Wallet balance"
              value={money(data.wallet.balanceCents)}
              sub={`Lasts about ${Math.round(data.wallet.balanceCents / data.wallet.avgDailySpendCents)} days`}
              href="/top-up"
            />
            <Stat
              label="Spend this month"
              value={money(spendThisMonthCents)}
              trend={spendLastMonthCents > 0 ? ((spendThisMonthCents - spendLastMonthCents) / spendLastMonthCents) * 100 : undefined}
              trendInvert
              sub={spendLastMonthCents > 0 ? "vs last month" : "No spend yet"}
              href="/reports"
            />
            <Stat
              label="Open tickets"
              value={openTickets}
              sub={waitingOnYou ? `${waitingOnYou} waiting on you` : "Nothing waiting on you"}
              href="/support/tickets"
            />
            <Stat
              label="Next invoice"
              value={nextInvoiceAt ? date(nextInvoiceAt) : "—"}
              sub={`${money(outstandingCents)} outstanding`}
              href="/billing"
            />
          </div>

          <section aria-labelledby="products-heading" className="pt-2 space-y-8">
            {[
              { biz, mine, data },
              ...(showAll && other.data ? [{ biz: otherBiz, mine: otherMine, data: other.data }] : []),
            ].map(({ biz: b, mine: m, data: d }) => (
              <div key={b.id}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 id={b === biz ? "products-heading" : undefined} className="text-section font-semibold tracking-[-0.3px] text-ink">
                      Your {b.name} products
                    </h2>
                    <p className="mt-1 text-[13px] text-muted">
                      {access.branch ? `What you can open at ${access.branch.name}. ` : ""}Opening a product doesn&apos;t ask for your password again.
                    </p>
                  </div>
                  <Link href="/products" className="hidden shrink-0 rounded text-[13px] font-semibold text-brand hover:underline sm:block dark:text-kw">
                    All products
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {m.slice(0, 8).map((s) => (
                    <SuiteCard key={s.id} suite={s} hasAccess usage={d.usageBySuite[s.id]} compact />
                  ))}
                </div>
                {m.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-[13px] text-muted">
                    You can&apos;t open any {b.name} products at {access.branch?.name ?? "your division"} yet.{" "}
                    <Link href="/products" className="font-semibold text-brand hover:underline dark:text-kw">
                      See what&apos;s available
                    </Link>
                    .
                  </p>
                )}
                {m.length > 8 && (
                  <p className="mt-3 text-[13px] text-muted">
                    Showing your 8 busiest products of {m.length}.{" "}
                    <Link href="/products" className="font-semibold text-brand hover:underline dark:text-kw">
                      See them all
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 md:p-6 lg:col-span-2">
              <CardHeader title="Recent activity" description="The latest changes across your account." />
              <ul className="mt-5 divide-y divide-line">
                {data.activity.map((a) => {
                  const Glyph = Icon[ACTIVITY_ICON[a.kind]];
                  const inner = (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand dark:text-kw">
                        <Glyph className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] text-ink">{a.text}</span>
                      <time dateTime={a.at} title={new Date(a.at).toLocaleString("en-ZA")} className="shrink-0 text-xs text-muted">
                        {ago(a.at)}
                      </time>
                    </>
                  );
                  return (
                    <li key={a.id}>
                      {a.href ? (
                        <Link href={a.href} className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2/70">
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex min-h-11 items-center gap-3 py-2.5">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-5 md:p-6">
              <CardHeader title="Quick actions" />
              <ul className="mt-4 space-y-2">
                {quickActions.map((a) => {
                  const Glyph = Icon[a.icon];
                  return (
                    <li key={a.href}>
                      <Link
                        href={a.href}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-ink transition-all duration-200 ease-mettus hover:-translate-y-px hover:border-field-line hover:shadow-card"
                      >
                        <Glyph className="h-4 w-4 text-brand dark:text-kw" />
                        <span className="flex-1">{a.label}</span>
                        <Icon.ChevronRight className="h-4 w-4 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <Recommendations limit={2} title="Suggested for you" />

          <AttentionCard flush />
        </>
      )}
    </div>
  );
}
