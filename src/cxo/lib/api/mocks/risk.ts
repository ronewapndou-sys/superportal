import { money } from "@/lib/format";
import { SUITE_BY_ID, suiteIdsFor } from "@/lib/suites";
import type {
  AccountStanding,
  Business,
  DecisionAssessment,
  DecisionOutcome,
  Invoice,
  ProductDecision,
  ProductTier,
  Recommendation,
  RecommendationPreview,
  RiskBand,
  StandingFactor,
  SuiteId,
  TermOption,
} from "../types";
import {
  billing,
  branches,
  clientProfile,
  currentUser,
  decisions,
  divisionUsage,
  invoices,
  logAudit,
  notifications,
  ORG_SUITES,
  PRICE_CENTS,
  tickets,
  topUps,
  usageSeries,
  users,
  wallet,
} from "./store";

/*
 * The decision engine behind product requests and recommendations. It is deliberately a plain, explainable rule
 * set rather than a black box: every score is a weighted sum of factors a client can read, every decision lists the
 * reasons, and a person can always review it. In production this sits behind the same two calls (assess a request,
 * suggest products) and is fed by the billing system, the contract register and the compliance file.
 */

const DAY = 86_400_000;
export const MODEL_VERSION = "Mettus account model 1.0";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const bandOf = (s: number): RiskBand => (s >= 85 ? "strong" : s >= 72 ? "good" : s >= 58 ? "fair" : "watch");
const effectOf = (s: number): StandingFactor["effect"] => (s >= 75 ? "helps" : s >= 55 ? "neutral" : "hurts");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const years = (ms: number) => ms / (365.25 * DAY);
const yearsText = (y: number) => (y < 1 ? `${Math.max(1, Math.round(y * 12))} months` : `${y.toFixed(1).replace(/\.0$/, "")} years`);

/** How sensitive each product is, which sets how strong the account must be before it is approved automatically. */
export const TIER: Record<SuiteId, ProductTier> = {
  easy_trace: "standard",
  prescreen_trace: "standard",
  id_verification: "standard",
  consumer_auth: "standard",
  business_enquiry: "standard",
  consumer_trace: "sensitive",
  address_trace: "sensitive",
  telephone_trace: "sensitive",
  account_trace: "sensitive",
  multi_trace: "sensitive",
  credit_enquiry: "sensitive",
  trace_ws: "sensitive",
  address_trace_ws: "sensitive",
  director_enquiry: "sensitive",
  swift: "sensitive",
  talent: "sensitive",
  skills_assessment: "sensitive",
  social_screening: "restricted",
  riskguard: "restricted",
  auditing_tool: "restricted",
};
export const REQUIRED: Record<ProductTier, number> = { standard: 60, sensitive: 70, restricted: 80 };
const TIER_NOTE: Record<ProductTier, string> = {
  standard: "it carries little personal information",
  sensitive: "it returns personal information about individuals",
  restricted: "it watches people continuously or draws on their social data",
};

/** When each division joined, in years before today. Newer divisions have a thinner history. */
const DIVISION_YEARS: Record<string, number> = { b_risk: 7.3, b_legal: 6, b_coll: 6.4, b_fraud: 5.1, b_credit: 3.2, b_onb: 1.1 };

const invoicesFor = (divisionId?: string) => invoices.filter((i) => !divisionId || i.branchId === divisionId);
const daysPastDue = (i: Invoice) => Math.max(0, Math.floor((Date.now() - new Date(i.dueAt).getTime()) / DAY));
const overdueOf = (divisionId?: string) => invoicesFor(divisionId).filter((i) => i.status === "overdue");

function mfaCoverage(divisionId?: string) {
  const active = users.filter((u) => u.status !== "deactivated" && (!divisionId || u.assignments.some((a) => a.branchId === divisionId)));
  const pool = active.length ? active : users.filter((u) => u.status !== "deactivated");
  const on = pool.filter((u) => u.mfaEnabled).length;
  return { on, total: pool.length, rate: pool.length ? on / pool.length : 1 };
}

function lastFullMonths() {
  return [...new Set(usageSeries.map((p) => p.date.slice(0, 7)))].sort().reverse();
}

