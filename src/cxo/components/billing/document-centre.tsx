"use client";

import { useMemo, useState } from "react";
import { downloadCsv } from "@/components/reports/series";
import { Icon } from "@/components/ui/icons";
import { Alert, Button, Card, CardHeader, ErrorState, Field, PendingState, Select, TableWrap, Tabs, TD, TH, TR } from "@/components/ui/primitives";
import { useAllInvoices, useBranches, useBranchMonths, useMonthlyReports, useOrg } from "@/lib/api/queries";
import { buildDocument, DOC_TEXT, type DocKind, type Scope } from "@/lib/documents";
import { count, money } from "@/lib/format";
import { useBusiness } from "@/lib/business";
import { can } from "@/lib/permissions";
import { useSession } from "@/lib/session";
import { BUSINESSES } from "@/lib/suites";
import { useAccess } from "@/lib/use-access";

const PERIODS = [
  { key: "last-1", months: 1, label: "Last month" },
  { key: "last-3", months: 3, label: "Last 3 months" },
  { key: "last-6", months: 6, label: "Last 6 months" },
  { key: "last-12", months: 12, label: "Last 12 months" },
] as const;

/**
 * One place to download a company's invoices, statements and usage reports. Choose the company (XDS, MIE or
 * both combined), the period, and whether to consolidate across branches or split by branch. Admins can cover every
 * branch; everyone else is limited to the branches they work in.
 */
