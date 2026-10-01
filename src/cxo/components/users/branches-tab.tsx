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
import { branchesApi } from "@/lib/api/endpoints";
import { qk, useBranches, useUsers } from "@/lib/api/queries";
import type { Branch, SuiteId } from "@/lib/api/types";
import { SUITE_BY_ID } from "@/lib/suites";
import { ProductChecklist, productNames } from "./product-checklist";

const schema = z.object({
  name: z.string().trim().min(2, "Give the division a name, like Fraud and Forensics."),
  code: z.string().trim().min(2, "Enter the division's account code, like CKGO501."),
  costCentre: z.string().trim().optional(),
  products: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

/** The divisions under this client (departments, cost centres or subsidiaries) and which subscribed products each has switched on. */
export function BranchesTab() {
  const { data, isPending, isError, refetch } = useBranches();
  const users = useUsers().data ?? [];
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
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
            title="Divisions"
            description="Each division switches on the products it uses. People at a division can only open products that division has switched on."
            action={
              <Button size="sm" onClick={() => setEditing("new")}>
                <Icon.Plus className="h-4 w-4" /> Add division
              </Button>
            }
          />
        </div>
        {isPending ? (
          <PendingState label="Loading divisions…" />
        ) : isError ? (
          <ErrorState message="Couldn't load your divisions." onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState title="No divisions yet" description="Add your first division to start giving people product access." />
        ) : (
          <div className="border-t border-line">
            <TableWrap label="Divisions">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={TH}>Division</th>
                    <th scope="col" className={TH}>XDS products</th>
                    <th scope="col" className={TH}>MIE products</th>
                    <th scope="col" className={cx(TH, "text-right")}>People</th>
                    <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((b) => {
                    const people = users.filter((u) => u.status !== "deactivated" && u.assignments.some((a) => a.branchId === b.id)).length;
                    const xds = b.products.filter((p) => SUITE_BY_ID[p].business === "xds");
                    const mie = b.products.filter((p) => SUITE_BY_ID[p].business === "mie");
                    return (
                      <tr key={b.id} className={TR}>
                        <th scope="row" className={cx(TD, "text-left")}>
                          <p className="font-semibold">{b.name}</p>
                          <p className="text-xs font-normal text-muted">
                            Account {b.code}
                            {b.costCentre ? `. Cost centre ${b.costCentre}` : ""}
                          </p>
                        </th>
                        <td className={TD}>{xds.length ? productNames(xds) : <span className="text-muted">None</span>}</td>
                        <td className={TD}>{mie.length ? productNames(mie) : <span className="text-muted">None</span>}</td>
                        <td className={cx(TD, "text-right tabular-nums")}>{people}</td>
                        <td className={cx(TD, "text-right")}>
                          <Button variant="secondary" size="sm" onClick={() => setEditing(b)} aria-label={`Edit ${b.name}`}>
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

      <BranchDialog
        branch={editing}
        onClose={() => setEditing(null)}
        onSaved={(b, created) => {
          setEditing(null);
          setNotice(created ? `${b.name} is added. Assign people to it from the People tab.` : `${b.name} is updated. People there see the change straight away.`);
        }}
      />
    </div>
  );
}

function BranchDialog({
  branch,
  onClose,
  onSaved,
}: {
  branch: Branch | "new" | null;
  onClose: () => void;
  onSaved: (b: Branch, created: boolean) => void;
}) {
  const qc = useQueryClient();
  const isNew = branch === "new";
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
      return isNew ? branchesApi.create(body) : branchesApi.update((branch as Branch).id, body);
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: qk.branches });
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.audit });
      onSaved(b, isNew);
    },
  });

  useEffect(() => {
    if (!branch) return;
    save.reset();
    reset(
      branch === "new"
        ? { name: "", code: "", costCentre: "", products: [] }
        : { name: branch.name, code: branch.code, costCentre: branch.costCentre ?? "", products: [...branch.products] }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  return (
    <Dialog
      open={!!branch}
      onClose={onClose}
      size="lg"
      title={isNew ? "Add a division" : `Edit ${(branch as Branch | null)?.name ?? "division"}`}
      description="Only products on your subscription can be switched on."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="branch-form" loading={save.isPending}>
            {isNew ? "Add division" : "Save division"}
          </Button>
        </>
      }
    >
      <form id="branch-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        <fieldset disabled={save.isPending} className="space-y-5">
          {save.error && <Alert tone="danger">{save.error.message}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Division name" required error={errors.name?.message}>
              <Input aria-invalid={!!errors.name} placeholder="e.g. Fraud and Forensics" {...register("name")} />
            </Field>
            <Field label="Account code" required hint="The customer code Mettus bills this division under." error={errors.code?.message}>
              <Input aria-invalid={!!errors.code} placeholder="e.g. CKGO501" {...register("code")} />
            </Field>
            <Field label="Cost centre" hint="Optional. Your own reference, shown on its invoices." error={errors.costCentre?.message}>
              <Input aria-invalid={!!errors.costCentre} placeholder="e.g. 5727" {...register("costCentre")} />
            </Field>
          </div>
          <ProductChecklist
            legend="Products switched on"
            hint="People at this division can open these, if their product role includes them too."
            value={products}
            onChange={(v) => setValue("products", v)}
          />
        </fieldset>
      </form>
    </Dialog>
  );
}
