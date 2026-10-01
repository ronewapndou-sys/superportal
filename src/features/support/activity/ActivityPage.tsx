import { useEffect, useMemo, useState } from 'react';
import { useChat } from '../../../chat';
import { PageHeader } from '../../../shell/PageHeader';
import { CloseIcon, Pill, copyText, useToast } from '../../../ui';
import { EVENTS, PRODUCTS, TOTAL_EVENTS, type ActivityEvent, type EventGroup } from './data';
import '../support.css';

const productLabel = (e: ActivityEvent) => (e.productId ? `${e.product} · ${e.productId}` : e.product);

function downloadCsv(rows: ActivityEvent[]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = ['Time,API user,Method,Product,Product ID,Reference,Result', ...rows.map((r) => [r.time, r.user, r.method, r.product, String(r.productId ?? ''), r.ref, r.status].map(cell).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'activity-log.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function EventDrawer({ event, onClose }: { event: ActivityEvent; onClose: () => void }) {
  const toast = useToast();
  const chat = useChat();

  // Lets the assistant button move out of the panel's way (see chat.css).
  useEffect(() => {
    document.body.dataset.drawer = 'open';
    return () => {
      delete document.body.dataset.drawer;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !chat.open && !document.querySelector('.scrim')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chat.open, onClose]);

  return (
    <aside className="drawer" aria-label={`Details for ${event.method} at ${event.time}`}>
      <div className="drawer-head">
        <div>
          <div className="code muted" style={{ marginBottom: 4 }}>{event.method}</div>
          <h2>{event.title}</h2>
          <div style={{ marginTop: 8 }}><Pill tone={event.tone}>{event.status}</Pill></div>
        </div>
        <button className="icon-btn" type="button" aria-label="Close details" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="drawer-body">
        <section>
          <h3>What happened</h3>
          <p>{event.what}</p>
        </section>
        <section>
          <h3>What to do</h3>
          <ol className="steps">{event.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
        <section>
          <h3>Call</h3>
          <dl className="kv">
            <dt>Time</dt><dd className="code">{event.time} SAST</dd>
            <dt>API user</dt><dd className="code">{event.user}</dd>
            <dt>Method</dt><dd className="code">{event.method}</dd>
            <dt>Product</dt><dd>{productLabel(event)}</dd>
            <dt>Reference</dt><dd className="code">{event.ref}</dd>
          </dl>
        </section>
        <section>
          <h3>Request sent</h3>
          <pre className="xml">{event.request}</pre>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Tickets and personal details are masked.</p>
        </section>
      </div>
      <div className="drawer-foot">
        <button
          className="btn"
          type="button"
          onClick={() => {
            copyText(`${event.time} · ${event.method} · ${productLabel(event)} · ${event.ref} · ${event.status}\n${event.what}\n${event.steps.join('\n')}`);
            toast('Details copied to your clipboard.');
          }}
        >
          Copy details
        </button>
        <button
          className="btn"
          type="button"
          onClick={() =>
            chat.startTicket({
              subject: `${event.title}: ${event.method}`,
              area: event.product === 'Sign-in' ? 'XDS Connect sign-in and tickets' : event.product,
              attached: event.ref !== 'None' ? event.ref : `${event.method} at ${event.time}`,
            })
          }
        >
          Log a ticket
        </button>
        <button className="btn primary" type="button" onClick={() => chat.ask(`Why did ${event.method} return "${event.title}" for ${event.ref}?`)}>
          Ask the assistant
        </button>
      </div>
    </aside>
  );
}

export function ActivityPage() {
  const toast = useToast();
  const [selected, setSelected] = useState<ActivityEvent | null>(null);
  const [group, setGroup] = useState<EventGroup | ''>('');
  const [product, setProduct] = useState('');
  const [search, setSearch] = useState('');

  const filtering = Boolean(group || product || search.trim());
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EVENTS.filter(
      (e) => (!group || e.group === group) && (!product || e.product === product) && (!q || [e.time, e.user, e.method, e.product, e.productId, e.ref, e.status].join(' ').toLowerCase().includes(q)),
    );
  }, [group, product, search]);
  const failures = EVENTS.filter((e) => e.group === 'failed').length;

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Calls your systems made to XDS Connect. Select one to see what happened and how to fix it."
        actions={
          <button className="btn" type="button" onClick={() => { downloadCsv(visible); toast(`Exported ${visible.length} calls to activity-log.csv.`); }}>
            Export CSV
          </button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <div className="search grow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input className="field" type="search" placeholder="Search by reference, method, enquiry ID or user" aria-label="Search calls" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="field" aria-label="Result" value={group} onChange={(e) => setGroup(e.target.value as EventGroup | '')}>
            <option value="">All results</option>
            <option value="success">Success</option>
            <option value="failed">Failed ({failures})</option>
            <option value="warning">Needs follow-up</option>
          </select>
          <select className="field" aria-label="Product" value={product} onChange={(e) => setProduct(e.target.value)}>
            <option value="">All products</option>
            {PRODUCTS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="field" aria-label="Date range" onChange={(e) => toast(`Showing ${e.target.value.toLowerCase()}.`)}>
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>
        <table className="table activity">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Time</th>
              <th>Method</th>
              <th style={{ width: 190 }}>Product</th>
              <th style={{ width: 170 }}>API user</th>
              <th style={{ width: 140 }}>Reference</th>
              <th style={{ width: 160 }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr
                key={e.time + e.method}
                className={e === selected ? 'selected' : undefined}
                onClick={() => setSelected(e)}
                onKeyDown={(k) => (k.key === 'Enter' || k.key === ' ') && (k.preventDefault(), setSelected(e))}
                tabIndex={0}
                aria-selected={e === selected}
              >
                <td className="code muted">{e.time}</td>
                <td className="code cell-main">{e.method}</td>
                <td>{productLabel(e)}</td>
                <td className="code muted">{e.user}</td>
                <td className="code">{e.ref}</td>
                <td><Pill tone={e.tone}>{e.status}</Pill></td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr className="empty-row"><td colSpan={6}>No calls match these filters. Clear the search or choose another result.</td></tr>
            )}
          </tbody>
        </table>
        <div className="pager">
          <span>{filtering ? `${visible.length} matching call${visible.length === 1 ? '' : 's'}` : `Showing 1 to ${EVENTS.length} of ${TOTAL_EVENTS.toLocaleString('en-US')} calls`} · times in SAST</span>
          <div className="pager-btns">
            <button className="btn" type="button" disabled>Previous</button>
            <button className="btn" type="button" disabled={filtering} onClick={() => toast('You are viewing the latest calls. Use Export CSV for the full list.')}>Next</button>
          </div>
        </div>
      </section>

      {selected && <EventDrawer event={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
