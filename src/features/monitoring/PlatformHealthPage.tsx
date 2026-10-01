import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../shell/PageHeader';
import { AreaChart, CloseIcon, Pill, Sparkline, TableToggle, UptimeStrip, useModal, useToast } from '../../ui';
import { CLIENTS, HOURS, INCIDENTS, SERVICES, SEVERITY, STATUS, type Company, type Incident, type PlatformService } from './data';
import './monitoring.css';

type Filter = 'All' | Company;
const FILTERS: Filter[] = ['All', 'XDS', 'MIE', 'Mettus'];
const compact = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('en-US'));

function ServiceDrawer({ service, incidents, onClose }: { service: PlatformService; incidents: Incident[]; onClose: () => void }) {
  useEffect(() => {
    document.body.dataset.drawer = 'open';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.scrim') && onClose();
    window.addEventListener('keydown', onKey);
    return () => { delete document.body.dataset.drawer; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const s = STATUS[service.status];
  const related = incidents.filter((i) => i.serviceId === service.id);

  return (
    <aside className="drawer" aria-label={`${service.name} details`}>
      <div className="drawer-head">
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{service.company}</div>
          <h2>{service.name}</h2>
          <div style={{ marginTop: 8 }}><Pill tone={s.tone}>{s.label}</Pill></div>
        </div>
        <button className="icon-btn" type="button" aria-label="Close details" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="drawer-body">
        <section>
          <p>{service.description}</p>
        </section>
        <section>
          <h3>Last 30 days · {service.uptime30d}% uptime</h3>
          <UptimeStrip days={service.history} />
        </section>
        <section>
          <h3>Calls per hour · last 24 hours</h3>
          <AreaChart labels={HOURS} values={service.hourly} height={160} unit="calls" label={`${service.name} calls per hour, last 24 hours`} />
        </section>
        <section>
          <h3>Now</h3>
          <dl className="kv">
            <dt>p95 response</dt><dd className="tnum">{service.p95Ms} ms</dd>
            <dt>Errors (24h)</dt><dd className="tnum">{service.errorRate}%</dd>
            <dt>Calls (24h)</dt><dd className="tnum">{service.hourly.reduce((a, b) => a + b, 0).toLocaleString('en-US')}</dd>
          </dl>
        </section>
        <section>
          <h3>Incidents</h3>
          {related.length === 0 ? <p className="muted">No incidents in the last 30 days.</p> : related.map((i) => (
            <p key={i.id}><span className="code">{i.id}</span> {i.title} · <span className="muted">{i.status === 'resolved' ? 'Resolved' : 'Open'} · {i.started}</span></p>
          ))}
        </section>
      </div>
    </aside>
  );
}

export function PlatformHealthPage() {
  const toast = useToast();
  const modal = useModal();
  const [filter, setFilter] = useState<Filter>('All');
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [selected, setSelected] = useState<PlatformService | null>(null);

  const services = SERVICES.filter((s) => filter === 'All' || s.company === filter);
  const hourly = useMemo(() => HOURS.map((_, h) => services.reduce((sum, s) => sum + s.hourly[h], 0)), [services]);
  const operational = services.filter((s) => s.status === 'operational').length;
  const open = incidents.filter((i) => i.status !== 'resolved');
  const lastHour = hourly[hourly.length - 1];
  const errorRate = services.length ? services.reduce((a, s) => a + s.errorRate * s.hourly.reduce((x, y) => x + y, 0), 0) / services.reduce((a, s) => a + s.hourly.reduce((x, y) => x + y, 0), 0) : 0;

  const declare = () =>
    modal.open({
      title: 'Declare an incident',
      body: (
        <>
          <p className="muted">Clients who use the service are told on their Monitoring page and by any alerts they've set up.</p>
          <div className="form-row">
            <label htmlFor="i-title">What's happening</label>
            <input className="field" id="i-title" name="title" placeholder="For example, Slow ConnectGetResult responses" />
          </div>
          <div className="form-row">
            <label htmlFor="i-svc">Service</label>
            <select className="field" id="i-svc" name="service">{SERVICES.map((s) => <option key={s.id} value={s.id}>{s.company} · {s.name}</option>)}</select>
          </div>
          <div className="form-row">
            <label htmlFor="i-sev">Severity</label>
            <select className="field" id="i-sev" name="severity"><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select>
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Declare incident',
          kind: 'danger',
          onClick: (form, formEl) => {
            const title = String(form.get('title') ?? '').trim();
            if (!title) { formEl.querySelector<HTMLInputElement>('#i-title')!.classList.add('invalid'); toast('Describe what is happening first.'); return false; }
            const id = `INC-${2292 + incidents.length}`;
            setIncidents((is) => [{ id, title, serviceId: String(form.get('service')), severity: form.get('severity') as Incident['severity'], status: 'investigating', started: 'Just now', clientsAffected: 0, updates: [{ time: 'Just now', text: 'Investigating.' }] }, ...is]);
            toast(`${id} declared. Affected clients can see it now.`);
          },
        },
      ],
    });

  const viewIncident = (i: Incident) =>
    modal.open({
      title: `${i.id} · ${i.title}`,
      body: (
        <>
          <p className="muted">{SERVICES.find((s) => s.id === i.serviceId)?.name} · started {i.started} · {i.clientsAffected} clients affected</p>
          <ol className="timeline">{i.updates.map((u) => <li key={u.time + u.text}><span className="muted tnum">{u.time}</span>{u.text}</li>)}</ol>
        </>
      ),
      actions: i.status === 'resolved'
        ? [{ label: 'Close', kind: 'primary' }]
        : [
            { label: 'Close' },
            { label: 'Mark resolved', kind: 'primary', onClick: () => { setIncidents((is) => is.map((x) => (x.id === i.id ? { ...x, status: 'resolved', updates: [{ time: 'Just now', text: 'Resolved.' }, ...x.updates] } : x))); toast(`${i.id} marked resolved.`); } },
          ],
    });

  return (
    <>
      <PageHeader
        title="Mettus platform health"
        description="Every Mettus service across XDS, MIE and the shared platform, and the clients they affect."
        actions={
          <>
            <button className="btn" type="button" onClick={() => toast('The public status page is coming soon.')}>Public status page</button>
            <button className="btn primary" type="button" onClick={declare}>Declare incident</button>
          </>
        }
      />

      <div className="tabs-row" role="tablist" aria-label="Company">
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" className="seg" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'All' ? 'All companies' : f === 'Mettus' ? 'Shared platform' : f}
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="card stat-static">
          <div className="label">Services operational</div>
          <div className="value">{operational} <span className="of">of {services.length}</span></div>
          <div className="note">{services.length - operational ? `${services.length - operational} degraded or in maintenance` : 'All services running normally'}</div>
        </div>
        <div className="card stat-static">
          <div className="label">Open incidents</div>
          <div className="value">{open.length}</div>
          <div className="note">{open.length ? `${open.reduce((a, i) => a + i.clientsAffected, 0)} clients affected` : 'Nothing open'}</div>
        </div>
        <div className="card stat-static">
          <div className="label">Calls in the last hour</div>
          <div className="value">{compact(lastHour)}</div>
          <div className="note">{compact(hourly.reduce((a, b) => a + b, 0))} in 24 hours</div>
        </div>
        <div className="card stat-static">
          <div className="label">Error rate (24 hours)</div>
          <div className="value">{errorRate.toFixed(1)}%</div>
          <div className="note">Weighted by calls</div>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>Services</h2>
            <span className="card-sub">Select a service to see its last 30 days.</span>
          </div>
        </div>
        <table className="table activity">
          <thead>
            <tr><th>Service</th><th style={{ width: 100 }}>Company</th><th style={{ width: 150 }}>Status</th><th style={{ width: 120 }}>Uptime (30d)</th><th style={{ width: 110 }}>p95</th><th style={{ width: 110 }}>Errors (24h)</th><th style={{ width: 130 }}>Calls (24h)</th></tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className={selected?.id === s.id ? 'selected' : undefined} onClick={() => setSelected(s)} tabIndex={0} onKeyDown={(k) => k.key === 'Enter' && setSelected(s)}>
                <td><div className="cell-main">{s.name}</div><div className="cell-sub">{s.description}</div></td>
                <td className="muted">{s.company === 'Mettus' ? 'Shared' : s.company}</td>
                <td><Pill tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Pill></td>
                <td className="tnum">{s.uptime30d}%</td>
                <td className="tnum muted">{s.p95Ms} ms</td>
                <td className="tnum">{s.errorRate}%</td>
                <td><Sparkline values={s.hourly} label={`${s.name}: ${s.hourly.reduce((a, b) => a + b, 0).toLocaleString('en-US')} calls in 24 hours`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>Calls per hour</h2>
              <span className="card-sub">{filter === 'All' ? 'All companies' : filter === 'Mettus' ? 'Shared platform' : filter} · last 24 hours</span>
            </div>
          </div>
          <div className="card-body">
            <AreaChart labels={HOURS} values={hourly} unit="calls" label="Calls per hour across the selected services, last 24 hours" format={(n) => (n >= 1000 ? `${n / 1000}K` : String(n))} />
            <TableToggle columns={['Hour', 'Calls']} rows={HOURS.map((h, i) => [h, hourly[i]])} />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>Incidents</h2>
              <span className="card-sub">{open.length} open · last 30 days</span>
            </div>
          </div>
          <ul className="incident-list">
            {incidents.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => viewIncident(i)}>
                  <span className="grow">
                    <span className="cell-main">{i.title}</span>
                    <span className="cell-sub"><span className="code">{i.id}</span> · {SERVICES.find((s) => s.id === i.serviceId)?.name} · {i.started}</span>
                  </span>
                  {i.status === 'resolved' ? <Pill tone="grey">Resolved</Pill> : <Pill tone={SEVERITY[i.severity]}>{i.severity === 'minor' ? 'Minor' : i.severity === 'major' ? 'Major' : 'Critical'} · {i.status}</Pill>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div className="card-title">
            <h2>Clients to watch</h2>
            <span className="card-sub">Client organisations, ordered by failure rate over the last 24 hours.</span>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Client</th><th style={{ width: 100 }}>Company</th><th style={{ width: 130 }}>Calls (24h)</th><th style={{ width: 130 }}>Failed</th><th>Main reason</th><th style={{ width: 120 }}>Health</th><th className="right" style={{ width: 130 }}>Action</th></tr></thead>
          <tbody>
            {[...CLIENTS].sort((a, b) => b.failRate - a.failRate).filter((c) => filter === 'All' || c.company === filter).map((c) => (
              <tr key={c.name}>
                <td className="cell-main">{c.name}</td>
                <td className="muted">{c.company}</td>
                <td className="tnum">{c.calls.toLocaleString('en-US')}</td>
                <td className="tnum">{c.failRate}%</td>
                <td className="muted">{c.reason}</td>
                <td><Pill tone={c.tone}>{c.label}</Pill></td>
                <td className="right"><button className="btn" type="button" onClick={() => toast(`A message to ${c.name}'s administrators would open here.`)}>Contact client</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected && <ServiceDrawer service={selected} incidents={incidents} onClose={() => setSelected(null)} />}
    </>
  );
}
