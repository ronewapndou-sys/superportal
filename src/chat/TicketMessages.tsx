import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Pill } from '../ui';
import { useChat } from './ChatContext';
import { STATUS_LABEL, STATUS_TONE, useTickets, when, type TicketPriority } from '../tickets/TicketsContext';
import { PRIORITIES, RESPONSE_TIME, TICKET_AREAS, type TicketDraft } from './tickets';

/** Support ticket form shown inside the chat. */
export function TicketForm({ messageId, draft, submitted, cancelled }: { messageId: number; draft: TicketDraft; submitted?: string; cancelled?: boolean }) {
  const { submitTicket, cancelTicket } = useChat();
  const { user } = useAuth();
  const [subject, setSubject] = useState(draft.subject ?? '');
  const [area, setArea] = useState(draft.area ?? TICKET_AREAS[0]);
  const [priority, setPriority] = useState<TicketPriority>('Normal');
  const [description, setDescription] = useState('');
  const [attach, setAttach] = useState(Boolean(draft.attached));
  const [error, setError] = useState('');

  if (cancelled) return <div className="ticket-card muted">Ticket cancelled.</div>;
  if (submitted) {
    return (
      <div className="ticket-card">
        <div className="ticket-card-head"><Link className="code" to={`/support/tickets?id=${submitted}`}>{submitted}</Link><Pill tone="grey">Open</Pill></div>
        <div className="cell-main">{subject}</div>
        <div className="cell-sub">{area} · {priority} priority{attach && draft.attached ? ` · ${draft.attached} attached` : ''}</div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Add a subject and describe the problem.');
      return;
    }
    submitTicket(messageId, { subject: subject.trim(), area, priority, description: description.trim(), attached: attach ? draft.attached : undefined });
  };

  return (
    <form className="ticket-form" onSubmit={submit} noValidate>
      <div className="ticket-form-title">Log a support ticket</div>
      <p className="ticket-form-sub">Support replies here in the portal, with a copy to {user?.email ?? 'your email'}.</p>
      {error && <p className="ticket-error" role="alert">{error}</p>}
      <label className="tf-label" htmlFor={`t-subject-${messageId}`}>Subject</label>
      <input id={`t-subject-${messageId}`} className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="For example, DOVS results not returning" />
      <div className="tf-row">
        <div>
          <label className="tf-label" htmlFor={`t-area-${messageId}`}>Product or area</label>
          <select id={`t-area-${messageId}`} className="field" value={area} onChange={(e) => setArea(e.target.value)}>
            {TICKET_AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="tf-label" htmlFor={`t-pri-${messageId}`}>Priority</label>
          <select id={`t-pri-${messageId}`} className="field" value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            {PRIORITIES.map((p) => <option key={p.value}>{p.value}</option>)}
          </select>
        </div>
      </div>
      <p className="tf-hint">{PRIORITIES.find((p) => p.value === priority)?.hint}. First reply {RESPONSE_TIME[priority]}.</p>
      <label className="tf-label" htmlFor={`t-desc-${messageId}`}>What's happening?</label>
      <textarea id={`t-desc-${messageId}`} className="field tf-area" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you expected, what happened, and when it started." />
      {draft.attached && (
        <label className="check tf-check"><input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> Attach call details for {draft.attached}</label>
      )}
      <div className="tf-actions">
        <button className="btn" type="button" onClick={() => cancelTicket(messageId)}>Cancel</button>
        <button className="btn primary" type="submit">Log ticket</button>
      </div>
    </form>
  );
}

/** The signed-in user's tickets, shown inside the chat. */
export function TicketList() {
  const { startTicket } = useChat();
  const { tickets } = useTickets();
  return (
    <div className="ticket-list">
      <div className="ticket-form-title">Your support tickets</div>
      <ul>
        {tickets.map((t) => (
          <li key={t.id}>
            <div className="ticket-card-head"><Link className="code" to={`/support/tickets?id=${t.id}`}>{t.id}</Link><Pill tone={STATUS_TONE[t.status]}>{STATUS_LABEL.client[t.status]}</Pill></div>
            <div className="cell-main">{t.subject}</div>
            <div className="cell-sub">{t.company} · {t.area} · updated {when(t.updatedAt).toLowerCase()}</div>
          </li>
        ))}
      </ul>
      <div className="ticket-list-links">
        <Link className="link-btn" to="/support/tickets">Open Support tickets</Link>
        <button className="link-btn" type="button" onClick={() => startTicket()}>Log another ticket</button>
      </div>
    </div>
  );
}
