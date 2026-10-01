import { useStoredBranch } from "./branch";
import { useSession } from "./session";

/**
 * The division the signed-in person is working in: their saved choice if it is one of theirs, otherwise their first.
 * Undefined for company-wide roles (such as finance) that have no divisions of their own, which means the whole client.
 */
export function useDivisionId(): string | undefined {
  const ids = useSession()?.user.assignments.map((a) => a.branchId) ?? [];
  const stored = useStoredBranch();
  return ids.includes(stored) ? stored : ids[0];
}
