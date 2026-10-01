import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../shell/PageHeader';
import { useTickets } from '../tickets/TicketsContext';
import { Pill, useModal, useToast } from '../ui';
import { SUBMITTED_KEY } from './InviteeForm';

/*
 * Shown to a client after onboarding: what they signed up to, and how to terminate services.
 * A termination request is sent to support as a ticket and takes effect after the notice period.
 */

const SERVICES = [
  { id: 15, name: 'Consumer Credit Enquiry', area: 'Credit' },
  { id: 194, name: 'DOVS', area: 'Identity' },
  { id: 153, name: 'Realtime IDV', area: 'Identity' },
  { id: 2, name: 'Consumer Trace', area: 'Tracing' },
  { id: 12, name: 'Business Enquiry', area: 'Commercial' },
];
const NOTICE_DAYS = 30;
const REASONS = ['No longer need the service', 'Moving to another provider', 'Cost', 'Closing the business', 'Something else'];

type Termination = { id: string; ids: number[]; all: boolean; effective: number; reason: string; ticket: string; status: 'pending' | 'cancelled' };
const key = (uid?: string) => `mettus-central-terminations:${uid}`;
const load = (uid?: string): Termination[] => {
  try { return JSON.parse(localStorage.getItem(key(uid)) ?? '[]'); } catch { return []; }
};
const day = (t: number) => new Date(t).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

