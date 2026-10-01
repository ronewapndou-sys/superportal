import { delay, http, HttpResponse } from "msw";
import { money } from "@/lib/format";
import { accessFor, unionOf } from "@/lib/access";
import { SUITE_BY_ID, SUITE_IDS, suiteIdsFor } from "@/lib/suites";
import type {
  Assignment,
  BillingSummary,
  Branch,
  Business,
  CurrentUser,
  ProductRole,
  Dashboard,
  InviteUser,
  NewTicket,
  PortalUser,
  BulkJob,
  BranchMonth,
  BulkReportType,
  MonthlyReport,
  NewBulkJob,
  UsagePoint,
  UsageQuery,
  ScheduledReport,
  Session,
  SuiteId,
  Ticket,
  TicketStatus,
  TopUp,
  TopUpRequest,
  UsageReport,
  Wallet,
} from "../types";
import {
  audit,
  billing,
  BRANCH_WEIGHT,
  branches,
  nextBranchId,
  nextRoleId,
  ORG_SUITES,
  productRoles,
  bulkJobs,
  currentUser,
  db,
  invoices,
  divisionUsage,
  logAudit,
  nextBulkReference,
  nextTicketKey,
  nextUserId,
  notifications,
  org,
  paymentMethods,
  PRICE_CENTS,
  scheduledReports,
  tickets,
  topUps,
  usageSeries,
  users,
  wallet,
} from "./store";
import { acceptTerms, approveByAgent, askForReview, declineOffer, openOffers, recommend, requestProduct } from "./risk";

const LATENCY = 450;
const SUITES: SuiteId[] = SUITE_IDS;
const businessOf = (suite: SuiteId | "platform", fallback: Business = "xds"): Business =>
  suite === "platform" ? fallback : SUITE_BY_ID[suite].business;
/** The division a request is scoped to, when it names one that exists; otherwise the whole client. */
const parseDivision = (request: Request): string | undefined => {
  const d = new URL(request.url).searchParams.get("division");
  return d && branches.some((b) => b.id === d) ? d : undefined;
};
const parseBusiness = (request: Request): Business | undefined => {
  const b = new URL(request.url).searchParams.get("business");
  return b === "xds" || b === "mie" ? b : undefined;
};

const fail = (status: number, message: string, code?: string) => HttpResponse.json({ message, code }, { status });

/** Every portal endpoint needs a fully verified session. */
function unauthorised(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !db.session?.mfaVerified) return fail(401, "Your session has ended. Please sign in again.", "unauthorised");
  return null;
}

/** Attach derived product access to a stored user. */
function withAccess(u: (typeof users)[number]): PortalUser {
  return { ...u, suites: unionOf(accessFor(u.assignments, branches, productRoles)) };
}

function me(): CurrentUser {
  const stored = users.find((u) => u.id === currentUser.id)!;
  const access = accessFor(stored.assignments, branches, productRoles);
  return { ...currentUser, assignments: stored.assignments, access, suites: unionOf(access) };
}

function sessionResponse(): Session {
  return { accessToken: "mock-access-token", user: me() };
}

/** Assignments must point at real divisions and roles; one role per division. */
function cleanAssignments(list: Assignment[] | undefined): Assignment[] | string {
  const out: Assignment[] = [];
  for (const a of list ?? []) {
    if (!branches.some((b) => b.id === a.branchId)) return "One of the divisions no longer exists. Refresh and try again.";
    if (!productRoles.some((r) => r.id === a.productRoleId)) return "One of the product roles no longer exists. Refresh and try again.";
    if (out.some((x) => x.branchId === a.branchId)) return "Give each division only one product role.";
    out.push({ branchId: a.branchId, productRoleId: a.productRoleId });
  }
  return out;
}

/** Enquiry spend for one business in the calendar month `offset` months ago (0 = this month), for one division or the whole client. */
function monthSpend(business: Business, offset: number, branchId?: string) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  const ym = d.toISOString().slice(0, 7);
  const ids = suiteIdsFor(business);
  if (branchId) {
    const use = divisionUsage(ym)[branchId];
    return use ? ids.reduce((sum, s) => sum + use[s] * PRICE_CENTS[s], 0) : 0;
  }
  return usageSeries
    .filter((p) => p.date.startsWith(ym))
    .reduce((sum, p) => sum + ids.reduce((a, s) => a + p[s] * PRICE_CENTS[s], 0), 0);
}

