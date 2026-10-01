import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useTickets } from '../../tickets/TicketsContext';
import { Pill } from '../../ui';
import './home.css';

const PLATFORM_ATTENTION = [
  { tone: 'amber' as const, label: 'Degraded', text: 'Realtime IDV responses are slow (INC-2291, 14 clients affected)', to: '/monitoring/platform' },
  { tone: 'grey' as const, label: 'Maintenance', text: 'MIE client portal is in planned maintenance', to: '/monitoring/platform' },
  { tone: 'red' as const, label: 'At risk', text: 'Vantage Telecom: 7.8% of calls failed in the last 24 hours', to: '/monitoring/platform' },
];

const CLIENT_ATTENTION = [
  { tone: 'red' as const, label: 'Error', text: 'Monitoring triggers are failing: your endpoint returned 503', to: '/support/integrations' },
  { tone: 'amber' as const, label: 'Needs attention', text: 'XDS Connect UAT refused calls from a new server address', to: '/support/integrations' },
  { tone: 'amber' as const, label: 'Degraded', text: 'Realtime IDV is slow at Mettus (INC-2291)', to: '/monitoring' },
  { tone: 'red' as const, label: 'Locked', text: 'API user svc_collections_old is locked', to: '/support/api' },
  { tone: 'amber' as const, label: 'Expiring', text: "svc_onboarding_prod's password expires in 5 days", to: '/support/api' },
];

/** Shown at the top of Home when someone was sent back from a page their account doesn't include. */
export function AccessDeniedBanner() {
  const denied = (useLocation().state as { denied?: string } | null)?.denied;
  if (!denied) return null;
  return (
    <div className="banner" role="alert" style={{ marginBottom: 20 }}>
      <span className="banner-icon" aria-hidden="true">!</span>
      <div className="grow">
        <div className="banner-title">{denied} isn't on your account</div>
        <div className="banner-text">Ask your organisation's administrator for access.</div>
      </div>
    </div>
  );
}

/** Things to act on: ticket replies, integration and API problems, incidents. Sits below the main content on the client and staff Home. */
export function AttentionCard({ flush = false }: { flush?: boolean }) {
  const { can } = useAuth();
  const { tickets, audience } = useTickets();
  const ticketItems = tickets
    .filter((t) => (audience === 'agent' ? t.status === 'open' : t.status === 'waiting-client'))
    .map((t) => ({
      tone: 'red' as const,
      label: audience === 'agent' ? 'New ticket' : 'Needs your reply',
      text: `${t.id}: ${t.subject}`,
      to: `${audience === 'agent' ? '/support/desk' : '/support/tickets'}?id=${t.id}`,
    }));
  const attention = [...ticketItems, ...(can('platform-health') ? PLATFORM_ATTENTION : can('support') ? CLIENT_ATTENTION : [])];

  if (attention.length === 0) return null;
  return (
    <section className="card attention-card" style={flush ? { marginTop: 0 } : undefined}>
      <div className="card-head">
        <div className="card-title">
          <h2>Needs your attention</h2>
          <span className="card-sub">{can('platform-health') ? 'From the support desk and platform health.' : 'From your support tickets, integrations and API.'}</span>
        </div>
      </div>
      <ul className="attention">
        {attention.map((a) => (
          <li key={a.text}>
            <Pill tone={a.tone}>{a.label}</Pill>
            <span className="grow">{a.text}</span>
            <Link className="btn" to={a.to}>Review</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