const enquiriesIn = (month: string, divisionId?: string) => {
  if (divisionId) return Object.values(divisionUsage(month)[divisionId] ?? {}).reduce((a, n) => a + n, 0);
  return usageSeries.filter((p) => p.date.startsWith(month)).reduce((a, p) => a + Object.entries(p).reduce((s, [k, v]) => (k === "date" ? s : s + (v as number)), 0), 0);
};

/** How the account looks today, for the whole client or one division. */
export function standing(divisionId?: string): AccountStanding {
  const now = Date.now();
  const division = branches.find((b) => b.id === divisionId);
  const who = division ? division.name : "Your divisions";

  // 1. payment profile
  const list = invoicesFor(divisionId);
  const paid = list.filter((i) => i.paidAt);
  const daysToPay = (i: Invoice) => (new Date(i.paidAt!).getTime() - new Date(i.issuedAt).getTime()) / DAY;
  const onTime = paid.filter((i) => daysToPay(i) <= 30);
  const avgDays = paid.length ? paid.reduce((a, i) => a + daysToPay(i), 0) / paid.length : 0;
  const overdue = overdueOf(divisionId);
  const overdueCents = overdue.reduce((a, i) => a + i.amountCents, 0);
  const worst = Math.max(0, ...overdue.map(daysPastDue));
  const onTimeRate = paid.length ? onTime.length / paid.length : 0.6;
  const lateness = avgDays <= 20 ? 30 : avgDays <= 30 ? 22 : avgDays <= 35 ? 12 : avgDays <= 40 ? 5 : 0;
  const payScore = paid.length ? clamp(Math.round(35 + onTimeRate * 35 + lateness - overdue.length * 8 - Math.min(12, worst * 0.3))) : 55;
  const payDetail = paid.length
    ? `${onTime.length} of ${paid.length} invoices paid within 30 days, and on average ${Math.round(avgDays)} days after issue.${overdue.length ? ` ${plural(overdue.length, "invoice")} overdue (${money(overdueCents)}).` : " Nothing overdue."}`
    : "No payment history yet.";

  // 2. tenure
  const tenureYears = divisionId ? (DIVISION_YEARS[divisionId] ?? 1) : years(now - new Date(clientProfile.customerSince).getTime());
  const tenureScore = clamp(Math.round(22 + tenureYears * 11));

  // 3. contract
  const elapsedMonths = Math.round((now - new Date(clientProfile.contract.startedAt).getTime()) / (30.44 * DAY));
  const monthsRemaining = Math.max(0, clientProfile.contract.termMonths - elapsedMonths);
  const { termMonths, autoRenew } = clientProfile.contract;
  let contractScore = termMonths >= 36 ? 85 : termMonths >= 24 ? 72 : 58;
  if (monthsRemaining >= 12) contractScore += 10;
  if (monthsRemaining < 3) contractScore += autoRenew ? -5 : -30;
  contractScore = clamp(contractScore);
  const endsAt = new Date(new Date(clientProfile.contract.startedAt).getTime() + termMonths * 30.44 * DAY).toISOString();

  // 4. account health: wallet cover, failed top-ups and how much is owed against the limit
  const cover = wallet.avgDailySpendCents ? wallet.balanceCents / wallet.avgDailySpendCents : 30;
  const failedTopUps = topUps.filter((t) => t.status === "failed" && now - new Date(t.createdAt).getTime() < 90 * DAY).length;
  const owed = list.filter((i) => i.status !== "paid").reduce((a, i) => a + i.amountCents, 0);
  const limit = Math.round(clientProfile.creditLimitCents * (divisionId ? 0.35 : 1));
  const exposure = limit ? owed / limit : 0;
  const healthScore = clamp(Math.round(35 + Math.min(cover, 20) * 4 + (wallet.autoTopUp.enabled ? 12 : 0) - failedTopUps * 10 - (exposure > 0.9 ? 25 : exposure > 0.75 ? 12 : 0)));
  const healthDetail = `The wallet covers about ${Math.round(cover)} days of usage. ${failedTopUps ? `${plural(failedTopUps, "top-up")} failed in the last 3 months. ` : ""}Auto top-up is ${wallet.autoTopUp.enabled ? "on" : "off"}. ${Math.round(exposure * 100)}% of the credit limit is in use.`;

  // 5. usage and growth: last full month against the one before it
  const months = lastFullMonths();
  const current = enquiriesIn(months[1], divisionId);
  const before = enquiriesIn(months[2], divisionId);
  const growth = before ? ((current - before) / before) * 100 : 0;
  const usageScore = growth > 60 ? 60 : growth > 25 ? 78 : growth >= 0 ? 90 : growth >= -10 ? 76 : 55;
  const usageDetail = `Enquiries ${growth >= 0 ? "grew" : "fell"} ${Math.abs(Math.round(growth))}% on the month before. ${growth > 60 ? "That is a sharp jump, so we look closer." : "That is steady, predictable use."}`;

  // 6. compliance and security
  const ficaAge = (now - new Date(clientProfile.compliance.ficaVerifiedAt).getTime()) / DAY;
  const ficaOk = ficaAge <= 365;
  const mfa = mfaCoverage(divisionId);
  const complianceScore = clamp(Math.round((ficaOk ? 35 : 0) + (clientProfile.compliance.operatorAgreementSignedAt ? 25 : 0) + (clientProfile.compliance.permissiblePurposeOnFile ? 20 : 0) + mfa.rate * 20));
  const complianceDetail = `FICA checked ${Math.round(ficaAge / 30.44)} months ago${ficaOk ? "" : " (out of date)"}. Operator agreement ${clientProfile.compliance.operatorAgreementSignedAt ? "signed" : "missing"}. Multi-factor sign-in is on for ${mfa.on} of ${mfa.total} people.`;

  // 7. relationship
  const open = tickets.filter((t) => t.status !== "resolved");
  const billingOpen = open.filter((t) => t.category === "billing").length;
  const urgent = open.filter((t) => t.priority === "urgent").length;
  const relScore = clamp(92 - billingOpen * 10 - urgent * 12);
  const relDetail = `${plural(billingOpen, "open billing query", "open billing queries")} and ${urgent ? plural(urgent, "urgent escalation") : "no escalations"}.`;

  const factor = (id: string, label: string, score: number, weight: number, detail: string): StandingFactor => ({ id, label, score, weight, detail, effect: effectOf(score) });
  const factors = [
    factor("payment", "Payment profile", payScore, 30, payDetail),
    factor("tenure", "Years with Mettus", tenureScore, 15, `${who} ${division ? "has" : "have"} been with Mettus for ${yearsText(tenureYears)}.`),
    factor("contract", "Contract", contractScore, 15, `${termMonths}-month contract with ${monthsRemaining} months left. It ${autoRenew ? "renews automatically" : "does not renew automatically"}.`),
    factor("health", "Account health", healthScore, 15, healthDetail),
    factor("usage", "Usage and growth", usageScore, 10, usageDetail),
    factor("compliance", "Compliance and security", complianceScore, 10, complianceDetail),
    factor("relationship", "Support relationship", relScore, 5, relDetail),
  ];
  const score = Math.round(factors.reduce((a, f) => a + (f.score * f.weight) / 100, 0));

  const blockers: string[] = [];
  for (const i of overdue.filter((x) => daysPastDue(x) >= 30)) blockers.push(`${i.number} is ${daysPastDue(i)} days overdue (${money(i.amountCents)}). New products wait until it is settled.`);
  if (!ficaOk) blockers.push("FICA verification is more than 12 months old. A current pack is needed before new products.");

  const tips: string[] = [];
  const need = [...factors].sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight);
  for (const f of need) {
    if (f.score >= 85 || tips.length >= 3) continue;
    if (f.id === "payment") tips.push(overdue.length ? `Settle ${overdue.map((i) => i.number).join(" and ")} from Billing. Then pay inside your 30 day terms: every on-time invoice lifts this score.` : "Pay inside your 30 day terms. Every on-time invoice lifts the payment score.");
    else if (f.id === "health") tips.push(wallet.autoTopUp.enabled ? "Top up so the wallet covers at least 14 days of usage." : "Switch on auto top-up so the wallet never runs low.");
    else if (f.id === "compliance") tips.push(mfa.rate < 1 ? `Switch on multi-factor sign-in for the ${plural(mfa.total - mfa.on, "person", "people")} without it.` : "Keep your compliance documents current.");
    else if (f.id === "contract") tips.push("Renew early, or move to a longer term, to lift the contract score.");
    else if (f.id === "relationship") tips.push("Close out open billing queries so they stop counting against you.");
    else if (f.id === "usage") tips.push("Tell us about planned volume changes. Expected growth is treated as healthy.");
  }

  const summary =
    blockers.length > 0
      ? "On hold. New products wait until the issue below is fixed."
      : bandOf(score) === "strong"
        ? "Strong standing. Most requests are approved straight away."
        : bandOf(score) === "good"
          ? "Good standing. Most products are approved, some on terms the client agrees to."
          : bandOf(score) === "fair"
            ? "Fair standing. Products are offered on terms the client agrees to, and the most sensitive go to a person."
            : "Needs attention. Requests wait until the points below improve.";

  return {
    divisionId,
    score,
    band: blockers.length ? "watch" : bandOf(score),
    summary,
    customerSince: new Date(now - tenureYears * 365.25 * DAY).toISOString(),
    contract: { termMonths, monthsRemaining, autoRenew, endsAt },
    factors,
    tips,
    blockers,
    modelVersion: MODEL_VERSION,
    assessedAt: new Date(now).toISOString(),
  };
}

