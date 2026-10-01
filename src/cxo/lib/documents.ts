import type { Branch, BranchMonth, Business, Invoice, SuiteId } from "@/lib/api/types";
import { INVOICE_STATUS_LABEL } from "@/lib/status";
import { BUSINESSES, SUITE_BY_ID, SUITE_LABEL, suiteIdsFor } from "@/lib/suites";

/*
 * Builds the files in the Billing download centre: invoices, statements and usage reports, for one
 * company or XDS and MIE together, consolidated across divisions or split by division.
 *
 * Demo downloads are CSV, built in the browser. When the billing system is connected, the same choices
 * (document, company, period, divisions) go to the server, which returns the tax-invoice PDFs or
 * statements and enforces which divisions the signed-in person may see.
 */

export type DocKind = "invoices" | "statements" | "usage";
export type Scope = Business | "both";
/** "consolidated", "split" (one section per division), or the id of a single division */
export type Layout = string;

export const DOC_TEXT: Record<DocKind, { label: string; file: string; hint: string }> = {
  invoices: { label: "Invoices", file: "invoices", hint: "Every invoice in the period, with its product lines." },
  statements: { label: "Statements", file: "statement", hint: "What was invoiced, what has been paid and what is still outstanding." },
  usage: { label: "Usage reports", file: "usage-report", hint: "Enquiries and spend by product, month by month." },
};

export interface DocInput {
  kind: DocKind;
  scope: Scope;
  layout: Layout;
  /** YYYY-MM, oldest first */
  months: string[];
  /** YYYY-MM to "September 2026" */
  labels: Record<string, string>;
  invoices: Invoice[];
  /** every division, so an invoice is always split across the whole organisation and adds back to its total */
  branches: Branch[];
  /** the divisions this person may see: everything for an admin, their own otherwise */
  shown: Branch[];
  branchMonths: BranchMonth[];
  /** products this person may report on */
  suites: SuiteId[];
}

export interface BranchTotal {
  id: string;
  name: string;
  cents: number;
  enquiries: number;
}

export interface DocOutput {
  fileName: string;
  rows: string[][];
  /** invoices in the file, or months covered for a usage report */
  count: number;
  totalCents: number;
  enquiries: number;
  byBranch: BranchTotal[];
  empty: boolean;
  scopeText: string;
  layoutText: string;
  periodText: string;
}

const cents = (n: number) => (n / 100).toFixed(2);
const businessesOf = (scope: Scope): Business[] => (scope === "both" ? ["xds", "mie"] : [scope]);

