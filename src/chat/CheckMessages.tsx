import { Link } from 'react-router-dom';
import { BULK_REPORTS } from '@/components/reports/bulk-file';
import { CHECK_STATUS_LABEL, CHECK_STATUS_TONE, checkLine, useMieChecks } from '../features/mie/checks';

/** "How far are my checks?": MIE screening batches and where each one stands, shown inside the chat. */
export function CheckStatusMessage() {
  const { isPending, jobs, active, recent } = useMieChecks();

  if (isPending) return <p>Looking up your MIE checks…</p>;

  if (jobs.length === 0) {
    return (
      <div className="pm">
        <p>You don't have any MIE screening checks running right now.</p>
        <p className="muted">Start a batch of checks from <Link to="/reports">Reports</Link>, under Bulk reports.</p>
      </div>
    );
  }

  return (
    <div className="pm">
      <p>{active.length > 0 ? "Here's where your checks stand:" : 'Nothing running right now. Your most recent checks:'}</p>
      <ul className="pm-list">
        {[...active, ...recent.slice(0, 3)].map((j) => (
          <li key={j.id}>
            <div className="pm-row">
              <strong>{j.clientReference ?? j.fileName}</strong>
              <span className={`pill ${CHECK_STATUS_TONE[j.status]}`}>{CHECK_STATUS_LABEL[j.status]}</span>
            </div>
            <p>{checkLine(j)}</p>
            <p className="muted">{BULK_REPORTS[j.reportType].label} · reference {j.reference}</p>
          </li>
        ))}
      </ul>
      <Link className="link-btn" to="/mie/fingerprint-zone">Open MIE services</Link>
    </div>
  );
}
