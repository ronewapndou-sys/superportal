import type { Role } from "./api/types";

/**
 * Client-side capability map — UX only. The backend must enforce the same
 * rules on every endpoint; hiding a button is not access control.
 */
export type Capability =
  | "products.launch"
  | "wallet.top_up"
  | "billing.view"
  | "billing.pay"
  | "support.create"
  | "reports.view"
  | "reports.schedule"
  | "users.manage";

export const CAPABILITIES: { id: Capability; label: string }[] = [
  { id: "products.launch", label: "Launch products" },
  { id: "wallet.top_up", label: "Top up credits" },
  { id: "billing.view", label: "View invoices" },
  { id: "billing.pay", label: "Pay invoices and manage payment methods" },
  { id: "support.create", label: "Log and reply to support tickets" },
  { id: "reports.view", label: "View reports" },
  { id: "reports.schedule", label: "Schedule and export reports" },
  { id: "users.manage", label: "Invite and manage users" },
];

export const ROLE_CAPS: Record<Role, Capability[]> = {
  admin: CAPABILITIES.map((c) => c.id),
  billing: ["wallet.top_up", "billing.view", "billing.pay", "support.create", "reports.view"],
  analyst: ["products.launch", "support.create", "reports.view", "reports.schedule"],
  viewer: ["reports.view", "billing.view"],
};

export const can = (role: Role | undefined, cap: Capability) => !!role && ROLE_CAPS[role].includes(cap);
