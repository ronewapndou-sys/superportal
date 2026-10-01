"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icons";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  cx,
  ErrorState,
  Field,
  PendingState,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { DecisionCard, refreshAfterDecision, useProductActions } from "@/components/intelligence/intelligence";
import { useBillingSummary, useOrg, useTickets } from "@/lib/api/queries";
import type { Business, ProductDecision, SuiteId } from "@/lib/api/types";
import { useAccess } from "@/lib/use-access";
import { ago } from "@/lib/format";
import { BUSINESSES, SUITE_BY_ID, suiteIdsFor } from "@/lib/suites";

const VOLUMES = [
  "Under 100",
  "100 to 1 000",
  "1 000 to 10 000",
  "Over 10 000",
] as const;

const schema = z.object({
  suites: z
    .array(z.string())
    .min(1, "Choose at least one product to ask about."),
  volume: z.enum(
    VOLUMES,
    "Choose a rough monthly volume so your account manager can quote.",
  ),
  note: z.string().trim().max(1000, "Keep the note under 1 000 characters."),
});
type Values = z.infer<typeof schema>;

type Result = { suite: SuiteId; decision?: ProductDecision; error?: string };

/**
 * Ask for products the division doesn't have yet. Each request is decided straight away by the account model:
 * approved (switched on now), approved with conditions, sent to a specialist with the assessment attached, or not
 * yet, with what would change that. Products already waiting on a specialist show as pending.
 */