type Assessment = Omit<DecisionAssessment, "reference" | "decidedAt" | "activated">;

const volumeBump = (volume?: string) => (volume === "Over 10 000" ? 5 : volume === "1 000 to 10 000" ? 2 : 0);
const VOLUME_MID: Record<string, number> = { "Under 100": 60, "100 to 1 000": 500, "1 000 to 10 000": 4_000, "Over 10 000": 12_000 };

/** What a month of expected use would cost, to the nearest R50 and never under R1 000: the prepay a client can choose instead of a limit. */
function prepayFor(suite: SuiteId, volume?: string) {
  const cents = (VOLUME_MID[volume ?? ""] ?? 1_000) * PRICE_CENTS[suite] * 1.15;
  return Math.max(100_000, Math.round(cents / 5_000) * 5_000);
}

/** Decide a request without changing anything: what would happen if this division asked for this product now. */
export function assess(suite: SuiteId, divisionId?: string, volume?: string): Assessment {
  const st = standing(divisionId);
  const name = SUITE_BY_ID[suite].name;
  const division = branches.find((b) => b.id === divisionId);
  const at = division ? ` for ${division.name}` : "";
  const tier = TIER[suite];
  const required = REQUIRED[tier] + volumeBump(volume);
  const margin = st.score - required;
  const overdue = overdueOf(divisionId);
  const hold = overdue.some((i) => daysPastDue(i) >= 30);
  const ficaProblem = st.blockers.some((b) => b.startsWith("FICA"));
  const tenureYears = divisionId ? (DIVISION_YEARS[divisionId] ?? 1) : years(Date.now() - new Date(clientProfile.customerSince).getTime());

  let outcome: DecisionOutcome;
  if (hold) outcome = "not_yet";
  else if (ficaProblem) outcome = "referred";
  else if (margin >= 8 && overdue.length === 0) outcome = "approved";
  else if (margin >= 0) outcome = "terms_offered";
  else if (margin >= -10) outcome = "referred";
  else outcome = "not_yet";
  // the most sensitive products need a track record and a clean account
  if (tier === "restricted" && (tenureYears < 1 || overdue.length > 0) && (outcome === "approved" || outcome === "terms_offered")) outcome = "referred";

  const f = (id: string) => st.factors.find((x) => x.id === id)!;
  const helps = st.factors.filter((x) => x.effect === "helps").sort((a, b) => b.score * b.weight - a.score * a.weight);
  const hurts = st.factors.filter((x) => x.effect === "hurts").sort((a, b) => a.score * a.weight - b.score * b.weight);
  const reasons = [
    `The account scores ${st.score}. ${name} needs ${required} because ${TIER_NOTE[tier]}.`,
    ...helps.slice(0, 2).map((x) => `${x.label}: ${x.detail}`),
    ...hurts.slice(0, 2).map((x) => `${x.label}: ${x.detail}`),
  ];

  // The terms we would put to the client. They are built for every outcome, so support can offer them after a
  // referral too. The client never has them imposed: they agree to them first.
  const conditions: string[] = [];
  const options: TermOption[] = [];
  const mfa = mfaCoverage(divisionId);
  const needsStart = f("payment").score < 80 || f("tenure").score < 60 || outcome === "terms_offered";
  if (needsStart && outcome !== "approved") {
    options.push(
      { id: "limit", label: "Start with a monthly limit", detail: ["Up to 5 000 checks a month.", "The limit lifts by itself after three months of on-time payments."] },
      { id: "prepay", label: "Prepay and start without a limit", detail: [`Add ${money(prepayFor(suite, volume))} to your wallet before it switches on.`, "No monthly limit applies."] }
    );
  }
  if (f("health").score < 70) conditions.push(`Keep at least 14 days of cover in the wallet. It is about ${Math.round(wallet.balanceCents / wallet.avgDailySpendCents)} days now.`);
  for (const i of overdue) conditions.push(`Settle ${i.number} (${money(i.amountCents)}) within 7 days.`);
  if (tier !== "standard" && mfa.rate < 1) conditions.push("Switch on multi-factor sign-in for everyone who will use this product.");
  if (st.contract.monthsRemaining < 6) conditions.push(`Renew the contract before it ends in ${plural(st.contract.monthsRemaining, "month")} to keep this product's pricing.`);
  if (tier === "restricted") conditions.push("Keep your permissible-purpose declaration up to date for this product.");

  // an approval that comes with terms is an offer, however the score fell
  if (outcome === "approved" && (options.length > 0 || conditions.length > 0)) outcome = "terms_offered";

  const nextSteps: string[] = [];
  if (hold) nextSteps.push(`Pay ${overdue.filter((i) => daysPastDue(i) >= 30).map((i) => i.number).join(" and ")} from Billing. The request is approved automatically once it clears.`);
  else if (ficaProblem) nextSteps.push("Upload a current FICA pack from your account page.");
  else if (outcome === "referred") nextSteps.push("A specialist reviews it within 4 business hours and you'll get a notification.");
  else if (outcome === "not_yet") nextSteps.push("You can ask a person to look at it.");

  const headline =
    outcome === "approved"
      ? `${name} is approved${at}.`
      : outcome === "terms_offered"
        ? `We can add ${name}${at} on terms you agree to.`
        : outcome === "referred"
          ? `A specialist will review ${name}${at}.`
          : `${name} can't be approved${at} yet.`;

  return { suite, divisionId, outcome, headline, score: st.score, required, tier, reasons, conditions, options, nextSteps, tips: st.tips, blockers: st.blockers, factors: st.factors, modelVersion: MODEL_VERSION };
}

