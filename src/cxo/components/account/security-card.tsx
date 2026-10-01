"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icons";
import { Dialog } from "@/components/ui/overlay";
import { Alert, Button, Card, CardHeader, Field, Input, Pill } from "@/components/ui/primitives";

const MIN = 12;

const schema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(MIN, `Your new password needs at least ${MIN} characters.`),
    confirm: z.string().min(1, "Type your new password again."),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "The two new passwords don't match." })
  .refine((v) => v.next !== v.current, { path: ["next"], message: "Choose a password you haven't used here before." });
type Values = z.infer<typeof schema>;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface DeviceSession {
  id: string;
  device: string;
  place: string;
  when: string;
  current?: boolean;
}

const SESSIONS: DeviceSession[] = [
  { id: "s1", device: "Chrome on Windows", place: "Johannesburg", when: "Active now", current: true },
  { id: "s2", device: "Edge on Windows", place: "Sandton", when: "2 days ago" },
  { id: "s3", device: "Safari on iPhone", place: "Cape Town", when: "5 days ago" },
];

export function SecurityCard({ mfaDestination }: { mfaDestination?: string }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [sessions, setSessions] = useState(SESSIONS);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", defaultValues: { current: "", next: "", confirm: "" } });
  const nextLen = useWatch({ control, name: "next" }).length;

  // Mock mutations — no password or session endpoints in the API contract yet.
  const change = useMutation({
    mutationFn: async () => wait(700),
    onSuccess: () => reset(),
  });
  const signOutOthers = useMutation({
    mutationFn: async () => wait(600),
    onSuccess: () => setSessions((s) => s.filter((x) => x.current)),
  });
  const others = sessions.length - 1;

  return (
    <Card className="p-5 md:p-6" aria-labelledby="security-title">
      <CardHeader
        id="security-title"
        title="Security"
        description="Your password, second factors and where you're signed in."
      />

      <section className="mt-6" aria-labelledby="pw-title">
        <h3 id="pw-title" className="text-[14px] font-semibold text-ink">
          Change password
        </h3>
        <form noValidate onSubmit={handleSubmit(() => change.mutate())} className="mt-3">
          <fieldset disabled={change.isPending} className="space-y-4">
            <Field label="Current password" error={errors.current?.message}>
              <Input type="password" autoComplete="current-password" aria-invalid={!!errors.current} {...register("current")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="New password"
                error={errors.next?.message}
                hint={`At least ${MIN} characters. A short sentence is easier to remember than symbols. ${nextLen} / ${MIN}`}
              >
                <Input type="password" autoComplete="new-password" aria-invalid={!!errors.next} {...register("next")} />
              </Field>
              <Field label="Confirm new password" error={errors.confirm?.message}>
                <Input type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} />
              </Field>
            </div>
          </fieldset>
          {change.isSuccess && (
            <Alert tone="success" className="mt-4" onDismiss={() => change.reset()}>
              Password changed. You stay signed in here, and other devices will need your new password.
            </Alert>
          )}
          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="secondary" loading={change.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-8 border-t border-line pt-6" aria-labelledby="mfa-title">
        <h3 id="mfa-title" className="text-[14px] font-semibold text-ink">
          Second factor
        </h3>
        <p className="mt-1 text-xs text-muted">One of these is needed every time you sign in with a password.</p>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Icon.Phone className="hidden h-5 w-5 text-muted sm:block" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">SMS code</p>
              <p className="text-xs text-muted tabular-nums">{mfaDestination ?? "Your mobile number"}</p>
            </div>
            <Pill tone="success">On</Pill>
          </li>
          <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Icon.Key className="hidden h-5 w-5 text-muted sm:block" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">Authenticator app</p>
              <p className="text-xs text-muted">Microsoft or Google Authenticator. Works without signal.</p>
            </div>
            <Pill tone="neutral">Not set up</Pill>
            <Button variant="secondary" size="sm" onClick={() => setAuthOpen(true)}>
              Set up
            </Button>
          </li>
        </ul>
      </section>

      <section className="mt-8 border-t border-line pt-6" aria-labelledby="sessions-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="sessions-title" className="text-[14px] font-semibold text-ink">
              Where you&apos;re signed in
            </h3>
            <p className="mt-1 text-xs text-muted">Signing out here signs you out of every Mettus product on that device.</p>
          </div>
          {others > 0 && (
            <Button variant="danger" size="sm" loading={signOutOthers.isPending} onClick={() => signOutOthers.mutate()}>
              Sign out other sessions
            </Button>
          )}
        </div>
        {signOutOthers.isSuccess && (
          <Alert tone="success" className="mt-4" onDismiss={() => signOutOthers.reset()}>
            Signed out of your other sessions. Only this device is still signed in.
          </Alert>
        )}
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{s.device}</p>
                <p className="text-xs text-muted">
                  {s.place} · {s.when}
                </p>
              </div>
              {s.current && <Pill tone="neutral" dot={false}>This device</Pill>}
            </li>
          ))}
        </ul>
      </section>

      <Dialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title="Set up an authenticator app"
        description="It takes about 2 minutes. Keep this window open while you do it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAuthOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setAuthOpen(false)}>I&apos;ve added it</Button>
          </>
        }
      >
        <ol className="list-decimal space-y-3 pl-5 text-[13px] leading-relaxed text-ink marker:font-semibold marker:text-brand">
          <li>Install Microsoft Authenticator or Google Authenticator on your phone.</li>
          <li>In the app, choose “Add account”, then “Scan a QR code”.</li>
          <li>Scan the code below. If you can&apos;t scan, type the setup key instead.</li>
          <li>Enter the 6-digit code the app shows to finish.</li>
        </ol>
        <div
          className="mx-auto mt-5 flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-ink/20 text-center text-xs text-muted"
          aria-hidden
        >
          QR code appears here
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Setup key: <span className="font-semibold text-ink tabular-nums">JBSW Y3DP EHPK 3PXP</span>
        </p>
      </Dialog>
    </Card>
  );
}
