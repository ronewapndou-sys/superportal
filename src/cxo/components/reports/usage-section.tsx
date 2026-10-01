"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HBarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { DateRangeFilter, describeRange, formatMonthShort } from "@/components/reports/date-range";
import { downloadUsageCsv, OTHER_COLOR, PALETTE } from "@/components/reports/series";
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
  Select,
  Spinner,
  Stat,
  TableWrap,
  TD,
  TH,
  TR,
} from "@/components/ui/primitives";
import { reportsApi } from "@/lib/api/endpoints";
import { useUsage } from "@/lib/api/queries";
import type { Branch, ReportRange, SuiteId, UsageQuery, UsageReport } from "@/lib/api/types";
import { count, dayMonth, money, moneyWhole } from "@/lib/format";
import { SUITE_BY_ID, SUITE_LABEL } from "@/lib/suites";

export interface UsageSelection {
  range: ReportRange;
  query: UsageQuery;
}

/**
 * Usage section: date range (preset or custom) + product filter, headline
 * stats, the enquiries chart (daily or monthly), spend by product and top
 * enquiry types. Exports cover exactly the range on screen. The selection
 * is controlled so the Monthly reports section can jump it to one month.
 */
export function UsageSection({
  suites,
  branches,
  allowAllBranches,
  canExport,
  selection,
  onSelection,
}: {
  suites: SuiteId[];
  branches: Branch[];
  /** admins can see the whole organisation; others only their own branches */
  allowAllBranches: boolean;
  canExport: boolean;
  selection: UsageSelection;
  onSelection: (s: UsageSelection) => void;
}) {
  const { range } = selection;
  // non-admins always report on one of their branches
  const query: UsageQuery =
    allowAllBranches || branches.some((b) => b.id === selection.query.branchId)
      ? selection.query
      : { ...selection.query, branchId: branches[0]?.id };
  const branchName = branches.find((b) => b.id === query.branchId)?.name;
  const [product, setProduct] = useState<SuiteId | "all">("all");
  const usage = useUsage(query);
  const visible = product === "all" ? suites : [product];
  const rangeText = `${describeRange(range, query)}${branchName ? ` at ${branchName}` : ""}`;

  const exporter = useMutation({
    mutationFn: async (format: "csv" | "pdf") => {
      const res = await reportsApi.exportReport({ report: "usage", from: query.from, to: query.to, format });
      if (format === "csv" && usage.data) downloadUsageCsv(res.fileName, usage.data.series, visible);
      return { ...res, format };
    },
  });

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4 md:p-5">
        <DateRangeFilter
          key={`${query.from}-${query.to}`}
          range={range}
          query={query}
          onChange={(r, q) => onSelection({ range: r, query: { ...q, branchId: query.branchId } })}
        />
        <div className="flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center">
          {(branches.length > 1 || allowAllBranches) && (
            <label className="flex items-center gap-3 md:w-72">
              <span className="shrink-0 text-[13px] font-medium text-ink">Division</span>
              <Select
                value={query.branchId ?? "all"}
                onChange={(e) =>
                  onSelection({ range, query: { ...query, branchId: e.target.value === "all" ? undefined : e.target.value } })
                }
              >
                {allowAllBranches && <option value="all">All divisions</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="flex items-center gap-3 md:w-72">
            <span className="shrink-0 text-[13px] font-medium text-ink">Product</span>
            <Select value={product} onChange={(e) => setProduct(e.target.value as SuiteId | "all")}>
              <option value="all">All products</option>
              {suites.map((s) => (
                <option key={s} value={s}>
                  {SUITE_BY_ID[s].name}
                </option>
              ))}
            </Select>
          </label>
          <p className="flex items-center gap-2 text-xs font-medium text-muted md:ml-4" aria-live="polite">
            {usage.isFetching && !usage.isPending ? (
              <>
                <Spinner className="h-3.5 w-3.5" /> Updating…
              </>
            ) : (
              <>
                Updated every 15 minutes
              </>
            )}
          </p>
          {canExport && (
            <div className="flex gap-2 md:ml-auto">
              <Button
                variant="secondary"
                size="sm"
                loading={exporter.isPending && exporter.variables === "csv"}
                disabled={exporter.isPending || !usage.data}
                onClick={() => exporter.mutate("csv")}
              >
                {!(exporter.isPending && exporter.variables === "csv") && <Icon.Download className="h-4 w-4" />}
                Export CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={exporter.isPending && exporter.variables === "pdf"}
                disabled={exporter.isPending || !usage.data}
                onClick={() => exporter.mutate("pdf")}
              >
                {!(exporter.isPending && exporter.variables === "pdf") && <Icon.File className="h-4 w-4" />}
                Export PDF
              </Button>
            </div>
          )}
        </div>
      </Card>

      {exporter.isSuccess && (
        <Alert tone="success" title="Export ready" onDismiss={() => exporter.reset()}>
          {exporter.data.format === "csv"
            ? `${exporter.data.fileName} has downloaded. It covers ${rangeText}.`
            : `Preparing ${exporter.data.fileName}. It downloads automatically when it's ready, usually in under a minute.`}
        </Alert>
      )}
      {exporter.isError && (
        <Alert tone="danger" onDismiss={() => exporter.reset()}>
          Couldn&apos;t export that report. Please try again.
        </Alert>
      )}

      {usage.isPending ? (
        <Card>
          <PendingState label="Crunching your usage numbers…" />
        </Card>
      ) : usage.isError ? (
        <Card>
          <ErrorState message={usage.error.message || "Couldn't load your usage report."} onRetry={() => usage.refetch()} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title="No products to report on"
            description="Your account doesn't have access to any Mettus products yet. Ask your admin to give you product access."
          />
        </Card>
      ) : (
        <ReportBody data={usage.data} visible={visible} rangeText={rangeText} />
      )}
    </div>
  );
}

function ReportBody({ data, visible, rangeText }: { data: UsageReport; visible: SuiteId[]; rangeText: string }) {
  const monthly = data.granularity === "month";
  const fmt = monthly ? formatMonthShort : dayMonth;
  const [asTable, setAsTable] = useState(false);

  const rows = visible.map((s) => ({ suite: s, ...data.totals[s] })).sort((a, b) => b.spendCents - a.spendCents);

  // Fourteen lines on one chart is unreadable: plot the four busiest products and fold the rest into "Other".
  const byVolume = [...visible].sort((a, b) => data.totals[b].enquiries - data.totals[a].enquiries).filter((s) => data.totals[s].enquiries > 0);
  const busiest = byVolume.slice(0, 4);
  const rest = byVolume.slice(4);
  const chartSeries = [
    ...busiest.map((s, i) => ({ key: s, label: SUITE_LABEL[s], color: PALETTE[i], values: data.series.map((p) => p[s]) })),
    ...(rest.length
      ? [
          {
            key: "other",
            label: `Other (${rest.length})`,
            color: OTHER_COLOR,
            values: data.series.map((p) => rest.reduce((sum, s) => sum + p[s], 0)),
          },
        ]
      : []),
  ];
  const enquiries = rows.reduce((a, r) => a + r.enquiries, 0);
  const spend = rows.reduce((a, r) => a + r.spendCents, 0);
  const prevEnquiries = rows.reduce((a, r) => a + r.enquiries / (1 + r.trendPct / 100), 0);
  const prevSpend = rows.reduce((a, r) => a + r.spendCents / (1 + r.trendPct / 100), 0);
  const pct = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : 0);
  const top = [...rows].sort((a, b) => b.spendCents - a.spendCents)[0];
  const topEnquiries = data.topEnquiries.filter((e) => visible.includes(e.suite));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Enquiries" value={count(enquiries)} trend={pct(enquiries, prevEnquiries)} sub={`vs previous ${count(data.days)} days`} />
        <Stat
          label="Spend"
          value={moneyWhole(spend)}
          trend={pct(spend, prevSpend)}
          sub="excl. VAT and plan fees"
        />
        <Stat label="Hit rate" value={`${data.hitRatePct.toFixed(1)}%`} trend={0} sub="records found first time" />
        <Stat
          label="Top product"
          value={SUITE_LABEL[top.suite]}
          trend={top.trendPct}
          sub={`${Math.round((top.spendCents / Math.max(1, spend)) * 100)}% of spend`}
        />
      </div>

      <Card className="p-5 md:p-6" aria-labelledby="usage-title">
        <CardHeader
          id="usage-title"
          title={monthly ? "Enquiries by month" : "Enquiries over time"}
          description={`${monthly ? "Monthly" : "Daily"} enquiries for ${rangeText}. Hover or focus the chart and use the arrow keys to read each ${monthly ? "month" : "day"}.`}
          action={
            <Button variant="ghost" size="sm" aria-pressed={asTable} onClick={() => setAsTable((t) => !t)}>
              {asTable ? "Show as chart" : "Show as table"}
            </Button>
          }
        />
        <div className="mt-5">
          {asTable ? (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-line">
              <TableWrap label={`${monthly ? "Monthly" : "Daily"} enquiries by product`}>
                <table className="w-full min-w-[420px]">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-line">
                      <th scope="col" className={TH}>{monthly ? "Month" : "Date"}</th>
                      {visible.map((s) => (
                        <th key={s} scope="col" className={cx(TH, "text-right")}>
                          {SUITE_LABEL[s]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.series.map((p) => (
                      <tr key={p.date} className={TR}>
                        <th scope="row" className={cx(TD, "text-left font-medium")}>
                          {fmt(p.date)}
                        </th>
                        {visible.map((s) => (
                          <td key={s} className={cx(TD, "text-right tabular-nums")}>
                            {count(p[s])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          ) : (
            <LineChart
              label={`${monthly ? "Monthly" : "Daily"} enquiries by product`}
              dates={data.series.map((p) => p.date)}
              formatDate={fmt}
              unit={monthly ? "month" : "day"}
              series={chartSeries}
            />
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 md:p-6 lg:col-span-2" aria-labelledby="spend-title">
          <CardHeader id="spend-title" title="Spend by product" description={`Enquiry spend for ${rangeText}.`} />
          <div className="mt-6">
            <HBarChart
              key={`${data.from}-${data.to}-${visible.join()}`}
              label="Spend by product"
              items={rows.map((r) => ({
                key: r.suite,
                label: SUITE_BY_ID[r.suite].name,
                value: r.spendCents,
                display: moneyWhole(r.spendCents),
                color: "var(--chart-blue)",
                sub: `${count(r.enquiries)} enquiries`,
              }))}
            />
          </div>
        </Card>

        <Card className="overflow-hidden lg:col-span-3" aria-labelledby="top-title">
          <div className="p-5 pb-0 md:p-6 md:pb-0">
            <CardHeader id="top-title" title="Top enquiry types" description="What your team runs most often." />
          </div>
          <div className="mt-4">
            {topEnquiries.length === 0 ? (
              <EmptyState title="No enquiries in this range" description="Try a longer date range or another product." />
            ) : (
              <TableWrap label="Top enquiry types">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={TH}>Enquiry</th>
                      <th scope="col" className={TH}>Product</th>
                      <th scope="col" className={cx(TH, "text-right")}>Count</th>
                      <th scope="col" className={cx(TH, "text-right")}>Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEnquiries.map((e) => (
                      <tr key={e.name} className={TR}>
                        <td className={cx(TD, "font-medium")}>{e.name}</td>
                        <td className={TD}>
                          <span className="text-muted">{SUITE_LABEL[e.suite]}</span>
                        </td>
                        <td className={cx(TD, "text-right tabular-nums")}>{count(e.count)}</td>
                        <td className={cx(TD, "text-right tabular-nums")}>{money(e.spendCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
