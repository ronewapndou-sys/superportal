"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import {
  Alert,
  Button,
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
import { useMonthlyReports } from "@/lib/api/queries";
import type { Business, MonthlyReport, SuiteId } from "@/lib/api/types";
import { count, money, moneyWhole } from "@/lib/format";
import { SUITE_BY_ID, suitesByCategory } from "@/lib/suites";
import { formatMonthShort, isoDay } from "./date-range";
import { downloadCsv, PALETTE } from "./series";

/** First and last day of a YYYY-MM month, capped at today for the current month. */
export function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  const today = isoDay(new Date());
  const to = isoDay(last) > today ? today : isoDay(last);
  return { from: `${ym}-01`, to };
}

function monthCsv(r: MonthlyReport, suites: SuiteId[]) {
  return [
    ["Month", "Product", "Enquiries", "Spend (ZAR)"],
    ...suites.map((s) => [r.label, SUITE_BY_ID[s].name, String(r.bySuite[s].enquiries), (r.bySuite[s].spendCents / 100).toFixed(2)]),
    [r.label, "Total", String(suites.reduce((a, s) => a + r.bySuite[s].enquiries, 0)), (suites.reduce((a, s) => a + r.bySuite[s].spendCents, 0) / 100).toFixed(2)],
  ];
}

/**
 * Month-by-month statements: a 13-month spend chart, then one row per
 * month with per-product spend, a link to its invoice and downloads.
 * "View month" hands the month back to the Usage section.
 */
