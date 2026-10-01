"use client";

import { z } from "zod";
import { Icon } from "@/components/ui/icons";
import { Button, IconButton, Select } from "@/components/ui/primitives";
import { accessFor } from "@/lib/access";
import { useBranches, useProductRoles } from "@/lib/api/queries";
import type { Assignment, Role } from "@/lib/api/types";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/status";
import { SUITE_BY_ID } from "@/lib/suites";

export const ROLES: Role[] = ["admin", "billing", "analyst", "viewer"];

export const accessSchema = z.object({
  role: z.enum(["admin", "billing", "analyst", "viewer"], "Choose portal permissions for this person."),
  assignments: z
    .array(
      z.object({
        branchId: z.string().min(1, "Choose a division for every row, or remove the empty row."),
        productRoleId: z.string().min(1, "Choose a product role for every division."),
      })
    )
    .refine((list) => new Set(list.map((a) => a.branchId)).size === list.length, "Each division can only appear once."),
});

const OPTION =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-field-line bg-surface px-3.5 py-3 text-[13px] text-ink transition-colors hover:border-brand/40 has-checked:border-brand/50 has-checked:bg-brand/[0.04]";

/**
 * Portal permissions (what someone can manage) and division roles (what they
 * can open, and where). Controlled, so the invite and edit dialogs share it.
 */
export function AccessFields({
  role,
  assignments,
  onRole,
  onAssignments,
  roleError,
  assignmentsError,
  name,
}: {
  role: Role | undefined;
  assignments: Assignment[];
  onRole: (r: Role) => void;
  onAssignments: (a: Assignment[]) => void;
  roleError?: string;
  assignmentsError?: string;
  name: string;
}) {
  const branches = useBranches().data ?? [];
  const roles = useProductRoles().data ?? [];
  const preview = accessFor(assignments, branches, roles);
  const unused = branches.filter((b) => !assignments.some((a) => a.branchId === b.id));

  function update(i: number, patch: Partial<Assignment>) {
    onAssignments(assignments.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  }

  return (
    <>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-ink">
          Portal permissions <span aria-hidden className="text-brand">*</span>
        </legend>
        <p className="mb-2.5 text-xs leading-snug text-muted">What they can manage in this portal, across every division.</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ROLES.map((r) => (
            <label key={r} className={OPTION}>
              <input
                type="radio"
                name={`${name}-role`}
                value={r}
                checked={role === r}
                onChange={() => onRole(r)}
                aria-describedby={roleError ? `${name}-role-error` : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              />
              <span className="leading-snug">
                <span className="block font-semibold">{ROLE_LABEL[r]}</span>
                <span className="mt-0.5 block text-xs text-muted">{ROLE_DESCRIPTION[r]}</span>
              </span>
            </label>
          ))}
        </div>
        {roleError && (
          <p id={`${name}-role-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {roleError}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-ink">Divisions and product roles</legend>
        <p className="mb-2.5 text-xs leading-snug text-muted">
          At each division, they can open the products their role includes and the division has switched on. Leave this empty
          for people who only manage billing or users.
        </p>

        {assignments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-4 text-[13px] text-muted">
            No divisions yet. They won&apos;t be able to open any products.
          </p>
        ) : (
          <ul className="space-y-3">
            {assignments.map((a, i) => {
              const products = preview[a.branchId] ?? [];
              return (
                <li key={i} className="rounded-xl border border-line p-3.5">
                  <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                    <Select
                      aria-label={`Division ${i + 1}`}
                      value={a.branchId}
                      onChange={(e) => update(i, { branchId: e.target.value })}
                      aria-invalid={!!assignmentsError && !a.branchId}
                    >
                      <option value="">Choose a division</option>
                      {branches
                        .filter((b) => b.id === a.branchId || unused.includes(b))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </Select>
                    <Select
                      aria-label={`Product role at division ${i + 1}`}
                      value={a.productRoleId}
                      onChange={(e) => update(i, { productRoleId: e.target.value })}
                      aria-invalid={!!assignmentsError && !a.productRoleId}
                    >
                      <option value="">Choose a product role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                    <IconButton label={`Remove division ${i + 1}`} onClick={() => onAssignments(assignments.filter((_, j) => j !== i))}>
                      <Icon.X />
                    </IconButton>
                  </div>
                  {a.branchId && a.productRoleId && (
                    <p className="mt-2 text-xs text-muted">
                      {products.length === 0 ? (
                        "This role has no products this division has switched on."
                      ) : (
                        <>
                          Can open{" "}
                          {(["xds", "mie"] as const)
                            .map((biz) => {
                              const own = products.filter((p) => SUITE_BY_ID[p].business === biz);
                              return own.length ? `${own.map((p) => SUITE_BY_ID[p].name).join(", ")}` : "";
                            })
                            .filter(Boolean)
                            .join(" and ")}
                          .
                        </>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {assignmentsError && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {assignmentsError}
          </p>
        )}

        {unused.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => onAssignments([...assignments, { branchId: "", productRoleId: "" }])}
          >
            <Icon.Plus className="h-4 w-4" /> Add a division
          </Button>
        )}
      </fieldset>
    </>
  );
}
