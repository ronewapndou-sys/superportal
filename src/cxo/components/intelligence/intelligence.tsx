"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/overlay";
import { Alert, Button, buttonClass, Card, cx, ErrorState, PendingState, Pill, type Tone } from "@/components/ui/primitives";
import { orgApi } from "@/lib/api/endpoints";
import { qk, useBranches, useOffers, useRecommendations } from "@/lib/api/queries";
import type { DecisionAssessment, DecisionOutcome, ProductDecision, RecommendationPreview, StandingFactor } from "@/lib/api/types";
import { SUITE_BY_ID } from "@/lib/suites";
import { useAccess } from "@/lib/use-access";
import { useDivisionId } from "@/lib/use-division";
import { useAuth } from "../../../auth/AuthContext";
import { useTickets } from "../../../tickets/TicketsContext";

/*
 * Product requests are decided by the Mettus account model (see lib/api/mocks/risk.ts). Clients are told the outcome,
 * what to do about it, and nothing about the scoring behind it. Anything that comes with terms is put to the client
 * as an offer: they choose how to start, agree, ask a person, or say not now, and nothing switches on until they agree.
 * The score, the factors and the thresholds are internal: they go to the support ticket for Mettus staff
 * (AssessmentPanel) and they are what lets most requests go through without anyone being involved.
 */

export const OUTCOME: Record<DecisionOutcome, { label: string; tone: Tone }> = {
  approved: { label: "Approved", tone: "success" },
  terms_offered: { label: "Terms to agree", tone: "warning" },
  referred: { label: "With a specialist", tone: "info" },
  not_yet: { label: "Not yet", tone: "danger" },
};

const PREVIEW: Record<RecommendationPreview, { label: string; tone: Tone }> = {
  pre_approved: { label: "Pre-approved", tone: "success" },
  terms: { label: "Terms to agree", tone: "warning" },
  quick_review: { label: "Quick review", tone: "info" },
  not_yet: { label: "Not yet", tone: "danger" },
};

/** After a decision changes what a division can open, everything that shows products or billing refreshes. */
export function refreshAfterDecision(qc: QueryClient) {
  for (const key of [qk.branches, qk.org, qk.billing, qk.dashboard, qk.tickets, qk.notifications, ["intelligence"]]) {
    void qc.invalidateQueries({ queryKey: key as readonly unknown[] });
  }
}

/**
 * Ask for a product, agree or turn down an offer, or ask a person to look at a decision. A referral becomes a ticket on
 * the support desk with the assessment attached for staff. The ticket text the client can read says only that an
 * automated check referred it.
 */
export function useProductActions() {
  const { createTicket } = useTickets();
  const division = useDivisionId();
  const divisionName = useBranches().data?.find((d) => d.id === division)?.name;

  const openTicket = (d: ProductDecision, note: string | undefined, volume: string | undefined, why: string): ProductDecision => {
    const suite = SUITE_BY_ID[d.suite];
    const ticket = createTicket({
      subject: `Access request: ${suite.name}${divisionName ? ` (${divisionName})` : ""}`,
      company: suite.business === "mie" ? "MIE" : "XDS",
      area: "Access request",
      priority: "Normal",
      description: [note || `We'd like to add ${suite.name}.`, volume && `Expected volume: ${volume} a month.`, `Automated check ${d.reference}: ${why}`].filter(Boolean).join("\n\n"),
      assessment: d.handoff,
    });
    return { ...d, ticketKey: ticket.id, handoff: undefined };
  };

  return {
    request: async (suite: string, note?: string, volume?: string): Promise<ProductDecision> => {
      const d = await orgApi.requestSuiteAccess(suite, note ?? "", volume, division);
      return d.outcome === "referred" ? openTicket(d, note, volume, "a specialist will review it.") : d;
    },
    review: async (d: ProductDecision): Promise<ProductDecision> => {
      const full = await orgApi.askForReview(d.reference);
      return openTicket(full, undefined, undefined, d.outcome === "terms_offered" ? "the client wants to talk through the terms." : "the client asked for a person to review it.");
    },
    accept: (d: ProductDecision, option?: string) => orgApi.acceptTerms(d.reference, option),
    decline: (d: ProductDecision) => orgApi.declineTerms(d.reference),
  };
}

type Busy = { accepting?: boolean; reviewing?: boolean; declining?: boolean };