/** Switch a product on for a division, and on the client's subscription if it was not there yet. */
function activate(suite: SuiteId, divisionId?: string) {
  if (!ORG_SUITES.includes(suite)) ORG_SUITES.push(suite);
  const sub = billing.subscriptions.find((s) => s.suite === suite);
  if (sub && sub.status !== "active") {
    sub.status = "active";
    sub.plan = "Pay as you go";
    sub.monthlyFeeCents = 0;
    sub.includedEnquiries = 0;
  }
  const division = branches.find((b) => b.id === divisionId);
  if (division && !division.products.includes(suite)) division.products.push(suite);
}

const reference = () => `AI-${Date.now().toString(36).toUpperCase().slice(-6)}`;

/** One plain sentence for the client, with nothing about scoring. */
function summaryOf(d: DecisionAssessment): string {
  if (d.outcome === "approved") return "Checked against your account and approved.";
  if (d.outcome === "terms_offered") return d.activated ? "You agreed the terms, and it is switched on." : "Please read the terms and tell us if you agree. Nothing switches on until you do.";
  if (d.outcome === "referred") return "This one needs a specialist to look at it.";
  return d.blockers.some((b) => b.includes("overdue")) ? "An invoice on the account is overdue, so new products are paused." : "It can't be approved automatically right now.";
}

