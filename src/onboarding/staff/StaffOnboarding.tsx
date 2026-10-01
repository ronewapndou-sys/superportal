import { useEffect, useMemo, useState } from 'react';
import { CLIENT_SERVICES } from '../../auth/accounts';
import { useAuth } from '../../auth/AuthContext';
import { addInvitedAccount } from '../../auth/invitedAccounts';
import { savePendingInvite } from '../pendingInvite';
import { PageHeader } from '../../shell/PageHeader';
import { CloseIcon, Pill, useModal, useToast } from '../../ui';
import {
  DAY, DIVISION_NAME, DOCS, ENTITIES, ENTITY_TYPES, EXPIRY_LABEL, NOW, ONBOARDINGS, PAYMENT_OPTIONS, QUEUES, STAFF, STATUS, STEPS,
  TEMPLATES, expiryState, fDate, toISO,
  type Doc, type DivisionId, type Entity, type Onboarding, type QueueId, type Verification,
} from './data';
import './staff.css';

type Tab = 'onboardings' | 'entities' | 'documents';
type DivisionFilter = 'all' | DivisionId;
const PER_PAGE = 12;

/** Re-renders after the demo data (module-level arrays) is changed. */
function useRefresh() {
  const [, set] = useState(0);
  return () => set((n) => n + 1);
}