/** One decision, as the client sees it: the outcome, a plain sentence, and what to do. Nothing about the scoring. */
export function DecisionPanel({
  decision,
  compact = false,
  option = "",
  onOption,
  onAccept,
  onReview,
  onDecline,
  busy = {},
}: {
  decision: ProductDecision;
  compact?: boolean;
  option?: string;
  onOption?: (id: string) => void;
  onAccept?: () => void;
  onReview?: () => void;
  onDecline?: () => void;
  busy?: Busy;
}) {
  const o = decision.declined ? { label: "Turned down", tone: "neutral" as Tone } : OUTCOME[decision.outcome];
  const isOffer = decision.outcome === "terms_offered" && !decision.activated && !decision.declined;
  const needsChoice = decision.options.length > 0;

  return (
    <div className={cx("rounded-2xl border border-line bg-surface", compact ? "p-3.5" : "p-5")}>
      <Pill tone={o.tone}>{o.label}</Pill>
      <h3 className="mt-2.5 text-[16px] leading-snug font-semibold text-ink">{decision.headline}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{decision.declined ? "You turned this down, so nothing was switched on. You can ask for it again any time." : decision.summary}</p>

      {isOffer && needsChoice && (
        <div className="mt-4" role="radiogroup" aria-label="How would you like to start?">
          <h4 className="text-[13px] font-semibold text-ink">How would you like to start?</h4>
          <div className="mt-2 space-y-2">
            {decision.options.map((opt) => {
              const on = option === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onOption?.(opt.id)}
                  className={cx("w-full rounded-xl border px-3.5 py-3 text-left transition-colors", on ? "border-brand bg-brand/[0.06]" : "border-line hover:border-field-line")}
                >
                  <span className="block text-[13px] font-semibold text-ink">{opt.label}</span>
                  <span className="mt-1 block space-y-0.5 text-xs leading-snug text-muted">
                    {opt.detail.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOffer && decision.terms.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[13px] font-semibold text-ink">{needsChoice ? "You also agree to" : "The terms"}</h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-ink">
            {decision.terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {decision.agreed && decision.agreed.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[13px] font-semibold text-ink">What you agreed</h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-muted">
            {decision.agreed.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {decision.nextSteps.length > 0 && !decision.declined && (
        <div className="mt-4">
          <h4 className="text-[13px] font-semibold text-ink">What happens next</h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-ink">
            {decision.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {isOffer && <p className="mt-4 text-xs text-muted">The offer stays open for 7 days. Nothing is switched on, or charged, until you agree.</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-muted">Reference {decision.reference}. Automated check; a person can review it.</p>
        <div className="flex flex-wrap items-center gap-2">
          {isOffer ? (
            <>
              <Button size="sm" loading={busy.accepting} disabled={needsChoice && !option} onClick={onAccept}>
                Agree and switch on
              </Button>
              {onReview && (
                <Button variant="secondary" size="sm" loading={busy.reviewing} onClick={onReview}>
                  Talk to a person
                </Button>
              )}
              {onDecline && (
                <Button variant="ghost" size="sm" loading={busy.declining} onClick={onDecline}>
                  Not now
                </Button>
              )}
            </>
          ) : decision.ticketKey ? (
            <Link href={`/support/tickets?id=${decision.ticketKey}`} className={buttonClass("secondary", "sm")}>
              View {decision.ticketKey}
            </Link>
          ) : decision.activated ? (
            <Link href={`/products/${decision.suite}`} className={buttonClass("secondary", "sm")}>
              Open {SUITE_BY_ID[decision.suite].name}
            </Link>
          ) : onReview && decision.outcome === "not_yet" && !decision.declined ? (
            <Button variant="secondary" size="sm" loading={busy.reviewing} onClick={onReview}>
              Ask a person to review this
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * A decision with everything the client can do about it wired up: choose how to start, agree, talk to a person or
 * say not now. It reports every change so the screen showing it can keep the latest version.
 */
export function DecisionCard({ decision, onChange, compact }: { decision: ProductDecision; onChange: (d: ProductDecision) => void; compact?: boolean }) {
  const qc = useQueryClient();
  const actions = useProductActions();
  const [option, setOption] = useState("");
  const settle = (d: ProductDecision) => {
    onChange(d);
    refreshAfterDecision(qc);
  };
  const accept = useMutation({ mutationFn: () => actions.accept(decision, option || undefined), onSuccess: settle });
  const review = useMutation({ mutationFn: () => actions.review(decision), onSuccess: settle });
  const decline = useMutation({ mutationFn: () => actions.decline(decision), onSuccess: settle });
  const error = accept.error ?? review.error ?? decline.error;

  return (
    <div className="space-y-2">
      <DecisionPanel
        decision={decision}
        compact={compact}
        option={option}
        onOption={setOption}
        onAccept={() => accept.mutate()}
        onReview={() => review.mutate()}
        onDecline={() => decline.mutate()}
        busy={{ accepting: accept.isPending, reviewing: review.isPending, declining: decline.isPending }}
      />
      {error && <Alert tone="danger">{error.message}</Alert>}
    </div>
  );
}

/** Terms the client has been offered and has not answered yet. They wait here until they agree or turn them down. */
export function PendingOffers() {
  const { data } = useOffers();
  const [seen, setSeen] = useState<Record<string, ProductDecision>>({});

  // keep an offer on screen after it is answered, so the client sees what they agreed
  useEffect(() => {
    if (!data?.length) return;
    setSeen((s) => {
      const next = { ...s };
      for (const d of data) next[d.reference] ??= d;
      return next;
    });
  }, [data]);

  const list = Object.values(seen);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="offers-heading" className="space-y-4">
      <div>
        <h2 id="offers-heading" className="text-section font-semibold tracking-[-0.3px] text-ink">
          Terms waiting for your answer
        </h2>
        <p className="mt-1 text-[13px] text-muted">We can add these. Read the terms, and tell us if you agree. Nothing switches on until you do.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {list.map((d) => (
          <div key={d.reference}>
            <p className="mb-2 text-[14px] font-semibold text-ink">{SUITE_BY_ID[d.suite].name}</p>
            <DecisionCard decision={d} onChange={(nd) => setSeen((s) => ({ ...s, [nd.reference]: nd }))} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Products suggested from how this division actually uses Mettus, each with what the decision would be today. */
export function Recommendations({ limit, title = "Recommended for you" }: { limit?: number; title?: string }) {
  const qc = useQueryClient();
  const access = useAccess();
  const actions = useProductActions();
  const { data, isPending, isError, refetch } = useRecommendations();
  const [result, setResult] = useState<ProductDecision | null>(null);
  const who = access.branch?.name ?? "your account";

  const add = useMutation({
    mutationFn: (suite: string) => actions.request(suite, "Suggested from our usage."),
    onSuccess: (d) => {
      setResult(d);
      refreshAfterDecision(qc);
    },
  });

  const list = (data ?? []).slice(0, limit);

  return (
    <section aria-labelledby="recommended-heading" className="space-y-4">
      <div>
        <h2 id="recommended-heading" className="text-section font-semibold tracking-[-0.3px] text-ink">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-muted">Suggested from how {who} uses Mettus. Most can be added in a moment.</p>
      </div>

      {add.error && <Alert tone="danger">{add.error.message}</Alert>}

      {isPending ? (
        <Card>
          <PendingState label={`Looking at how ${who} uses Mettus…`} />
        </Card>
      ) : isError ? (
        <Card>
          <ErrorState message="Couldn't work out suggestions." onRetry={() => refetch()} />
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-5 text-[13px] text-muted">Nothing to suggest right now. {who} already uses the products its activity points to.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((r) => {
            const suite = SUITE_BY_ID[r.suite];
            const p = PREVIEW[r.preview];
            return (
              <Card key={r.suite} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{suite.category}</p>
                    <h3 className="text-[16px] font-semibold text-ink">{suite.name}</h3>
                  </div>
                  <Pill tone={p.tone}>{p.label}</Pill>
                </div>
                <p className="mt-3 text-[14px] font-semibold text-ink">{r.headline}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-muted">
                  {r.reasons.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] leading-relaxed text-ink">
                  <span className="font-semibold">What it does for you: </span>
                  {r.benefit}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  <Button size="sm" loading={add.isPending && add.variables === r.suite} onClick={() => add.mutate(r.suite)}>
                    Add to {access.branch?.name ?? "my account"}
                  </Button>
                  <Link href={`/products/${r.suite}`} className="text-[13px] font-semibold text-brand hover:underline dark:text-kw">
                    Learn more
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!result}
        onClose={() => setResult(null)}
        size="lg"
        title={result ? SUITE_BY_ID[result.suite].name : "Decision"}
        description="Checked against your account."
        footer={
          <Button variant="secondary" onClick={() => setResult(null)}>
            Close
          </Button>
        }
      >
        {result && <DecisionCard decision={result} onChange={setResult} />}
      </Dialog>
    </section>
  );
}

/* ------------------------------------------------------------ Support staff only */

const bandOf = (s: number): { label: string; tone: Tone } => (s >= 85 ? { label: "Strong", tone: "success" } : s >= 72 ? { label: "Good", tone: "success" } : s >= 58 ? { label: "Fair", tone: "warning" } : { label: "Watch", tone: "danger" });

function FactorRow({ f }: { f: StandingFactor }) {
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">
          {f.label} <span className="font-normal text-muted">({f.weight}%)</span>
        </p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{f.detail}</p>
      </div>
      <p className="text-[13px] font-semibold tabular-nums text-ink">{f.score}</p>
      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${f.label}: ${f.score} out of 100`}>
        <div className={cx("h-full rounded-full", f.effect === "hurts" ? "bg-danger" : "bg-brand")} style={{ width: `${f.score}%` }} />
      </div>
    </li>
  );
}

/**
 * Shown to Mettus support on a ticket raised by the decision engine. It carries the score, the factors behind it, what
 * the model suggests, and a way to approve. Approving puts the terms to the client to agree. Clients never see this.
 */
export function AssessmentPanel({ assessment: a, ticketId, resolved }: { assessment: DecisionAssessment; ticketId: string; resolved: boolean }) {
  const qc = useQueryClient();
  const { reply, setStatus } = useTickets();
  const { user } = useAuth();
  const divisionName = useBranches().data?.find((d) => d.id === a.divisionId)?.name;
  const suite = SUITE_BY_ID[a.suite];
  const [done, setDone] = useState<"offered" | "on" | null>(null);
  const band = bandOf(a.score);
  const o = OUTCOME[a.outcome];
  const gap = a.required - a.score;
  const hasTerms = a.options.length > 0 || a.conditions.length > 0;
  const where = divisionName ? ` for ${divisionName}` : "";

  const approve = useMutation({
    mutationFn: () => orgApi.approveAsAgent(a.suite, a.divisionId, user?.name ?? "Mettus support", { conditions: a.conditions, options: a.options }),
    onSuccess: (r) => {
      if (r.offered) {
        reply(ticketId, `We've approved ${suite.name}${where} in principle. Please open Products, read the terms we're offering, and tell us if you agree. Nothing switches on until you do.`);
        setDone("offered");
      } else {
        reply(ticketId, `Good news: ${suite.name} is approved${where} and switched on now.`);
        setStatus(ticketId, "resolved");
        setDone("on");
      }
      refreshAfterDecision(qc);
    },
  });

  const suggestion =
    a.outcome === "referred"
      ? `Referred, not declined: the score is ${gap > 0 ? `${gap} below` : "at"} the ${a.required} this ${a.tier} product needs${a.blockers.length ? ", and a hard stop applies" : ""}. A reasonable call is to approve and put the terms below to the client.`
      : a.outcome === "not_yet"
        ? "Held by a hard stop or a large gap to the threshold. Approve only if the account manager is comfortable."
        : a.outcome === "terms_offered"
          ? "The model offered the client terms on its own. Nothing to do unless they ask to talk them through."
          : "The model approved this on its own. Nothing to do.";

  return (
    <details open className="mx-5 mt-4 rounded-xl border border-line bg-surface-2/50 p-4 text-[13px]">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-semibold text-ink">
        Account assessment (internal, the client does not see this)
        <Pill tone={o.tone}>{o.label}</Pill>
      </summary>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-ink">
          Score <span className="text-[20px] font-bold tabular-nums">{a.score}</span> of 100 <Pill tone={band.tone}>{band.label}</Pill>
        </p>
        <p className="text-muted">
          Needs {a.required} ({a.tier} product). {divisionName ?? "Whole client"}. {a.modelVersion}. {a.reference}.
        </p>
      </div>
      <p className="mt-2 leading-relaxed text-ink">{suggestion}</p>

      {a.blockers.length > 0 && <p className="mt-2 text-danger">Hard stop: {a.blockers.join(" ")}</p>}

      <ul className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
        {a.factors.map((f) => (
          <FactorRow key={f.id} f={f} />
        ))}
      </ul>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="font-semibold text-ink">Why the model decided this</h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted">
            {a.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-ink">{hasTerms ? "Terms it would put to the client" : "To move the account"}</h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted">
            {hasTerms
              ? [...a.options.map((x) => `Choice: ${x.label}. ${x.detail.join(" ")}`), ...a.conditions].map((c) => <li key={c}>{c}</li>)
              : a.tips.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      </div>

      {!a.activated && !resolved && !done && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate()}>
            {hasTerms ? "Approve and offer these terms" : "Approve and switch on"}
          </Button>
          <p className="text-xs text-muted">
            {hasTerms ? `Tells the client ${suite.name} is approved in principle. It switches on only when they agree the terms.` : `Switches ${suite.name} on${where}, tells the client, and resolves this ticket.`}
          </p>
        </div>
      )}
      {approve.error && <p className="mt-2 text-danger">{approve.error.message}</p>}
      {done === "offered" && <p className="mt-4 border-t border-line pt-4 font-semibold text-ink">Terms sent to the client. It switches on when they agree.</p>}
      {done === "on" && <p className="mt-4 border-t border-line pt-4 font-semibold text-ink">Approved and switched on. The client has been told.</p>}
    </details>
  );
}