/** Each business bills separately, so every figure is scoped to one of them. */
function billingSummary(business: Business = "xds", branchId?: string): BillingSummary {
  const own = invoices.filter((i) => i.business === business && (!branchId || i.branchId === branchId));
  const outstanding = own.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amountCents, 0);
  const overdue = own.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amountCents, 0);
  const ids = suiteIdsFor(business);
  return {
    ...billing,
    spendThisMonthCents: monthSpend(business, 0, branchId),
    spendLastMonthCents: monthSpend(business, 1, branchId),
    subscriptions: billing.subscriptions.filter((sub) => ids.includes(sub.suite)),
    billingContact: business === "mie" ? { name: "Pieter van Wyk", email: "hr-accounts@absa.example" } : billing.billingContact,
    outstandingCents: outstanding,
    overdueCents: overdue,
  };
}

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function sumPoints(points: UsagePoint[], suite: SuiteId) {
  return points.reduce((sum, p) => sum + p[suite], 0);
}

/** Daily series between two inclusive dates, clamped to the ledger history. */
function slice(from: string, to: string) {
  return usageSeries.filter((p) => p.date >= from && p.date <= to);
}

/** Scale the organisation's series down to one division: its share of volume, only its switched-on products. */
function forBranch(points: UsagePoint[], branchId?: string): UsagePoint[] {
  if (!branchId) return points;
  const branch = branches.find((b) => b.id === branchId);
  const w = BRANCH_WEIGHT[branchId] ?? 0.05;
  return points.map((p) => {
    const out = { ...p };
    for (const s of SUITES) out[s] = branch?.products.includes(s) ? Math.round(p[s] * w) : 0;
    return out;
  });
}

