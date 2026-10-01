"use client";

import { accessFor, unionOf } from "./access";
import { useBranches, useProductRoles } from "./api/queries";
import type { Branch, ProductRole, SuiteId } from "./api/types";
import { useStoredBranch } from "./branch";
import { useSession } from "./session";

export interface AccessContext {
  /** the division the user is working in right now, if they have any */
  branch?: Branch;
  /** products they can open at that division */
  suites: SuiteId[];
  /** products per division, for every division they're assigned to */
  access: Record<string, SuiteId[]>;
  /** everything they can open somewhere */
  anywhere: SuiteId[];
  myBranches: Branch[];
  roleAt: (branchId: string) => ProductRole | undefined;
  /** other divisions of theirs where this product is available */
  elsewhere: (suite: SuiteId) => Branch[];
}

/**
 * Product access for the signed-in user, recomputed from live division and
 * role data so an admin's changes show up straight away.
 */
export function useAccess(): AccessContext {
  const user = useSession()!.user;
  const branches = useBranches().data;
  const roles = useProductRoles().data;
  const stored = useStoredBranch();

  const access = branches && roles ? accessFor(user.assignments, branches, roles) : user.access;
  const myIds = user.assignments.map((a) => a.branchId);
  const myBranches = (branches ?? []).filter((b) => myIds.includes(b.id));
  const branchId = myIds.includes(stored) ? stored : myIds[0];
  const branch = myBranches.find((b) => b.id === branchId);

  return {
    branch,
    suites: branchId ? (access[branchId] ?? []) : [],
    access,
    anywhere: unionOf(access),
    myBranches,
    roleAt: (id) => {
      const a = user.assignments.find((x) => x.branchId === id);
      return roles?.find((r) => r.id === a?.productRoleId);
    },
    elsewhere: (suite) => myBranches.filter((b) => b.id !== branchId && access[b.id]?.includes(suite)),
  };
}
