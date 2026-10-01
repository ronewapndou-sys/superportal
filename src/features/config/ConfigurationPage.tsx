import { useState } from 'react';
import { PageHeader } from '../../shell/PageHeader';
import { useToast } from '../../ui';
import {
  ALERT_KINDS,
  CHANNELS,
  DEFAULT_CONFIG,
  REPORT_FIELDS,
  SESSION_TIMEOUTS,
  loadConfig,
  saveConfig,
  type AlertKindId,
  type ChannelId,
  type ConfigState,
} from './data';

/** Organisation-wide configuration: report field exclusions, alert channels and security defaults. */
export function ConfigurationPage() {
  const toast = useToast();
  const [config, setConfig] = useState<ConfigState>(loadConfig);

  const update = (next: ConfigState, message: string) => {
    setConfig(next);
    saveConfig(next);
    toast(message);
  };

  const toggleField = (id: ConfigState['excludedReportFields'][number]) => {
    const on = !config.excludedReportFields.includes(id);
    const excludedReportFields = on
      ? [...config.excludedReportFields, id]
      : config.excludedReportFields.filter((f) => f !== id);
    const label = REPORT_FIELDS.find((f) => f.id === id)!.label;
    update({ ...config, excludedReportFields }, `${label} ${on ? 'excluded from' : 'included in'} reports. Saved.`);
  };

  const toggleChannel = (alert: AlertKindId, channel: ChannelId) => {
    const current = config.alertChannels[alert];
    const on = !current.includes(channel);
    const next = on ? [...current, channel] : current.filter((c) => c !== channel);
    update({ ...config, alertChannels: { ...config.alertChannels, [alert]: next } }, 'Alert channels updated. Saved.');
  };

  const reset = () => update(DEFAULT_CONFIG, 'Configuration reset to defaults.');

  return (
    <>
      <PageHeader
        title="Configuration"
        description="Organisation-wide settings: what reports leave out, how alerts reach you, and sign-in defaults for everyone on the account."
        actions={<button className="btn" type="button" onClick={reset}>Reset to defaults</button>}
      />

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>Report field exclusions</h2>
            <span className="card-sub">Leave these out of exported reports, activity logs and bulk files, across XDS and MIE.</span>
          </div>
        </div>
        <ul className="svc-list">
          {REPORT_FIELDS.map((f) => (
            <li key={f.id}>
              <span className="grow">
                <span className="cell-main">{f.label}</span>
                {f.description && <span className="cell-sub">{f.description}</span>}
              </span>
              <label className="check">
                <input
                  type="checkbox"
                  checked={config.excludedReportFields.includes(f.id)}
                  onChange={() => toggleField(f.id)}
                />
                Exclude
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div className="card-title">
            <h2>Notifications and alerts</h2>
            <span className="card-sub">Choose how each kind of alert reaches your organisation. More than one channel can be on at once.</span>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Alert</th>
                {CHANNELS.map((c) => <th key={c.id} style={{ width: 90 }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {ALERT_KINDS.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-main">{a.label}</div>
                    <div className="cell-sub">{a.description}</div>
                  </td>
                  {CHANNELS.map((c) => (
                    <td key={c.id}>
                      <input
                        type="checkbox"
                        aria-label={`${a.label} by ${c.label}`}
                        checked={config.alertChannels[a.id].includes(c.id)}
                        onChange={() => toggleChannel(a.id, c.id)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ob-two" style={{ marginTop: 16 }}>
            <div className="form-row">
              <label htmlFor="cfg-whatsapp">WhatsApp number</label>
              <input
                id="cfg-whatsapp"
                className="field"
                placeholder="e.g. +27 82 123 4567"
                value={config.whatsappNumber}
                onChange={(e) => update({ ...config, whatsappNumber: e.target.value }, 'WhatsApp number saved.')}
              />
            </div>
            <div className="form-row">
              <label htmlFor="cfg-phone">Phone number</label>
              <input
                id="cfg-phone"
                className="field"
                placeholder="e.g. +27 11 234 5678"
                value={config.phoneNumber}
                onChange={(e) => update({ ...config, phoneNumber: e.target.value }, 'Phone number saved.')}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div className="card-title">
            <h2>Sign-in defaults</h2>
            <span className="card-sub">Applies to everyone with access to this account.</span>
          </div>
        </div>
        <div className="card-body">
          <label className="check" style={{ marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={config.requireMfa}
              onChange={(e) => update({ ...config, requireMfa: e.target.checked }, `Multi-factor sign-in ${e.target.checked ? 'required' : 'optional'} for everyone. Saved.`)}
            />
            Require multi-factor sign-in for every user
          </label>
          <div className="form-row" style={{ maxWidth: 280 }}>
            <label htmlFor="cfg-timeout">Session timeout</label>
            <select
              id="cfg-timeout"
              className="field"
              value={config.sessionTimeoutMinutes}
              onChange={(e) => update({ ...config, sessionTimeoutMinutes: Number(e.target.value) }, 'Session timeout saved.')}
            >
              {SESSION_TIMEOUTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <span className="ob-help">People are signed out after this long without activity.</span>
          </div>
        </div>
      </section>
    </>
  );
}