function usageReport(q: UsageQuery): UsageReport {
  const series = forBranch(slice(q.from, q.to), q.branchId);
  const days = Math.max(1, Math.round((new Date(q.to).getTime() - new Date(q.from).getTime()) / DAY_MS) + 1);
  const prevTo = isoDay(new Date(new Date(q.from).getTime() - DAY_MS));
  const prevFrom = isoDay(new Date(new Date(q.from).getTime() - days * DAY_MS));
  const prev = forBranch(slice(prevFrom, prevTo), q.branchId);

  const totals = Object.fromEntries(
    SUITES.map((s) => {
      const enquiries = sumPoints(series, s);
      const before = sumPoints(prev, s);
      const trendPct = before > 0 ? ((enquiries - before) / before) * 100 : 0;
      return [s, { enquiries, spendCents: enquiries * PRICE_CENTS[s], trendPct }];
    })
  ) as UsageReport["totals"];

  const out: UsagePoint[] =
    q.granularity === "day"
      ? series
      : Object.values(
          series.reduce<Record<string, UsagePoint>>((acc, p) => {
            const m = p.date.slice(0, 7);
            acc[m] ??= { date: m, ...(Object.fromEntries(SUITES.map((s) => [s, 0])) as Record<SuiteId, number>) };
            for (const s of SUITES) acc[m][s] += p[s];
            return acc;
          }, {})
        );

  // each product is its own enquiry type now, so "top enquiries" is simply the busiest products
  const topEnquiries = SUITES.map((s) => ({ name: SUITE_BY_ID[s].name, suite: s, count: totals[s].enquiries, spendCents: totals[s].spendCents }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return { ...q, days, series: out, totals, topEnquiries, hitRatePct: 94.2, historyStartsAt: usageSeries[0].date };
}

function lastDays(n: number): UsageQuery {
  const to = new Date();
  return { from: isoDay(new Date(to.getTime() - (n - 1) * DAY_MS)), to: isoDay(to), granularity: "day" };
}

function monthlyReports(): MonthlyReport[] {
  const current = isoDay(new Date()).slice(0, 7);
  const months = [...new Set(usageSeries.map((p) => p.date.slice(0, 7)))].reverse().slice(0, 13);
  return months.map((m) => {
    const pts = usageSeries.filter((p) => p.date.startsWith(m));
    const bySuite = Object.fromEntries(
      SUITES.map((s) => {
        const e = sumPoints(pts, s);
        return [s, { enquiries: e, spendCents: e * PRICE_CENTS[s] }];
      })
    ) as MonthlyReport["bySuite"];
    const [y, mo] = m.split("-").map(Number);
    const label = new Date(y, mo - 1, 1).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
    const invoiceNumbers = Object.fromEntries(
      (["xds", "mie"] as const)
        .map((biz) => [biz, invoices.filter((i) => i.periodLabel === label && i.business === biz)] as const)
        .filter(([, list]) => list.length > 0)
        .map(([biz, list]) => [biz, list.length === 1 ? list[0].number : `${list.length} invoices`])
    ) as MonthlyReport["invoiceNumbers"];
    return {
      month: m,
      label,
      status: m === current ? "in_progress" : "final",
      enquiries: SUITES.reduce((sum, s) => sum + bySuite[s].enquiries, 0),
      spendCents: SUITES.reduce((sum, s) => sum + bySuite[s].spendCents, 0),
      bySuite,
      invoiceNumbers,
    };
  });
}

/**
 * Each division's share of every month's enquiries. A product is split only between the divisions that have it
 * switched on, by their usual volume, and the remainder goes to the busiest division, so the divisions always add
 * back to the organisation's total (and to the invoice) exactly.
 */
function branchMonths(from: string, to: string): BranchMonth[] {
  const months = [...new Set(usageSeries.map((p) => p.date.slice(0, 7)))].filter((m) => m >= from && m <= to).sort();
  return months.flatMap((m) => {
    const use = divisionUsage(m);
    return branches.map((b) => ({
      month: m,
      branchId: b.id,
      bySuite: Object.fromEntries(SUITES.map((x) => [x, { enquiries: use[b.id][x], spendCents: use[b.id][x] * PRICE_CENTS[x] }])) as BranchMonth["bySuite"],
    }));
  });
}

/** Advance running bulk jobs based on elapsed time — the mock's stand-in for a worker queue. */
function tickBulkJobs() {
  const t = Date.now();
  for (const j of bulkJobs) {
    if (!j.startedAtMs || !j.durationMs || j.status === "completed" || j.status === "failed") continue;
    const elapsed = t - j.startedAtMs;
    if (elapsed < 1500) {
      j.status = "queued";
      continue;
    }
    const pct = Math.min(100, Math.round(((elapsed - 1500) / j.durationMs) * 100));
    j.progress = pct;
    j.processedRows = Math.round((j.rows * pct) / 100);
    j.status = pct >= 100 ? "completed" : "processing";
    if (j.status === "completed") {
      j.noMatchRows = Math.round(j.rows * 0.015);
      j.completedAt = new Date().toISOString();
    }
  }
}

const publicJob = ({ startedAtMs, durationMs, ...j }: (typeof bulkJobs)[number]): BulkJob => {
  void startedAtMs;
  void durationMs;
  return j;
};

const BULK_PRICE: Record<BulkReportType, { suite: SuiteId; cents: number }> = {
  consumer_trace: { suite: "multi_trace", cents: PRICE_CENTS.multi_trace },
  credit_enquiry: { suite: "credit_enquiry", cents: PRICE_CENTS.credit_enquiry },
  id_verification: { suite: "id_verification", cents: PRICE_CENTS.id_verification },
  business_enquiry: { suite: "business_enquiry", cents: PRICE_CENTS.business_enquiry },
  director_enquiry: { suite: "director_enquiry", cents: PRICE_CENTS.director_enquiry },
  talent_screening: { suite: "talent", cents: PRICE_CENTS.talent },
  social_screening: { suite: "social_screening", cents: PRICE_CENTS.social_screening },
  qualification_check: { suite: "swift", cents: PRICE_CENTS.swift },
  riskguard_add: { suite: "riskguard", cents: PRICE_CENTS.riskguard },
};

function dashboard(business: Business = "xds", branchId?: string): Dashboard {
  const r = usageReport({ ...lastDays(30), branchId });
  const b = billingSummary(business, branchId);
  const own = tickets.filter((t) => t.business === business);
  return {
    wallet: { ...wallet },
    billing: {
      outstandingCents: b.outstandingCents,
      nextInvoiceAt: b.nextInvoiceAt,
      spendThisMonthCents: b.spendThisMonthCents,
      spendLastMonthCents: b.spendLastMonthCents,
    },
    openTickets: own.filter((t) => t.status !== "resolved").length,
    waitingOnYou: own.filter((t) => t.status === "waiting_on_you").length,
    usageBySuite: Object.fromEntries(
      SUITES.map((s) => [s, { enquiries: r.totals[s].enquiries, trendPct: r.totals[s].trendPct }])
    ) as Dashboard["usageBySuite"],
    activity: [
      ...own.slice(0, 3).map((t) => ({
        id: `act-${t.key}`,
        at: t.updatedAt,
        kind: "support" as const,
        text: `${t.key} · ${t.subject}`,
        href: `/support/${t.key}`,
      })),
      ...topUps.slice(0, 2).map((t) => ({
        id: `act-${t.id}`,
        at: t.createdAt,
        kind: "wallet" as const,
        text: `${t.by} topped up ${rands(t.amountCents)} (${t.reference})`,
        href: "/top-up",
      })),
      ...audit.slice(0, 2).map((a) => ({ id: `act-${a.id}`, at: a.at, kind: "users" as const, text: `${a.actor}: ${a.action.toLowerCase()}: ${a.target}` })),
    ].sort((a, b) => b.at.localeCompare(a.at)),
  };
}

const rands = money;

/* -------------------------------------------------------------- handlers */

export const handlers = [
  /* auth — the host portal has already signed the user in */
  http.get("/api/auth/session", async () => {
    await delay(LATENCY);
    db.session = { mfaVerified: true };
    return HttpResponse.json(sessionResponse());
  }),

  /* org + dashboard */
  http.get("/api/org", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(org);
  }),
  http.get("/api/dashboard", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(dashboard(parseBusiness(request), parseDivision(request)));
  }),
  http.get("/api/notifications", async ({ request }) => {
    await delay(LATENCY / 2);
    return unauthorised(request) ?? HttpResponse.json(notifications);
  }),
  http.post("/api/notifications/read-all", async ({ request }) => {
    await delay(LATENCY / 2);
    notifications.forEach((n) => (n.read = true));
    return unauthorised(request) ?? HttpResponse.json(notifications);
  }),
  http.post("/api/suites/access-request", async ({ request }) => {
    await delay(LATENCY * 2); // the decision engine "thinks" for a moment
    const denied = unauthorised(request);
    if (denied) return denied;
    const { suite, note, volume, division } = (await request.json()) as { suite: SuiteId; note?: string; volume?: string; division?: string };
    const target = branches.find((x) => x.id === division);
    const name = SUITE_BY_ID[suite].name;
    if (target?.products.includes(suite)) return fail(409, `${name} is already switched on at ${target.name}.`);
    if (!target && ORG_SUITES.includes(suite)) return fail(409, `Your organisation already has ${name}.`);
    const pending = tickets.find((t) => t.suite === suite && t.category === "access" && t.status !== "resolved" && t.subject.includes(target?.name ?? ""));
    if (pending) return fail(409, `${name} was already requested in ${pending.key}. A specialist will reply there.`);
    return HttpResponse.json(requestProduct({ suite, divisionId: target?.id, volume, note }));
  }),
  http.post("/api/decisions/:ref/review", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const d = askForReview(String(params.ref));
    return d ? HttpResponse.json(d) : fail(404, "Couldn't find that decision.");
  }),
  http.post("/api/decisions/:ref/accept", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const { option } = (await request.json().catch(() => ({}))) as { option?: string };
    const d = acceptTerms(String(params.ref), option);
    return d ? HttpResponse.json(d) : fail(404, "That offer isn't open any more.");
  }),
  http.post("/api/decisions/:ref/decline", async ({ request, params }) => {
    await delay(LATENCY / 2);
    const denied = unauthorised(request);
    if (denied) return denied;
    const d = declineOffer(String(params.ref));
    return d ? HttpResponse.json(d) : fail(404, "That offer isn't open any more.");
  }),
  http.get("/api/offers", async ({ request }) => {
    await delay(LATENCY / 2);
    return unauthorised(request) ?? HttpResponse.json(openOffers(parseDivision(request)));
  }),
  http.post("/api/internal/approve", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const { suite, division, agent, conditions, options } = (await request.json()) as { suite: SuiteId; division?: string; agent?: string; conditions?: string[]; options?: import("../types").TermOption[] };
    return HttpResponse.json(approveByAgent(suite, division, agent ?? "Mettus support", { conditions: conditions ?? [], options: options ?? [] }));
  }),
  http.get("/api/recommendations", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(recommend(parseBusiness(request) ?? "xds", parseDivision(request)));
  }),

  /* wallet */
  http.get("/api/wallet", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(wallet);
  }),
  http.get("/api/wallet/top-ups", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(topUps);
  }),
  http.post("/api/wallet/top-ups", async ({ request }) => {
    await delay(LATENCY * 3);
    const denied = unauthorised(request);
    if (denied) return denied;
    const body = (await request.json()) as TopUpRequest;
    if (!Number.isInteger(body.amountCents) || body.amountCents < 50_000 || body.amountCents > 50_000_000) {
      return fail(400, "Top-ups must be between R 500 and R 500 000.");
    }
    const labels: Record<TopUpRequest["methodKind"], string> = {
      card: paymentMethods.find((p) => p.id === body.methodId)?.label ?? "Card",
      debit_order: "Debit order",
      instant_eft: "Instant EFT",
      eft: "EFT reference",
    };
    // standard EFT stays pending until the bank transfer clears
    const pending = body.methodKind === "eft";
    const topUp: TopUp = {
      id: `tu_${Date.now()}`,
      reference: `TOP-${Math.floor(88_300 + Math.random() * 600)}`,
      createdAt: new Date().toISOString(),
      amountCents: body.amountCents,
      methodLabel: labels[body.methodKind],
      status: pending ? "pending" : "completed",
      by: currentUser.name,
    };
    topUps.unshift(topUp);
    if (!pending) wallet.balanceCents += body.amountCents;
    logAudit("Topped up wallet", `${rands(body.amountCents)} · ${topUp.reference}`);
    return HttpResponse.json({ wallet, topUp });
  }),
  http.put("/api/wallet/auto-top-up", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    wallet.autoTopUp = (await request.json()) as Wallet["autoTopUp"];
    logAudit(wallet.autoTopUp.enabled ? "Turned on auto top-up" : "Turned off auto top-up", rands(wallet.autoTopUp.amountCents));
    return HttpResponse.json(wallet);
  }),
  http.put("/api/wallet/threshold", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    wallet.lowBalanceThresholdCents = ((await request.json()) as { thresholdCents: number }).thresholdCents;
    return HttpResponse.json(wallet);
  }),

  /* billing */
  http.get("/api/billing/summary", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(billingSummary(parseBusiness(request), parseDivision(request)));
  }),
  http.get("/api/billing/invoices", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(invoices);
  }),
  http.get("/api/billing/invoices/:id", async ({ request, params }) => {
    await delay(LATENCY);
    const inv = invoices.find((i) => i.id === params.id);
    return unauthorised(request) ?? (inv ? HttpResponse.json(inv) : fail(404, "Couldn't find that invoice."));
  }),
  http.post("/api/billing/invoices/:id/pay", async ({ request, params }) => {
    await delay(LATENCY * 3);
    const denied = unauthorised(request);
    if (denied) return denied;
    const inv = invoices.find((i) => i.id === params.id);
    if (!inv) return fail(404, "Couldn't find that invoice.");
    inv.status = "paid";
    logAudit("Paid invoice", inv.number);
    return HttpResponse.json(inv);
  }),
  http.get("/api/billing/payment-methods", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(paymentMethods);
  }),
  http.post("/api/billing/payment-methods/:id/default", async ({ request, params }) => {
    await delay(LATENCY);
    paymentMethods.forEach((p) => (p.isDefault = p.id === params.id));
    return unauthorised(request) ?? HttpResponse.json(paymentMethods);
  }),

  /* support */
  http.get("/api/support/tickets", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(tickets);
  }),
  http.get("/api/support/tickets/:key", async ({ request, params }) => {
    await delay(LATENCY);
    const t = tickets.find((x) => x.key === params.key);
    return unauthorised(request) ?? (t ? HttpResponse.json(t) : fail(404, "Couldn't find that ticket on your account."));
  }),
  http.post("/api/support/tickets", async ({ request }) => {
    await delay(LATENCY * 2);
    const denied = unauthorised(request);
    if (denied) return denied;
    const body = (await request.json()) as NewTicket;
    const nowIso = new Date().toISOString();
    const hours = { low: 48, medium: 24, high: 8, urgent: 2 }[body.priority];
    const business = businessOf(body.suite, body.business);
    const t: Ticket = {
      key: nextTicketKey(business),
      business,
      subject: body.subject,
      suite: body.suite,
      category: body.category,
      priority: body.priority,
      status: "open",
      createdAt: nowIso,
      updatedAt: nowIso,
      slaDueAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
      requester: currentUser.name,
      messages: [
        { id: "m1", author: currentUser.name, from: "client", body: body.description, createdAt: nowIso, attachments: body.attachments },
        { id: "m2", author: "System", from: "system", body: `Ticket created and synced to the Mettus support desk. First response target: ${hours} hours.`, createdAt: nowIso },
      ],
    };
    tickets.unshift(t);
    return HttpResponse.json(t);
  }),
  http.post("/api/support/tickets/:key/messages", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const t = tickets.find((x) => x.key === params.key);
    if (!t) return fail(404, "Couldn't find that ticket.");
    const { body, attachments } = (await request.json()) as { body: string; attachments: string[] };
    const nowIso = new Date().toISOString();
    t.messages.push({ id: `m${t.messages.length + 1}`, author: currentUser.name, from: "client", body, attachments, createdAt: nowIso });
    t.updatedAt = nowIso;
    if (t.status === "waiting_on_you" || t.status === "resolved") t.status = "open";
    return HttpResponse.json(t);
  }),
  http.patch("/api/support/tickets/:key", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const t = tickets.find((x) => x.key === params.key);
    if (!t) return fail(404, "Couldn't find that ticket.");
    const { status } = (await request.json()) as { status: TicketStatus };
    t.status = status;
    t.updatedAt = new Date().toISOString();
    t.messages.push({ id: `m${t.messages.length + 1}`, author: "System", from: "system", body: status === "resolved" ? `Marked as resolved by ${currentUser.name}.` : `Reopened by ${currentUser.name}.`, createdAt: t.updatedAt });
    return HttpResponse.json(t);
  }),

  /* reports */
  http.get("/api/reports/usage", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const sp = new URL(request.url).searchParams;
    const fallback = lastDays(30);
    const q: UsageQuery = {
      from: sp.get("from") ?? fallback.from,
      to: sp.get("to") ?? fallback.to,
      granularity: sp.get("granularity") === "month" ? "month" : "day",
      branchId: sp.get("branch") || undefined,
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(q.from) || !/^\d{4}-\d{2}-\d{2}$/.test(q.to) || q.from > q.to) {
      return fail(400, "Choose a start date that's on or before the end date.");
    }
    if (q.from < usageSeries[0].date) {
      return fail(400, `Reports go back to ${new Date(usageSeries[0].date).toLocaleDateString("en-ZA", { dateStyle: "long" })}. Choose a later start date.`);
    }
    return HttpResponse.json(usageReport(q));
  }),
  http.get("/api/reports/monthly", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(monthlyReports());
  }),
  http.get("/api/reports/by-branch", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const sp = new URL(request.url).searchParams;
    const from = sp.get("from") ?? "";
    const to = sp.get("to") ?? "";
    const month = /^\d{4}-\d{2}$/;
    if (!month.test(from) || !month.test(to) || from > to) return fail(400, "Choose a first month that is on or before the last month.");
    return HttpResponse.json(branchMonths(from, to));
  }),
  http.get("/api/reports/bulk", async ({ request }) => {
    await delay(LATENCY / 2);
    tickBulkJobs();
    return unauthorised(request) ?? HttpResponse.json(bulkJobs.map(publicJob));
  }),
  http.post("/api/reports/bulk", async ({ request }) => {
    await delay(LATENCY * 2);
    const denied = unauthorised(request);
    if (denied) return denied;
    const body = (await request.json()) as NewBulkJob;
    const price = BULK_PRICE[body.reportType];
    if (!price || price.suite !== body.suite) return fail(400, "That report type isn't available for the product you chose.");
    if (!ORG_SUITES.includes(body.suite)) return fail(403, "Your organisation doesn't subscribe to that product.");
    if (!me().suites.includes(body.suite)) return fail(403, "None of your division roles include that product. Ask your admin for access.");
    const rows = body.identifiers.length;
    if (rows === 0) return fail(400, "Your file has no valid rows to run. Fix the rows listed and upload it again.");
    if (rows > 10_000) return fail(400, "A bulk file can have up to 10 000 rows. Split it into smaller files.");
    const cost = rows * price.cents;
    if (cost > wallet.balanceCents) {
      return fail(402, `This run costs ${money(cost)}, but your wallet has ${money(wallet.balanceCents)}. Top up first, or upload fewer rows.`, "insufficient_funds");
    }
    // credits are reserved up front; unmatched rows are refunded on the real platform
    wallet.balanceCents -= cost;
    const job = {
      id: `bj_${Date.now()}`,
      reference: nextBulkReference(),
      fileName: body.fileName,
      suite: body.suite,
      reportType: body.reportType,
      clientReference: body.clientReference,
      rows,
      status: "queued" as const,
      progress: 0,
      processedRows: 0,
      noMatchRows: 0,
      costCents: cost,
      createdAt: new Date().toISOString(),
      by: currentUser.name,
      startedAtMs: Date.now(),
      durationMs: Math.min(20_000, 5_000 + rows * 15),
    };
    bulkJobs.unshift(job);
    logAudit("Started a bulk report run", `${job.reference}, ${rows} rows, ${money(cost)}`);
    return HttpResponse.json(publicJob(job));
  }),
  http.delete("/api/reports/bulk/:id", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const job = bulkJobs.find((j) => j.id === params.id);
    if (!job) return fail(404, "Couldn't find that bulk run.");
    if (job.status !== "queued") return fail(409, "This run has already started, so it can't be cancelled.");
    job.status = "failed";
    wallet.balanceCents += job.costCents;
    job.costCents = 0;
    logAudit("Cancelled a bulk report run", job.reference);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("/api/reports/scheduled", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(scheduledReports);
  }),
  http.post("/api/reports/scheduled", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const body = (await request.json()) as Omit<ScheduledReport, "id" | "nextRunAt">;
    const days = { daily: 1, weekly: 7, monthly: 30 }[body.frequency];
    const sr: ScheduledReport = { ...body, id: `sr_${Date.now()}`, nextRunAt: new Date(Date.now() + days * 86_400_000).toISOString() };
    scheduledReports.push(sr);
    logAudit("Scheduled a report", sr.name);
    return HttpResponse.json(sr);
  }),
  http.delete("/api/reports/scheduled/:id", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const i = scheduledReports.findIndex((s) => s.id === params.id);
    if (i >= 0) {
      logAudit("Deleted a scheduled report", scheduledReports[i].name);
      scheduledReports.splice(i, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("/api/reports/export", async ({ request }) => {
    await delay(LATENCY * 2);
    const denied = unauthorised(request);
    if (denied) return denied;
    const { report, from, to, format } = (await request.json()) as { report: string; from: string; to: string; format: string };
    return HttpResponse.json({ fileName: `mettus-${report}-${from}-to-${to}.${format}` });
  }),

  /* divisions */
  http.get("/api/branches", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(branches);
  }),
  http.post("/api/branches", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const body = (await request.json()) as Omit<Branch, "id">;
    if (branches.some((b) => b.name.toLowerCase() === body.name.trim().toLowerCase())) {
      return fail(409, `There's already a division called ${body.name.trim()}.`);
    }
    const bad = body.products.find((p) => !ORG_SUITES.includes(p));
    if (bad) return fail(400, `${SUITE_BY_ID[bad].name} isn't on your subscription, so a division can't switch it on.`);
    const b: Branch = { ...body, name: body.name.trim(), id: nextBranchId() };
    branches.push(b);
    logAudit("Added division", `${b.name} (${b.code})`);
    return HttpResponse.json(b);
  }),
  http.patch("/api/branches/:id", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const b = branches.find((x) => x.id === params.id);
    if (!b) return fail(404, "Couldn't find that division.");
    const body = (await request.json()) as Partial<Branch>;
    const bad = body.products?.find((p) => !ORG_SUITES.includes(p));
    if (bad) return fail(400, `${SUITE_BY_ID[bad].name} isn't on your subscription, so a division can't switch it on.`);
    Object.assign(b, { ...body, id: b.id });
    logAudit("Updated division products", `${b.name}: ${b.products.length} products`);
    return HttpResponse.json(b);
  }),

  /* product roles */
  http.get("/api/product-roles", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(productRoles);
  }),
  http.post("/api/product-roles", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const body = (await request.json()) as Omit<ProductRole, "id">;
    if (productRoles.some((r) => r.name.toLowerCase() === body.name.trim().toLowerCase())) {
      return fail(409, `There's already a role called ${body.name.trim()}.`);
    }
    const r: ProductRole = { ...body, name: body.name.trim(), id: nextRoleId() };
    productRoles.push(r);
    logAudit("Added product role", r.name);
    return HttpResponse.json(r);
  }),
  http.patch("/api/product-roles/:id", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const r = productRoles.find((x) => x.id === params.id);
    if (!r) return fail(404, "Couldn't find that role.");
    Object.assign(r, { ...((await request.json()) as Partial<ProductRole>), id: r.id });
    logAudit("Updated product role", r.name);
    return HttpResponse.json(r);
  }),

  /* users */
  http.get("/api/users", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(users.map(withAccess));
  }),
  http.post("/api/users", async ({ request }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const body = (await request.json()) as InviteUser;
    if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return fail(409, "Someone with that email is already on your account.", "duplicate_email");
    }
    const assignments = cleanAssignments(body.assignments);
    if (typeof assignments === "string") return fail(400, assignments);
    const u = { id: nextUserId(), name: body.name, email: body.email, role: body.role, assignments, mfaEnabled: false, status: "invited" as const };
    users.push(u);
    logAudit("Invited user", body.email);
    return HttpResponse.json(withAccess(u));
  }),
  http.patch("/api/users/:id", async ({ request, params }) => {
    await delay(LATENCY);
    const denied = unauthorised(request);
    if (denied) return denied;
    const u = users.find((x) => x.id === params.id);
    if (!u) return fail(404, "Couldn't find that user.");
    const body = (await request.json()) as Partial<PortalUser>;
    if (u.id === currentUser.id && (body.status === "deactivated" || (body.role && body.role !== "admin"))) {
      return fail(400, "You can't remove your own admin access. Ask another admin to do it.");
    }
    if (body.assignments) {
      const assignments = cleanAssignments(body.assignments);
      if (typeof assignments === "string") return fail(400, assignments);
      u.assignments = assignments;
    }
    if (body.role) u.role = body.role;
    if (body.status) u.status = body.status;
    if (body.name) u.name = body.name;
    if (body.status) logAudit(body.status === "deactivated" ? "Deactivated user" : "Reactivated user", u.name);
    else if (body.role || body.assignments) logAudit("Updated access", `${u.name}: ${u.assignments.length} division ${u.assignments.length === 1 ? "role" : "roles"}`);
    return HttpResponse.json(withAccess(u));
  }),
  http.post("/api/users/:id/reset-mfa", async ({ request, params }) => {
    await delay(LATENCY);
    const u = users.find((x) => x.id === params.id);
    if (u) {
      u.mfaEnabled = false;
      logAudit("Reset MFA", u.name);
    }
    return unauthorised(request) ?? (u ? HttpResponse.json(withAccess(u)) : fail(404, "Couldn't find that user."));
  }),
  http.post("/api/users/:id/resend-invite", async ({ request, params }) => {
    await delay(LATENCY);
    const u = users.find((x) => x.id === params.id);
    if (u) logAudit("Resent invite", u.email);
    return unauthorised(request) ?? (u ? HttpResponse.json(withAccess(u)) : fail(404, "Couldn't find that user."));
  }),
  http.get("/api/audit", async ({ request }) => {
    await delay(LATENCY);
    return unauthorised(request) ?? HttpResponse.json(audit);
  }),
];