/** What leaves the decision engine for the client. The assessment travels only when a person needs to pick it up. */
function forClient(d: DecisionAssessment, handoff: boolean): ProductDecision {
  const agreed = d.outcome === "terms_offered" && d.activated;
  const offer = d.outcome === "terms_offered";
  const chosen = d.options.find((o) => o.id === d.agreedOption);
  const name = SUITE_BY_ID[d.suite].name;
  const division = branches.find((b) => b.id === d.divisionId);
  return {
    reference: d.reference,
    suite: d.suite,
    divisionId: d.divisionId,
    outcome: agreed ? "approved" : d.outcome,
    headline: agreed ? `${name} is switched on${division ? ` for ${division.name}` : ""}.` : d.headline,
    summary: summaryOf(d),
    terms: offer ? d.conditions : [],
    options: offer && !agreed ? d.options : [],
    agreed: agreed ? [...(chosen ? [chosen.label, ...chosen.detail] : []), ...d.conditions] : undefined,
    declined: d.declined,
    nextSteps: d.nextSteps,
    decidedAt: d.decidedAt,
    activated: d.activated,
    ...(handoff ? { handoff: d } : {}),
  };
}

/** Decide a request and act on it: switch it on, put terms to the client, or hand it to a person. */
export function requestProduct(input: { suite: SuiteId; divisionId?: string; volume?: string; note?: string }): ProductDecision {
  const d: DecisionAssessment = { ...assess(input.suite, input.divisionId, input.volume), reference: reference(), decidedAt: new Date().toISOString(), activated: false };
  const name = SUITE_BY_ID[d.suite].name;
  const division = branches.find((b) => b.id === d.divisionId);
  const where = `${name}${division ? ` at ${division.name}` : ""} (${d.reference})`;

  if (d.outcome === "approved") {
    activate(d.suite, d.divisionId);
    d.activated = true;
    logAudit("Approved product", where, "Mettus decision engine");
    notifications.unshift({ id: `n_${d.reference}`, business: SUITE_BY_ID[d.suite].business, kind: "product", title: `${name} is approved`, body: `${division ? `${division.name} can open it now.` : "You can open it now."}`, at: d.decidedAt, read: false, href: "/products" });
  } else if (d.outcome === "terms_offered") {
    logAudit("Offered terms for product", where, "Mettus decision engine");
  } else if (d.outcome === "referred") {
    logAudit("Referred product request", where, "Mettus decision engine");
  } else {
    logAudit("Held product request", where, "Mettus decision engine");
  }
  decisions.unshift(d);
  return forClient(d, d.outcome === "referred");
}