export function MonthlyReportsSection({
  suites,
  business,
  onViewMonth,
  onEmailMonthly,
}: {
  suites: SuiteId[];
  business: Business;
  onViewMonth: (ym: string) => void;
  onEmailMonthly: () => void;
}) {
  const { data, isPending, isError, refetch } = useMonthlyReports();
  const [notice, setNotice] = useState<string | null>(null);

  if (isPending) {
    return (
      <Card>
        <PendingState label="Loading your monthly reports…" />
      </Card>
    );
  }
  if (isError) {
    return (
      <Card>
        <ErrorState message="Couldn't load your monthly reports." onRetry={() => refetch()} />
      </Card>
    );
  }
  if (data.length === 0) {
    return (
      <Card>
        <EmptyState title="No monthly reports yet" description="Your first monthly report appears after your first full month on Mettus." />
      </Card>
    );
  }

  // only count products this person can see
  const rows = data.map((r) => ({
    ...r,
    enquiries: suites.reduce((a, s) => a + r.bySuite[s].enquiries, 0),
    spendCents: suites.reduce((a, s) => a + r.bySuite[s].spendCents, 0),
  }));
  const chronological = [...rows].reverse();
  const groups = groupsFor(business, suites);

  function downloadMonth(r: MonthlyReport) {
    downloadCsv(`mettus-monthly-${r.month}.csv`, monthCsv(r, suites));
    setNotice(`mettus-monthly-${r.month}.csv has downloaded.`);
  }

  function downloadAll() {
    const header = ["Month", "Status", ...suites.map((s) => `${SUITE_BY_ID[s].name} enquiries`), ...suites.map((s) => `${SUITE_BY_ID[s].name} spend (ZAR)`), "Total spend (ZAR)", "Invoice"];
    const body = rows.map((r) => [
      r.label,
      r.status === "final" ? "Final" : "In progress",
      ...suites.map((s) => String(r.bySuite[s].enquiries)),
      ...suites.map((s) => (r.bySuite[s].spendCents / 100).toFixed(2)),
      (r.spendCents / 100).toFixed(2),
      r.invoiceNumbers[business] ?? "",
    ]);
    downloadCsv("mettus-monthly-summary.csv", [header, ...body]);
    setNotice(`mettus-monthly-summary.csv has downloaded. It covers ${rows.length} months.`);
  }

  return (
    <div className="space-y-6">
      {notice && (
        <Alert tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Card className="p-5 md:p-6">
        <CardHeader
          title="Spend by month"
          description="The last 13 months, split by product. The current month keeps growing until month end."
          action={
            <>
              <Button variant="secondary" size="sm" onClick={downloadAll}>
                <Icon.Download className="h-4 w-4" /> Download all months
              </Button>
              <Button variant="ghost" size="sm" onClick={onEmailMonthly}>
                <Icon.Mail className="h-4 w-4" /> Email me every month
              </Button>
            </>
          }
        />
        <MonthColumns rows={chronological} groups={groups} />
      </Card>

      <Card>
        <TableWrap label="Monthly reports">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>Month</th>
                <th scope="col" className={TH}>Status</th>
                {groups.map((g) => (
                  <th key={g.name} scope="col" className={cx(TH, "text-right")}>
                    {g.name}
                  </th>
                ))}
                <th scope="col" className={cx(TH, "text-right")}>Enquiries</th>
                <th scope="col" className={cx(TH, "text-right")}>Spend</th>
                <th scope="col" className={TH}>Invoice</th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className={TR}>
                  <th scope="row" className={cx(TD, "text-left font-semibold whitespace-nowrap")}>
                    {r.label}
                  </th>
                  <td className={TD}>
                    <Pill tone={r.status === "final" ? "neutral" : "info"} dot={r.status !== "final"}>{r.status === "final" ? "Final" : "In progress"}</Pill>
                  </td>
                  {groups.map((g) => (
                    <td key={g.name} className={cx(TD, "text-right tabular-nums whitespace-nowrap text-muted")}>
                      {moneyWhole(groupSpend(r, g.ids))}
                    </td>
                  ))}
                  <td className={cx(TD, "text-right tabular-nums")}>{count(r.enquiries)}</td>
                  <td className={cx(TD, "text-right font-semibold tabular-nums whitespace-nowrap")}>{money(r.spendCents)}</td>
                  <td className={cx(TD, "whitespace-nowrap tabular-nums text-muted")}>{r.invoiceNumbers[business] ?? "Not issued yet"}</td>
                  <td className={cx(TD, "text-right whitespace-nowrap")}>
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onViewMonth(r.month)} aria-label={`View ${r.label} in usage`}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => downloadMonth(r)} aria-label={`Download ${r.label} as CSV`}>
                        <Icon.Download className="h-4 w-4" /> CSV
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}

/** Stacked monthly columns. The table below carries the same numbers for screen readers. */
interface Group {
  name: string;
  ids: SuiteId[];
}

const groupSpend = (r: MonthlyReport, ids: SuiteId[]) => ids.reduce((sum, s) => sum + r.bySuite[s].spendCents, 0);

/** Product categories that have at least one of these products, in catalogue order. */
function groupsFor(business: Business, suites: SuiteId[]): Group[] {
  return suitesByCategory(business)
    .map((c) => ({ name: c.name, ids: c.suites.map((s) => s.id).filter((id) => suites.includes(id)) }))
    .filter((g) => g.ids.length > 0);
}

function MonthColumns({ rows, groups }: { rows: MonthlyReport[]; groups: Group[] }) {
  const max = Math.max(1, ...rows.map((r) => r.spendCents));
  return (
    <div className="mt-6" aria-hidden>
      <div className="flex h-48 items-end gap-1.5 sm:gap-2.5">
        {rows.map((r) => (
          <div key={r.month} className="group relative flex h-full flex-1 flex-col justify-end" title={`${r.label}: ${money(r.spendCents)}`}>
            <div
              className={cx("flex origin-bottom flex-col-reverse overflow-hidden rounded-t-lg transition-transform duration-500 ease-mettus", r.status === "in_progress" && "opacity-60")}
              style={{ height: `${(r.spendCents / max) * 100}%` }}
            >
              {groups.map((g, i) => (
                <span
                  key={g.name}
                  className="block w-full"
                  style={{ height: `${(groupSpend(r, g.ids) / Math.max(1, r.spendCents)) * 100}%`, background: PALETTE[i % PALETTE.length] }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2.5">
        {rows.map((r, i) => (
          <span key={r.month} className={cx("flex-1 text-center text-[10px] text-muted sm:text-[11px]", i % 2 === 1 && "max-sm:invisible")}>
            {formatMonthShort(r.month)}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {groups.map((g, i) => (
          <span key={g.name} className="flex items-center gap-2 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} /> {g.name}
          </span>
        ))}
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-steel/60" /> Faded column = month in progress
        </span>
      </div>
    </div>
  );
}
