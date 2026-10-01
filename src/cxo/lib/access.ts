import type { Assignment, Branch, ProductRole, SuiteId } from "./api/types";

/**
 * The one access rule, shared by the UI and the mock backend:
 * at a division, a person can open the products their role includes AND the
 * division has switched on. The real backend must apply the same rule on every
 * request — the UI only reflects it.
 */
export function accessFor(
  assignments: Assignment[],
  branches: Pick<Branch, "id" | "products">[],
  roles: Pick<ProductRole, "id" | "products">[]
): Record<string, SuiteId[]> {
  const out: Record<string, SuiteId[]> = {};
  for (const a of assignments) {
    const branch = branches.find((b) => b.id === a.branchId);
    const role = roles.find((r) => r.id === a.productRoleId);
    if (!branch || !role) continue;
    const allowed = role.products.filter((p) => branch.products.includes(p));
    out[a.branchId] = Array.from(new Set([...(out[a.branchId] ?? []), ...allowed]));
  }
  return out;
}

export const unionOf = (access: Record<string, SuiteId[]>): SuiteId[] =>
  Array.from(new Set(Object.values(access).flat()));
