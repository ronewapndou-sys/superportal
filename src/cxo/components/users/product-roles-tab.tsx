"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icons";
import { Dialog } from "@/components/ui/overlay";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  cx,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PendingState,
  TableWrap,
  TD,
  TH,
  TR,
} from "@/components/ui/primitives";
import { productRolesApi } from "@/lib/api/endpoints";
import { qk, useProductRoles, useUsers } from "@/lib/api/queries";
import type { ProductRole, SuiteId } from "@/lib/api/types";
import { ProductChecklist, productNames } from "./product-checklist";

const schema = z.object({
  name: z.string().trim().min(2, "Give the role a name, like Credit officer."),
  description: z.string().trim().min(4, "Describe the role in a few words, so admins pick the right one."),
  products: z.array(z.string()).min(1, "Choose at least one product this role can open."),
});
type Values = z.infer<typeof schema>;

/** Job roles and the products each unlocks. Used at any branch. */
export function ProductRolesTab() {
  const { data, isPending, isError, refetch } = useProductRoles();
  const users = useUsers().data ?? [];
  const [editing, setEditing] = useState<ProductRole | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {notice && (
        <Alert tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      <Card>
        <div className="p-5 md:p-6">
          <CardHeader
            title="Product roles"
            description="A product role is a job, like Credit officer, and the products it needs. Give someone a role at a division, and they can open the products the role includes and the division has switched on."
            action={
              <Button size="sm" onClick={() => setEditing("new")}>
                <Icon.Plus className="h-4 w-4" /> Add product role
              </Button>
            }
          />
        </div>
        {isPending ? (
          <PendingState label="Loading product roles…" />
        ) : isError ? (
          <ErrorState message="Couldn't load product roles." onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState title="No product roles yet" description="Add a role to start giving people product access at divisions." />
        ) : (
          <div className="border-t border-line">
            <TableWrap label="Product roles">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={TH}>Role</th>
                    <th scope="col" className={TH}>Products</th>
                    <th scope="col" className={cx(TH, "text-right")}>People</th>
                    <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => {
                    const people = users.filter((u) => u.status !== "deactivated" && u.assignments.some((a) => a.productRoleId === r.id)).length;
                    return (
                      <tr key={r.id} className={TR}>
                        <th scope="row" className={cx(TD, "text-left")}>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-xs font-normal text-muted">{r.description}</p>
                        </th>
                        <td className={TD}>{productNames(r.products)}</td>
                        <td className={cx(TD, "text-right tabular-nums")}>{people}</td>
                        <td className={cx(TD, "text-right")}>
                          <Button variant="secondary" size="sm" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </Card>

      <RoleDialog
        role={editing}
        onClose={() => setEditing(null)}
        onSaved={(r, created) => {
          setEditing(null);
          setNotice(created ? `${r.name} is added. You can give it to people at any division.` : `${r.name} is updated for everyone who has it.`);
        }}
      />
    </div>
  );
}

function RoleDialog({
  role,
  onClose,
  onSaved,
}: {
  role: ProductRole | "new" | null;
  onClose: () => void;
  onSaved: (r: ProductRole, created: boolean) => void;
}) {
  const qc = useQueryClient();
  const isNew = role === "new";
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" });
  const products = (useWatch({ control, name: "products" }) ?? []) as SuiteId[];

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { ...v, products: v.products as SuiteId[] };
      return isNew ? productRolesApi.create(body) : productRolesApi.update((role as ProductRole).id, body);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.productRoles });
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.audit });
      onSaved(r, isNew);
    },
  });

  useEffect(() => {
    if (!role) return;
    save.reset();
    reset(role === "new" ? { name: "", description: "", products: [] } : { name: role.name, description: role.description, products: [...role.products] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <Dialog
      open={!!role}
      onClose={onClose}
      size="lg"
      title={isNew ? "Add a product role" : `Edit ${(role as ProductRole | null)?.name ?? "role"}`}
      description="Changes apply at every division where someone has this role."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="role-form" loading={save.isPending}>
            {isNew ? "Add role" : "Save role"}
          </Button>
        </>
      }
    >
      <form id="role-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        <fieldset disabled={save.isPending} className="space-y-5">
          {save.error && <Alert tone="danger">{save.error.message}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role name" required error={errors.name?.message}>
              <Input aria-invalid={!!errors.name} placeholder="e.g. Collections agent" {...register("name")} />
            </Field>
            <Field label="Description" required error={errors.description?.message}>
              <Input aria-invalid={!!errors.description} placeholder="e.g. Checks arrears accounts" {...register("description")} />
            </Field>
          </div>
          <ProductChecklist
            legend="Products this role can open"
            value={products}
            onChange={(v) => setValue("products", v, { shouldValidate: !!errors.products })}
            error={errors.products?.message}
          />
        </fieldset>
      </form>
    </Dialog>
  );
}
