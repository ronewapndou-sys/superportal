import { useEffect, useState } from 'react';
import { useBusiness } from '@/lib/business';
import { useChat } from '../../../chat';
import { PageHeader } from '../../../shell/PageHeader';
import { Pill, useModal, useToast } from '../../../ui';
import { CATALOGUE, CHECKLIST, INITIAL_INTEGRATIONS, INITIAL_INTEGRATIONS_MIE, STATUS_PILL, type Integration } from './data';
import '../support.css';

type Tab = 'all' | 'connected' | 'issues' | 'not-connected';

const TABS: { id: Tab; label: string; test: (i: Integration) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'connected', label: 'Connected', test: (i) => i.status === 'connected' },
  { id: 'issues', label: 'Needs attention', test: (i) => i.status === 'error' || i.status === 'attention' },
  { id: 'not-connected', label: 'Not connected', test: (i) => i.status === 'not-connected' },
];

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function IntegrationsPage() {
  const toast = useToast();
  const modal = useModal();
  const chat = useChat();
  const business = useBusiness();
  const defaultRows = business === 'mie' ? INITIAL_INTEGRATIONS_MIE : INITIAL_INTEGRATIONS;
  const [rows, setRows] = useState<Integration[]>(defaultRows);
  // Bumping a row's counter remounts it, which replays the highlight animation.
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [ticked, setTicked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  // Switching XDS/MIE in the top bar shows that business's own integrations.
  useEffect(() => setRows(defaultRows), [business]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string, changes: Partial<Integration>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    setFlash((f) => ({ ...f, [id]: (f[id] ?? 0) + 1 }));
  };

  /** Fake a short connection attempt that always succeeds. */
  const connect = (row: Integration, workingLabel = 'Connecting') => {
    update(row.id, { status: 'working', workingLabel });
    window.setTimeout(() => {
      update(row.id, { status: 'connected', lastActivity: 'Just now', workingLabel: undefined });
      toast(`${row.name} is connected.`);
    }, 1400);
  };

  const manage = (row: Integration) =>
    modal.open({
      title: row.name,
      body: (
        <>
          <p className="muted">Choose how this connection behaves.</p>
          <label className="check"><input type="checkbox" name="sync" defaultChecked /> Sync changes every 15 minutes</label>
          <label className="check"><input type="checkbox" name="alerts" defaultChecked /> Email me if a sync fails</label>
          <label className="check"><input type="checkbox" name="closed" /> Include closed cases</label>
        </>
      ),
      actions: [
        { label: 'Disconnect', kind: 'danger', onClick: () => { update(row.id, { status: 'not-connected', lastActivity: 'Disconnected just now' }); toast(`${row.name} was disconnected.`); } },
        { label: 'Cancel' },
        { label: 'Save settings', kind: 'primary', onClick: () => toast(`Settings saved for ${row.name}.`) },
      ],
    });

  const viewError = (row: Integration) => {
    const isWebhooks = row.id === 'mie-webhooks';
    const endpoint = isWebhooks ? 'https://api.absa.example/mie/webhooks' : 'https://api.absa.example/xds/triggers';
    const noun = isWebhooks ? 'webhook deliveries' : 'triggers';
    return modal.open({
      title: `${row.name} are failing`,
      body: (
        <>
          <p>3 {noun} ({isWebhooks ? 'verification results ready for collection' : 'default alerts for consumers you monitor'}) couldn't be delivered because your endpoint returned <span className="code">503 Service Unavailable</span>. Delivery is retried for 24 hours.</p>
          <p className="note-box">Last attempt: 29 Sep 2026, 23:10 · {endpoint}</p>
          <p className="muted" style={{ marginTop: 12 }}>Check that your endpoint is running, then send a test {isWebhooks ? 'webhook' : 'trigger'}.</p>
        </>
      ),
      actions: [
        { label: 'Log a ticket', onClick: () => chat.startTicket({ subject: `${row.name} are failing`, area: 'Integrations' }) },
        { label: 'Ask the assistant', onClick: () => chat.ask(`Why is ${row.name} failing?`) },
        { label: `Send test ${isWebhooks ? 'webhook' : 'trigger'}`, kind: 'primary', onClick: () => connect(row, 'Testing') },
      ],
    });
  };

  const review = (row: Integration) =>
    modal.open({
      title: 'XDS Connect UAT needs attention',
      body: (
        <>
          <p>Calls from <span className="code">203.0.113.24</span> were refused today at 08:41 because that address is not on your allowed list.</p>
          <div className="form-row">
            <label htmlFor="ip">Server address to allow</label>
            <input className="field code" id="ip" name="ip" defaultValue="203.0.113.24" />
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Add to allowed list',
          kind: 'primary',
          onClick: (form) => {
            const ip = String(form.get('ip') ?? '').trim();
            update(row.id, { status: 'working', workingLabel: 'Updating' });
            window.setTimeout(() => {
              update(row.id, { status: 'connected', lastActivity: 'Just now', workingLabel: undefined, issue: undefined });
              toast(`${ip} is on your allowed list. UAT calls from it will now work.`);
            }, 1200);
          },
        },
      ],
    });

  const addIntegration = () =>
    modal.open({
      title: 'Add integration',
      body: (
        <div className="pick">
          {CATALOGUE.map((c, i) => (
            <label key={c.id}>
              <input type="radio" name="pick" value={c.id} defaultChecked={i === 0} />
              <span className="sq">{c.initials}</span>
              <span>
                <strong>{c.name}</strong>
                <br />
                <span className="muted">{c.purpose}</span>
              </span>
            </label>
          ))}
        </div>
      ),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Add',
          kind: 'primary',
          onClick: (form) => {
            const c = CATALOGUE.find((x) => x.id === form.get('pick'))!;
            if (rows.some((r) => r.id === c.id)) {
              toast(`${c.name} is already in the list.`);
              return;
            }
            setRows((rs) => [...rs, { ...c, status: 'not-connected', lastActivity: 'Never' }]);
            setFlash((f) => ({ ...f, [c.id]: 1 }));
            toast(`${c.name} was added. Choose Connect to set it up.`);
          },
        },
      ],
    });

  const actionFor = (row: Integration) => {
    switch (row.status) {
      case 'connected': return <button className="btn" type="button" onClick={() => manage(row)}>Manage</button>;
      case 'error': return <button className="btn" type="button" onClick={() => viewError(row)}>View error</button>;
      case 'attention': return <button className="btn" type="button" onClick={() => review(row)}>Review</button>;
      case 'not-connected': return <button className="btn primary" type="button" onClick={() => connect(row)}>Connect</button>;
      case 'working': return <button className="btn" type="button" disabled>{row.workingLabel}…</button>;
    }
  };

  const toggleTick = (i: number) => setTicked((prev) => prev.map((t, j) => (j === i ? !t : t)));
  const allTicked = ticked.every(Boolean);
  useEffect(() => {
    if (allTicked) toast("All set. You're ready to connect a system.");
  }, [allTicked, toast]);

  const issues = rows.filter((r) => r.status === 'error' || r.status === 'attention');
  const q = query.trim().toLowerCase();
  const activeTab = TABS.find((t) => t.id === tab)!;
  const visible = rows.filter((r) => activeTab.test(r) && (!q || `${r.name} ${r.purpose}`.toLowerCase().includes(q)));
  const doneCount = ticked.filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the systems your organisation uses, and check that they're working."
        actions={
          <>
            <button className="btn" type="button" onClick={() => toast('The setup guide is coming soon.')}>Setup guide</button>
            <button className="btn primary" type="button" onClick={addIntegration}>Add integration</button>
          </>
        }
      />

      {issues.length > 0 && (
        <div className="banner" role="status">
          <span className="banner-icon" aria-hidden="true">!</span>
          <div className="grow">
            <div className="banner-title">
              {issues.length === 1 ? '1 integration needs attention' : `${issues.length} integrations need attention`}
            </div>
            <div className="banner-text">{issues.map((i) => i.issue ?? i.name).join('. ')}.</div>
          </div>
          <button className="btn" type="button" onClick={() => setTab('issues')}>Show these</button>
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <div className="tabs" role="tablist" aria-label="Filter integrations">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
                <span className="count">{rows.filter(t.test).length}</span>
              </button>
            ))}
          </div>
          <div className="search" style={{ width: 240 }}>
            <SearchIcon />
            <input className="field" type="search" placeholder="Find an integration" aria-label="Find an integration" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Integration</th>
              <th style={{ width: 170 }}>Status</th>
              <th style={{ width: 170 }}>Last activity</th>
              <th className="right" style={{ width: 150 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const pill = STATUS_PILL[row.status];
              return (
                <tr key={`${row.id}-${flash[row.id] ?? 0}`} className={flash[row.id] ? 'flash' : undefined}>
                  <td>
                    <div className="name-cell">
                      <span className="sq" aria-hidden="true">{row.initials}</span>
                      <div>
                        <div className="cell-main">{row.name}</div>
                        <div className="cell-sub">{row.purpose}</div>
                      </div>
                    </div>
                  </td>
                  <td><Pill tone={pill.tone}>{row.status === 'working' ? row.workingLabel : pill.label}</Pill></td>
                  <td className="muted">{row.lastActivity}</td>
                  <td className="right">{actionFor(row)}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr className="empty-row">
                <td colSpan={4}>No integrations match. Try another tab or clear the search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="two-col">
        <section className="card help-card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3>Before you connect</h3>
              <span className="progress-label">{doneCount} of {CHECKLIST.length} done</span>
            </div>
            <ul className="checklist">
              {CHECKLIST.map((item, i) => (
                <li key={item}>
                  <button type="button" aria-pressed={ticked[i]} onClick={() => toggleTick(i)}>
                    <span className="tick" aria-hidden="true" />
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="card help-card">
          <div className="card-body">
            <h3>Need help connecting?</h3>
            <p>The assistant can walk you through connecting a system step by step, or explain an error you're seeing.</p>
            <div className="help-actions">
              <button className="btn" type="button" onClick={() => chat.ask('How do I connect a new integration?')}>Ask the assistant</button>
              <button className="btn" type="button" onClick={() => chat.startTicket({ area: 'Integrations' })}>Log a support ticket</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