export function buildDocument(input: DocInput): DocOutput {
  const { kind, scope, layout, months, labels, branches, shown } = input;
  const businesses = businessesOf(scope);
  const monthOf = Object.fromEntries(Object.entries(labels).map(([m, l]) => [l, m]));
  const cell = new Map(input.branchMonths.map((b) => [`${b.month}|${b.branchId}`, b.bySuite]));

  // the divisions the numbers add up over, and the ones that get their own section
  const sel = layout === "consolidated" || layout === "split" ? shown : shown.filter((b) => b.id === layout);
  const split = layout !== "consolidated";

  const scopeText = scope === "both" ? "XDS and MIE, combined" : BUSINESSES[scope].name;
  const layoutText =
    layout === "consolidated"
      ? shown.length === branches.length
        ? "All divisions, consolidated"
        : "All your divisions, consolidated"
      : layout === "split"
        ? "Split by division"
        : (sel[0]?.name ?? "One division");
  const first = labels[months[0]] ?? months[0] ?? "";
  const last = labels[months[months.length - 1]] ?? first;
  const periodText = months.length <= 1 ? first : `${first} to ${last}`;

  const rows: string[][] = [
    [`Mettus ${DOC_TEXT[kind].label.toLowerCase()}`],
    ["Company", scopeText],
    ["Period", periodText],
    ["Divisions", layoutText],
    ["Prepared", new Date().toISOString().slice(0, 10)],
  ];
  if (scope === "both" && kind !== "usage") {
    rows.push(["Note", "XDS and MIE are separate companies. Each issues its own tax invoices. This file keeps them apart and adds them up for your records."]);
  }
  rows.push([]);

  const totals = new Map<string, BranchTotal>();
  const add = (b: Branch | null, amount: number, enquiries: number) => {
    const id = b?.id ?? "all";
    const t = totals.get(id) ?? { id, name: b?.name ?? (shown.length === branches.length ? "All divisions" : "All your divisions"), cents: 0, enquiries: 0 };
    t.cents += amount;
    t.enquiries += enquiries;
    totals.set(id, t);
  };
  let count = 0;
  let grand = 0;
  let grandEnquiries = 0;

  // Invoices are issued to each division's own account, so a division's invoices are simply the ones issued to it.
  const selIds = new Set(sel.map((b) => b.id));
  const invoices = input.invoices
    .filter((i) => businesses.includes(i.business) && months.includes(monthOf[i.periodLabel]) && selIds.has(i.branchId))
    .sort((a, b) => a.issuedAt.localeCompare(b.issuedAt) || a.number.localeCompare(b.number));
  const sum = (list: Invoice[]) => list.reduce((a, i) => a + i.amountCents, 0);
  const divisionHeader = (b: Branch) => `Division: ${b.name} (account ${b.code}${b.costCentre ? `, cost centre ${b.costCentre}` : ""})`;
  const divisionOf = (inv: Invoice) => branches.find((b) => b.id === inv.branchId);

  if (kind === "invoices") {
    const invoiceRows = (inv: Invoice) => {
      rows.push(["Invoice", inv.number, "Company", BUSINESSES[inv.business].name, "Period", inv.periodLabel, "Status", INVOICE_STATUS_LABEL[inv.status]]);
      rows.push(["Product", "Description", "Quantity", "Amount (ZAR, incl. VAT)"]);
      for (const l of inv.lines) rows.push([SUITE_LABEL[l.suite], l.description, String(l.quantity), cents(l.amountCents)]);
      rows.push(["Invoice total", "", "", cents(inv.amountCents)], []);
    };
    if (!split) {
      // one combined document per company and month, with the product lines added up across the divisions
      for (const biz of businesses) {
        for (const m of months) {
          const group = invoices.filter((i) => i.business === biz && monthOf[i.periodLabel] === m);
          if (group.length === 0) continue;
          rows.push(["Consolidated invoice", BUSINESSES[biz].name, labels[m] ?? m, "Covers", group.map((i) => i.number).join("; ")]);
          rows.push(["Product", "Description", "Quantity", "Amount (ZAR, incl. VAT)"]);
          const bySuite = new Map<string, { suite: string; qty: number; amt: number }>();
          for (const inv of group) {
            for (const l of inv.lines) {
              const t = bySuite.get(l.suite) ?? { suite: l.suite, qty: 0, amt: 0 };
              t.qty += l.quantity;
              t.amt += l.amountCents;
              bySuite.set(l.suite, t);
            }
          }
          for (const t of bySuite.values()) {
            const label = SUITE_LABEL[t.suite as keyof typeof SUITE_LABEL];
            rows.push([label, t.suite === "platform" ? "Mettus platform fee" : `${t.qty.toLocaleString("en-ZA")} enquiries`, String(t.qty), cents(t.amt)]);
          }
          rows.push(["Total", "", "", cents(sum(group))], []);
        }
      }
      add(null, sum(invoices), 0);
    } else {
      for (const b of sel) {
        const mine = invoices.filter((i) => i.branchId === b.id);
        add(b, sum(mine), 0);
        if (mine.length === 0) continue;
        rows.push([divisionHeader(b)], []);
        for (const inv of mine) invoiceRows(inv);
        rows.push(["Division total", "", "", cents(sum(mine))], []);
      }
    }
    grand = sum(invoices);
    count = invoices.length;
    if (businesses.length > 1) {
      for (const biz of businesses) rows.push([`Total ${BUSINESSES[biz].name}`, "", "", cents(sum(invoices.filter((i) => i.business === biz)))]);
    }
    rows.push(["All invoices", "", "", cents(grand)]);
  }

  if (kind === "statements") {
    const header = ["Division", "Account code", "Company", "Invoice", "Period", "Issued", "Due", "Status", "Amount (ZAR, incl. VAT)"];
    const line = (inv: Invoice) => [divisionOf(inv)?.name ?? "", divisionOf(inv)?.code ?? "", BUSINESSES[inv.business].name, inv.number, inv.periodLabel, inv.issuedAt.slice(0, 10), inv.dueAt.slice(0, 10), INVOICE_STATUS_LABEL[inv.status], cents(inv.amountCents)];
    const total = (label: string, amount: number) => [label, "", "", "", "", "", "", "", cents(amount)];
    if (!split) {
      rows.push(header);
      for (const inv of invoices) rows.push(line(inv));
      add(null, sum(invoices), 0);
    } else {
      for (const b of sel) {
        const mine = invoices.filter((i) => i.branchId === b.id);
        add(b, sum(mine), 0);
        if (mine.length === 0) continue;
        rows.push([divisionHeader(b)], header);
        for (const inv of mine) rows.push(line(inv));
        rows.push(total("Division total", sum(mine)), []);
      }
    }
    grand = sum(invoices);
    count = invoices.length;
    rows.push([]);
    rows.push(total("Invoiced", grand));
    rows.push(total("Paid", sum(invoices.filter((i) => i.status === "paid"))));
    rows.push(total("Outstanding", sum(invoices.filter((i) => i.status !== "paid"))));
    rows.push(total("Of which overdue", sum(invoices.filter((i) => i.status === "overdue"))));
  }

  if (kind === "usage") {
    const header = ["Month", "Company", "Product", "Enquiries", "Spend (ZAR, incl. VAT)"];
    const usageRows = (group: Branch[]) => {
      let enq = 0;
      let spend = 0;
      for (const m of months) {
        for (const biz of businesses) {
          for (const s of suiteIdsFor(biz).filter((id) => input.suites.includes(id))) {
            const e = group.reduce((a, b) => a + (cell.get(`${m}|${b.id}`)?.[s]?.enquiries ?? 0), 0);
            const c = group.reduce((a, b) => a + (cell.get(`${m}|${b.id}`)?.[s]?.spendCents ?? 0), 0);
            if (e === 0) continue;
            rows.push([labels[m] ?? m, BUSINESSES[biz].name, SUITE_BY_ID[s].name, String(e), cents(c)]);
            enq += e;
            spend += c;
          }
        }
      }
      return { enq, spend };
    };
    if (!split) {
      rows.push(header);
      const t = usageRows(sel);
      add(null, t.spend, t.enq);
      grand += t.spend;
      grandEnquiries += t.enq;
    } else {
      for (const b of sel) {
        rows.push([`Division: ${b.name} (account ${b.code}${b.costCentre ? `, cost centre ${b.costCentre}` : ""})`], header);
        const t = usageRows([b]);
        rows.push(["Division total", "", "", String(t.enq), cents(t.spend)], []);
        add(b, t.spend, t.enq);
        grand += t.spend;
        grandEnquiries += t.enq;
      }
    }
    count = months.length;
    rows.push([split && sel.length > 1 ? "All divisions total" : "Total", "", "", String(grandEnquiries), cents(grand)]);
  }

  const layoutSlug = layout === "consolidated" ? "consolidated" : layout === "split" ? "by-division" : (sel[0]?.code ?? layout).toLowerCase();
  const fileName = `mettus-${DOC_TEXT[kind].file}-${scope === "both" ? "xds-mie" : scope}-${months[0]}${months.length > 1 ? `-to-${months[months.length - 1]}` : ""}-${layoutSlug}.csv`;

  return {
    fileName,
    rows,
    count,
    totalCents: grand,
    enquiries: grandEnquiries,
    byBranch: [...totals.values()],
    empty: kind === "usage" ? grandEnquiries === 0 : invoices.length === 0,
    scopeText,
    layoutText,
    periodText,
  };
}