export function DocumentCentre() {
  const user = useSession()!.user;
  const business = useBusiness();
  const access = useAccess();
  // admins and the finance role work for the whole company; anyone else only for the branches they are assigned to
  const isAdmin = can(user.role, "users.manage") || can(user.role, "billing.pay");
  const allBranches = useBranches();
  const org = useOrg().data;
  const monthly = useMonthlyReports();
  const invoices = useAllInvoices();

  const [kind, setKind] = useState<DocKind>("statements");
  const [scopeChoice, setScopeChoice] = useState<Scope | null>(null);
  const [periodKey, setPeriodKey] = useState("last-3");
  const [layoutChoice, setLayoutChoice] = useState("consolidated");
  const [notice, setNotice] = useState<string | null>(null);
  const scope = scopeChoice ?? business;

  const branches = useMemo(() => allBranches.data ?? [], [allBranches.data]);
  const shown = isAdmin ? branches : access.myBranches;
  const layout = layoutChoice === "consolidated" || (layoutChoice === "split" && shown.length > 1) || shown.some((b) => b.id === layoutChoice) ? layoutChoice : "consolidated";

  // finished months, newest first; the month in progress has no invoice yet
  const finished = useMemo(() => (monthly.data ?? []).filter((r) => r.status === "final").map((r) => r.month).sort().reverse(), [monthly.data]);
  const labels = useMemo(() => Object.fromEntries((monthly.data ?? []).map((r) => [r.month, r.label])), [monthly.data]);
  const months = useMemo(() => {
    if (periodKey.startsWith("m:")) return [periodKey.slice(2)];
    const n = PERIODS.find((p) => p.key === periodKey)?.months ?? 3;
    return finished.slice(0, n).reverse();
  }, [periodKey, finished]);

  const split = useBranchMonths(months[0] ?? "", months[months.length - 1] ?? "");
  const suites = isAdmin ? (org?.products ?? access.anywhere) : access.anywhere;

  const out = useMemo(() => {
    if (!invoices.data || !split.data || months.length === 0 || branches.length === 0) return null;
    return buildDocument({ kind, scope, layout, months, labels, invoices: invoices.data, branches, shown, branchMonths: split.data, suites });
    // `shown` and `suites` are derived from the same data as the deps below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, scope, layout, months, labels, invoices.data, branches, split.data, isAdmin, access.myBranches, org?.products]);

  const failed = monthly.isError || invoices.isError || split.isError || allBranches.isError;
  const loading = monthly.isPending || invoices.isPending || allBranches.isPending || (months.length > 0 && split.isPending);
  const usage = kind === "usage";

  return (
    <Card id="documents" className="scroll-mt-24">
      <div className="p-5 md:p-6">
        <CardHeader
          title="Download centre"
          description="Invoices, statements and usage reports for your company. Split them by division, or combine everything into one file."
        />
        <div className="mt-5">
          <Tabs<DocKind>
            label="Choose a document"
            value={kind}
            onChange={(k) => {
              setKind(k);
              setNotice(null);
            }}
            tabs={(Object.keys(DOC_TEXT) as DocKind[]).map((k) => ({ id: k, label: DOC_TEXT[k].label }))}
          />
          <p className="mt-2 text-[13px] text-muted">{DOC_TEXT[kind].hint}</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="Company">
            <Select value={scope} onChange={(e) => setScopeChoice(e.target.value as Scope)}>
              <option value="xds">{BUSINESSES.xds.name}</option>
              <option value="mie">{BUSINESSES.mie.name}</option>
              <option value="both">XDS and MIE combined</option>
            </Select>
          </Field>
          <Field label="Period">
            <Select value={periodKey} onChange={(e) => setPeriodKey(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.key} value={p.key} disabled={finished.length < p.months && p.months > 1}>
                  {p.label}
                </option>
              ))}
              <optgroup label="A single month">
                {finished.map((m) => (
                  <option key={m} value={`m:${m}`}>
                    {labels[m]}
                  </option>
                ))}
              </optgroup>
            </Select>
          </Field>
          <Field label="Divisions" hint={isAdmin ? undefined : "You can download for the divisions you work in."}>
            <Select value={layout} onChange={(e) => setLayoutChoice(e.target.value)}>
              <option value="consolidated">{shown.length === branches.length ? "Consolidated, all divisions" : "Consolidated, all my divisions"}</option>
              {shown.length > 1 && <option value="split">Split by division</option>}
              {shown.length > 1 && (
                <optgroup label="One division">
                  {shown.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>
        </div>

        {scope === "both" && !usage && (
          <p className="mt-4 text-[13px] text-muted">
            XDS and MIE are separate companies, each with its own VAT number. A combined file keeps their invoices apart and adds them up for your records. Each company still issues its own tax invoices.
          </p>
        )}
      </div>

      {notice && (
        <div className="px-5 pb-4 md:px-6">
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        </div>
      )}

      {failed ? (
        <ErrorState
          message="Couldn't prepare your documents."
          onRetry={() => {
            void monthly.refetch();
            void invoices.refetch();
            void split.refetch();
            void allBranches.refetch();
          }}
        />
      ) : shown.length === 0 && !loading ? (
        <p className="border-t border-line px-5 py-6 text-[13px] text-muted md:px-6">
          You aren&apos;t assigned to a division yet, so there is nothing to download. Ask an administrator to add you to a division.
        </p>
      ) : loading || !out ? (
        <PendingState label="Preparing your documents…" />
      ) : (
        <div className="border-t border-line">
          <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">What&apos;s in the file</h3>
              <p className="mt-0.5 text-[13px] text-muted">
                {out.scopeText} · {out.periodText} · {out.layoutText}
                {kind !== "usage" ? ` · ${count(out.count)} ${out.count === 1 ? "invoice" : "invoices"}` : ""}
              </p>
            </div>
            <Button
              disabled={out.empty}
              onClick={() => {
                downloadCsv(out.fileName, out.rows);
                setNotice(`${out.fileName} has downloaded.`);
              }}
            >
              <Icon.Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>

          {out.empty ? (
            <p className="px-5 pb-6 text-[13px] text-muted md:px-6">
              {usage ? "There's no usage for this company, period and division selection." : "There are no invoices for this company and period. Try a longer period, or the other company."}
            </p>
          ) : (
            <TableWrap label="Totals in this file">
              <table className="w-full min-w-[480px] border-t border-line">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={TH}>Division</th>
                    {usage && <th scope="col" className={`${TH} text-right`}>Enquiries</th>}
                    <th scope="col" className={`${TH} text-right`}>{usage ? "Spend" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody>
                  {out.byBranch.map((b) => (
                    <tr key={b.id} className={TR}>
                      <th scope="row" className={`${TD} text-left font-medium`}>{b.name}</th>
                      {usage && <td className={`${TD} text-right tabular-nums`}>{count(b.enquiries)}</td>}
                      <td className={`${TD} text-right tabular-nums whitespace-nowrap`}>{money(b.cents)}</td>
                    </tr>
                  ))}
                  {out.byBranch.length > 1 && (
                    <tr className="border-t border-line bg-surface-2/60">
                      <th scope="row" className={`${TD} text-left font-semibold`}>Total</th>
                      {usage && <td className={`${TD} text-right font-semibold tabular-nums`}>{count(out.enquiries)}</td>}
                      <td className={`${TD} text-right font-semibold tabular-nums whitespace-nowrap`}>{money(out.totalCents)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>
      )}
    </Card>
  );
}