function Drawer({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset.drawer = 'open';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.scrim') && onClose();
    window.addEventListener('keydown', onKey);
    return () => { delete document.body.dataset.drawer; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return <aside className="drawer" aria-label={label}>{children}</aside>;
}

function DrawerHead({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="drawer-head">
      <div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{eyebrow}</div>
        <h2>{title}</h2>
        {children && <div style={{ marginTop: 8 }}>{children}</div>}
      </div>
      <button className="icon-btn" type="button" aria-label="Close details" onClick={onClose}><CloseIcon /></button>
    </div>
  );
}

function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="so-pager">
      <span className="muted">{total === 0 ? 'No results' : `${(page - 1) * PER_PAGE + 1} to ${Math.min(page * PER_PAGE, total)} of ${total}`}</span>
      <div>
        <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
function useExport() {
  const toast = useToast();
  return (name: string, rows: string[][]) => {
    // The preview sandbox blocks real downloads, so the demo only confirms what would be exported.
    void csv(rows);
    toast(`${name} export ready: ${rows.length - 1} rows.`);
  };
}

function Filters({ search, onSearch, placeholder, division, onDivision, children }: {
  search: string; onSearch: (v: string) => void; placeholder: string; division: DivisionFilter; onDivision: (d: DivisionFilter) => void; children?: React.ReactNode;
}) {
  return (
    <div className="toolbar so-toolbar">
      <div className="search so-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input className="field" type="search" placeholder={placeholder} aria-label={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} />
      </div>
      <select className="field so-select" aria-label="Division" value={division} onChange={(e) => onDivision(e.target.value as DivisionFilter)}>
        <option value="all">All divisions</option>
        <option value="xds">XDS</option>
        <option value="mie">MIE</option>
        <option value="mettus">Mettus</option>
      </select>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- Onboardings */

function stepLabel(o: Onboarding) {
  if (o.status === 'UNDER_REVIEW' || o.status === 'CHANGE_REQUEST') return `Step ${o.step + 1} of ${STEPS.length}: ${STEPS[o.step]}`;
  return '';
}

function OnboardingDrawer({ o, onClose, onChanged }: { o: Onboarding; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const modal = useModal();
  const entity = ENTITIES.find((e) => e.id === o.entityId);
  const docs = DOCS.filter((d) => d.entityId === o.entityId);
  const waiting = ['PENDING_REG', 'PENDING_COMP', 'EMAIL_FAILED'].includes(o.status);
  const open = !['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(o.status);
  const lapsed = waiting && o.expiresAt < NOW;

  const resend = () => {
    o.expiresAt = NOW + 14 * DAY;
    o.lastAt = NOW;
    o.bounced = false;
    if (o.status === 'EMAIL_FAILED') o.status = 'PENDING_REG';
    onChanged();
    toast(`Invitation sent again to ${o.email}. It now runs for 14 days.`);
  };
  const cancel = () => modal.open({
    title: 'Cancel this invitation?',
    body: <p>{o.contact} at {o.name} will no longer be able to complete this onboarding. You can send a new invitation later.</p>,
    actions: [
      { label: 'Keep invitation' },
      { label: 'Cancel invitation', kind: 'danger', onClick: () => { o.status = 'CANCELLED'; onChanged(); toast('Invitation cancelled.'); } },
    ],
  });

  return (
    <Drawer label={`${o.name} onboarding`} onClose={onClose}>
      <DrawerHead eyebrow={`${o.ref} · ${DIVISION_NAME[o.division]}`} title={o.name} onClose={onClose}>
        <Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill>
      </DrawerHead>
      <div className="drawer-body">
        {lapsed && <div className="note-box">This invitation expired on {fDate(o.expiresAt)}. Send it again to give {o.contact} another 14 days.</div>}
        {o.bounced && <div className="note-box">The invitation email to {o.email} bounced. Check the address, then send it again.</div>}
        {stepLabel(o) && <div className="note-box">{stepLabel(o)}{o.approvers.length > 0 && <> · waiting on {o.approvers.join(', ')}</>}</div>}
        <section>
          <h3>Details</h3>
          <dl className="kv">
            <dt>Template</dt><dd>{o.template}</dd>
            <dt>Contact</dt><dd>{o.contact}</dd>
            <dt>Email</dt><dd>{o.email}</dd>
            <dt>Invited by</dt><dd>{o.invitedBy}, {fDate(o.invitedAt)}</dd>
            <dt>Last activity</dt><dd>{fDate(o.lastAt)}</dd>
            {waiting && <><dt>Invite expires</dt><dd>{fDate(o.expiresAt)}</dd></>}
            {entity && <><dt>Entity type</dt><dd>{entity.type}</dd></>}
          </dl>
        </section>
        {o.status === 'UNDER_REVIEW' || o.status === 'CHANGE_REQUEST' || o.status === 'ACCEPTED' ? (
          <section>
            <h3>Approval</h3>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i < o.step ? '' : 'muted'}>{s}{i < o.step ? ', done' : i === o.step && o.status !== 'ACCEPTED' ? ', now' : ''}</li>
              ))}
            </ol>
          </section>
        ) : null}
        <section>
          <h3>Documents</h3>
          {docs.length === 0 ? <p className="muted">No documents yet.</p> : (
            <ul className="so-list">
              {docs.map((d) => (
                <li key={d.id}><span>{d.type}</span><ExpiryPill d={d} /></li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {open && (
        <div className="drawer-foot">
          <button className="btn" onClick={cancel}>Cancel invitation</button>
          {waiting && <button className="btn primary" onClick={resend}>Send again</button>}
        </div>
      )}
    </Drawer>
  );
}

function ExpiryPill({ d }: { d: Doc }) {
  const s = expiryState(d);
  const tone = s === 'expired' ? 'red' : s === 'expiring' ? 'amber' : s === 'valid' ? 'green' : 'grey';
  return <Pill tone={tone}>{s === 'none' ? 'No expiry' : s === 'expired' ? `Expired ${fDate(d.expires!)}` : fDate(d.expires!)}</Pill>;
}

function OnboardingsTab({ me, onInvite, version, onChanged }: { me: string; onInvite: () => void; version: number; onChanged: () => void }) {
  const [queue, setQueue] = useState<QueueId>('pending');
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState<DivisionFilter>('all');
  const [by, setBy] = useState('');
  const [sort, setSort] = useState<{ key: 'name' | 'status' | 'invitedAt' | 'lastAt'; dir: 1 | -1 }>({ key: 'invitedAt', dir: -1 });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const exportRows = useExport();

  const inDivision = (o: Onboarding) => division === 'all' || o.division === division;
  const counts = useMemo(
    () => Object.fromEntries(QUEUES.map((q) => [q.id, ONBOARDINGS.filter((o) => inDivision(o) && q.test(o, me)).length])) as Record<QueueId, number>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [division, me, version],
  );
  const rows = useMemo(() => {
    const q = QUEUES.find((x) => x.id === queue)!;
    const t = search.trim().toLowerCase();
    return ONBOARDINGS.filter((o) => inDivision(o) && q.test(o, me) && (!by || o.invitedBy === by)
      && (!t || `${o.name} ${o.email} ${o.ref} ${o.contact}`.toLowerCase().includes(t)))
      .sort((a, b) => {
        const k = sort.key;
        const av = k === 'name' ? a.name : k === 'status' ? STATUS[a.status].label : a[k];
        const bv = k === 'name' ? b.name : k === 'status' ? STATUS[b.status].label : b[k];
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, search, division, by, sort, me, version]);

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const open = ONBOARDINGS.find((o) => o.id === openId);
  const sortBy = (key: typeof sort.key) => { setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 })); setPage(1); };
  const th = (key: typeof sort.key, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="so-sort" onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button>
    </th>
  );

  return (
    <>
      <div className="tabs-row so-queues" role="tablist" aria-label="Queue">
        {QUEUES.map((q) => (
          <button key={q.id} role="tab" aria-selected={queue === q.id} className="tab" onClick={() => { setQueue(q.id); setPage(1); }}>
            {q.label}<span className="count">{counts[q.id]}</span>
          </button>
        ))}
      </div>
      <div className="card so-card">
        <Filters search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, email or reference" division={division} onDivision={(d) => { setDivision(d); setPage(1); }}>
          <select className="field so-select" aria-label="Invited by" value={by} onChange={(e) => { setBy(e.target.value); setPage(1); }}>
            <option value="">Invited by anyone</option>
            {STAFF.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="so-spacer" />
          <button className="btn" onClick={() => exportRows('Onboardings', [['Reference', 'Name', 'Status', 'Invited by', 'Invited'], ...rows.map((o) => [o.ref, o.name, STATUS[o.status].label, o.invitedBy, toISO(o.invitedAt)])])}>Export {rows.length}</button>
          <button className="btn primary" onClick={onInvite}>Send invitation</button>
        </Filters>
        <div className="so-scroll">
          <table className="table">
            <thead><tr>{th('name', 'Entity')}{th('status', 'Status')}<th>Division</th><th>Invited by</th>{th('invitedAt', 'Invited')}{th('lastAt', 'Last activity')}</tr></thead>
            <tbody>
              {slice.map((o) => (
                <tr key={o.id} className={`so-row${o.id === openId ? ' selected' : ''}`} tabIndex={0} onClick={() => setOpenId(o.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(o.id)}>
                  <td><div className="cell-main">{o.name}</div><div className="cell-sub">{o.ref} · {o.contact}</div></td>
                  <td><Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill>{stepLabel(o) && <div className="cell-sub">{STEPS[o.step]}</div>}</td>
                  <td>{DIVISION_NAME[o.division]}</td>
                  <td>{o.invitedBy}</td>
                  <td className="tnum">{fDate(o.invitedAt)}</td>
                  <td className="tnum">{fDate(o.lastAt)}</td>
                </tr>
              ))}
              {slice.length === 0 && <tr><td colSpan={6} className="so-empty">Nothing in this queue{search || by ? ' matches your filters' : ''}.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={cur} pages={pages} total={rows.length} onPage={setPage} />
      </div>
      {open && <OnboardingDrawer o={open} onClose={() => setOpenId(null)} onChanged={onChanged} />}
    </>
  );
}

/* ---------------------------------------------------------------- Invitation wizard */

type Invite = {
  division: DivisionId; template: string; type: string; name: string; first: string; last: string; email: string; mobile: string;
  expiry: string; payment: number; twoFactor: boolean; liveness: boolean; message: string;
};
const blankInvite = (): Invite => ({
  division: 'xds', template: TEMPLATES[0], type: ENTITY_TYPES[0], name: '', first: '', last: '', email: '', mobile: '',
  expiry: toISO(NOW + 14 * DAY), payment: 0, twoFactor: false, liveness: false,
  message: 'Hi #InviteeFirstName,\n\nPlease complete the onboarding for #EntityName so we can get you set up. It takes about ten minutes.\n\nThank you',
});

function InviteWizard({ preset, onClose, onDone }: { preset?: Partial<Invite>; onClose: () => void; onDone: (draft: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Invite>({ ...blankInvite(), ...preset });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const set = <K extends keyof Invite>(k: K, v: Invite[K]) => setF((x) => ({ ...x, [k]: v }));
  const matches = f.name.trim().length > 1 ? ENTITIES.filter((e) => e.tradingName.toLowerCase().includes(f.name.trim().toLowerCase())).slice(0, 4) : [];

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Enter the entity name.';
    if (!f.first.trim()) e.first = 'Enter a first name.';
    if (!f.last.trim()) e.last = 'Enter a last name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address.';
    if (f.mobile && !/^\+?[0-9 ]{9,15}$/.test(f.mobile)) e.mobile = 'Enter a valid phone number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = (draft: boolean) => {
    if (!draft) {
      const e: Record<string, string> = {};
      if (new Date(f.expiry).getTime() < NOW) e.expiry = 'Choose a date in the future.';
      if (f.twoFactor && !f.mobile) e.twoFactor = 'Two-factor sign-in needs a mobile number. Go back and add one.';
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    const entity = ENTITIES.find((x) => x.tradingName.toLowerCase() === f.name.trim().toLowerCase());
    const id = `o${ONBOARDINGS.length + 1}`;
    ONBOARDINGS.unshift({
      id, ref: `ONB-${2400 + ONBOARDINGS.length}`, entityId: entity?.id ?? '', name: f.name.trim(), contact: `${f.first} ${f.last}`, email: f.email,
      division: f.division, template: f.template, status: draft ? 'DRAFT' : 'PENDING_REG', step: 0, approvers: [], invitedBy: STAFF[0],
      invitedAt: NOW, lastAt: NOW, expiresAt: new Date(f.expiry).getTime(), bounced: false, selfCert: false,
    });
    if (!draft) {
      const first = f.first.trim();
      const last = f.last.trim();
      const email = f.email.trim();
      const entityName = f.name.trim();
      // So the invitee's own onboarding form opens pre-filled, instead of asking them to retype what we already have.
      savePendingInvite({
        entityName,
        entityType: f.type,
        contactFirst: first,
        contactLast: last,
        email,
        mobile: f.mobile.trim(),
        noBankDetails: f.payment === PAYMENT_OPTIONS.length - 1,
      });
      // And so the presenter can sign straight in as the person just invited, with no setup of their own.
      addInvitedAccount({
        id: `invite-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: `${first} ${last}`.trim() || email,
        email,
        role: `Administrator, ${entityName || 'their company'}`,
        initials: ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '??',
        cellEnding: f.mobile.replace(/\D/g, '').slice(-3).padStart(3, '0'),
        orgs: f.division === 'mettus' ? ['XDS', 'MIE'] : [f.division === 'mie' ? 'MIE' : 'XDS'],
        services: CLIENT_SERVICES,
      });
    }
    onDone(draft);
    toast(draft ? 'Saved as a draft.' : `Invitation sent to ${f.email}. They now appear on the login screen.`);
  };
  const preview = f.message.replace(/#InviteeFirstName/g, f.first || 'there').replace(/#EntityName/g, f.name || 'your company');

  return (
    <Drawer label="Send invitation" onClose={onClose}>
      <DrawerHead eyebrow={`Step ${step} of 2`} title="Send an onboarding invitation" onClose={onClose} />
      <div className="drawer-body so-form">
        {step === 1 ? (
          <>
            <div className="form-row"><label htmlFor="iv-div">Division</label>
              <select id="iv-div" className="field" value={f.division} onChange={(e) => set('division', e.target.value as DivisionId)}><option value="xds">XDS</option><option value="mie">MIE</option><option value="mettus">Mettus (XDS and MIE)</option></select></div>
            <div className="form-row"><label htmlFor="iv-tpl">Template</label>
              <select id="iv-tpl" className="field" value={f.template} onChange={(e) => set('template', e.target.value)}>{TEMPLATES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="form-row"><label htmlFor="iv-type">Entity type</label>
              <select id="iv-type" className="field" value={f.type} onChange={(e) => set('type', e.target.value)}>{ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="form-row"><label htmlFor="iv-name">Entity name</label>
              <input id="iv-name" className={`field${errors.name ? ' invalid' : ''}`} value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
              {errors.name && <span className="ob-err">{errors.name}</span>}
              {matches.length > 0 && (
                <div className="so-suggest"><span className="muted">Already in Mettus Central:</span>
                  {matches.map((m) => <button type="button" key={m.id} className="so-chip" onClick={() => setF((x) => ({ ...x, name: m.tradingName, type: m.type, first: m.contact.split(' ')[0], last: m.contact.split(' ').slice(1).join(' '), email: m.email, division: m.division }))}>{m.tradingName}</button>)}
                </div>
              )}</div>
            <div className="so-two">
              <div className="form-row"><label htmlFor="iv-first">First name</label><input id="iv-first" className={`field${errors.first ? ' invalid' : ''}`} value={f.first} onChange={(e) => set('first', e.target.value)} />{errors.first && <span className="ob-err">{errors.first}</span>}</div>
              <div className="form-row"><label htmlFor="iv-last">Last name</label><input id="iv-last" className={`field${errors.last ? ' invalid' : ''}`} value={f.last} onChange={(e) => set('last', e.target.value)} />{errors.last && <span className="ob-err">{errors.last}</span>}</div>
            </div>
            <div className="form-row"><label htmlFor="iv-email">Email address</label><input id="iv-email" type="email" className={`field${errors.email ? ' invalid' : ''}`} value={f.email} onChange={(e) => set('email', e.target.value)} />{errors.email && <span className="ob-err">{errors.email}</span>}</div>
            <div className="form-row"><label htmlFor="iv-mob">Mobile number (optional)</label><input id="iv-mob" className={`field${errors.mobile ? ' invalid' : ''}`} value={f.mobile} onChange={(e) => set('mobile', e.target.value)} />{errors.mobile && <span className="ob-err">{errors.mobile}</span>}</div>
          </>
        ) : (
          <>
            <div className="form-row"><label htmlFor="iv-exp">Invitation expires</label><input id="iv-exp" type="date" className={`field${errors.expiry ? ' invalid' : ''}`} value={f.expiry} onChange={(e) => set('expiry', e.target.value)} />{errors.expiry && <span className="ob-err">{errors.expiry}</span>}</div>
            <div className="form-row"><label htmlFor="iv-pay">Bank details</label>
              <select id="iv-pay" className="field" value={f.payment} onChange={(e) => set('payment', Number(e.target.value))}>{PAYMENT_OPTIONS.map((p, i) => <option key={p} value={i}>{p}</option>)}</select></div>
            <label className="check"><input type="checkbox" checked={f.twoFactor} onChange={(e) => set('twoFactor', e.target.checked)} />Require two-factor sign-in</label>
            {errors.twoFactor && <span className="ob-err">{errors.twoFactor}</span>}
            <label className="check"><input type="checkbox" checked={f.liveness} onChange={(e) => set('liveness', e.target.checked)} />Ask for a liveness check</label>
            <div className="form-row"><label htmlFor="iv-msg">Message</label>
              <textarea id="iv-msg" className="field so-text" rows={6} value={f.message} onChange={(e) => set('message', e.target.value)} />
              <span className="ob-help">Use #InviteeFirstName and #EntityName to personalise it.</span></div>
            <h3 className="so-prev-h">Preview</h3>
            <div className="so-preview">{preview}</div>
          </>
        )}
      </div>
      <div className="drawer-foot">
        {step === 1 ? (
          <>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={() => validate1() && setStep(2)}>Continue</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => setStep(1)}>Back</button>
            <button className="btn" onClick={() => submit(true)}>Save as draft</button>
            <button className="btn primary" onClick={() => submit(false)}>Send invitation</button>
          </>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------------------------------------------------------- Entities */

const VERIFY_TONE: Record<Verification, 'green' | 'grey' | 'red' | 'amber'> = {
  Verified: 'green', Review: 'amber', 'Not verified yet': 'grey', 'Self-certified': 'amber', Inactive: 'grey', 'Prepaid client': 'grey', 'Terms client': 'grey',
};
const mask = (a: string) => (a ? `•••• ${a.slice(-4)}` : 'None');

function EntityDrawer({ e, onClose, onChanged, onStartOnboarding, onOpenDoc }: { e: Entity; onClose: () => void; onChanged: () => void; onStartOnboarding: (e: Entity) => void; onOpenDoc: (d: Doc) => void }) {
  const toast = useToast();
  const docs = DOCS.filter((d) => d.entityId === e.id);
  const onbs = ONBOARDINGS.filter((o) => o.entityId === e.id);
  const [prev, setPrev] = useState<Verification>('Not verified yet');
  const toggleInactive = () => {
    if (e.verification === 'Inactive') { e.verification = prev; toast(`${e.legalName} is active again.`); }
    else { setPrev(e.verification); e.verification = 'Inactive'; toast(`${e.legalName} marked as inactive.`); }
    e.updatedAt = NOW;
    onChanged();
  };
  return (
    <Drawer label={`${e.legalName} details`} onClose={onClose}>
      <DrawerHead eyebrow={`${DIVISION_NAME[e.division]} · Trading as ${e.tradingName}`} title={e.legalName} onClose={onClose}>
        <Pill tone={VERIFY_TONE[e.verification]}>{e.verification}</Pill>
      </DrawerHead>
      <div className="drawer-body">
        {e.verification === 'Review' && <div className="note-box">Flagged for review: {e.reviewReason}. Check the bank details with {e.contact}, then verify again.</div>}
        {e.verification === 'Inactive' && <div className="note-box">This entity is inactive and is hidden from the default list.</div>}
        <section>
          <h3>Entity</h3>
          <dl className="kv">
            <dt>Reference</dt><dd>{e.ref || 'Not captured yet'}</dd>
            <dt>Type</dt><dd>{e.type}</dd>
            <dt>Registration</dt><dd>{e.regNumber}</dd>
            <dt>Contact</dt><dd>{e.contact}</dd>
            <dt>Email</dt><dd>{e.email}</dd>
          </dl>
        </section>
        <section>
          <h3>Bank details</h3>
          {e.verification === 'Prepaid client' ? <p className="muted">Prepaid client. No bank details are held.</p> : (
            <dl className="kv">
              <dt>Bank</dt><dd>{e.bank}</dd>
              <dt>Account type</dt><dd>{e.accountType}</dd>
              <dt>Account number</dt><dd>{mask(e.account)}</dd>
            </dl>
          )}
        </section>
        <section>
          <h3>Documents</h3>
          {docs.length === 0 ? <p className="muted">No documents yet.</p> : (
            <ul className="so-list">
              {docs.map((d) => <li key={d.id}><button className="so-link" onClick={() => onOpenDoc(d)}>{d.type}</button><ExpiryPill d={d} /></li>)}
            </ul>
          )}
        </section>
        <section>
          <h3>Onboardings</h3>
          {onbs.length === 0 ? <p className="muted">None yet.</p> : (
            <ul className="so-list">{onbs.map((o) => <li key={o.id}><span>{o.ref} · {o.template}</span><Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill></li>)}</ul>
          )}
        </section>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={toggleInactive}>{e.verification === 'Inactive' ? 'Reactivate' : 'Mark as inactive'}</button>
        <button className="btn primary" onClick={() => onStartOnboarding(e)}>Start onboarding</button>
      </div>
    </Drawer>
  );
}

function EntitiesTab({ onStartOnboarding, version, onChanged, onOpenDoc }: { onStartOnboarding: (e: Entity) => void; version: number; onChanged: () => void; onOpenDoc: (d: Doc) => void }) {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState<DivisionFilter>('all');
  const [ver, setVer] = useState<'' | Verification>('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const toast = useToast();
  const exportRows = useExport();
  const refresh = useRefresh();

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return ENTITIES.filter((e) => (division === 'all' || e.division === division)
      && (ver ? e.verification === ver : e.verification !== 'Inactive')
      && (!t || `${e.legalName} ${e.tradingName} ${e.ref} ${e.email}`.toLowerCase().includes(t)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, division, ver, version]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const open = ENTITIES.find((e) => e.id === openId);

  const verify = (e: Entity) => {
    e.verification = 'Not verified yet';
    refresh();
    toast(`Checking bank details for ${e.legalName}.`);
    window.setTimeout(() => {
      const ok = e.legalName.length % 4 !== 0;
      e.verification = ok ? 'Verified' : 'Review';
      e.reviewReason = ok ? '' : 'Account holder name does not match the legal name';
      e.updatedAt = NOW;
      onChanged();
      toast(ok ? `Bank details verified for ${e.legalName}.` : `${e.legalName} needs review.`);
    }, 1800);
  };

  return (
    <>
      <div className="card so-card">
        <Filters search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, reference or email" division={division} onDivision={(d) => { setDivision(d); setPage(1); }}>
          <select className="field so-select" aria-label="Verification" value={ver} onChange={(e) => { setVer(e.target.value as '' | Verification); setPage(1); }}>
            <option value="">Active entities</option>
            {(['Verified', 'Review', 'Not verified yet', 'Self-certified', 'Prepaid client', 'Terms client', 'Inactive'] as Verification[]).map((v) => <option key={v}>{v}</option>)}
          </select>
          <span className="so-spacer" />
          <button className="btn" onClick={() => exportRows('Entities', [['Reference', 'Legal name', 'Division', 'Verification'], ...rows.map((e) => [e.ref, e.legalName, DIVISION_NAME[e.division], e.verification])])}>Export {rows.length}</button>
        </Filters>
        <div className="so-scroll">
          <table className="table">
            <thead><tr><th>Entity</th><th>Verification</th><th>Division</th><th>Type</th><th>Updated</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {slice.map((e) => (
                <tr key={e.id} className={`so-row${e.id === openId ? ' selected' : ''}`} tabIndex={0} onClick={() => setOpenId(e.id)} onKeyDown={(ev) => ev.key === 'Enter' && setOpenId(e.id)}>
                  <td><div className="cell-main">{e.legalName}</div><div className="cell-sub">{e.ref || 'No reference yet'} · {e.contact}</div></td>
                  <td><Pill tone={VERIFY_TONE[e.verification]}>{e.verification}</Pill>{e.verification === 'Review' && <div className="cell-sub">{e.reviewReason}</div>}</td>
                  <td>{DIVISION_NAME[e.division]}</td>
                  <td>{e.type}</td>
                  <td className="tnum">{fDate(e.updatedAt)}</td>
                  <td className="right" onClick={(ev) => ev.stopPropagation()}>
                    {e.verification !== 'Prepaid client' && e.verification !== 'Inactive' && e.verification !== 'Verified' &&
                      <button className="btn" onClick={() => verify(e)}>Verify bank details</button>}
                  </td>
                </tr>
              ))}
              {slice.length === 0 && <tr><td colSpan={6} className="so-empty">No entities match.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={cur} pages={pages} total={rows.length} onPage={setPage} />
      </div>
      {open && <EntityDrawer e={open} onClose={() => setOpenId(null)} onChanged={onChanged} onStartOnboarding={onStartOnboarding} onOpenDoc={onOpenDoc} />}
    </>
  );
}

/* ---------------------------------------------------------------- Documents */

function DocDrawer({ d, onClose, onChanged }: { d: Doc; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const modal = useModal();
  const e = ENTITIES.find((x) => x.id === d.entityId)!;
  const [mode, setMode] = useState<'' | 'expiry'>('');
  const [date, setDate] = useState(d.expires ? toISO(d.expires) : '');
  const [none, setNone] = useState(!d.expires);

  const saveExpiry = () => {
    if (!none && !date) { toast('Choose a date, or tick that it does not expire.'); return; }
    d.expires = none ? null : new Date(`${date}T23:59`).getTime();
    setMode('');
    onChanged();
    toast(none ? 'Expiry date removed.' : `Expiry date set to ${fDate(d.expires!)}.`);
  };
  const request = () => { d.update = 'requested'; onChanged(); toast(`Update requested. ${d.notify} has been notified.`); };
  const accept = () => { d.update = ''; d.versions++; d.uploadedAt = NOW; onChanged(); toast('New version accepted.'); };
  const remove = () => modal.open({
    title: 'Remove this document?',
    body: <p>{d.file} will be taken out of the library for {e.legalName}.</p>,
    actions: [
      { label: 'Keep document' },
      { label: 'Remove document', kind: 'danger', onClick: () => { DOCS.splice(DOCS.indexOf(d), 1); onChanged(); onClose(); toast('Document removed.'); } },
    ],
  });

  return (
    <Drawer label={`${d.file} details`} onClose={onClose}>
      <DrawerHead eyebrow={d.type} title={d.file} onClose={onClose}><ExpiryPill d={d} /></DrawerHead>
      <div className="drawer-body">
        {d.update === 'requested' && <div className="note-box">An updated version has been requested from {d.notify}.</div>}
        {d.update === 'review' && <div className="note-box">A new version is waiting for you to review.</div>}
        <section>
          <h3>Details</h3>
          <dl className="kv">
            <dt>Entity</dt><dd>{e.legalName}</dd>
            <dt>Division</dt><dd>{DIVISION_NAME[e.division]}</dd>
            <dt>Status</dt><dd>{EXPIRY_LABEL[expiryState(d)]}</dd>
            <dt>Notifies</dt><dd>{d.notify}</dd>
            <dt>Uploaded</dt><dd>{fDate(d.uploadedAt)} by {d.uploadedBy}</dd>
            <dt>Version</dt><dd>{d.versions}</dd>
            <dt>Size</dt><dd>{d.sizeKB > 1024 ? `${(d.sizeKB / 1024).toFixed(1)} MB` : `${d.sizeKB} KB`}</dd>
          </dl>
        </section>
        {mode === 'expiry' && (
          <section>
            <h3>Expiry date</h3>
            <div className="form-row"><input type="date" className="field" aria-label="Expiry date" value={date} disabled={none} onChange={(ev) => setDate(ev.target.value)} /></div>
            <label className="check"><input type="checkbox" checked={none} onChange={(ev) => setNone(ev.target.checked)} />This document does not expire</label>
            <div className="so-inline"><button className="btn primary" onClick={saveExpiry}>Save expiry date</button><button className="btn" onClick={() => setMode('')}>Cancel</button></div>
          </section>
        )}
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={remove}>Remove</button>
        <button className="btn" onClick={() => setMode('expiry')}>Set expiry</button>
        {d.update === 'review' ? <button className="btn primary" onClick={accept}>Accept new version</button>
          : d.update === 'requested' ? <button className="btn" onClick={() => { d.update = ''; onChanged(); toast('Update request cancelled.'); }}>Cancel request</button>
            : <button className="btn primary" onClick={request}>Request update</button>}
      </div>
    </Drawer>
  );
}

function DocumentsTab({ version, onChanged, openDoc, setOpenDoc }: { version: number; onChanged: () => void; openDoc: Doc | null; setOpenDoc: (d: Doc | null) => void }) {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState<DivisionFilter>('all');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const exportRows = useExport();

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return DOCS.filter((d) => {
      const e = ENTITIES.find((x) => x.id === d.entityId);
      if (!e || (division !== 'all' && e.division !== division)) return false;
      if (t && !`${d.file} ${d.type} ${e.legalName}`.toLowerCase().includes(t)) return false;
      if (status === 'requested' || status === 'review') return d.update === status;
      return !status || expiryState(d) === status;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, division, status, version]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  return (
    <>
      <div className="card so-card">
        <Filters search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search file, type or entity" division={division} onDivision={(d) => { setDivision(d); setPage(1); }}>
          <select className="field so-select" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Any status</option>
            <option value="expired">Expired</option>
            <option value="expiring">Expiring within 30 days</option>
            <option value="valid">Valid</option>
            <option value="none">No expiry date</option>
            <option value="requested">Update requested</option>
            <option value="review">New version to review</option>
          </select>
          <span className="so-spacer" />
          <button className="btn" onClick={() => exportRows('Documents', [['File', 'Type', 'Entity', 'Expires'], ...rows.map((d) => [d.file, d.type, ENTITIES.find((e) => e.id === d.entityId)?.legalName ?? '', d.expires ? toISO(d.expires) : ''])])}>Export {rows.length}</button>
        </Filters>
        <div className="so-scroll">
          <table className="table">
            <thead><tr><th>Document</th><th>Entity</th><th>Expires</th><th>Update</th><th>Uploaded</th></tr></thead>
            <tbody>
              {slice.map((d) => {
                const e = ENTITIES.find((x) => x.id === d.entityId)!;
                return (
                  <tr key={d.id} className={`so-row${openDoc?.id === d.id ? ' selected' : ''}`} tabIndex={0} onClick={() => setOpenDoc(d)} onKeyDown={(ev) => ev.key === 'Enter' && setOpenDoc(d)}>
                    <td><div className="cell-main">{d.type}</div><div className="cell-sub">{d.file}</div></td>
                    <td>{e.legalName}<div className="cell-sub">{DIVISION_NAME[e.division]}</div></td>
                    <td><ExpiryPill d={d} /></td>
                    <td>{d.update === 'requested' ? 'Requested' : d.update === 'review' ? 'To review' : <span className="muted">None</span>}</td>
                    <td className="tnum">{fDate(d.uploadedAt)}</td>
                  </tr>
                );
              })}
              {slice.length === 0 && <tr><td colSpan={5} className="so-empty">No documents match.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={cur} pages={pages} total={rows.length} onPage={setPage} />
      </div>
      {openDoc && <DocDrawer d={openDoc} onClose={() => setOpenDoc(null)} onChanged={onChanged} />}
    </>
  );
}

/* ---------------------------------------------------------------- Page */

export function StaffOnboarding() {
  const { user } = useAuth();
  const me = user && STAFF.includes(user.name) ? user.name : STAFF[0];
  const [tab, setTab] = useState<Tab>('onboardings');
  const [invite, setInvite] = useState<Partial<Invite> | null>(null);
  const [openDoc, setOpenDoc] = useState<Doc | null>(null);
  const [version, setVersion] = useState(0);
  const changed = () => setVersion((v) => v + 1);

  const startFor = (e: Entity) => {
    const [first, ...rest] = e.contact.split(' ');
    setInvite({ division: e.division, name: e.tradingName, type: e.type, first, last: rest.join(' '), email: e.email });
    setTab('onboardings');
  };
  const expiring = DOCS.filter((d) => ['expired', 'expiring'].includes(expiryState(d))).length;
  const review = ENTITIES.filter((e) => e.verification === 'Review').length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'onboardings', label: 'Onboardings' },
    { id: 'entities', label: 'Entities', count: review },
    { id: 'documents', label: 'Documents', count: expiring },
  ];
  const switchTab = (t: Tab) => { setTab(t); setOpenDoc(null); };

  return (
    <>
      <PageHeader title="Onboarding" description="Send invitations, follow each onboarding through approval, and keep entities and documents current." />
      <div className="tabs-row so-top" role="tablist" aria-label="Onboarding sections">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => switchTab(t.id)}>
            {t.label}{t.count ? <span className="count" title={t.id === 'entities' ? 'Entities to review' : 'Documents expired or expiring'}>{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tab === 'onboardings' && <OnboardingsTab me={me} version={version} onChanged={changed} onInvite={() => setInvite({})} />}
      {tab === 'entities' && <EntitiesTab version={version} onChanged={changed} onStartOnboarding={startFor} onOpenDoc={(d) => { setTab('documents'); setOpenDoc(d); }} />}
      {tab === 'documents' && <DocumentsTab version={version} onChanged={changed} openDoc={openDoc} setOpenDoc={setOpenDoc} />}
      {invite && <InviteWizard preset={invite} onClose={() => setInvite(null)} onDone={() => { setInvite(null); changed(); }} />}
    </>
  );
}