/** `embedded`: rendered inside another page (Products, for an already-onboarded client), which has its own PageHeader. */
export function ServicesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const toast = useToast();
  const modal = useModal();
  const { createTicket } = useTickets();
  const [terms, setTerms] = useState<Termination[]>(() => load(user?.id));

  const submitted = (() => {
    try { return JSON.parse(localStorage.getItem(`${SUBMITTED_KEY}:${user?.id}`) ?? 'null') as { ref: string; legalName: string; contact: string; email: string; at: number } | null; } catch { return null; }
  })();
  const org = submitted?.legalName ?? 'ABSA';
  // Only the existing ABSA account has XDS Connect call history; a client invited live during a demo has none yet.
  const hasLegacyServices = user?.id === 'admin';
  const save = (next: Termination[]) => {
    setTerms(next);
    try { localStorage.setItem(key(user?.id), JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const pending = terms.filter((t) => t.status === 'pending');
  const ending = (id: number) => pending.find((t) => t.all || t.ids.includes(id));

  const terminate = (preselect?: number) =>
    modal.open({
      title: 'Terminate services',
      body: (
        <>
          <p className="muted">Choose what to end. Termination takes effect after a {NOTICE_DAYS}-day notice period, on {day(Date.now() + NOTICE_DAYS * 864e5)}. You can cancel the request before then.</p>
          <div className="form-row">
            <label>Services to terminate</label>
            {SERVICES.filter((s) => !ending(s.id)).map((s) => (
              <label key={s.id} className="check"><input type="checkbox" name="svc" value={s.id} defaultChecked={s.id === preselect} /> {s.name} (Product ID {s.id})</label>
            ))}
            <label className="check"><input type="checkbox" name="all" /> Terminate all services and close the account</label>
          </div>
          <div className="form-row">
            <label htmlFor="tr-why">Reason</label>
            <select className="field" id="tr-why" name="reason">{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <div className="form-row">
            <label htmlFor="tr-confirm">Type <strong>{org}</strong> to confirm</label>
            <input className="field" id="tr-confirm" name="confirm" autoComplete="off" />
          </div>
        </>
      ),
      actions: [
        { label: 'Keep my services' },
        {
          label: 'Request termination',
          kind: 'danger',
          onClick: (form, formEl) => {
            const all = form.get('all') === 'on';
            const ids = form.getAll('svc').map(Number);
            if (!all && ids.length === 0) { toast('Choose at least one service to terminate.'); return false; }
            if (String(form.get('confirm') ?? '').trim().toLowerCase() !== org.toLowerCase()) {
              formEl.querySelector<HTMLInputElement>('#tr-confirm')?.classList.add('invalid');
              toast(`Type ${org} exactly to confirm.`);
              return false;
            }
            const names = all ? 'all services and the account' : SERVICES.filter((s) => ids.includes(s.id)).map((s) => s.name).join(', ');
            const reason = String(form.get('reason'));
            const effective = Date.now() + NOTICE_DAYS * 864e5;
            const tk = createTicket({
              subject: `Termination request: ${all ? 'all services' : names}`,
              company: 'XDS',
              area: 'Billing',
              priority: 'Normal',
              description: `${org} asks to terminate ${names}, effective ${day(effective)} after the ${NOTICE_DAYS}-day notice period.\nReason: ${reason}.\nRequested by ${user?.name} (${user?.email}).`,
            });
            save([{ id: `t${Date.now()}`, ids, all, effective, reason, ticket: tk.id, status: 'pending' }, ...terms]);
            toast(`Termination requested. Ticket ${tk.id} was sent to support.`);
          },
        },
      ],
    });

  const cancel = (t: Termination) =>
    modal.open({
      title: 'Cancel termination request?',
      body: <p>Your services will carry on as normal. Ticket <span className="code">{t.ticket}</span> will be updated.</p>,
      actions: [
        { label: 'Keep the request' },
        { label: 'Cancel request', kind: 'primary', onClick: () => { save(terms.map((x) => (x.id === t.id ? { ...x, status: 'cancelled' } : x))); toast('Termination request cancelled.'); } },
      ],
    });

  return (
    <>
      {embedded ? (
        <div className="page-header">
          <div>
            <h2 style={{ margin: 0 }}>Your onboarding and services</h2>
            <p className="page-desc">What you signed up to, and how to end a service.</p>
          </div>
          {hasLegacyServices && (
            <div className="page-actions">
              <button className="btn" type="button" onClick={() => terminate()}>Terminate services</button>
            </div>
          )}
        </div>
      ) : (
        <PageHeader
          title="Onboarding and services"
          description="What you signed up to, and how to end a service."
          actions={hasLegacyServices ? <button className="btn" type="button" onClick={() => terminate()}>Terminate services</button> : undefined}
        />
      )}

      {pending.map((t) => (
        <div className="banner" key={t.id} role="status">
          <span className="banner-icon" aria-hidden="true">!</span>
          <div className="grow">
            <div className="banner-title">{t.all ? 'Your account is set to close' : 'Some of your services are set to end'} on {day(t.effective)}</div>
            <div className="banner-text">Requested with ticket {t.ticket}. Until then everything works as normal.</div>
          </div>
          <button className="btn" type="button" onClick={() => cancel(t)}>Cancel request</button>
        </div>
      ))}

      <div className="two-col">
        <section className="card">
          <div className="card-head"><div className="card-title"><h2>Your onboarding</h2><span className="card-sub">Completed</span></div></div>
          <div className="card-body">
            <dl className="details">
              <dt>Organisation</dt><dd>{org}</dd>
              <dt>Reference</dt><dd className="code">{submitted?.ref ?? 'ONB-204871'}</dd>
              <dt>Contact</dt><dd>{submitted?.contact ?? user?.name}<br /><span className="muted">{submitted?.email ?? user?.email}</span></dd>
              <dt>Submitted</dt><dd>{submitted ? day(submitted.at) : '12 March 2026'}</dd>
              <dt>Status</dt><dd><Pill tone="green">Approved</Pill></dd>
            </dl>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><div className="card-title"><h2>Ending your services</h2><span className="card-sub">Notice period: {NOTICE_DAYS} days</span></div></div>
          <div className="card-body">
            <p>You can end one service or all of them. Enquiries stop on the effective date, and you're billed up to that date. Reports and invoices stay available for 12 months.</p>
            <p className="muted" style={{ marginTop: 10 }}>Your request goes to support as a ticket, so you can follow it and talk to the team under Support tickets.</p>
          </div>
        </section>
      </div>

      {hasLegacyServices && (
        <section className="card" style={{ marginTop: 20 }}>
          <div className="card-head"><div className="card-title"><h2>Your services</h2><span className="card-sub">Products called through XDS Connect.</span></div></div>
          <table className="table">
            <thead><tr><th>Service</th><th style={{ width: 120 }}>Product ID</th><th style={{ width: 140 }}>Area</th><th style={{ width: 240 }}>Status</th><th className="right" style={{ width: 130 }}>Action</th></tr></thead>
            <tbody>
              {SERVICES.map((s) => {
                const t = ending(s.id);
                return (
                  <tr key={s.id}>
                    <td className="cell-main">{s.name}</td>
                    <td className="code">{s.id}</td>
                    <td className="muted">{s.area}</td>
                    <td>{t ? <Pill tone="amber">Ends {day(t.effective)}</Pill> : <Pill tone="green">Active</Pill>}</td>
                    <td className="right">{t ? null : <button className="btn" type="button" onClick={() => terminate(s.id)}>Terminate</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
