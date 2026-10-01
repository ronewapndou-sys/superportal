import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChat } from '../../chat';
import { PageHeader } from '../../shell/PageHeader';
import { BarList, CHART_BLUE, CHART_RED, Pill, StackedColumns, TableToggle, useModal, useToast } from '../../ui';
import { ALERT_RULES, CLIENT_HOURLY, CLIENT_SERVICE_IDS, FAILURE_REASONS, INCIDENTS, RECENT_ALERTS, SERVICES, STATUS, TODAY_HOURS, type AlertRule } from './data';
import './monitoring.css';

const hours = TODAY_HOURS;
const success = CLIENT_HOURLY.reduce((a, [s]) => a + s, 0);
const failed = CLIENT_HOURLY.reduce((a, [, f]) => a + f, 0);

export function ClientMonitoringPage() {
  const toast = useToast();
  const modal = useModal();
  const chat = useChat();
  const [rules, setRules] = useState<AlertRule[]>(ALERT_RULES);

  const myServices = SERVICES.filter((s) => CLIENT_SERVICE_IDS.includes(s.id));
  const myIncidents = INCIDENTS.filter((i) => i.status !== 'resolved' && CLIENT_SERVICE_IDS.includes(i.serviceId));
  const successRate = ((success / (success + failed)) * 100).toFixed(1);

  const toggle = (id: string) => {
    const rule = rules.find((r) => r.id === id)!;
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, on: !r.on } : r)));
    toast(`${rule.name} is ${rule.on ? 'off' : 'on'}.`);
  };

  const createRule = () =>
    modal.open({
      title: 'Create alert',
      body: (
        <>
          <div className="form-row">
            <label htmlFor="r-when">Alert me when</label>
            <select className="field" id="r-when" name="when">
              <option value="Failed calls above 10% for 15 minutes">Failed calls go above 10% for 15 minutes</option>
              <option value="No successful calls for 30 minutes during business hours">No successful calls for 30 minutes (business hours)</option>
              <option value="An API user password expires within 7 days">An API user's password is about to expire</option>
              <option value="Liveness failures above 20% in an hour">DOVS liveness failures go above 20% in an hour</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="r-how">Send to</label>
            <select className="field" id="r-how" name="how"><option>Email · it-ops@absa.example</option><option>SMS · •••321</option><option>Email and SMS</option></select>
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Create alert',
          kind: 'primary',
          onClick: (form) => {
            const condition = String(form.get('when'));
            setRules((rs) => [...rs, { id: `r${Date.now()}`, name: condition.split(' ').slice(0, 3).join(' '), condition, channel: String(form.get('how')), on: true, lastFired: 'Never' }]);
            toast('Alert created. It is on.');
          },
        },
      ],
    });

  const showIncident = (id: string) => {
    const i = INCIDENTS.find((x) => x.id === id)!;
    modal.open({
      title: `${i.title}`,
      body: (
        <>
          <p className="muted">{SERVICES.find((s) => s.id === i.serviceId)?.name} · Mettus incident <span className="code">{i.id}</span> · started {i.started}</p>
          <ol className="timeline">{i.updates.map((u) => <li key={u.time + u.text}><span className="muted tnum">{u.time}</span>{u.text}</li>)}</ol>
        </>
      ),
      actions: [{ label: 'Close', kind: 'primary' }],
    });
  };

  return (
    <>
      <PageHeader
        title="Monitoring"
        description="How your organisation's connections to XDS are performing today, and the alerts you've set up."
        actions={
          <>
            <Link className="btn" to="/support/activity">Open activity log</Link>
            <button className="btn primary" type="button" onClick={createRule}>Create alert</button>
          </>
        }
      />

      {myIncidents.map((i) => (
        <div className="banner warn" role="status" key={i.id}>
          <span className="banner-icon" aria-hidden="true">!</span>
          <div className="grow">
            <div className="banner-title">Mettus is working on an issue with {SERVICES.find((s) => s.id === i.serviceId)?.name}</div>
            <div className="banner-text">{i.updates[0].text} · Updated {i.updates[0].time}</div>
          </div>
          <button className="btn" type="button" onClick={() => showIncident(i.id)}>View updates</button>
        </div>
      ))}

      <div className="stats">
        <div className="card stat-static">
          <div className="label">Successful calls (today)</div>
          <div className="value">{successRate}%</div>
          <div className="note">{failed} of {(success + failed).toLocaleString('en-US')} calls failed</div>
        </div>
        <div className="card stat-static">
          <div className="label">Calls today</div>
          <div className="value">{(success + failed).toLocaleString('en-US')}</div>
          <div className="note">Since midnight · up to 11:00</div>
        </div>
        <div className="card stat-static">
          <div className="label">p95 response time</div>
          <div className="value">740 ms</div>
          <div className="note">XDS Connect Production</div>
        </div>
        <div className="card stat-static">
          <div className="label">Alerts fired today</div>
          <div className="value">2</div>
          <div className="note">{rules.filter((r) => r.on).length} of {rules.length} alerts are on</div>
        </div>
      </div>

      <div className="two-col wide-left">
        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>Calls per hour today</h2>
              <span className="card-sub">All products · XDS Connect Production</span>
            </div>
          </div>
          <div className="card-body">
            <StackedColumns
              labels={hours}
              series={[{ name: 'Successful', color: CHART_BLUE }, { name: 'Failed', color: CHART_RED }]}
              values={CLIENT_HOURLY}
              label="Successful and failed calls per hour today"
            />
            <TableToggle columns={['Hour', 'Successful', 'Failed']} rows={hours.map((h, i) => [h, CLIENT_HOURLY[i][0], CLIENT_HOURLY[i][1]])} />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>Why calls failed</h2>
              <span className="card-sub">{failed} failed calls today</span>
            </div>
          </div>
          <div className="card-body">
            <BarList items={FAILURE_REASONS} unit="failed calls" />
            <button className="btn" type="button" style={{ marginTop: 18 }} onClick={() => chat.ask('My ticket expired')}>How do I fix expired tickets?</button>
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>Services you use</h2>
              <span className="card-sub">Live status from Mettus.</span>
            </div>
          </div>
          <ul className="svc-list">
            {myServices.map((s) => {
              const inc = myIncidents.find((i) => i.serviceId === s.id);
              return (
                <li key={s.id}>
                  <span className="grow">
                    <span className="cell-main">{s.name}</span>
                    <span className="cell-sub">{s.uptime30d}% uptime in the last 30 days</span>
                  </span>
                  {inc && <button type="button" className="link-btn" onClick={() => showIncident(inc.id)}>{inc.id}</button>}
                  <Pill tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Pill>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>Recent alerts</h2>
              <span className="card-sub">Sent to your team in the last 7 days.</span>
            </div>
          </div>
          <ul className="svc-list">
            {RECENT_ALERTS.map((a) => (
              <li key={a.time + a.text}>
                <Pill tone={a.tone}>{a.label}</Pill>
                <span className="grow">
                  <span>{a.text}</span>
                  <span className="cell-sub">{a.time}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div className="card-title">
            <h2>Alerts</h2>
            <span className="card-sub">Who hears about problems, and when.</span>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Alert</th><th style={{ width: 240 }}>Send to</th><th style={{ width: 150 }}>Last sent</th><th className="right" style={{ width: 110 }}>On</th></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td><div className="cell-main">{r.name}</div><div className="cell-sub">{r.condition}</div></td>
                <td className="muted">{r.channel}</td>
                <td className="muted">{r.lastFired}</td>
                <td className="right">
                  <button type="button" role="switch" aria-checked={r.on} aria-label={`${r.name} alert`} className="switch" onClick={() => toggle(r.id)}>
                    <span />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
