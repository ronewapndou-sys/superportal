/**
 * Shared API contract. The backend team implements these shapes; the MSW
 * mocks in ./mocks return them today. Money is always integer cents (ZAR)
 * so nothing rounds on the way through.
 */

/** Mettus group businesses whose products the portal fronts. */
export type Business = "xds" | "mie";

export type XdsSuiteId =
  | "consumer_auth"
  | "consumer_trace"
  | "address_trace"
  | "telephone_trace"
  | "account_trace"
  | "multi_trace"
  | "easy_trace"
  | "prescreen_trace"
  | "id_verification"
  | "business_enquiry"
  | "director_enquiry"
  | "credit_enquiry"
  | "trace_ws"
  | "address_trace_ws";
export type MieSuiteId = "swift" | "social_screening" | "skills_assessment" | "talent" | "riskguard" | "auditing_tool";
export type SuiteId = XdsSuiteId | MieSuiteId;
export type Role = "admin" | "billing" | "analyst" | "viewer";

/* ----------------------------------------------------------------- Auth */

/**
 * Resolved from the host portal's sign-in (its SSO cookie or a token it
 * hands over). This app has no login screen of its own.
 */
export interface Session {
  accessToken: string;
  user: CurrentUser;
}

/* ------------------------------------------------------------- Divisions */

/**
 * A division of a client: a department, cost centre or subsidiary such as "Fraud and Forensics" or "Legal".
 * Each has its own account code, and switches on a subset of the products the client subscribes to.
 * (The type keeps its old name, Branch, to limit churn; everything a person sees says "division".)
 */
export interface Branch {
  id: string;
  name: string;
  /** the division's account code, as on the Mettus customer master list (for example CKGO501) */
  code: string;
  /** the client's own cost centre for the division, if they use one */
  costCentre?: string;
  products: SuiteId[];
}

/** A job role (e.g. "Credit officer") that unlocks a set of products. */
export interface ProductRole {
  id: string;
  name: string;
  description: string;
  products: SuiteId[];
}

/** A person holds one product role at a division. People can work at several divisions. */
export interface Assignment {
  branchId: string;
  productRoleId: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  /** portal permissions (what they can manage), separate from product access */
  role: Role;
  orgId: string;
  orgName: string;
  assignments: Assignment[];
  /** products they can open at each of their divisions: role products ∩ division products */
  access: Record<string, SuiteId[]>;
  /** union of `access` across divisions */
  suites: SuiteId[];
}

export interface Org {
  id: string;
  name: string;
  registrationNumber: string;
  accountNumber: string;
  /** products on the organisation's subscription, across XDS and MIE */
  products: SuiteId[];
  accountManager: { name: string; email: string; phone: string };
}

/* --------------------------------------------------------------- Wallet */

export interface Wallet {
  balanceCents: number;
  lowBalanceThresholdCents: number;
  autoTopUp: { enabled: boolean; thresholdCents: number; amountCents: number; methodId?: string };
  /** average daily spend over the last 30 days — drives "lasts about N days" */
  avgDailySpendCents: number;
}

export type PaymentMethodKind = "card" | "debit_order" | "instant_eft" | "eft";

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  detail: string;
  isDefault: boolean;
}

export interface TopUpRequest {
  amountCents: number;
  methodKind: PaymentMethodKind;
  methodId?: string;
  allocation?: Partial<Record<SuiteId, number>>;
}

export interface TopUp {
  id: string;
  reference: string;
  createdAt: string;
  amountCents: number;
  methodLabel: string;
  status: "completed" | "pending" | "failed";
  by: string;
}

/* -------------------------------------------------------------- Billing */

export type InvoiceStatus = "paid" | "due" | "overdue";

export interface InvoiceLine {
  suite: SuiteId | "platform";
  description: string;
  quantity: number;
  amountCents: number;
}

export interface Invoice {
  id: string;
  /** each business is its own legal entity, so it issues its own invoices */
  business: Business;
  /** invoices are per division account: the division this invoice bills */
  branchId: string;
  number: string;
  issuedAt: string;
  dueAt: string;
  periodLabel: string;
  amountCents: number;
  status: InvoiceStatus;
  /** when a paid invoice was paid; it drives the payment profile behind product decisions */
  paidAt?: string;
  lines: InvoiceLine[];
}

export interface Subscription {
  suite: SuiteId;
  plan: string;
  monthlyFeeCents: number;
  includedEnquiries: number;
  renewsAt: string;
  status: "active" | "not_subscribed";
}