/** The client wants a person involved: hand the assessment over for a ticket. */
export function askForReview(ref: string): ProductDecision | undefined {
  const d = decisions.find((x) => x.reference === ref);
  if (!d) return undefined;
  logAudit("Asked for a person to review a decision", `${SUITE_BY_ID[d.suite].name} (${d.reference})`);
  return forClient(d, true);
}

/** The client agrees the terms: only now is the product switched on. */
export function acceptTerms(ref: string, optionId?: string): ProductDecision | undefined {
  const d = decisions.find((x) => x.reference === ref);
  if (!d || d.outcome !== "terms_offered" || d.declined) return undefined;
  if (!d.activated) {
    d.agreedOption = optionId ?? d.options[0]?.id;
    d.agreedAt = new Date().toISOString();
    activate(d.suite, d.divisionId);
    d.activated = true;
    const division = branches.find((b) => b.id === d.divisionId);
    logAudit("Client agreed terms", `${SUITE_BY_ID[d.suite].name}${division ? ` at ${division.name}` : ""} (${d.reference})${d.agreedOption ? `, started with ${d.agreedOption}` : ""}`, currentUser.name);
  }
  return forClient(d, false);
}

/** The client turns an offer down. Nothing was switched on, so there is nothing to undo. */
export function declineOffer(ref: string): ProductDecision | undefined {
  const d = decisions.find((x) => x.reference === ref);
  if (!d || d.activated) return undefined;
  d.declined = true;
  logAudit("Client declined terms", `${SUITE_BY_ID[d.suite].name} (${d.reference})`, currentUser.name);
  return forClient(d, false);
}

