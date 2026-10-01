"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, CardHeader, Field, Input, Select, Switch } from "@/components/ui/primitives";
import { walletApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/queries";
import type { PaymentMethod, Wallet } from "@/lib/api/types";
import { moneyWhole } from "@/lib/format";
import { parseRand, randToCents } from "./money-input";

const toRand = (cents: number) => String(Math.round(cents / 100));

function RandInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-semibold text-muted">R</span>
      <Input inputMode="decimal" className="pl-8 tabular-nums" {...props} />
    </div>
  );
}

function checkRand(raw: string, what: string) {
  const n = parseRand(raw);
  if (Number.isNaN(n)) return `Enter the ${what} in rand, like 10 000.`;
  if (randToCents(n) < 50_000) return `The ${what} must be at least R 500.`;
  if (randToCents(n) > 50_000_000) return `The ${what} can be at most R 500 000.`;
  return undefined;
}

/** Initialised once from the loaded wallet; the parent only mounts it when data is ready. */
export function AutoTopUpCard({ wallet, methods }: { wallet: Wallet; methods: PaymentMethod[] }) {
  const qc = useQueryClient();
  const cards = methods.filter((m) => m.kind === "card" || m.kind === "debit_order");

  const [enabled, setEnabled] = useState(wallet.autoTopUp.enabled);
  const [threshold, setThreshold] = useState(toRand(wallet.autoTopUp.thresholdCents));
  const [amount, setAmount] = useState(toRand(wallet.autoTopUp.amountCents));
  const [methodId, setMethodId] = useState(wallet.autoTopUp.methodId ?? cards.find((c) => c.isDefault)?.id ?? cards[0]?.id ?? "");
  const [alertAt, setAlertAt] = useState(toRand(wallet.lowBalanceThresholdCents));
  const [touched, setTouched] = useState(false);
  const [alertTouched, setAlertTouched] = useState(false);

  const onSaved = (w: Wallet) => {
    qc.setQueryData(qk.wallet, w);
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
  const saveAuto = useMutation({ mutationFn: walletApi.setAutoTopUp, onSuccess: onSaved });
  const saveAlert = useMutation({ mutationFn: walletApi.setThreshold, onSuccess: onSaved });

  const thresholdError = touched && enabled ? checkRand(threshold, "threshold") : undefined;
  const amountError = touched && enabled ? checkRand(amount, "top-up amount") : undefined;
  const alertError = alertTouched ? checkRand(alertAt, "alert amount") : undefined;

  function submitAuto(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (enabled && (checkRand(threshold, "threshold") || checkRand(amount, "top-up amount"))) return;
    saveAuto.mutate({
      enabled,
      thresholdCents: randToCents(parseRand(threshold)) || wallet.autoTopUp.thresholdCents,
      amountCents: randToCents(parseRand(amount)) || wallet.autoTopUp.amountCents,
      methodId: methodId || undefined,
    });
  }

  function submitAlert(e: React.FormEvent) {
    e.preventDefault();
    setAlertTouched(true);
    if (checkRand(alertAt, "alert amount")) return;
    saveAlert.mutate(randToCents(parseRand(alertAt)));
  }

  // editing anything clears the previous "Saved" confirmation
  const editAuto = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    if (saveAuto.isSuccess || saveAuto.isError) saveAuto.reset();
  };

  return (
    <Card id="auto" className="scroll-mt-24 p-5 md:p-6" aria-labelledby="auto-title">
      <CardHeader
        id="auto-title"
        title="Auto top-up and alerts"
        description="Keep enquiries running without anyone having to remember to top up."
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <form noValidate onSubmit={submitAuto} className="space-y-4">
          <Switch
            label="Auto top-up"
            description="When your balance drops below the threshold, your chosen method is charged."
            checked={enabled}
            onChange={editAuto(setEnabled)}
          />
          <fieldset disabled={!enabled || saveAuto.isPending} className="space-y-4 disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="When balance drops below" error={thresholdError}>
                <RandInput value={threshold} onChange={(e) => editAuto(setThreshold)(e.target.value)} aria-invalid={!!thresholdError} />
              </Field>
              <Field label="Add this amount" error={amountError}>
                <RandInput value={amount} onChange={(e) => editAuto(setAmount)(e.target.value)} aria-invalid={!!amountError} />
              </Field>
            </div>
            <Field label="Charge" hint="Instant EFT and EFT can't run automatically.">
              <Select value={methodId} onChange={(e) => editAuto(setMethodId)(e.target.value)}>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </fieldset>
          {saveAuto.isSuccess && (
            <Alert tone="success">
              {saveAuto.data.autoTopUp.enabled
                ? `Saved. ${moneyWhole(saveAuto.data.autoTopUp.amountCents)} is added whenever your balance drops below ${moneyWhole(saveAuto.data.autoTopUp.thresholdCents)}.`
                : "Saved. Auto top-up is off."}
            </Alert>
          )}
          {saveAuto.error && <Alert tone="danger">{saveAuto.error.message}</Alert>}
          <Button type="submit" variant="secondary" loading={saveAuto.isPending}>
            Save auto top-up
          </Button>
        </form>

        <form noValidate onSubmit={submitAlert} className="space-y-4 border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <div>
            <p className="text-[13px] font-medium text-ink">Low-balance alert</p>
            <p className="mt-0.5 text-xs leading-snug text-muted">
              Admins and billing users get an email and a portal notification when the balance drops below this.
            </p>
          </div>
          <Field label="Alert me below" error={alertError}>
            <RandInput
              value={alertAt}
              onChange={(e) => {
                setAlertAt(e.target.value);
                if (saveAlert.isSuccess) saveAlert.reset();
              }}
              aria-invalid={!!alertError}
            />
          </Field>
          {saveAlert.isSuccess && (
            <Alert tone="success">Saved. Alerts start when your balance drops below {moneyWhole(saveAlert.data.lowBalanceThresholdCents)}.</Alert>
          )}
          {saveAlert.error && <Alert tone="danger">{saveAlert.error.message}</Alert>}
          <Button type="submit" variant="secondary" loading={saveAlert.isPending}>
            Save alert
          </Button>
        </form>
      </div>
    </Card>
  );
}
