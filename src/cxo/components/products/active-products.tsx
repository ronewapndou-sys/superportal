"use client";

import Link from "next/link";
import {
  buttonClass,
  Card,
  CardHeader,
  cx,
  EmptyState,
  ErrorState,
  PendingState,
  Pill,
  TableWrap,
  TD,
  TH,
  TR,
} from "@/components/ui/primitives";
import { useBillingSummary, useDashboard } from "@/lib/api/queries";
import type { Business, SuiteId, Subscription } from "@/lib/api/types";
import { count, date, money } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useSession } from "@/lib/session";
import { useAccess } from "@/lib/use-access";
import { BUSINESSES, SUITE_BY_ID, suiteIdsFor } from "@/lib/suites";

interface Row {
  sub: Subscription;
  used?: number;
  hasAccess: boolean;
  /** other branches of yours where you can open it */
  elsewhere: string[];
}

function AccessCell({ hasAccess, elsewhere, canLaunch }: Pick<Row, "hasAccess" | "elsewhere"> & { canLaunch: boolean }) {
  if (hasAccess) return <Pill tone="success">{canLaunch ? "Can open here" : "View only"}</Pill>;
  if (elsewhere.length) return <span className="text-muted">At {elsewhere.join(", ")}</span>;
  return <span className="text-muted">Not in your roles</span>;
}

/** Enquiries against the bundle, in words. Over-bundle is the only state that earns colour. */
function Usage({ used, included }: { used?: number; included: number }) {
  if (used === undefined) return <span className="text-muted">Not available yet</span>;
  if (included === 0) return <span className="tabular-nums">{count(used)} used, pay as you go</span>;
  const over = used > included;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="tabular-nums">
        {count(used)} of {count(included)} included
      </span>
      {over && <Pill tone="warning">{count(used - included)} over the bundle</Pill>}
    </span>
  );
}

/**
 * What the organisation actually pays for in the selected business: plan,
 * fee, usage against the bundle, renewal, and whether *you* can open it.
 */
export function ActiveProducts({ business }: { business: Business }) {
  const user = useSession()!.user;
  const access = useAccess();
  const billing = useBillingSummary();
  const dashboard = useDashboard();
  const biz = BUSINESSES[business];
  const ids = suiteIdsFor(business);
  const canLaunch = can(user.role, "products.launch");

  if (billing.isPending) {
    return (
      <Card>
        <PendingState label="Loading your active products…" />
      </Card>
    );
  }
  if (billing.isError) {
    return (
      <Card>
        <ErrorState message="Couldn't load your active products." onRetry={() => billing.refetch()} />
      </Card>
    );
  }

  const rows: Row[] = billing.data.subscriptions
    .filter((s) => s.status === "active" && ids.includes(s.suite))
    .map((sub) => ({
      sub,
      used: dashboard.data?.usageBySuite[sub.suite as SuiteId]?.enquiries,
      hasAccess: access.suites.includes(sub.suite),
      elsewhere: access.elsewhere(sub.suite).map((b) => b.name),
    }));
  const monthly = rows.reduce((sum, r) => sum + r.sub.monthlyFeeCents, 0);

  return (
    <Card aria-labelledby="active-products-heading">
      <div className="p-5 md:p-6">
        <CardHeader
          id="active-products-heading"
          title="Active products"
          description={
            rows.length === 0
              ? `Your organisation doesn't have any ${biz.name} products yet.`
              : `${rows.length} of ${ids.length} ${biz.name} products are active on your account, at ${money(monthly)} a month in plan fees. Usage covers the last 30 days.`
          }
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={`No active ${biz.name} products`}
          description="Pick a product below to find out more, and your account manager will set up a trial."
        />
      ) : (
        <>
          {/* desktop */}
          <div className="hidden border-t border-line md:block">
            <TableWrap label={`Active ${biz.name} products`}>
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={TH}>Product</th>
                    <th scope="col" className={TH}>Plan</th>
                    <th scope="col" className={cx(TH, "text-right")}>Monthly fee</th>
                    <th scope="col" className={TH}>Usage</th>
                    <th scope="col" className={TH}>Renews</th>
                    <th scope="col" className={TH}>{access.branch ? `You at ${access.branch.name}` : "Your access"}</th>
                    <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ sub, used, hasAccess, elsewhere }) => (
                    <tr key={sub.suite} className={TR}>
                      <th scope="row" className={cx(TD, "text-left font-semibold")}>
                        {SUITE_BY_ID[sub.suite].name}
                      </th>
                      <td className={TD}>{sub.plan}</td>
                      <td className={cx(TD, "text-right tabular-nums whitespace-nowrap")}>
                        {sub.monthlyFeeCents ? money(sub.monthlyFeeCents) : <span className="text-muted">None</span>}
                      </td>
                      <td className={TD}>
                        <Usage used={used} included={sub.includedEnquiries} />
                      </td>
                      <td className={cx(TD, "whitespace-nowrap")}>{date(sub.renewsAt)}</td>
                      <td className={TD}>
                        <AccessCell hasAccess={hasAccess} elsewhere={elsewhere} canLaunch={canLaunch} />
                      </td>
                      <td className={cx(TD, "text-right")}>
                        <Link
                          href={`/products/${sub.suite}`}
                          className={buttonClass("secondary", "sm")}
                          aria-label={`${hasAccess && canLaunch ? "Open" : "View"} ${SUITE_BY_ID[sub.suite].name}`}
                        >
                          {hasAccess && canLaunch ? "Open" : "View"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>

          {/* mobile */}
          <ul className="divide-y divide-line border-t border-line md:hidden">
            {rows.map(({ sub, used, hasAccess, elsewhere }) => (
              <li key={sub.suite} className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{SUITE_BY_ID[sub.suite].name}</p>
                    <p className="text-[13px] text-muted">
                      {sub.plan} plan{sub.monthlyFeeCents ? `, ${money(sub.monthlyFeeCents)} a month` : ""}
                    </p>
                  </div>
                  <Link href={`/products/${sub.suite}`} className={buttonClass("secondary", "sm")}>
                    {hasAccess && canLaunch ? "Open" : "View"}
                  </Link>
                </div>
                <div className="text-[13px] text-ink">
                  <Usage used={used} included={sub.includedEnquiries} />
                </div>
                <p className="text-xs text-muted">
                  Renews {date(sub.renewsAt)}.{" "}
                  {hasAccess
                    ? "You can open it at this division."
                    : elsewhere.length
                      ? `You can open it at ${elsewhere.join(", ")}.`
                      : "None of your roles include it."}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