/** Offers waiting for the client's answer. */
export function openOffers(divisionId?: string): ProductDecision[] {
  return decisions.filter((d) => d.outcome === "terms_offered" && !d.activated && !d.declined && (!divisionId || d.divisionId === divisionId)).map((d) => forClient(d, false));
}

/**
 * A support agent approves a request the model referred or held. If there are terms, the client is asked to agree
 * to them first; if there are none, it is switched on.
 */
export function approveByAgent(suite: SuiteId, divisionId: string | undefined, agent: string, terms?: { conditions: string[]; options: TermOption[] }): { activated: boolean; offered: boolean } {
  const division = branches.find((b) => b.id === divisionId);
  const name = SUITE_BY_ID[suite].name;
  const where = `${name}${division ? ` at ${division.name}` : ""}`;
  const business = SUITE_BY_ID[suite].business;
  if (terms && (terms.conditions.length > 0 || terms.options.length > 0)) {
    const base = assess(suite, divisionId);
    const d: DecisionAssessment = { ...base, outcome: "terms_offered", headline: `We can add ${name}${division ? ` for ${division.name}` : ""} on terms you agree to.`, conditions: terms.conditions, options: terms.options, nextSteps: [], reference: reference(), decidedAt: new Date().toISOString(), activated: false };
    decisions.unshift(d);
    logAudit("Approved in principle, terms offered", where, agent);
    notifications.unshift({ id: `n_offer_${d.reference}`, business, kind: "product", title: `Terms ready for ${name}`, body: `A specialist approved ${name}${division ? ` for ${division.name}` : ""}. Read the terms and tell us if you agree.`, at: d.decidedAt, read: false, href: "/products" });
    return { activated: false, offered: true };
  }
  activate(suite, divisionId);
  logAudit("Approved product after review", where, agent);
  notifications.unshift({ id: `n_ok_${Date.now()}`, business, kind: "product", title: `${name} is approved`, body: `${division ? `${division.name} can open it now.` : "You can open it now."} A specialist reviewed your request.`, at: new Date().toISOString(), read: false, href: "/products" });
  const d = decisions.find((x) => x.suite === suite && x.divisionId === divisionId);
  if (d) d.activated = true;
  return { activated: true, offered: false };
}

const PREVIEW: Record<DecisionOutcome, RecommendationPreview> = { approved: "pre_approved", terms_offered: "terms", referred: "quick_review", not_yet: "not_yet" };