export function RequestProducts({ business }: { business: Business }) {
  const qc = useQueryClient();
  const billing = useBillingSummary();
  const tickets = useTickets();
  const org = useOrg();
  const division = useAccess().branch;
  const actions = useProductActions();
  const [reviewed, setReviewed] = useState<Record<string, ProductDecision>>({});
  const biz = BUSINESSES[business];
  const ids = suiteIdsFor(business);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { suites: [], note: "" },
  });
  const selected = useWatch({ control, name: "suites" }) ?? [];

  const send = useMutation({
    mutationFn: async (v: Values): Promise<Result[]> => {
      const settled = await Promise.allSettled(
        (v.suites as SuiteId[]).map((s) =>
          actions.request(s, v.note, v.volume),
        ),
      );
      return settled.map((r, i) => {
        const suite = v.suites[i] as SuiteId;
        return r.status === "fulfilled"
          ? { suite, decision: r.value }
          : { suite, error: (r.reason as Error).message };
      });
    },
    onSuccess: () => refreshAfterDecision(qc),
  });

  if (billing.isPending) {
    return (
      <Card>
        <PendingState label="Checking which products you can add…" />
      </Card>
    );
  }
  if (billing.isError) {
    return (
      <Card>
        <ErrorState
          message="Couldn't load the products you can add."
          onRetry={() => billing.refetch()}
        />
      </Card>
    );
  }

  const available = division
    ? ids.filter((id) => !division.products.includes(id))
    : billing.data.subscriptions.filter((s) => s.status === "not_subscribed" && ids.includes(s.suite)).map((s) => s.suite);
  const pendingFor = (suite: SuiteId) =>
    tickets.data?.find(
      (t) =>
        t.suite === suite && t.category === "access" && t.status !== "resolved",
    );
  const requestable = available.filter((s) => !pendingFor(s));
  const manager = org.data?.accountManager.name ?? "Your account manager";

  if (available.length === 0) {
    return (
      <Card className="flex flex-col gap-2 p-5 md:p-6">
        <h2 className="text-section font-semibold tracking-[-0.3px] text-ink">
          Request a new product
        </h2>
        <p className="text-[13px] text-muted">
          {division ? `${division.name} already has every ${biz.name} product.` : `Your organisation already has every ${biz.name} product.`} Switch to{" "}
          {business === "xds" ? "MIE" : "XDS"} at the top to see what else is
          available.
        </p>
      </Card>
    );
  }

  const decided = send.data?.filter((r) => r.decision) ?? [];
  const failed = send.data?.filter((r) => r.error) ?? [];

  if (send.isSuccess && decided.length > 0) {
    return (
      <Card className="space-y-5 p-5 md:p-6">
        <CardHeader
          title={decided.length === 1 ? "Here's the decision" : `Here are the ${decided.length} decisions`}
          description="Each request was checked against your account straight away. Approved products are switched on now. Where there are terms, nothing switches on until you agree to them."
        />
        {failed.length > 0 && <Alert tone="danger">{failed.map((r) => r.error).join(" ")}</Alert>}
        <div className="space-y-4">
          {decided.map((r) => {
            const d = reviewed[r.decision!.reference] ?? r.decision!;
            return <DecisionCard key={d.reference} decision={d} onChange={(nd) => setReviewed((x) => ({ ...x, [nd.reference]: nd }))} />;
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset({ suites: [], note: "" });
            send.reset();
            setReviewed({});
          }}
        >
          Request another product
        </Button>
      </Card>
    );
  }

  function toggle(s: SuiteId) {
    const next = selected.includes(s)
      ? selected.filter((x) => x !== s)
      : [...selected, s];
    setValue("suites", next, {
      shouldValidate: selected.length > 0 || !!errors.suites,
    });
  }

  return (
    <Card className="p-5 md:p-6" aria-labelledby="request-products-heading">
      <CardHeader
        id="request-products-heading"
        title="Request a new product"
        description={`Ask for ${biz.name} products ${division ? division.name : "your organisation"} doesn't have yet. We check your account straight away, and most requests are decided on the spot.`}
      />

      <form
        noValidate
        className="mt-6"
        onSubmit={handleSubmit(
          (v) => send.mutate(v),
          () =>
            requestAnimationFrame(() =>
              document
                .querySelector(
                  '#request-products-heading ~ form [role="alert"]',
                )
                ?.scrollIntoView({ behavior: "smooth", block: "center" }),
            ),
        )}
      >
        <fieldset disabled={send.isPending} className="space-y-5">
          {failed.length > 0 && (
            <Alert tone="danger">{failed.map((r) => r.error).join(" ")}</Alert>
          )}

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink">
              Products{" "}
              <span aria-hidden className="text-brand">
                *
              </span>
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((s) => {
                const suite = SUITE_BY_ID[s];
                const pending = pendingFor(s);
                const checked = selected.includes(s);
                return (
                  <label
                    key={s}
                    className={cx(
                      "flex min-h-11 items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                      pending
                        ? "cursor-not-allowed border-line bg-surface-2/60"
                        : "cursor-pointer border-field-line bg-surface hover:border-brand/40 has-checked:border-brand has-checked:bg-brand/[0.04]",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand disabled:opacity-50"
                      checked={checked}
                      disabled={!!pending}
                      onChange={() => toggle(s)}
                      aria-describedby={`req-${s}-desc`}
                    />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-ink">
                        {suite.name}
                      </span>
                      <span
                        id={`req-${s}-desc`}
                        className="mt-0.5 block text-[13px] leading-snug text-muted"
                      >
                        {pending ? (
                          <>
                            Requested {ago(pending.createdAt).toLowerCase()} in{" "}
                            <Link
                              href={`/support/${pending.key}`}
                              className="font-semibold text-brand hover:underline dark:text-kw"
                            >
                              {pending.key}
                            </Link>
                            . Waiting for a reply.
                          </>
                        ) : (
                          suite.description
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.suites && (
              <p
                role="alert"
                className="mt-1.5 text-xs font-medium text-danger"
              >
                {errors.suites.message}
              </p>
            )}
          </fieldset>

          {requestable.length === 0 ? (
            <p className="text-[13px] text-muted">
              Every {biz.name} product you can add has already been requested.{" "}
              {manager} will reply on the ticket.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_1fr]">
                <Field
                  label="Expected volume a month"
                  required
                  error={errors.volume?.message}
                >
                  <Select
                    aria-invalid={!!errors.volume}
                    defaultValue=""
                    {...register("volume")}
                  >
                    <option value="" disabled>
                      Choose a range
                    </option>
                    {VOLUMES.map((v) => (
                      <option key={v} value={v}>
                        {v} checks
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="What would you use it for?"
                  hint="Optional. A sentence or two helps with pricing."
                  error={errors.note?.message}
                >
                  <Textarea
                    rows={2}
                    maxLength={1000}
                    aria-invalid={!!errors.note}
                    placeholder="e.g. Screening 40 new division staff each quarter"
                    {...register("note")}
                  />
                </Field>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Icon.Info className="h-4 w-4 shrink-0" />
                  Approved products switch on straight away and are billed per enquiry. You only pay for what you use.
                </p>
                <Button type="submit" loading={send.isPending}>
                  {selected.length > 1
                    ? `Request ${selected.length} products`
                    : "Request product"}
                </Button>
              </div>
            </>
          )}
        </fieldset>
      </form>
    </Card>
  );
}
