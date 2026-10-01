import { useState } from 'react';
import { Pill } from '../ui';
import { useChat } from './ChatContext';
import { useFpz } from './FpzContext';
import { FPZ_BRANCHES, FPZ_SLOTS, FPZ_STATUS_LABEL, FPZ_STATUS_TONE, formatFpzDate, tomorrowIso } from './fpz';

/** Booking form for an FPZ (Fingerprint Zone) appointment, shown inside the chat. */
export function FpzBookingForm({ messageId, submitted, cancelled }: { messageId: number; submitted?: string; cancelled?: boolean }) {
  const { submitFpzBooking, cancelFpzBooking } = useChat();
  const [candidateName, setCandidateName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [branchId, setBranchId] = useState(FPZ_BRANCHES[0].id);
  const [date, setDate] = useState(tomorrowIso());
  const [time, setTime] = useState(FPZ_SLOTS[0]);
  const [error, setError] = useState('');

  const branch = FPZ_BRANCHES.find((b) => b.id === branchId) ?? FPZ_BRANCHES[0];

  if (cancelled) return <div className="ticket-card muted">Booking cancelled.</div>;
  if (submitted) {
    return (
      <div className="ticket-card">
        <div className="ticket-card-head"><span className="code">{submitted}</span><Pill tone="amber">Booked</Pill></div>
        <div className="cell-main">{candidateName}</div>
        <div className="cell-sub">{branch.name} · {formatFpzDate(date)} at {time}</div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      setError("Add the candidate's name.");
      return;
    }
    submitFpzBooking(messageId, { candidateName: candidateName.trim(), idNumber: idNumber.trim() || undefined, branchId, date, time });
  };

  return (
    <form className="ticket-form" onSubmit={submit} noValidate>
      <div className="ticket-form-title">Book an FPZ fingerprint appointment</div>
      <p className="ticket-form-sub">For a criminal record check that needs fingerprints captured at a Fingerprint Zone branch.</p>
      {error && <p className="ticket-error" role="alert">{error}</p>}
      <label className="tf-label" htmlFor={`fpz-name-${messageId}`}>Candidate name</label>
      <input id={`fpz-name-${messageId}`} className="field" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Full name" />
      <label className="tf-label" htmlFor={`fpz-id-${messageId}`}>ID number (optional)</label>
      <input id={`fpz-id-${messageId}`} className="field" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="13-digit South African ID number" />
      <div className="tf-row">
        <div>
          <label className="tf-label" htmlFor={`fpz-branch-${messageId}`}>Branch</label>
          <select id={`fpz-branch-${messageId}`} className="field" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {FPZ_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="tf-label" htmlFor={`fpz-time-${messageId}`}>Time</label>
          <select id={`fpz-time-${messageId}`} className="field" value={time} onChange={(e) => setTime(e.target.value)}>
            {FPZ_SLOTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <label className="tf-label" htmlFor={`fpz-date-${messageId}`}>Date</label>
      <input id={`fpz-date-${messageId}`} type="date" className="field" min={tomorrowIso()} value={date} onChange={(e) => setDate(e.target.value)} />
      <p className="tf-hint">{branch.address} · {branch.hours}. Bring a valid ID document; the appointment takes about 15 minutes.</p>
      <div className="tf-actions">
        <button className="btn" type="button" onClick={() => cancelFpzBooking(messageId)}>Cancel</button>
        <button className="btn primary" type="submit">Book appointment</button>
      </div>
    </form>
  );
}

/** The signed-in user's FPZ bookings, shown inside the chat. */
export function FpzBookingList() {
  const { bookings } = useFpz();
  const { ask } = useChat();
  return (
    <div className="ticket-list">
      <div className="ticket-form-title">Your FPZ bookings</div>
      {bookings.length === 0 ? (
        <p className="muted">No fingerprint appointments booked yet.</p>
      ) : (
        <ul>
          {bookings.map((b) => {
            const branch = FPZ_BRANCHES.find((x) => x.id === b.branchId);
            return (
              <li key={b.id}>
                <div className="ticket-card-head"><span className="code">{b.id}</span><Pill tone={FPZ_STATUS_TONE[b.status]}>{FPZ_STATUS_LABEL[b.status]}</Pill></div>
                <div className="cell-main">{b.candidateName}</div>
                <div className="cell-sub">{branch?.name ?? 'Branch'} · {formatFpzDate(b.date)} at {b.time}</div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="ticket-list-links">
        <button className="link-btn" type="button" onClick={() => ask('Book a fingerprint appointment')}>Book another</button>
      </div>
    </div>
  );
}
