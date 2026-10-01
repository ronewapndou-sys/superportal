"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icons";
import { Alert, Button, Card, CardHeader, Checkbox, cx, Field, Input, SuccessPanel } from "@/components/ui/primitives";
import { walletApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/queries";
import type { PaymentMethod, PaymentMethodKind, SuiteId, TopUp, TopUpRequest, Wallet } from "@/lib/api/types";
import { money, moneyWhole } from "@/lib/format";
import { SUITE_BY_ID } from "@/lib/suites";
import { parseRand, randToCents } from "./money-input";
import { Stepper } from "./stepper";

const STEPS = ["Amount", "Payment", "Confirm"];
const BUNDLES = [500_000, 1_000_000, 2_500_000, 5_000_000] as const;
const MIN_CENTS = 50_000;
const MAX_CENTS = 50_000_000;

const schema = z
  .object({
    preset: z.string(),
    custom: z.string(),
    split: z.boolean(),
    allocation: z.record(z.string(), z.string()),
  })
  .superRefine((v, ctx) => {
    const total = amountFrom(v);
    if (v.preset === "custom") {
      const n = parseRand(v.custom);
      if (Number.isNaN(n)) ctx.addIssue({ code: "custom", path: ["custom"], message: "Enter an amount in rand, like 15 000." });
      else if (randToCents(n) < MIN_CENTS) ctx.addIssue({ code: "custom", path: ["custom"], message: "The smallest top-up is R 500." });
      else if (randToCents(n) > MAX_CENTS)
        ctx.addIssue({
          code: "custom",
          path: ["custom"],
          message: "The largest top-up is R 500 000. For more, speak to your account manager.",
        });
    }
    if (!v.split || Number.isNaN(total)) return;
    let sum = 0;
    for (const [suite, raw] of Object.entries(v.allocation)) {
      if (!raw.trim()) continue;
      const n = parseRand(raw);
      if (Number.isNaN(n) || n < 0) {
        ctx.addIssue({ code: "custom", path: ["allocation", suite], message: "Enter an amount in rand, or leave it blank." });
        return;
      }
      sum += randToCents(n);
    }
    if (sum !== total) {
      ctx.addIssue({
        code: "custom",
        path: ["split"],
        message: `Your split adds up to ${money(sum)}. It needs to match the ${money(total)} top-up, or turn the split off.`,
      });
    }
  });

type Values = z.infer<typeof schema>;

function amountFrom(v: Pick<Values, "preset" | "custom">) {
  if (v.preset !== "custom") return Number(v.preset);
  const n = parseRand(v.custom);
  return Number.isNaN(n) ? NaN : randToCents(n);
}

type MethodChoice = { key: string; kind: PaymentMethodKind; methodId?: string; label: string; detail: string };

/** Fictional collection account — replace with the real one from finance. */
const EFT_DETAILS = [
  ["Account name", "Mettus Collections (demo)"],
  ["Bank", "Standard Bank"],
  ["Account number", "000 123 456 7"],
  ["Branch code", "051001"],
];

export function TopUpFlow({ wallet, methods, suites }: { wallet: Wallet; methods: PaymentMethod[]; suites: SuiteId[] }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<TopUp | null>(null);

  const choices: MethodChoice[] = [
    ...methods
      .filter((m) => m.kind === "card")
      .map((m) => ({ key: `card:${m.id}`, kind: "card" as const, methodId: m.id, label: m.label, detail: `${m.detail} · credits appear straight away` })),
    { key: "instant_eft", kind: "instant_eft", label: "Instant EFT", detail: "Approve it in your banking app · credits appear straight away" },
    { key: "eft", kind: "eft", label: "EFT with a reference", detail: "Pay from any bank. Credits appear in 1 to 2 working days." },
  ];
  const defaultCard = methods.find((m) => m.kind === "card" && m.isDefault);
  const [methodKey, setMethodKey] = useState(defaultCard ? `card:${defaultCard.id}` : choices[0].key);
  const method = choices.find((c) => c.key === methodKey) ?? choices[0];

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      preset: String(BUNDLES[2]),
      custom: "",
      split: false,
      allocation: Object.fromEntries(suites.map((s) => [s, ""])),
    },
  });
  const { register, control, handleSubmit, formState, getValues, reset } = form;
  const errors = formState.errors;
  const [preset, custom, split, allocation] = useWatch({ control, name: ["preset", "custom", "split", "allocation"] });
  const amountCents = amountFrom({ preset, custom });

  const allocatedCents = Object.values(allocation ?? {}).reduce((sum, raw) => {
    const n = parseRand(raw);
    return sum + (Number.isNaN(n) ? 0 : randToCents(n));
  }, 0);

  const pay = useMutation({
    mutationFn: walletApi.topUp,
    onSuccess: ({ wallet: w, topUp }) => {
      qc.setQueryData(qk.wallet, w);
      qc.invalidateQueries({ queryKey: qk.wallet });
      qc.invalidateQueries({ queryKey: qk.topUps });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      setResult(topUp);
    },
  });

  function submitPayment() {
    const v = getValues();
    const body: TopUpRequest = { amountCents: amountFrom(v), methodKind: method.kind, methodId: method.methodId };
    if (v.split) {
      body.allocation = Object.fromEntries(
        Object.entries(v.allocation)
          .filter(([, raw]) => raw.trim())
          .map(([s, raw]) => [s, randToCents(parseRand(raw))])
      ) as TopUpRequest["allocation"];
    }
    pay.mutate(body);
  }

  function startOver() {
    reset();
    pay.reset();
    setResult(null);
    setStep(0);
  }

  const days = (cents: number) => Math.round(cents / Math.max(wallet.avgDailySpendCents, 1));

  if (result) {
    const pending = result.status === "pending";
    return (
      <Card className="p-5 md:p-6">
        <SuccessPanel
          title={pending ? "Your top-up is waiting for payment" : "Credits added to your wallet"}
          reference={result.reference}
          referenceLabel={pending ? "Use this payment reference" : "Reference"}
          actions={
            <Button variant="secondary" onClick={startOver}>
              <Icon.Refresh className="h-4 w-4" /> Top up again
            </Button>
          }
        >
          {pending ? (
            <>Pay {money(result.amountCents)} by EFT using the details below. The credits appear in 1 to 2 working days, once your bank transfer clears.</>
          ) : (
            <>
              {money(result.amountCents)} was added with {result.methodLabel}. Your new balance is{" "}
              <span className="font-semibold text-ink tabular-nums">{money(wallet.balanceCents)}</span>.
            </>
          )}
        </SuccessPanel>
        {pending && (
          <dl className="mt-5 grid gap-3 rounded-lg border border-line p-4 text-[13px] sm:grid-cols-2">
            {[...EFT_DETAILS, ["Reference", result.reference], ["Amount", money(result.amountCents)]].map(([k, val]) => (
              <div key={k}>
                <dt className="text-xs font-medium text-muted">{k}</dt>
                <dd className="mt-0.5 font-semibold text-ink tabular-nums">{val}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5 md:p-6" aria-labelledby="topup-title">
      <CardHeader
        id="topup-title"
        title="Add credits"
        description="Every Mettus product draws from your wallet as your team runs enquiries."
      />
      <div className="mt-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <form
          noValidate
          className="mt-6"
          onSubmit={handleSubmit(
            () => setStep(1),
            () =>
              requestAnimationFrame(() => {
                document.querySelector('[role="alert"], [aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
              })
          )}
        >
          <fieldset>
            <legend className="text-[13px] font-medium text-ink">How much would you like to add?</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {BUNDLES.map((b) => (
                <label
                  key={b}
                  className="flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border border-field-line bg-surface px-3.5 py-2.5 transition-colors hover:border-brand/40 has-checked:border-brand has-checked:bg-brand/[0.05] has-focus-visible:ring-4 has-focus-visible:ring-brand/20"
                >
                  <input type="radio" value={String(b)} className="sr-only" {...register("preset")} />
                  <span className="text-[15px] font-bold text-ink tabular-nums">{moneyWhole(b)}</span>
                  <span className="text-[11px] text-muted tabular-nums">About {days(b)} days</span>
                </label>
              ))}
              <label className="col-span-2 flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border border-field-line bg-surface px-3.5 py-2.5 transition-colors hover:border-brand/40 has-checked:border-brand has-checked:bg-brand/[0.05] has-focus-visible:ring-4 has-focus-visible:ring-brand/20 sm:col-span-1">
                <input type="radio" value="custom" className="sr-only" {...register("preset")} />
                <span className="text-[15px] font-bold text-ink">Custom</span>
                <span className="text-[11px] text-muted">Any amount</span>
              </label>
            </div>
          </fieldset>

          {preset === "custom" && (
            <Field label="Custom amount" className="mt-5 max-w-xs" error={errors.custom?.message} hint="In rand, between R 500 and R 500 000.">
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-semibold text-muted">R</span>
                <Input inputMode="decimal" placeholder="15 000" className="pl-8 tabular-nums" aria-invalid={!!errors.custom} {...register("custom")} />
              </div>
            </Field>
          )}

          {suites.length > 1 && (
            <div className="mt-5 space-y-4">
              <Checkbox
                label="Split this top-up between products"
                description="Leave this off to add everything to your shared wallet, which any product can draw from."
                {...register("split")}
              />
              {split && (
                <div className="rounded-lg border border-line bg-surface-2/50 p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {suites.map((s) => (
                      <Field key={s} label={SUITE_BY_ID[s].name} error={errors.allocation?.[s]?.message}>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-semibold text-muted">R</span>
                          <Input
                            inputMode="decimal"
                            placeholder="0"
                            className="pl-8 tabular-nums"
                            aria-invalid={!!errors.allocation?.[s]}
                            {...register(`allocation.${s}`)}
                          />
                        </div>
                      </Field>
                    ))}
                  </div>
                  <p
                    className={cx(
                      "mt-3 text-xs tabular-nums",
                      !Number.isNaN(amountCents) && allocatedCents === amountCents ? "font-semibold text-success" : "text-muted"
                    )}
                  >
                    {money(allocatedCents)} of {Number.isNaN(amountCents) ? money(0) : money(amountCents)} allocated
                  </p>
                  {errors.split?.message && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                      {errors.split.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:justify-end">
            <Button type="submit">
              Continue to payment <Icon.ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {step === 1 && (
        <div className="mt-6">
          <fieldset>
            <legend className="text-[13px] font-medium text-ink">How would you like to pay {money(amountCents)}?</legend>
            <div className="mt-3 space-y-3">
              {choices.map((c) => (
                <label
                  key={c.key}
                  className="flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl border border-field-line bg-surface px-4 py-3 transition-colors hover:border-brand/40 has-checked:border-brand has-checked:bg-brand/[0.05]"
                >
                  <input
                    type="radio"
                    name="method"
                    value={c.key}
                    checked={methodKey === c.key}
                    onChange={() => setMethodKey(c.key)}
                    className="h-4 w-4 shrink-0 accent-brand"
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    {c.kind === "card" ? <Icon.Card className="h-5 w-5" /> : <Icon.Bank className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">{c.label}</span>
                    <span className="block text-xs text-muted">{c.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <Icon.ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Review top-up <Icon.ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          {pay.error && (
            <Alert tone="danger" className="mb-5" title="Your payment didn't go through">
              {pay.error.message} Nothing was charged. You can try again, or choose another way to pay.
            </Alert>
          )}
          <dl className="divide-y divide-line rounded-lg border border-line text-[13px]">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">Amount</dt>
              <dd className="font-bold text-ink tabular-nums">{money(amountCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">Goes to</dt>
              <dd className="text-right text-ink">
                {split
                  ? Object.entries(allocation)
                      .filter(([, raw]) => raw.trim() && parseRand(raw) > 0)
                      .map(([s, raw]) => `${SUITE_BY_ID[s as SuiteId].name} ${money(randToCents(parseRand(raw)))}`)
                      .join(" · ")
                  : "Shared wallet, any product"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">Pay with</dt>
              <dd className="text-right text-ink">{method.label}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">Balance after top-up</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {method.kind === "eft" ? "Once your transfer clears" : money(wallet.balanceCents + amountCents)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Credits don&apos;t expire and are used at your contracted rates. A VAT invoice for this top-up is added to your next
            statement.
          </p>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={pay.isPending}>
              <Icon.ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={submitPayment} loading={pay.isPending}>
              {pay.isPending
                ? "Confirming your payment…"
                : method.kind === "eft"
                  ? "Get payment reference"
                  : `Pay ${money(amountCents)}`}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
