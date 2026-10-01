import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DecisionCard, refreshAfterDecision, useProductActions } from '@/components/intelligence/intelligence';
import { useRecommendations } from '@/lib/api/queries';
import type { ProductDecision, RecommendationPreview, SuiteId } from '@/lib/api/types';
import { SUITE_BY_ID } from '@/lib/suites';
import { useAccess } from '@/lib/use-access';

const PREVIEW: Record<RecommendationPreview, { label: string; tone: string }> = {
  pre_approved: { label: 'Pre-approved', tone: 'green' },
  terms: { label: 'Terms to agree', tone: 'amber' },
  quick_review: { label: 'Quick review', tone: 'grey' },
  not_yet: { label: 'Not yet', tone: 'red' },
};

/** Sends a request for a product and keeps the decision, so the chat can walk the client through it. */
function useDecide() {
  const qc = useQueryClient();
  const actions = useProductActions();
  const [decision, setDecision] = useState<ProductDecision | null>(null);
  const request = useMutation({
    mutationFn: (suite: string) => actions.request(suite, 'Asked through the assistant.'),
    onSuccess: (d) => {
      setDecision(d);
      refreshAfterDecision(qc);
    },
  });
  return { decision, setDecision, request };
}

/** The decision, in the chat. When there are terms, they are put to the client here too: nothing switches on until they agree. */
function Decision({ d, onChange }: { d: ProductDecision; onChange: (d: ProductDecision) => void }) {
  const offer = d.outcome === 'terms_offered' && !d.activated && !d.declined;
  return (
    <div className="pm">
      {offer && <p>I can add it, on terms. Choose how you'd like to start and agree, talk it through with a person, or leave it for now.</p>}
      <DecisionCard compact decision={d} onChange={onChange} />
    </div>
  );
}

/** "What should I add?": the top suggestions for the division you are working in, each one tap from a decision. */
export function AdviceMessage() {
  const { data, isPending } = useRecommendations();
  const who = useAccess().branch?.name ?? 'your account';
  const { decision, setDecision, request } = useDecide();

  if (decision) return <Decision d={decision} onChange={setDecision} />;
  if (isPending) return <p>Looking at how {who} uses Mettus…</p>;
  if (!data || data.length === 0) return <p>Nothing to suggest right now. {who} already uses the products its activity points to.</p>;

  return (
    <div className="pm">
      <p>Going by last month's activity at {who}, these fit best:</p>
      <ul className="pm-list">
        {data.slice(0, 3).map((r) => (
          <li key={r.suite}>
            <div className="pm-row">
              <strong>{SUITE_BY_ID[r.suite].name}</strong>
              <span className={`pill ${PREVIEW[r.preview].tone}`}>{PREVIEW[r.preview].label}</span>
            </div>
            <p>{r.headline}. {r.reasons[0]}</p>
            <p className="muted">{r.benefit}</p>
            {request.error && request.variables === r.suite && <p className="pm-err">{request.error.message}</p>}
            <div className="pm-actions">
              <button type="button" className="btn primary" disabled={request.isPending} onClick={() => request.mutate(r.suite)}>
                {request.isPending && request.variables === r.suite ? 'Checking…' : 'Add it'}
              </button>
              <Link to={`/products/${r.suite}`}>Learn more</Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="muted">I check your account first. If there are terms, I'll go through them with you, and nothing switches on until you agree.</p>
    </div>
  );
}

/** "Add <product>": confirm, then decide. */
export function ProductRequestMessage({ suite }: { suite: SuiteId }) {
  const s = SUITE_BY_ID[suite];
  const division = useAccess().branch;
  const { decision, setDecision, request } = useDecide();

  if (decision) return <Decision d={decision} onChange={setDecision} />;
  return (
    <div className="pm">
      <p>
        You'd like <strong>{s.name}</strong>{division ? <> at <strong>{division.name}</strong></> : null}. I'll check your account now. If there are terms, I'll go through them with you first.
      </p>
      {request.error && <p className="pm-err">{request.error.message}</p>}
      <div className="pm-actions">
        <button type="button" className="btn primary" disabled={request.isPending} onClick={() => request.mutate(suite)}>
          {request.isPending ? 'Checking your account…' : 'Check and add it'}
        </button>
      </div>
    </div>
  );
}
