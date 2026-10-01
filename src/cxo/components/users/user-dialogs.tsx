"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/overlay";
import { Alert, Button, Field, Input, SuccessPanel } from "@/components/ui/primitives";
import { usersApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/queries";
import type { Assignment, PortalUser } from "@/lib/api/types";
import { getSession, setSession } from "@/lib/session";
import { accessSchema, AccessFields } from "./access-fields";

const inviteSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter the person's full name."),
    email: z.email("Please enter a valid work email address, like name@company.co.za."),
  })
  .extend(accessSchema.shape);
type InviteValues = z.infer<typeof inviteSchema>;

/** First message from the assignments array (row-level or the uniqueness rule). */
function assignmentsError(e: unknown): string | undefined {
  const err = e as
    | ({ message?: string; root?: { message?: string } } & Record<number, { branchId?: { message?: string }; productRoleId?: { message?: string } }>)
    | undefined;
  if (!err) return undefined;
  if (err.message) return err.message;
  if (err.root?.message) return err.root.message;
  for (const k of Object.keys(err)) {
    const row = err[Number(k)];
    const m = row?.branchId?.message ?? row?.productRoleId?.message;
    if (m) return m;
  }
  return undefined;
}

function scrollToFirstError() {
  requestAnimationFrame(() => {
    document
      .querySelector('[role="dialog"] [role="alert"], [role="dialog"] [aria-invalid="true"]')
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", role: undefined, assignments: [] },
  });
  const invite = useMutation({
    mutationFn: usersApi.invite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.audit });
    },
  });

  // start fresh each time the dialog opens
  useEffect(() => {
    if (open) {
      reset();
      invite.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const role = useWatch({ control, name: "role" });
  const assignments = useWatch({ control, name: "assignments" }) as Assignment[] | undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Invite a user"
      description="They'll get an email with a link to set a password and turn on multi-factor sign-in."
      footer={
        invite.isSuccess ? (
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="invite-form" loading={invite.isPending}>
              Send invite
            </Button>
          </>
        )
      }
    >
      {invite.isSuccess ? (
        <SuccessPanel title={`Invite sent to ${invite.data.name}`}>
          An invite is on its way to {invite.data.email}. The link expires in 7 days, and you can resend it from the user list.
        </SuccessPanel>
      ) : (
        <form
          id="invite-form"
          noValidate
          onSubmit={handleSubmit((v) => invite.mutate(v), scrollToFirstError)}
        >
          <fieldset disabled={invite.isPending} className="space-y-5">
            {invite.error && <Alert tone="danger">{invite.error.message}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errors.name?.message}>
                <Input autoComplete="off" aria-invalid={!!errors.name} {...register("name")} placeholder="e.g. Lindiwe Zulu" />
              </Field>
              <Field label="Work email" required error={errors.email?.message}>
                <Input type="email" autoComplete="off" aria-invalid={!!errors.email} {...register("email")} placeholder="name@company.co.za" />
              </Field>
            </div>
            <AccessFields
              name="invite"
              role={role}
              assignments={assignments ?? []}
              onRole={(r) => setValue("role", r, { shouldValidate: true })}
              onAssignments={(a) => setValue("assignments", a, { shouldValidate: !!errors.assignments })}
              roleError={errors.role?.message}
              assignmentsError={assignmentsError(errors.assignments)}
            />
          </fieldset>
        </form>
      )}
    </Dialog>
  );
}

type AccessValues = z.infer<typeof accessSchema>;

export function EditAccessDialog({ user, onClose }: { user: PortalUser | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { handleSubmit, control, setValue, reset, formState: { errors } } = useForm<AccessValues>({
    resolver: zodResolver(accessSchema),
    mode: "onBlur",
  });
  const update = useMutation({
    mutationFn: (v: AccessValues) => usersApi.update(user!.id, v),
    onSuccess: (updated) => {
      // editing yourself: refresh your own session so the navbar and products follow straight away
      const current = getSession();
      if (current && updated.id === current.user.id) {
        setSession({ ...current, user: { ...current.user, role: updated.role, assignments: updated.assignments } });
      }
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.audit });
      onClose();
    },
  });

  const editRole = useWatch({ control, name: "role" });
  const editAssignments = useWatch({ control, name: "assignments" }) as Assignment[] | undefined;

  useEffect(() => {
    if (user) {
      reset({ role: user.role, assignments: user.assignments.map((a) => ({ ...a })) });
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Dialog
      open={!!user}
      onClose={onClose}
      size="lg"
      title={user ? `Edit access for ${user.name}` : "Edit access"}
      description="Portal permissions and which products they can open at each division. Changes apply the next time they open a product."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-access-form" loading={update.isPending}>
            Save access
          </Button>
        </>
      }
    >
      <form id="edit-access-form" noValidate onSubmit={handleSubmit((v) => update.mutate(v), scrollToFirstError)}>
        <fieldset disabled={update.isPending} className="space-y-5">
          {update.error && <Alert tone="danger">{update.error.message}</Alert>}
          <AccessFields
            name="edit"
            role={editRole}
            assignments={editAssignments ?? []}
            onRole={(r) => setValue("role", r, { shouldValidate: true })}
            onAssignments={(a) => setValue("assignments", a, { shouldValidate: !!errors.assignments })}
            roleError={errors.role?.message}
            assignmentsError={assignmentsError(errors.assignments)}
          />
        </fieldset>
      </form>
    </Dialog>
  );
}

/** Confirmation that names what's about to happen (deactivate / reactivate). */
export function StatusDialog({ user, onClose }: { user: PortalUser | null; onClose: () => void }) {
  const qc = useQueryClient();
  const deactivating = user?.status !== "deactivated";
  const change = useMutation({
    mutationFn: () => usersApi.update(user!.id, { status: deactivating ? "deactivated" : "active" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.audit });
      onClose();
    },
  });

  useEffect(() => {
    if (user) change.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Dialog
      open={!!user}
      onClose={onClose}
      title={user ? (deactivating ? `Deactivate ${user.name}?` : `Reactivate ${user.name}?`) : ""}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={deactivating ? "danger" : "primary"} loading={change.isPending} onClick={() => change.mutate()}>
            {deactivating ? `Deactivate ${user?.name.split(" ")[0]}` : `Reactivate ${user?.name.split(" ")[0]}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-[13px] leading-relaxed text-muted">
        {change.error && <Alert tone="danger">{change.error.message}</Alert>}
        {deactivating ? (
          <p>
            {user?.name} will be signed out of every XDS and MIE product straight away, and won&apos;t be able
            to sign in again. Their tickets, reports and audit history stay on your account. You can reactivate them later.
          </p>
        ) : (
          <p>
            {user?.name} will be able to sign in again with the same role and product access they had before.
          </p>
        )}
      </div>
    </Dialog>
  );
}
