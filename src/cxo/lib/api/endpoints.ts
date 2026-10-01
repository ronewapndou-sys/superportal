import { api } from "./client";
import type {
  TermOption,
  ProductDecision,
  Recommendation,
  BranchMonth,
  AuditEvent,
  BillingSummary,
  Branch,
  ProductRole,
  Business,
  Dashboard,
  InviteUser,
  Invoice,
  NewTicket,
  Notification,
  Org,
  PaymentMethod,
  PortalUser,
  BulkJob,
  MonthlyReport,
  NewBulkJob,
  UsageQuery,
  ScheduledReport,
  Session,
  Ticket,
  TicketStatus,
  TopUp,
  TopUpRequest,
  UsageReport,
  Wallet,
} from "./types";

export const authApi = {
  /** exchange the host portal's sign-in for a session in this app */
  session: () => api.get<Session>("/auth/session"),
};

export const orgApi = {
  get: () => api.get<Org>("/org"),
  dashboard: (business: Business, division?: string) => api.get<Dashboard>(`/dashboard?business=${business}${division ? `&division=${division}` : ""}`),
  notifications: () => api.get<Notification[]>("/notifications"),
  markAllRead: () => api.post<Notification[]>("/notifications/read-all"),
  requestSuiteAccess: (suite: string, note: string, volume?: string, division?: string) =>
    api.post<ProductDecision>("/suites/access-request", { suite, note, volume, division }),
  askForReview: (reference: string) => api.post<ProductDecision>(`/decisions/${reference}/review`),
  acceptTerms: (reference: string, option?: string) => api.post<ProductDecision>(`/decisions/${reference}/accept`, { option }),
  declineTerms: (reference: string) => api.post<ProductDecision>(`/decisions/${reference}/decline`),
  offers: (division?: string) => api.get<ProductDecision[]>(`/offers${division ? `?division=${division}` : ""}`),
  approveAsAgent: (suite: string, division: string | undefined, agent: string, terms: { conditions: string[]; options: TermOption[] }) =>
    api.post<{ activated: boolean; offered: boolean }>("/internal/approve", { suite, division, agent, ...terms }),
  recommendations: (business: Business, division?: string) =>
    api.get<Recommendation[]>(`/recommendations?business=${business}${division ? `&division=${division}` : ""}`),
};

export const walletApi = {
  get: () => api.get<Wallet>("/wallet"),
  topUps: () => api.get<TopUp[]>("/wallet/top-ups"),
  topUp: (body: TopUpRequest) => api.post<{ wallet: Wallet; topUp: TopUp }>("/wallet/top-ups", body),
  setAutoTopUp: (body: Wallet["autoTopUp"]) => api.put<Wallet>("/wallet/auto-top-up", body),
  setThreshold: (thresholdCents: number) => api.put<Wallet>("/wallet/threshold", { thresholdCents }),
};

export const billingApi = {
  summary: (business: Business, division?: string) => api.get<BillingSummary>(`/billing/summary?business=${business}${division ? `&division=${division}` : ""}`),
  invoices: () => api.get<Invoice[]>("/billing/invoices"),
  invoice: (id: string) => api.get<Invoice>(`/billing/invoices/${id}`),
  paymentMethods: () => api.get<PaymentMethod[]>("/billing/payment-methods"),
  setDefaultMethod: (id: string) => api.post<PaymentMethod[]>(`/billing/payment-methods/${id}/default`),
  payInvoice: (id: string) => api.post<Invoice>(`/billing/invoices/${id}/pay`),
};

export const supportApi = {
  tickets: () => api.get<Ticket[]>("/support/tickets"),
  ticket: (key: string) => api.get<Ticket>(`/support/tickets/${key}`),
  create: (body: NewTicket) => api.post<Ticket>("/support/tickets", body),
  reply: (key: string, body: string, attachments: string[] = []) =>
    api.post<Ticket>(`/support/tickets/${key}/messages`, { body, attachments }),
  setStatus: (key: string, status: TicketStatus) => api.patch<Ticket>(`/support/tickets/${key}`, { status }),
};

export const reportsApi = {
  usage: (q: UsageQuery) =>
    api.get<UsageReport>(
      `/reports/usage?from=${q.from}&to=${q.to}&granularity=${q.granularity}${q.branchId ? `&branch=${q.branchId}` : ""}`
    ),
  monthly: () => api.get<MonthlyReport[]>("/reports/monthly"),
  byBranch: (from: string, to: string) => api.get<BranchMonth[]>(`/reports/by-branch?from=${from}&to=${to}`),
  bulkJobs: () => api.get<BulkJob[]>("/reports/bulk"),
  createBulkJob: (body: NewBulkJob) => api.post<BulkJob>("/reports/bulk", body),
  cancelBulkJob: (id: string) => api.del<void>(`/reports/bulk/${id}`),
  scheduled: () => api.get<ScheduledReport[]>("/reports/scheduled"),
  createSchedule: (body: Omit<ScheduledReport, "id" | "nextRunAt">) =>
    api.post<ScheduledReport>("/reports/scheduled", body),
  deleteSchedule: (id: string) => api.del<void>(`/reports/scheduled/${id}`),
  exportReport: (body: { report: string; from: string; to: string; format: "csv" | "pdf" }) =>
    api.post<{ fileName: string }>("/reports/export", body),
};

export const branchesApi = {
  list: () => api.get<Branch[]>("/branches"),
  create: (body: Omit<Branch, "id">) => api.post<Branch>("/branches", body),
  update: (id: string, body: Partial<Omit<Branch, "id">>) => api.patch<Branch>(`/branches/${id}`, body),
};

export const productRolesApi = {
  list: () => api.get<ProductRole[]>("/product-roles"),
  create: (body: Omit<ProductRole, "id">) => api.post<ProductRole>("/product-roles", body),
  update: (id: string, body: Partial<Omit<ProductRole, "id">>) => api.patch<ProductRole>(`/product-roles/${id}`, body),
};

export const usersApi = {
  list: () => api.get<PortalUser[]>("/users"),
  invite: (body: InviteUser) => api.post<PortalUser>("/users", body),
  update: (id: string, body: Partial<Pick<PortalUser, "role" | "assignments" | "status" | "name">>) =>
    api.patch<PortalUser>(`/users/${id}`, body),
  resetMfa: (id: string) => api.post<PortalUser>(`/users/${id}/reset-mfa`),
  resendInvite: (id: string) => api.post<PortalUser>(`/users/${id}/resend-invite`),
  audit: () => api.get<AuditEvent[]>("/audit"),
};