/** Products suggested from what a division actually does with Mettus. */
export function recommend(business: Business, divisionId?: string): Recommendation[] {
  const months = lastFullMonths();
  const month = months[1];
  const division = branches.find((b) => b.id === divisionId);
  const vol = (divisionId ? (divisionUsage(month)[divisionId] ?? {}) : Object.fromEntries(suiteIdsFor(business).map((s) => [s, usageSeries.filter((p) => p.date.startsWith(month)).reduce((a, p) => a + p[s], 0)]))) as Record<SuiteId, number>;
  const held = (s: SuiteId) => (division ? division.products.includes(s) : ORG_SUITES.includes(s));
  const n = (s: SuiteId) => (vol[s] ?? 0).toLocaleString("en-ZA");
  const base: Omit<Recommendation, "preview">[] = [];
  const push = (r: Omit<Recommendation, "preview">) => {
    if (SUITE_BY_ID[r.suite].business === business && !held(r.suite) && !base.some((b) => b.suite === r.suite)) base.push(r);
  };

  if ((vol.credit_enquiry ?? 0) >= 500) push({ suite: "id_verification", headline: "Check the ID before you buy the credit report", reasons: [`${n("credit_enquiry")} credit enquiries last month.`, "No identity check runs ahead of them, so a stolen ID reaches the credit report before anyone notices."], benefit: "Catches mismatched IDs early and cuts fraud losses on new applications.", confidence: 88 });
  if ((vol.consumer_trace ?? 0) >= 800) {
    const saving = Math.round((PRICE_CENTS.consumer_trace - PRICE_CENTS.multi_trace) * vol.consumer_trace * 0.5);
    push({ suite: "multi_trace", headline: "Run your traces as batches", reasons: [`${n("consumer_trace")} single traces last month.`, "Batches cost R 3.80 a trace, against R 6.50 one at a time."], benefit: `Could save about ${money(saving)} a month if half your traces ran as batches.`, confidence: 84 });
  }
  if ((vol.consumer_trace ?? 0) + (vol.address_trace ?? 0) >= 2000) push({ suite: "trace_ws", headline: "Trace from your own systems", reasons: [`${((vol.consumer_trace ?? 0) + (vol.address_trace ?? 0)).toLocaleString("en-ZA")} traces last month.`, "The web service returns results straight into your own systems."], benefit: "Removes the keying and waiting from every trace, and records each call for audit.", confidence: 78 });
  if ((vol.id_verification ?? 0) >= 500) push({ suite: "consumer_auth", headline: "Add a proof-of-life step for risky applicants", reasons: [`${n("id_verification")} ID verifications last month.`, "An ID number proves the ID exists, not that the applicant holds it."], benefit: "Stops impersonation at the point of application, for the few who look risky.", confidence: 74 });
  if ((vol.business_enquiry ?? 0) >= 100) push({ suite: "director_enquiry", headline: "Look behind the companies you check", reasons: [`${n("business_enquiry")} business enquiries last month.`, "Directors' own records often tell you more than the company's."], benefit: "Spots directors linked to failed or delinquent companies.", confidence: 76 });
  if ((vol.telephone_trace ?? 0) >= 300) push({ suite: "account_trace", headline: "Trace by bank account as well", reasons: [`${n("telephone_trace")} telephone traces last month.`, "When the number is dead, a bank account still points to the person."], benefit: "Raises the trace hit rate on customers who have moved or changed numbers.", confidence: 70 });
  if ((vol.credit_enquiry ?? 0) >= 2000) push({ suite: "prescreen_trace", headline: "Pre-screen before you send offers", reasons: [`${n("credit_enquiry")} credit enquiries last month.`, "Pre-screening removes people who won't qualify before you spend a full enquiry on them."], benefit: "Fewer wasted enquiries and cleaner marketing lists.", confidence: 72 });
  if ((vol.talent ?? 0) >= 100) push({ suite: "riskguard", headline: "Keep watching people you've screened", reasons: [`${n("talent")} candidates screened last month.`, "A clean check on the day someone starts says nothing about next year."], benefit: "Alerts you when a screened employee's record changes, without rescreening.", confidence: 86 });
  if ((vol.talent ?? 0) >= 100) push({ suite: "skills_assessment", headline: "Test skills as part of screening", reasons: [`${n("talent")} candidates screened last month.`, "Screening confirms who someone is. It doesn't confirm what they can do."], benefit: "Puts skills evidence next to the background check in one report.", confidence: 68 });
  if ((vol.swift ?? 0) >= 500) push({ suite: "social_screening", headline: "Add social media screening", reasons: [`${n("swift")} qualification checks last month.`, "Public social posts are a common source of conduct risk that records miss."], benefit: "Flags public conduct risk before an offer goes out.", confidence: 66 });
  if (held("riskguard")) push({ suite: "auditing_tool", headline: "Evidence every screening decision", reasons: ["You monitor people continuously.", "An audit trail shows a regulator who looked, when, and why."], benefit: "Turns monitoring into evidence you can hand over.", confidence: 64 });

  // what the rest of the client already uses
  if (division) {
    const peers = suiteIdsFor(business)
      .filter((s) => !held(s))
      .map((s) => ({ s, who: branches.filter((b) => b.id !== division.id && b.products.includes(s)) }))
      .filter((x) => x.who.length >= 2)
      .sort((a, b) => b.who.length - a.who.length);
    if (peers[0]) {
      const { s, who } = peers[0];
      push({ suite: s, headline: `${plural(who.length, "other division")} already use ${SUITE_BY_ID[s].short}`, reasons: [`In use at ${who.slice(0, 3).map((b) => b.name).join(", ")}${who.length > 3 ? " and others" : ""}.`, "Using the same product keeps checks consistent across the group."], benefit: "One way of working across divisions, and one set of results to compare.", confidence: 60 + 4 * who.length });
    }
  }

  return base
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4)
    .map((r) => ({ ...r, preview: PREVIEW[assess(r.suite, divisionId).outcome] }));
}
