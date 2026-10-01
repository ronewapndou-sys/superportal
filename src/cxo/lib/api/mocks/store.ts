/**
 * In-memory mock database. Resets on every hard refresh. All people,
 * companies and contact details are fictional — use *.example domains and
 * throwaway passwords only, never anything real or plausible.
 */
import type {
  AuditEvent,
  Branch,
  ProductRole,
  BulkJob,
  BillingSummary,
  Business,
  CurrentUser,
  Invoice,
  Notification,
  Org,
  PaymentMethod,
  PortalUser,
  DecisionAssessment,
  ScheduledReport,
  SuiteId,
  Ticket,
  TopUp,
  UsagePoint,
  Wallet,
} from "../types";
import { SUITE_BY_ID, SUITE_IDS, suiteIdsFor } from "@/lib/suites";

export const DEMO_EMAIL = "thandi@absa.example";

const DAY = 86_400_000;
const now = Date.now();
const daysAgo = (d: number, h = 0) => new Date(now - d * DAY - h * 3_600_000).toISOString();
const daysAhead = (d: number, h = 0) => new Date(now + d * DAY + h * 3_600_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

/** deterministic PRNG so the charts look the same on every load */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Products the organisation subscribes to: 11 of the 14 XDS products and 4 of the 6 MIE products. */
export const ORG_SUITES: SuiteId[] = [
  "consumer_auth",
  "consumer_trace",
  "address_trace",
  "telephone_trace",
  "account_trace",
  "multi_trace",
  "id_verification",
  "credit_enquiry",
  "business_enquiry",
  "director_enquiry",
  "trace_ws",
  "talent",
  "social_screening",
  "swift",
  "riskguard",
];

export const org: Org = {
  id: "org_absa",
  name: "Absa Bank Limited",
  registrationNumber: "2014/204511/07",
  accountNumber: "MET-AC-004821",
  accountManager: { name: "Lerato Dlamini", email: "lerato.dlamini@mettus.example", phone: "010 555 0142" },
  products: ORG_SUITES,
};

/** The signed-in demo user. Access is derived from their division assignments at request time. */
export const currentUser: Omit<CurrentUser, "assignments" | "access" | "suites"> = {
  id: "u_1",
  name: "Thandi Mokoena",
  email: DEMO_EMAIL,
  role: "admin",
  orgId: org.id,
  orgName: org.name,
};

/* --------------------------------------------------------------- Divisions */

/*
 * A client's divisions: the departments, cost centres or subsidiaries under one client. Each has its own account
 * code (as in the Mettus customer master list), so invoices, statements and usage can be reported per division
 * or consolidated for the whole client.
 */

export const branches: Branch[] = [
  { id: "b_risk", name: "Group Risk and Compliance", code: "CKGO500", costCentre: "1000", products: [...ORG_SUITES] },
  { id: "b_fraud", name: "Fraud and Forensics", code: "CKGO501", costCentre: "5727", products: ["credit_enquiry", "consumer_trace", "consumer_auth", "id_verification", "business_enquiry", "director_enquiry", "talent", "social_screening", "swift"] },
  { id: "b_legal", name: "Legal", code: "CKGO502", costCentre: "3294", products: ["credit_enquiry", "consumer_trace"] },
  { id: "b_coll", name: "Collections and Recoveries", code: "CKGO503", costCentre: "1431", products: ["credit_enquiry", "consumer_trace", "address_trace", "telephone_trace", "account_trace", "multi_trace", "consumer_auth", "id_verification", "swift"] },
  { id: "b_credit", name: "Retail Credit", code: "CKGO504", costCentre: "7916", products: ["credit_enquiry", "consumer_trace", "consumer_auth", "id_verification"] },
  { id: "b_onb", name: "Customer Onboarding", code: "CKGO506", costCentre: "4737", products: ["credit_enquiry", "consumer_trace", "id_verification", "swift"] },
];

let branchSeq = 1;
export const nextBranchId = () => `b_new${branchSeq++}`;

/** Share of enquiries each division runs, so division-filtered reports look plausible. */
export const BRANCH_WEIGHT: Record<string, number> = { b_risk: 0.3, b_coll: 0.22, b_fraud: 0.18, b_credit: 0.14, b_onb: 0.09, b_legal: 0.07 };

const invoiceMonth = (offset: number) => {
  const d = new Date(now);
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Invoices are per division account, so the account code is in the number: INV-CKGO503-2609 (MIE-INV-... for MIE). */
export const invoiceNumber = (business: Business, branchId: string, offset: number) =>
  `${business === "mie" ? "MIE-" : ""}INV-${branches.find((x) => x.id === branchId)?.code ?? "CKGO500"}-${invoiceMonth(offset)}`;

export const productRoles: ProductRole[] = [
  { id: "r_mgr", name: "Division manager", description: "Everything the division has switched on.", products: [...ORG_SUITES] },
  { id: "r_credit", name: "Credit officer", description: "Credit checks and finding applicants.", products: ["credit_enquiry", "consumer_trace", "address_trace", "account_trace", "consumer_auth"] },
  { id: "r_fraud", name: "Fraud and compliance analyst", description: "Identity, fraud and company checks.", products: ["id_verification", "consumer_auth", "telephone_trace", "director_enquiry", "business_enquiry"] },
  { id: "r_front", name: "Front-desk verifier", description: "Quick identity and qualification checks at onboarding.", products: ["consumer_auth", "id_verification", "swift"] },
  { id: "r_collect", name: "Collections agent", description: "Tracing customers in arrears.", products: ["consumer_trace", "address_trace", "telephone_trace", "account_trace", "multi_trace"] },
  { id: "r_hr", name: "HR and recruitment", description: "Candidate screening and workforce monitoring.", products: ["talent", "social_screening", "swift", "riskguard"] },
];

let roleSeq = 1;
export const nextRoleId = () => `r_new${roleSeq++}`;

export const wallet: Wallet = {
  balanceCents: 1_845_000,
  lowBalanceThresholdCents: 2_000_000,
  autoTopUp: { enabled: false, thresholdCents: 1_000_000, amountCents: 2_500_000 },
  avgDailySpendCents: 186_000,
};

export const paymentMethods: PaymentMethod[] = [
  { id: "pm_card", kind: "card", label: "Visa ending 4821", detail: "Expires 08/28 · T Mokoena", isDefault: true },
  { id: "pm_do", kind: "debit_order", label: "FNB debit order ending 2210", detail: "Business cheque account · runs on the 1st", isDefault: false },
];

export const topUps: TopUp[] = [
  { id: "tu_6", reference: "TOP-88213", createdAt: daysAgo(6, 3), amountCents: 2_500_000, methodLabel: "Visa ending 4821", status: "completed", by: "Thandi Mokoena" },
  { id: "tu_5", reference: "TOP-87940", createdAt: daysAgo(19, 1), amountCents: 2_500_000, methodLabel: "Instant EFT (Nedbank)", status: "completed", by: "Pieter van Wyk" },
  { id: "tu_4", reference: "TOP-87501", createdAt: daysAgo(33, 6), amountCents: 1_000_000, methodLabel: "Visa ending 4821", status: "failed", by: "Pieter van Wyk" },
  { id: "tu_3", reference: "TOP-87502", createdAt: daysAgo(33, 5), amountCents: 1_000_000, methodLabel: "EFT reference", status: "completed", by: "Pieter van Wyk" },
  { id: "tu_2", reference: "TOP-86877", createdAt: daysAgo(48, 2), amountCents: 5_000_000, methodLabel: "Visa ending 4821", status: "completed", by: "Thandi Mokoena" },
];

/* ----------------------------------------------------------------- Billing */

function monthLabel(offset: number) {
  const d = new Date(now);
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

export const billing: Omit<BillingSummary, "outstandingCents" | "overdueCents"> = {
  nextInvoiceAt: daysAhead(12),
  spendThisMonthCents: 3_874_500,
  spendLastMonthCents: 4_128_050,
  billingContact: { name: "Pieter van Wyk", email: "accounts@absa.example" },
  vatNumber: "4870291145",
  subscriptions: [
    { suite: "credit_enquiry", plan: "Business", monthlyFeeCents: 450_000, includedEnquiries: 5_000, renewsAt: daysAhead(12), status: "active" },
    { suite: "consumer_trace", plan: "Tracing Pro", monthlyFeeCents: 280_000, includedEnquiries: 8_000, renewsAt: daysAhead(12), status: "active" },
    { suite: "address_trace", plan: "Pay as you go", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "active" },
    { suite: "telephone_trace", plan: "Pay as you go", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "active" },
    { suite: "account_trace", plan: "Pay as you go", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "active" },
    { suite: "multi_trace", plan: "Batch", monthlyFeeCents: 120_000, includedEnquiries: 20_000, renewsAt: daysAhead(12), status: "active" },
    { suite: "easy_trace", plan: "None", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "not_subscribed" },
    { suite: "prescreen_trace", plan: "None", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "not_subscribed" },
    { suite: "consumer_auth", plan: "Standard", monthlyFeeCents: 95_000, includedEnquiries: 3_000, renewsAt: daysAhead(12), status: "active" },
    { suite: "id_verification", plan: "Growth", monthlyFeeCents: 320_000, includedEnquiries: 10_000, renewsAt: daysAhead(12), status: "active" },
    { suite: "business_enquiry", plan: "Standard", monthlyFeeCents: 150_000, includedEnquiries: 400, renewsAt: daysAhead(12), status: "active" },
    { suite: "director_enquiry", plan: "Pay as you go", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "active" },
    { suite: "trace_ws", plan: "API Standard", monthlyFeeCents: 200_000, includedEnquiries: 25_000, renewsAt: daysAhead(12), status: "active" },
    { suite: "address_trace_ws", plan: "None", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "not_subscribed" },
    { suite: "talent", plan: "Enterprise", monthlyFeeCents: 250_000, includedEnquiries: 300, renewsAt: daysAhead(12), status: "active" },
    { suite: "social_screening", plan: "Pay as you go", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "active" },
    { suite: "swift", plan: "Pay as you go", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "active" },
    { suite: "skills_assessment", plan: "None", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "not_subscribed" },
    { suite: "riskguard", plan: "Workforce", monthlyFeeCents: 180_000, includedEnquiries: 2_000, renewsAt: daysAhead(12), status: "active" },
    { suite: "auditing_tool", plan: "None", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(12), status: "not_subscribed" },
  ],

};

/* ----------------------------------------------------------------- Support */

export const tickets: Ticket[] = [
  {
    business: "xds",
    key: "MET-1048",
    subject: "Multiple Consumer Trace file stuck on “Processing”",
    suite: "multi_trace",
    category: "technical",
    priority: "high",
    status: "in_progress",
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(1),
    slaDueAt: daysAhead(0, 3),
    requester: "Sipho Ndlovu",
    assignee: "Naledi, Mettus support",
    messages: [
      { id: "m1", author: "Sipho Ndlovu", from: "client", body: "Our 2 400-record batch file has been on “Processing” since 07:40. Normally it finishes in about 10 minutes. File name batch_sept_week4.csv.", createdAt: hoursAgo(5), attachments: ["batch_sept_week4.csv"] },
      { id: "m2", author: "System", from: "system", body: "Ticket created and synced to the Mettus support desk. First response target: 8 hours.", createdAt: hoursAgo(5) },
      { id: "m3", author: "Naledi", from: "agent", body: "Thanks Sipho, we can see the job. One of the processing nodes restarted mid-run. We're re-queuing your file now and you won't be charged twice for any record.", createdAt: hoursAgo(1) },
    ],
  },
  {
    business: "xds",
    key: "MET-1045",
    subject: `Please confirm the VAT number on invoice ${invoiceNumber("xds", "b_coll", 1)}`,
    suite: "platform",
    category: "billing",
    priority: "medium",
    status: "waiting_on_you",
    createdAt: daysAgo(2, 4),
    updatedAt: daysAgo(1, 2),
    slaDueAt: daysAhead(1),
    requester: "Pieter van Wyk",
    assignee: "Johan, Mettus billing",
    messages: [
      { id: "m1", author: "Pieter van Wyk", from: "client", body: "The VAT number on last month's invoice looks wrong. Can you reissue it?", createdAt: daysAgo(2, 4) },
      { id: "m2", author: "Johan", from: "agent", body: "Happy to reissue it. Could you reply with the correct VAT number and a copy of your VAT registration certificate?", createdAt: daysAgo(1, 2) },
    ],
  },
  {
    business: "xds",
    key: "MET-1041",
    subject: "Identity Verification Trace flags married surnames as a mismatch",
    suite: "id_verification",
    category: "data_query",
    priority: "medium",
    status: "open",
    createdAt: daysAgo(3, 1),
    updatedAt: daysAgo(3, 1),
    slaDueAt: daysAgo(2, 1),
    requester: "Ayesha Patel",
    messages: [
      { id: "m1", author: "Ayesha Patel", from: "client", body: "Applicants who use a recent married surname come back as a name mismatch, even when the ID number is valid. Can the match rules allow for this on our account?", createdAt: daysAgo(3, 1) },
    ],
  },
  {
    business: "xds",
    key: "MET-1036",
    subject: "New API keys for Consumer Trace Web Service",
    suite: "trace_ws",
    category: "access",
    priority: "low",
    status: "resolved",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
    slaDueAt: daysAgo(7),
    requester: "Thandi Mokoena",
    assignee: "Naledi, Mettus support",
    messages: [
      { id: "m1", author: "Thandi Mokoena", from: "client", body: "Please issue two new API keys for our loan origination system.", createdAt: daysAgo(9) },
      { id: "m2", author: "Naledi", from: "agent", body: "Done. Your admins can now create keys themselves in the product settings.", createdAt: daysAgo(7) },
      { id: "m3", author: "System", from: "system", body: "Ticket resolved.", createdAt: daysAgo(7) },
    ],
  },
  {
    business: "xds",
    key: "MET-1029",
    subject: "Request: push Consumer Credit Enquiry results to our loan system",
    suite: "credit_enquiry",
    category: "feature_request",
    priority: "low",
    status: "resolved",
    createdAt: daysAgo(21),
    updatedAt: daysAgo(14),
    slaDueAt: daysAgo(19),
    requester: "Sipho Ndlovu",
    assignee: "Ruan, Mettus product",
    messages: [
      { id: "m1", author: "Sipho Ndlovu", from: "client", body: "Can enquiry results be pushed to a webhook instead of polling?", createdAt: daysAgo(21) },
      { id: "m2", author: "Ruan", from: "agent", body: "Webhooks for enquiry results are available now. The setup guide is under Consumer Credit Enquiry, Settings, Integrations.", createdAt: daysAgo(14) },
    ],
  },
  {
    business: "mie",
    key: "MIE-2214",
    subject: "Criminal record checks pending longer than usual",
    suite: "talent",
    category: "technical",
    priority: "high",
    status: "in_progress",
    createdAt: daysAgo(1, 3),
    updatedAt: hoursAgo(4),
    slaDueAt: daysAhead(0, 5),
    requester: "Thandi Mokoena",
    assignee: "Zanele, MIE support",
    messages: [
      { id: "m1", author: "Thandi Mokoena", from: "client", body: "Three candidates’ criminal checks submitted last Tuesday still show “At SAPS”. Our intake starts Monday. Can you chase these?", createdAt: daysAgo(1, 3) },
      { id: "m2", author: "Zanele", from: "agent", body: "We've escalated all three with the SAPS Criminal Record Centre. Two usually clear within 48 hours of escalation. We'll update you by tomorrow midday.", createdAt: hoursAgo(4) },
    ],
  },
  {
    business: "mie",
    key: "MIE-2209",
    subject: "Access request: Talent Assessment Solutions",
    suite: "skills_assessment",
    category: "access",
    priority: "low",
    status: "open",
    createdAt: daysAgo(3, 2),
    updatedAt: daysAgo(3, 2),
    slaDueAt: daysAgo(1, 2),
    requester: "Nomsa Khumalo",
    messages: [
      { id: "m1", author: "Nomsa Khumalo", from: "client", body: "We'd like to test candidates for numeracy and customer service before interviews.\n\nExpected volume: 100 to 1 000 a month.", createdAt: daysAgo(3, 2) },
    ],
  },
  {
    business: "mie",
    key: "MIE-2201",
    subject: "Add a senior-management due diligence package",
    suite: "auditing_tool",
    category: "feature_request",
    priority: "low",
    status: "resolved",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(8),
    slaDueAt: daysAgo(10),
    requester: "Thandi Mokoena",
    assignee: "Pieter, MIE accounts",
    messages: [
      { id: "m1", author: "Thandi Mokoena", from: "client", body: "Can we get a package that adds directorship and credit checks for senior hires?", createdAt: daysAgo(12) },
      { id: "m2", author: "Pieter", from: "agent", body: "Done. “Senior management” is now available in your packages list.", createdAt: daysAgo(8) },
    ],
  },
];

/** XDS and MIE run separate Jira projects, so keys differ by business. */
const ticketSeq = { xds: 1049, mie: 2215 };
export const nextTicketKey = (business: "xds" | "mie" = "xds") =>
  business === "mie" ? `MIE-${ticketSeq.mie++}` : `MET-${ticketSeq.xds++}`;

/* ----------------------------------------------------------------- Reports */

/** ledger history the mock can report on — two years, so a 12-month range still has a previous period to compare with */
export const HISTORY_DAYS = 730;

/** Daily volume per product: weekday base, weekend factor, and whether it grows with the business. */
const VOLUME: Record<SuiteId, { base: number; weekend: number; grows: boolean }> = {
  credit_enquiry: { base: 170, weekend: 0.35, grows: true },
  consumer_trace: { base: 260, weekend: 0.3, grows: true },
  address_trace: { base: 90, weekend: 0.3, grows: true },
  telephone_trace: { base: 70, weekend: 0.3, grows: true },
  account_trace: { base: 40, weekend: 0.2, grows: true },
  multi_trace: { base: 380, weekend: 0, grows: true },
  easy_trace: { base: 0, weekend: 0, grows: false },
  prescreen_trace: { base: 0, weekend: 0, grows: false },
  consumer_auth: { base: 110, weekend: 0.4, grows: true },
  id_verification: { base: 300, weekend: 0.45, grows: true },
  business_enquiry: { base: 12, weekend: 0.1, grows: false },
  director_enquiry: { base: 18, weekend: 0.1, grows: false },
  trace_ws: { base: 620, weekend: 0.8, grows: true },
  address_trace_ws: { base: 0, weekend: 0, grows: false },
  // MIE follows hiring cycles: busier in Jan/Feb intakes, almost nothing at weekends
  talent: { base: 22, weekend: 0.1, grows: true },
  social_screening: { base: 10, weekend: 0.05, grows: true },
  swift: { base: 48, weekend: 0.15, grows: true },
  skills_assessment: { base: 0, weekend: 0, grows: false },
  riskguard: { base: 60, weekend: 1, grows: false },
  auditing_tool: { base: 0, weekend: 0, grows: false },
};

const SUITE_BUSINESS_MIE = new Set<SuiteId>(["talent", "social_screening", "swift", "skills_assessment", "riskguard", "auditing_tool"]);

function seriesPoint(d: Date, weekend: boolean, growth: number, rand: () => number) {
  const intake = d.getMonth() <= 1 ? 1.6 : 1;
  const out = {} as Record<SuiteId, number>;
  for (const id of Object.keys(VOLUME) as SuiteId[]) {
    const v = VOLUME[id];
    const hiring = SUITE_BUSINESS_MIE.has(id) ? intake : 1;
    // Multiple Consumer Trace arrives in batches on a few days a week
    const batchDay = id !== "multi_trace" || d.getDay() === 1 || d.getDay() === 3;
    out[id] = batchDay ? Math.round(v.base * (0.8 + rand() * 0.4) * (weekend ? v.weekend : 1) * (v.grows ? growth : 1) * hiring) : 0;
  }
  return out;
}

function buildSeries(): UsagePoint[] {
  const rand = mulberry32(42);
  const out: UsagePoint[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    // slow growth plus a December dip, so monthly views have some shape
    const growth = (0.55 + ((HISTORY_DAYS - 1 - i) / HISTORY_DAYS) * 0.6) * (d.getMonth() === 11 ? 0.75 : 1);
    out.push({
      date: d.toISOString().slice(0, 10),
      ...seriesPoint(d, weekend, growth, rand),
    });
  }
  return out;
}

export const usageSeries = buildSeries();

export const PRICE_CENTS: Record<SuiteId, number> = {
  consumer_auth: 900,
  consumer_trace: 650,
  address_trace: 420,
  telephone_trace: 420,
  account_trace: 520,
  multi_trace: 380,
  easy_trace: 350,
  prescreen_trace: 300,
  id_verification: 350,
  business_enquiry: 4_500,
  director_enquiry: 1_800,
  credit_enquiry: 1_450,
  trace_ws: 480,
  address_trace_ws: 380,
  talent: 18_500,
  social_screening: 9_500,
  swift: 2_400,
  skills_assessment: 12_000,
  riskguard: 1_500,
  auditing_tool: 25_000,
};

/* ---------------------------------------------------- Division usage and invoices */

const VAT = 1.15;

/**
 * Each division's enquiries for a month. A product is split only between the divisions that have it switched on,
 * by their usual volume, and the busiest takes the remainder, so the divisions always add back to the client's
 * total exactly (and invoices, statements and usage reports agree).
 */
export function divisionUsage(month: string): Record<string, Record<SuiteId, number>> {
  const pts = usageSeries.filter((p) => p.date.startsWith(month));
  const out = Object.fromEntries(
    branches.map((b) => [b.id, Object.fromEntries(SUITE_IDS.map((s) => [s, 0])) as Record<SuiteId, number>])
  ) as Record<string, Record<SuiteId, number>>;
  for (const s of SUITE_IDS) {
    const total = pts.reduce((a, p) => a + p[s], 0);
    const on = branches.filter((b) => b.products.includes(s));
    if (on.length === 0) continue;
    const weights = on.map((b) => BRANCH_WEIGHT[b.id] ?? 0.05);
    const sum = weights.reduce((a, c) => a + c, 0);
    const shares = weights.map((wt) => Math.floor((total * wt) / sum));
    shares[weights.indexOf(Math.max(...weights))] += total - shares.reduce((a, c) => a + c, 0);
    on.forEach((b, i) => {
      out[b.id][s] = shares[i];
    });
  }
  return out;
}

/** Divisions behind on an invoice, by the month (offset) it is for. Legal is two invoices behind, so it is the one on payment hold. */
const BEHIND: Record<Business, Record<string, number[]>> = { xds: { b_coll: [2], b_legal: [2, 3] }, mie: { b_fraud: [2] } };

/** How long each division usually takes to pay, in days after the invoice is issued (terms are 30 days). */
const DAYS_TO_PAY: Record<string, number> = { b_risk: 11, b_fraud: 14, b_credit: 19, b_onb: 24, b_coll: 33, b_legal: 38 };

/**
 * One invoice per division account, per company, per month, built from that division's own usage (incl. VAT).
 * XDS also charges a small platform fee per account. The client's totals are the sum of its divisions.
 */
function buildInvoices(): Invoice[] {
  // newest first, so the index is how many months ago
  const months = [...new Set(usageSeries.map((p) => p.date.slice(0, 7)))].sort().reverse();
  const out: Invoice[] = [];
  for (const business of ["xds", "mie"] as const) {
    const ids = suiteIdsFor(business);
    const history = business === "mie" ? 6 : 8;
    // offset 0 is the month in progress, which has no invoice until the 1st
    for (let offset = history; offset >= 1; offset--) {
      const month = months[offset];
      if (!month) continue;
      const use = divisionUsage(month);
      const d = new Date(now);
      d.setDate(1);
      d.setHours(12, 0, 0, 0); // midday, so the issue date never slips into the previous day in UTC
      d.setMonth(d.getMonth() - offset + 1);
      const issuedAt = d.toISOString();
      const dueAt = new Date(d.getTime() + 30 * DAY).toISOString();
      for (const b of branches) {
        const lines: Invoice["lines"] = ids
          .filter((s) => b.products.includes(s) && use[b.id][s] > 0)
          .map((s) => ({
            suite: s,
            description: `${SUITE_BY_ID[s].name}: ${use[b.id][s].toLocaleString("en-ZA")} enquiries`,
            quantity: use[b.id][s],
            amountCents: Math.round(use[b.id][s] * PRICE_CENTS[s] * VAT),
          }));
        if (lines.length === 0) continue;
        if (business === "xds") lines.push({ suite: "platform", description: "Mettus platform fee", quantity: 1, amountCents: Math.round(15_000 * VAT) });
        // an invoice is issued on the 1st and due 30 days later: last month's is still due, the one before it is overdue if unpaid
        const status: Invoice["status"] = offset === 1 ? "due" : BEHIND[business][b.id]?.includes(offset) ? "overdue" : "paid";
        // paid invoices get a payment date from the division's usual habit, nudged a little each month
        const nudge = ((offset * 7 + b.code.charCodeAt(6)) % 7) - 3;
        const paidAt = status === "paid" ? new Date(d.getTime() + Math.max(2, (DAYS_TO_PAY[b.id] ?? 20) + nudge) * DAY).toISOString() : undefined;
        out.push({
          id: `inv_${b.code.toLowerCase()}_${month}_${business}`,
          business,
          branchId: b.id,
          number: invoiceNumber(business, b.id, offset),
          issuedAt,
          dueAt,
          periodLabel: monthLabel(offset),
          amountCents: lines.reduce((a, l) => a + l.amountCents, 0),
          status,
          paidAt,
          lines,
        });
      }
    }
  }
  return out.sort((x, y) => y.issuedAt.localeCompare(x.issuedAt));
}

export const invoices: Invoice[] = buildInvoices();

/**
 * What the decision engine knows about the client beyond its invoices and usage: when it joined, what it signed,
 * and its compliance paperwork. Fictional, like everything here.
 */
export const clientProfile = {
  customerSince: new Date(now - 7.3 * 365.25 * DAY).toISOString(),
  contract: { startedAt: new Date(now - 25 * 30.44 * DAY).toISOString(), termMonths: 36, autoRenew: true },
  /** the most Mettus will let the client owe at once, across all divisions */
  creditLimitCents: 90_000_000,
  compliance: {
    ficaVerifiedAt: new Date(now - 210 * DAY).toISOString(),
    operatorAgreementSignedAt: new Date(now - 980 * DAY).toISOString(),
    permissiblePurposeOnFile: true,
  },
};

/** Decisions made on product requests, newest first, so the client can see what was decided and why. */
export const decisions: DecisionAssessment[] = [];


export const scheduledReports: ScheduledReport[] = [
  { id: "sr_1", name: "Monthly spend by product", report: "spend", frequency: "monthly", format: "pdf", recipients: ["accounts@absa.example"], nextRunAt: daysAhead(12) },
  { id: "sr_2", name: "Weekly enquiry detail", report: "enquiry_detail", frequency: "weekly", format: "csv", recipients: ["sipho@absa.example", "risk@absa.example"], nextRunAt: daysAhead(3) },
];

export const bulkJobs: (BulkJob & { startedAtMs?: number; durationMs?: number })[] = [
  {
    id: "bj_3", reference: "BULK-2231", fileName: "sept_applications_wk4.csv", suite: "credit_enquiry", reportType: "credit_enquiry",
    clientReference: "Loan book review Q3", rows: 2_400, status: "completed", progress: 100, processedRows: 2_400, noMatchRows: 37,
    costCents: 2_400 * 1_450, createdAt: daysAgo(2, 5), completedAt: daysAgo(2, 4), by: "Sipho Ndlovu",
  },
  {
    id: "bj_2", reference: "BULK-2218", fileName: "new_suppliers_aug.csv", suite: "director_enquiry", reportType: "director_enquiry",
    rows: 186, status: "completed", progress: 100, processedRows: 186, noMatchRows: 0,
    costCents: 186 * 1_800, createdAt: daysAgo(15, 2), completedAt: daysAgo(15, 2), by: "Ayesha Patel",
  },
  {
    id: "bj_4", reference: "BULK-2226", fileName: "graduate_intake_2027.csv", suite: "talent", reportType: "talent_screening",
    clientReference: "Graduate intake 2027", rows: 120, status: "completed", progress: 100, processedRows: 120, noMatchRows: 2,
    costCents: 120 * 18_500, createdAt: daysAgo(4, 2), completedAt: daysAgo(3, 20), by: "Nomsa Khumalo",
  },
  {
    // Still moving: three of the outstanding candidates are the criminal checks chased in MIE-2214 ("At SAPS").
    id: "bj_5", reference: "BULK-2233", fileName: "new_hires_oct_wk1.csv", suite: "talent", reportType: "talent_screening",
    clientReference: "October intake", rows: 18, status: "processing", progress: 72, processedRows: 13, noMatchRows: 0,
    costCents: 18 * 18_500, createdAt: daysAgo(1, 3), by: "Thandi Mokoena",
  },
  {
    id: "bj_1", reference: "BULK-2190", fileName: "director_list.csv", suite: "business_enquiry", reportType: "business_enquiry",
    rows: 54, status: "failed", progress: 0, processedRows: 0, noMatchRows: 0,
    costCents: 0, createdAt: daysAgo(31, 1), by: "Sipho Ndlovu",
  },
];

let bulkSeq = 2234;
export const nextBulkReference = () => `BULK-${bulkSeq++}`;

/* ------------------------------------------------------------------- Users */

/** Stored without `suites` — the handlers derive it from assignments on every response. */
export const users: Omit<PortalUser, "suites">[] = [
  { id: "u_1", name: "Thandi Mokoena", email: DEMO_EMAIL, role: "admin", assignments: [{ branchId: "b_risk", productRoleId: "r_mgr" }, { branchId: "b_coll", productRoleId: "r_credit" }, { branchId: "b_fraud", productRoleId: "r_mgr" }], mfaEnabled: true, status: "active", lastActiveAt: hoursAgo(0) },
  { id: "u_2", name: "Pieter van Wyk", email: "pieter@absa.example", role: "billing", assignments: [], mfaEnabled: true, status: "active", lastActiveAt: hoursAgo(20) },
  { id: "u_3", name: "Sipho Ndlovu", email: "sipho@absa.example", role: "analyst", assignments: [{ branchId: "b_coll", productRoleId: "r_credit" }, { branchId: "b_credit", productRoleId: "r_credit" }], mfaEnabled: true, status: "active", lastActiveAt: hoursAgo(1) },
  { id: "u_4", name: "Ayesha Patel", email: "ayesha@absa.example", role: "analyst", assignments: [{ branchId: "b_fraud", productRoleId: "r_fraud" }], mfaEnabled: false, status: "active", lastActiveAt: daysAgo(2) },
  { id: "u_8", name: "Nomsa Khumalo", email: "nomsa.hr@absa.example", role: "analyst", assignments: [{ branchId: "b_risk", productRoleId: "r_hr" }, { branchId: "b_fraud", productRoleId: "r_hr" }], mfaEnabled: true, status: "active", lastActiveAt: hoursAgo(3) },
  { id: "u_5", name: "Kabelo Sithole", email: "kabelo@absa.example", role: "viewer", assignments: [{ branchId: "b_legal", productRoleId: "r_credit" }], mfaEnabled: true, status: "active", lastActiveAt: daysAgo(5) },
  { id: "u_9", name: "Zodwa Mthembu", email: "zodwa@absa.example", role: "analyst", assignments: [{ branchId: "b_onb", productRoleId: "r_front" }], mfaEnabled: true, status: "active", lastActiveAt: hoursAgo(6) },
  { id: "u_6", name: "Megan O'Connor", email: "megan@absa.example", role: "analyst", assignments: [{ branchId: "b_fraud", productRoleId: "r_credit" }, { branchId: "b_onb", productRoleId: "r_credit" }], mfaEnabled: false, status: "invited" },
  { id: "u_7", name: "Johannes Botha", email: "johannes@absa.example", role: "viewer", assignments: [{ branchId: "b_legal", productRoleId: "r_credit" }], mfaEnabled: true, status: "deactivated", lastActiveAt: daysAgo(64) },
];

let userSeq = 10;
export const nextUserId = () => `u_${userSeq++}`;

export const audit: AuditEvent[] = [
  { id: "a1", at: hoursAgo(1), actor: "Thandi Mokoena", action: "Changed role", target: "Sipho Ndlovu → Analyst" },
  { id: "a2", at: hoursAgo(26), actor: "Thandi Mokoena", action: "Invited user", target: "megan@absa.example" },
  { id: "a3", at: daysAgo(6, 3), actor: "Thandi Mokoena", action: "Topped up wallet", target: "R 25 000.00 · TOP-88213" },
  { id: "a4", at: daysAgo(7), actor: "Mettus support", action: "Granted product access", target: "Ayesha Patel → Monitor" },
  { id: "a5", at: daysAgo(12), actor: "Pieter van Wyk", action: "Paid invoice", target: invoiceNumber("xds", "b_fraud", 3) },
  { id: "a6", at: daysAgo(64), actor: "Thandi Mokoena", action: "Deactivated user", target: "Johannes Botha" },
];

let auditSeq = 7;
export function logAudit(action: string, target: string, actor = currentUser.name) {
  audit.unshift({ id: `a${auditSeq++}`, at: new Date().toISOString(), actor, action, target });
}

/* ----------------------------------------------------------- Notifications */

export const notifications: Notification[] = [
  { id: "n1", business: "xds", kind: "support", title: "MET-1048 updated", body: "Naledi replied: your batch file is being re-queued.", at: hoursAgo(1), read: false, href: "/support/MET-1048" },
  { id: "n2", kind: "wallet", title: "Wallet below R 20 000", body: "At your current usage your credits last about 10 days.", at: hoursAgo(3), read: false, href: "/top-up" },
  { id: "n3", business: "xds", kind: "billing", title: "Invoice overdue", body: `${invoiceNumber("xds", "b_coll", 2)} was due 2 days ago.`, at: daysAgo(2), read: false, href: "/billing" },
  { id: "n4", business: "xds", kind: "product", title: "New in Identity Verification Trace", body: "Married-surname matching is now more accurate.", at: daysAgo(4), read: true, href: "/products/id_verification" },
  { id: "n6", business: "mie", kind: "support", title: "MIE-2214 updated", body: "Zanele escalated your three pending criminal checks with SAPS.", at: hoursAgo(4), read: false, href: "/support/MIE-2214" },
  { id: "n7", business: "mie", kind: "billing", title: "New MIE invoice", body: `${invoiceNumber("mie", "b_risk", 1)} for ${monthLabel(1)} is ready.`, at: daysAgo(1), read: true, href: "/billing" },
  { id: "n5", kind: "users", title: "Megan hasn't accepted her invite", body: "Invites expire after 7 days. You can resend it.", at: daysAgo(5), read: true, href: "/users" },
];

export const db = {
  session: null as null | { mfaVerified: boolean },
};

/**
 * ABSA's data as it was when this module first loaded, before anyone's session could mutate it. Everything
 * below is one in-memory store shared across the whole tab: signing into a freshly invited account empties
 * it out (see resetToFreshOrg), and without a snapshot to restore, signing back into ABSA afterwards — in the
 * same tab, without a hard refresh — would still see that empty state instead of its real history.
 */
const ABSA_SNAPSHOT = structuredClone({
  org, branches, productRoles, wallet, paymentMethods, topUps, billing, tickets, invoices, usageSeries,
  clientProfile, bulkJobs, scheduledReports, users, audit, notifications, orgSuites: ORG_SUITES, currentUser,
});

function restoreAbsa() {
  const s = structuredClone(ABSA_SNAPSHOT);
  ORG_SUITES.length = 0;
  ORG_SUITES.push(...s.orgSuites);
  Object.assign(org, s.org, { products: ORG_SUITES });
  Object.assign(currentUser, s.currentUser);
  branches.length = 0;
  branches.push(...s.branches);
  productRoles.length = 0;
  productRoles.push(...s.productRoles);
  Object.assign(wallet, s.wallet);
  paymentMethods.length = 0;
  paymentMethods.push(...s.paymentMethods);
  topUps.length = 0;
  topUps.push(...s.topUps);
  Object.assign(billing, s.billing);
  tickets.length = 0;
  tickets.push(...s.tickets);
  invoices.length = 0;
  invoices.push(...s.invoices);
  usageSeries.length = 0;
  usageSeries.push(...s.usageSeries);
  Object.assign(clientProfile, s.clientProfile);
  bulkJobs.length = 0;
  bulkJobs.push(...s.bulkJobs);
  scheduledReports.length = 0;
  scheduledReports.push(...s.scheduledReports);
  users.length = 0;
  users.push(...s.users);
  audit.length = 0;
  audit.push(...s.audit);
  notifications.length = 0;
  notifications.push(...s.notifications);
}

/**
 * Mettus Central: make the mock session match the person signed in to the host portal.
 * Unknown emails (for example Mettus staff) keep the default client user.
 */
export function signInAs(email: string) {
  if (email.toLowerCase() === DEMO_EMAIL.toLowerCase()) {
    restoreAbsa();
    return;
  }
  const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return;
  Object.assign(currentUser, { id: u.id, name: u.name, email: u.email, role: u.role });
}

/**
 * A client signed up before Mettus Central and has real history (today, only ABSA via Thandi). Everyone else —
 * anyone invited live during a demo — is a genuinely new client: no products switched on, no invoices, no usage,
 * no team besides themselves. This resets the whole mock account to that blank-slate shape.
 */
export function resetToFreshOrg(account: { id: string; name: string; email: string; role: string }) {
  const companyName = account.role.split(',').slice(1).join(',').trim() || 'Your organisation';
  const branchId = 'b_main';
  const zeroSeries: UsagePoint[] = usageSeries.map((p) => {
    const out = { date: p.date } as UsagePoint;
    for (const id of SUITE_IDS) out[id] = 0;
    return out;
  });

  ORG_SUITES.length = 0;
  Object.assign(org, {
    id: `org_${account.id}`,
    name: companyName,
    registrationNumber: "",
    accountNumber: "",
    accountManager: { name: "Lerato Dlamini", email: "lerato.dlamini@mettus.example", phone: "010 555 0142" },
    products: ORG_SUITES,
  });
  Object.assign(currentUser, { id: account.id, name: account.name, email: account.email, role: "admin", orgId: org.id, orgName: org.name });

  branches.length = 0;
  branches.push({ id: branchId, name: "Head Office", code: "NEW001", costCentre: "0000", products: [] });

  users.length = 0;
  users.push({
    id: account.id, name: account.name, email: account.email, role: "admin",
    assignments: [{ branchId, productRoleId: "r_mgr" }], mfaEnabled: false, status: "active", lastActiveAt: new Date().toISOString(),
  });

  Object.assign(wallet, {
    balanceCents: 0, lowBalanceThresholdCents: 2_000_000,
    autoTopUp: { enabled: false, thresholdCents: 1_000_000, amountCents: 2_500_000 },
    avgDailySpendCents: 1,
  });
  paymentMethods.length = 0;
  topUps.length = 0;

  Object.assign(billing, {
    nextInvoiceAt: daysAhead(30),
    spendThisMonthCents: 0,
    spendLastMonthCents: 0,
    billingContact: { name: account.name, email: account.email },
    vatNumber: "",
    subscriptions: SUITE_IDS.map((suite) => ({
      suite, plan: "None", monthlyFeeCents: 0, includedEnquiries: 0, renewsAt: daysAhead(30), status: "not_subscribed" as const,
    })),
  });

  tickets.length = 0;
  invoices.length = 0;
  audit.length = 0;
  notifications.length = 0;
  bulkJobs.length = 0;
  scheduledReports.length = 0;
  usageSeries.length = 0;
  usageSeries.push(...zeroSeries);

  Object.assign(clientProfile, {
    customerSince: new Date().toISOString(),
    contract: { startedAt: new Date().toISOString(), termMonths: 12, autoRenew: false },
    creditLimitCents: 0,
    compliance: { ficaVerifiedAt: daysAgo(400), operatorAgreementSignedAt: "", permissiblePurposeOnFile: false },
  });
}