export interface BillingSummary {
  outstandingCents: number;
  overdueCents: number;
  nextInvoiceAt: string;
  spendThisMonthCents: number;
  spendLastMonthCents: number;
  billingContact: { name: string; email: string };
  vatNumber: string;
  subscriptions: Subscription[];
}

/* ------------------------------------------- Account standing and product decisions */

export type RiskBand = "strong" | "good" | "fair" | "watch";

/** One thing the standing score looks at, in words a client can read. */
export interface StandingFactor {
  id: string;
  label: string;
  /** 0 to 100 for this factor alone */
  score: number;
  /** its share of the overall score, in percent */
  weight: number;
  /** what we looked at */
  detail: string;
  effect: "helps" | "neutral" | "hurts";
}

/**
 * How Mettus sees the account, for the whole client or one division. It is the same score the product decisions use,
 * so a client can see why a request was approved, or what would change a "not yet".
 */
export interface AccountStanding {
  divisionId?: string;
  score: number;
  band: RiskBand;
  summary: string;
  customerSince: string;
  contract: { termMonths: number; monthsRemaining: number; autoRenew: boolean; endsAt: string };
  factors: StandingFactor[];
  /** what would lift the score, most useful first */
  tips: string[];
  /** hard stops in force right now; a product cannot be approved automatically while any apply */
  blockers: string[];
  modelVersion: string;
  assessedAt: string;
}

export type ProductTier = "standard" | "sensitive" | "restricted";
/** terms_offered: we can add it on terms the client must agree to; nothing switches on until they do. */
export type DecisionOutcome = "approved" | "terms_offered" | "referred" | "not_yet";

/**
 * The full assessment behind a decision. Internal: Mettus support sees it on the ticket, and it is what automates
 * the approval. A client is never shown the score, the factors or the thresholds.
 */
export interface DecisionAssessment {
  reference: string;
  suite: SuiteId;
  divisionId?: string;
  outcome: DecisionOutcome;
  headline: string;
  score: number;
  required: number;
  tier: ProductTier;
  /** why the model decided as it did, for the agent */
  reasons: string[];
  /** terms the client would agree to, apart from the choice of how to start */
  conditions: string[];
  /** ways to start, when there is a real choice; the client picks one */
  options: TermOption[];
  /** what the client is told to do next */
  nextSteps: string[];
  /** what an agent could do to move the account, from the weakest factors */
  tips: string[];
  blockers: string[];
  factors: StandingFactor[];
  decidedAt: string;
  modelVersion: string;
  /** true once the product is switched on (for an offer, once the client has agreed) */
  activated: boolean;
  /** the client turned the offer down */
  declined?: boolean;
  agreedOption?: string;
  agreedAt?: string;
}

/** One way to start, when the client has a real choice between terms. */
export interface TermOption {
  id: string;
  label: string;
  detail: string[];
}

/** What a client is told about a decision: the outcome and what to do about it, never the score or the reasoning. */
export interface ProductDecision {
  reference: string;
  suite: SuiteId;
  divisionId?: string;
  outcome: DecisionOutcome;
  headline: string;
  /** one plain sentence, with nothing about scoring */
  summary: string;
  /** for an offer: the terms that apply whichever way the client starts */
  terms: string[];
  /** for an offer: the ways to start, of which the client picks one */
  options: TermOption[];
  /** once an offer is agreed: exactly what the client agreed to */
  agreed?: string[];
  declined?: boolean;
  nextSteps: string[];
  decidedAt: string;
  /** true once the product is switched on */
  activated: boolean;
  /** set once a person is looking at it: the support ticket */
  ticketKey?: string;
  /**
   * The assessment that goes on the support ticket for staff. The client screens never show it. In production the
   * server opens the ticket itself, so this never leaves it.
   */
  handoff?: DecisionAssessment;
}

export type RecommendationPreview = "pre_approved" | "terms" | "quick_review" | "not_yet";

/** A product suggested from how a division actually uses Mettus. */
export interface Recommendation {
  suite: SuiteId;
  headline: string;
  reasons: string[];
  benefit: string;
  /** how strongly the usage points to this product, 0 to 100 */
  confidence: number;
  preview: RecommendationPreview;
}

/* -------------------------------------------------------------- Support */

export type TicketStatus = "open" | "in_progress" | "waiting_on_you" | "resolved";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "technical" | "billing" | "access" | "data_query" | "feature_request";

export interface TicketMessage {
  id: string;
  author: string;
  /** "agent" messages come from the Mettus support desk (Jira comments) */
  from: "client" | "agent" | "system";
  body: string;
  createdAt: string;
  attachments?: string[];
}

