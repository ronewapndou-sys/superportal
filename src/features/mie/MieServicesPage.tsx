import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BULK_REPORTS } from '@/components/reports/bulk-file';
import { useChat } from '../../chat';
import { useFpz } from '../../chat/FpzContext';
import { FPZ_BRANCHES, FPZ_SLOTS, FPZ_STATUS_LABEL, FPZ_STATUS_TONE, formatFpzDate, tomorrowIso, type NewFpzBooking } from '../../chat/fpz';
import { PageHeader } from '../../shell/PageHeader';
import { useOrg } from '../../shell/OrgContext';
import { Pill, useModal, useToast } from '../../ui';
import { CHECK_STATUS_LABEL, CHECK_STATUS_TONE, checkLine, useMieChecks } from './checks';

/** MIE screening check status, FPZ appointment bookings and fingerprint-taking training. */
export function MieServicesPage() {
  const { org, options, setOrg } = useOrg();
  const hasMie = options.includes('MIE');
  const chat = useChat();
  const toast = useToast();
  const modal = useModal();
  const { isPending, jobs, active, recent } = useMieChecks();
  const { bookings, createBooking } = useFpz();

  // This is MIE-only. A direct link while XDS is picked in the top bar flips it to match,
  // but only for accounts that actually have MIE: there's nothing to switch to otherwise.
  useEffect(() => {
    if (hasMie && org !== 'MIE' && org !== 'All organisations') setOrg('MIE');
  }, [hasMie, org, setOrg]);

  const bookAppointment = () =>
    modal.open({
      title: 'Book an FPZ fingerprint appointment',
      body: (
        <>
          <p className="muted">For a criminal record check that needs fingerprints captured at a Fingerprint Zone branch.</p>
          <div className="form-row">
            <label htmlFor="fpz-name">Candidate name</label>
            <input className="field" id="fpz-name" name="candidateName" placeholder="Full name" />
          </div>
          <div className="form-row">
            <label htmlFor="fpz-idnum">ID number (optional)</label>
            <input className="field" id="fpz-idnum" name="idNumber" placeholder="13-digit South African ID number" />
          </div>
          <div className="nt-grid">
            <div className="form-row">
              <label htmlFor="fpz-branch">Branch</label>
              <select className="field" id="fpz-branch" name="branchId" defaultValue={FPZ_BRANCHES[0].id}>
                {FPZ_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="fpz-time">Time</label>
              <select className="field" id="fpz-time" name="time" defaultValue={FPZ_SLOTS[0]}>
                {FPZ_SLOTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="fpz-date">Date</label>
            <input className="field" id="fpz-date" name="date" type="date" min={tomorrowIso()} defaultValue={tomorrowIso()} />
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Book appointment',
          kind: 'primary',
          onClick: (form, formEl) => {
            const candidateName = String(form.get('candidateName') ?? '').trim();
            if (!candidateName) {
              formEl.querySelector<HTMLInputElement>('#fpz-name')?.classList.add('invalid');
              toast("Add the candidate's name.");
              return false;
            }
            const booking: NewFpzBooking = {
              candidateName,
              idNumber: String(form.get('idNumber') ?? '').trim() || undefined,
              branchId: String(form.get('branchId') ?? FPZ_BRANCHES[0].id),
              date: String(form.get('date') ?? '') || tomorrowIso(),
              time: String(form.get('time') ?? FPZ_SLOTS[0]),
            };
            const created = createBooking(booking);
            toast(`Booked ${created.id} for ${candidateName}.`);
          },
        },
      ],
    });

  if (!hasMie) {
    return (
      <>
        <PageHeader title="MIE Fingerprint Zone" description="Screening check status, FPZ appointment bookings and fingerprint-taking training for your MIE products." />
        <section className="card">
          <div className="card-body">
            <p>Your account doesn't have MIE access yet, so there's nothing to show here.</p>
            <p className="muted">Ask your administrator to add MIE to your account, or log a ticket and we'll help.</p>
            <button className="btn primary" type="button" style={{ marginTop: 12 }} onClick={() => chat.startTicket()}>Log a support ticket</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="MIE Fingerprint Zone"
        description="Screening check status, FPZ appointment bookings and fingerprint-taking training for your MIE products."
        actions={<button className="btn primary" type="button" onClick={bookAppointment}>Book an appointment</button>}
      />

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>Screening checks</h2>
            <span className="card-sub">Criminal Record Checks, Qualification Verification, Social Media Screening and Employee Risk Management batches.</span>
          </div>
        </div>
        <div className="card-body">
          {isPending ? (
            <p className="muted">Looking up your MIE checks…</p>
          ) : jobs.length === 0 ? (
            <p className="muted">Nothing running right now. Start a batch of checks from <Link to="/reports">Reports</Link>, under Bulk reports.</p>
          ) : (
            <>
              <ul className="svc-list">
                {[...active, ...recent].map((j) => (
                  <li key={j.id}>
                    <span className="grow">
                      <span className="cell-main">{j.clientReference ?? j.fileName}</span>
                      <span className="cell-sub">{checkLine(j)} · {BULK_REPORTS[j.reportType].label} · reference {j.reference}</span>
                    </span>
                    <Pill tone={CHECK_STATUS_TONE[j.status]}>{CHECK_STATUS_LABEL[j.status]}</Pill>
                  </li>
                ))}
              </ul>
              <Link className="link-btn" to="/reports" style={{ marginTop: 12, display: 'inline-block' }}>Open Reports</Link>
            </>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>FPZ bookings</h2>
            <span className="card-sub">Fingerprint appointments booked for candidates.</span>
          </div>
        </div>
        <div className="card-body">
          {bookings.length === 0 ? (
            <p className="muted">No fingerprint appointments booked yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Reference</th><th>Candidate</th><th>Branch</th><th>When</th><th className="right">Status</th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const branch = FPZ_BRANCHES.find((x) => x.id === b.branchId);
                  return (
                    <tr key={b.id}>
                      <td className="code cell-main">{b.id}</td>
                      <td>{b.candidateName}</td>
                      <td className="muted">{branch?.name ?? 'Branch'}</td>
                      <td className="muted">{formatFpzDate(b.date)} at {b.time}</td>
                      <td className="right"><Pill tone={FPZ_STATUS_TONE[b.status]}>{FPZ_STATUS_LABEL[b.status]}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>Fingerprint-taking training</h2>
            <span className="card-sub">Train your own staff to capture compliant prints in-house.</span>
          </div>
        </div>
        <div className="card-body">
          <p>
            MIE runs a fingerprint-taking course so your own HR or onboarding staff can capture compliant prints in-house, instead of sending every
            candidate to an FPZ branch. It's a half-day session, classroom plus hands-on practice, and everyone who completes it gets a certificate
            of competence.
          </p>
          <button
            className="btn"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => chat.startTicket({ subject: 'Register staff for MIE fingerprint-taking training', area: 'MIE training' })}
          >
            Request training
          </button>
        </div>
      </section>
    </>
  );
}
