"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { billingApi, branchesApi, orgApi, productRolesApi, reportsApi, supportApi, usersApi, walletApi } from "./endpoints";
import { useBusiness } from "@/lib/business";
import { useDivisionId } from "@/lib/use-division";
import type { Business, UsageQuery } from "./types";

/** One place for query keys, so mutations invalidate the right things. */
export const qk = {
  org: ["org"] as const,
  dashboard: ["dashboard"] as const,
  dashboardFor: (b: Business, division?: string) => ["dashboard", b, division ?? "all"] as const,
  notifications: ["notifications"] as const,
  wallet: ["wallet"] as const,
  topUps: ["wallet", "top-ups"] as const,
  billing: ["billing", "summary"] as const,
  billingFor: (b: Business, division?: string) => ["billing", "summary", b, division ?? "all"] as const,
  invoices: ["billing", "invoices"] as const,
  paymentMethods: ["billing", "payment-methods"] as const,
  tickets: ["support", "tickets"] as const,
  ticket: (key: string) => ["support", "tickets", key] as const,
  usage: (q: UsageQuery) => ["reports", "usage", q.from, q.to, q.granularity, q.branchId ?? "all"] as const,
  branches: ["branches"] as const,
  productRoles: ["product-roles"] as const,
  monthly: ["reports", "monthly"] as const,
  byBranch: (from: string, to: string) => ["reports", "by-branch", from, to] as const,
  bulk: ["reports", "bulk"] as const,
  scheduled: ["reports", "scheduled"] as const,
  offers: (division?: string) => ["intelligence", "offers", division ?? "all"] as const,
  recommendations: (b: Business, division?: string) => ["intelligence", "recommendations", b, division ?? "all"] as const,
  users: ["users"] as const,
  audit: ["users", "audit"] as const,
};

/** Products suggested from how this division uses Mettus, with what the decision engine would say today. */
export const useRecommendations = () => {
  const business = useBusiness();
  const division = useDivisionId();
  return useQuery({ queryKey: qk.recommendations(business, division), queryFn: () => orgApi.recommendations(business, division) });
};
/** Terms the client has been offered and has not yet answered, for the division they work in. */
export const useOffers = () => {
  const division = useDivisionId();
  return useQuery({ queryKey: qk.offers(division), queryFn: () => orgApi.offers(division) });
};
export const useOrg = () => useQuery({ queryKey: qk.org, queryFn: orgApi.get });
/**
 * Scoped to the XDS / MIE switch and to the division you are working in. Invalidating qk.dashboard refreshes all of them.
 * Pass `business` to fetch a specific one regardless of the switch (for example, showing both when "All organisations" is picked).
 */
export const useDashboard = (opts?: { business?: Business; enabled?: boolean }) => {
  const globalBusiness = useBusiness();
  const business = opts?.business ?? globalBusiness;
  const division = useDivisionId();
  return useQuery({ queryKey: qk.dashboardFor(business, division), queryFn: () => orgApi.dashboard(business, division), enabled: opts?.enabled ?? true });
};
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: orgApi.notifications });
export const useWallet = () => useQuery({ queryKey: qk.wallet, queryFn: walletApi.get });
export const useTopUps = () => useQuery({ queryKey: qk.topUps, queryFn: walletApi.topUps });
/** One division's billing, or the whole client's when no division is given. */
export const useBillingSummary = (division?: string) => {
  const business = useBusiness();
  return useQuery({ queryKey: qk.billingFor(business, division), queryFn: () => billingApi.summary(business, division) });
};
/** Each business issues its own invoices, one per division account; the list follows the XDS / MIE switch, and a division when one is given. */
export const useInvoices = (division?: string) => {
  const business = useBusiness();
  return useQuery({
    queryKey: qk.invoices,
    queryFn: billingApi.invoices,
    select: (list) => list.filter((i) => i.business === business && (!division || i.branchId === division)),
  });
};
export const usePaymentMethods = () => useQuery({ queryKey: qk.paymentMethods, queryFn: billingApi.paymentMethods });
export const useTickets = () => useQuery({ queryKey: qk.tickets, queryFn: supportApi.tickets });
export const useTicket = (key: string) => useQuery({ queryKey: qk.ticket(key), queryFn: () => supportApi.ticket(key) });
export const useUsage = (q: UsageQuery) =>
  // keep the previous range on screen while a new one loads, so the page doesn't flash
  useQuery({ queryKey: qk.usage(q), queryFn: () => reportsApi.usage(q), placeholderData: keepPreviousData });
/** Every invoice across XDS and MIE, for downloads that combine both. */
export const useAllInvoices = () => useQuery({ queryKey: qk.invoices, queryFn: billingApi.invoices });
/** Each division's share of every month in the range. */
export const useBranchMonths = (from: string, to: string) =>
  useQuery({ queryKey: qk.byBranch(from, to), queryFn: () => reportsApi.byBranch(from, to), enabled: Boolean(from && to) });
export const useMonthlyReports = () => useQuery({ queryKey: qk.monthly, queryFn: reportsApi.monthly });
export const useBulkJobs = () =>
  useQuery({
    queryKey: qk.bulk,
    queryFn: reportsApi.bulkJobs,
    // poll only while something is still running
    refetchInterval: (q) => (q.state.data?.some((j) => j.status === "queued" || j.status === "processing") ? 1500 : false),
  });
export const useScheduledReports = () => useQuery({ queryKey: qk.scheduled, queryFn: reportsApi.scheduled });
export const useBranches = () => useQuery({ queryKey: qk.branches, queryFn: branchesApi.list });
export const useProductRoles = () => useQuery({ queryKey: qk.productRoles, queryFn: productRolesApi.list });
export const useUsers = () => useQuery({ queryKey: qk.users, queryFn: usersApi.list });
export const useAudit = () => useQuery({ queryKey: qk.audit, queryFn: usersApi.audit });