export interface Ticket {
  key: string; // Jira issue key: MET-1042 for XDS, MIE-2210 for MIE (separate Jira projects)
  business: Business;
  subject: string;
  suite: SuiteId | "platform";
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  /** first-response / resolution SLA target */
  slaDueAt: string;
  requester: string;
  assignee?: string;
  messages: TicketMessage[];
}

export interface NewTicket {
  business: Business;
  subject: string;
  suite: SuiteId | "platform";
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  attachments: string[];
}

/* -------------------------------------------------------------- Reports */

/** Quick presets; "custom" means the caller supplies from/to. */
export type ReportRange = "7d" | "30d" | "90d" | "12m" | "custom";
export type Granularity = "day" | "month";

export interface UsageQuery {
  /** inclusive ISO dates, YYYY-MM-DD */
  from: string;
  to: string;
  granularity: Granularity;
  /** omit for the whole organisation */
  branchId?: string;
}

/** YYYY-MM-DD for daily points, YYYY-MM for monthly; one count per product. */
export type UsagePoint = { date: string } & Record<SuiteId, number>;

export interface UsageReport extends UsageQuery {
  days: number;
  series: UsagePoint[];
  /** trend compares with the previous period of the same length */
  totals: Record<SuiteId, { enquiries: number; spendCents: number; trendPct: number }>;
  topEnquiries: { name: string; suite: SuiteId; count: number; spendCents: number }[];
  hitRatePct: number;
  /** earliest date the ledger can report on */
  historyStartsAt: string;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  label: string; // "September 2026"
  /** in_progress = current month, numbers still moving */
  status: "final" | "in_progress";
  enquiries: number;
  spendCents: number;
  bySuite: Record<SuiteId, { enquiries: number; spendCents: number }>;
  /** one invoice per business for the month, once issued */
  invoiceNumbers: Partial<Record<Business, string>>;
}

/** One division's enquiries and spend for one month. Across divisions these add back to the organisation's totals exactly. */
export interface BranchMonth {
  month: string; // YYYY-MM
  branchId: string;
  bySuite: Record<SuiteId, { enquiries: number; spendCents: number }>;
}

/* ------------------------------------------------------------ Bulk reports */

export type BulkReportType =
  | "consumer_trace"
  | "credit_enquiry"
  | "id_verification"
  | "business_enquiry"
  | "director_enquiry"
  | "talent_screening"
  | "social_screening"
  | "qualification_check"
  | "riskguard_add";

export type BulkJobStatus = "queued" | "processing" | "completed" | "failed";

export interface BulkJob {
  id: string;
  reference: string;
  fileName: string;
  suite: SuiteId;
  reportType: BulkReportType;
  clientReference?: string;
  rows: number;
  status: BulkJobStatus;
  /** 0–100 */
  progress: number;
  processedRows: number;
  /** rows the bureau couldn't match once processing finished */
  noMatchRows: number;
  costCents: number;
  createdAt: string;
  completedAt?: string;
  by: string;
}

export interface NewBulkJob {
  fileName: string;
  suite: SuiteId;
  reportType: BulkReportType;
  clientReference?: string;
  /** validated identifiers only — invalid rows are dropped client-side and listed to the user */
  identifiers: string[];
}

export interface ScheduledReport {
  id: string;
  name: string;
  report: "usage" | "spend" | "enquiry_detail" | "invoice_pack";
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "pdf" | "xlsx";
  recipients: string[];
  nextRunAt: string;
}

/* ---------------------------------------------------------------- Users */

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignments: Assignment[];
  /** derived by the backend from assignments — read-only */
  suites: SuiteId[];
  mfaEnabled: boolean;
  status: "active" | "invited" | "deactivated";
  lastActiveAt?: string;
}

export interface InviteUser {
  name: string;
  email: string;
  role: Role;
  assignments: Assignment[];
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

/* ---------------------------------------------------------- Notifications */

export interface Notification {
  id: string;
  /** omitted = account-wide (wallet, users) and shown under both businesses */
  business?: Business;
  kind: "billing" | "support" | "wallet" | "users" | "product";
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

export interface ActivityItem {
  id: string;
  at: string;
  kind: Notification["kind"];
  text: string;
  href?: string;
}

/* ------------------------------------------------------------ Dashboard */

export interface Dashboard {
  wallet: Wallet;
  billing: Pick<BillingSummary, "outstandingCents" | "nextInvoiceAt" | "spendThisMonthCents" | "spendLastMonthCents">;
  openTickets: number;
  waitingOnYou: number;
  activity: ActivityItem[];
  usageBySuite: Record<SuiteId, { enquiries: number; trendPct: number }>;
}
