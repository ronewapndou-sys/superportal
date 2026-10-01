import type { Tone } from "@/components/ui/primitives";
import type { InvoiceStatus, PortalUser, Role, TicketCategory, TicketPriority, TicketStatus, TopUp } from "./api/types";

/* One Record for labels and one for tones — status colour never appears at a call site. */

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_you: "Waiting on you",
  resolved: "Resolved",
};
export const TICKET_STATUS_TONE: Record<TicketStatus, Tone> = {
  open: "info",
  in_progress: "info",
  waiting_on_you: "warning",
  resolved: "success",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
// only priorities that change what you do next get colour
export const PRIORITY_TONE: Record<TicketPriority, Tone> = { low: "neutral", medium: "neutral", high: "warning", urgent: "danger" };
/** SLA first-response targets shown to the client, in hours. */
export const PRIORITY_SLA_HOURS: Record<TicketPriority, number> = { low: 48, medium: 24, high: 8, urgent: 2 };

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  technical: "Technical issue",
  billing: "Billing or payment",
  access: "Access and users",
  data_query: "Data query or dispute",
  feature_request: "Feature request",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = { paid: "Paid", due: "Due", overdue: "Overdue" };
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, Tone> = { paid: "success", due: "info", overdue: "danger" };

export const TOPUP_STATUS_LABEL: Record<TopUp["status"], string> = { completed: "Completed", pending: "Pending", failed: "Failed" };
export const TOPUP_STATUS_TONE: Record<TopUp["status"], Tone> = { completed: "success", pending: "warning", failed: "danger" };

export const USER_STATUS_LABEL: Record<PortalUser["status"], string> = { active: "Active", invited: "Invited", deactivated: "Deactivated" };
export const USER_STATUS_TONE: Record<PortalUser["status"], Tone> = { active: "success", invited: "warning", deactivated: "neutral" };

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", billing: "Billing", analyst: "Analyst", viewer: "Viewer" };
export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Everything, including users and billing.",
  billing: "Invoices, top-ups and payment methods.",
  analyst: "Uses products and runs reports.",
  viewer: "Read-only access to reports and tickets.",
};
