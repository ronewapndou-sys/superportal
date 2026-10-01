import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TICKET_AREAS, PRIORITIES, RESPONSE_TIME } from '../chat/tickets';
import { AssessmentPanel } from '@/components/intelligence/intelligence';
import { PageHeader } from '../shell/PageHeader';
import { useOrg } from '../shell/OrgContext';
import { Pill, useModal, useToast } from '../ui';
import { STATUS_LABEL, STATUS_TONE, SUPPORT_TEAM, useTickets, when, type Company, type Ticket, type TicketPriority } from './TicketsContext';
import './tickets.css';

type Filter = 'active' | 'waiting' | 'resolved' | 'all';

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function TicketsPage() {
  const { audience, tickets, notices, createTicket, reply, setStatus, markTicketRead } = useTickets();
  const toast = useToast();
  const modal = useModal();
  const { org } = useOrg();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('active');
  const [company, setCompany] = useState<'All' | Company>('All');
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<string | undefined>();
  const threadRef = useRef<HTMLDivElement>(null);
  const isAgent = audience === 'agent';
  const labels = STATUS_LABEL[audience];

  const waitingOnMe = (tk: Ticket) => (isAgent ? tk.status === 'open' || tk.status === 'in-progress' : tk.status === 'waiting-client');
  const FILTERS: { id: Filter; label: string; test: (t: Ticket) => boolean }[] = [
    { id: 'active', label: 'Open', test: (tk) => tk.status !== 'resolved' },
    { id: 'waiting', label: isAgent ? 'Needs a reply' : 'Waiting for you', test: waitingOnMe },
    { id: 'resolved', label: 'Resolved', test: (tk) => tk.status === 'resolved' },
    { id: 'all', label: 'All', test: () => true },
  ];

  const sorted = useMemo(() => [...tickets].sort((a, b) => b.updatedAt - a.updatedAt), [tickets]);
  const visible = sorted.filter((tk) => FILTERS.find((f) => f.id === filter)!.test(tk) && (company === 'All' || tk.company === company));
  const selectedId = params.get('id') ?? visible[0]?.id;
  const selected = tickets.find((tk) => tk.id === selectedId);
  const unreadIds = new Set(notices.filter((n) => !n.read && n.ticketId).map((n) => n.ticketId));

  useEffect(() => {
    if (selected) markTicketRead(selected.id);
  }, [selected?.id, selected?.messages.length, markTicketRead]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [selected?.id, selected?.messages.length]);

  const select = (id: string) => setParams({ id }, { replace: true });

  // /support/tickets?new=1 (from Home and the product pages) opens the new ticket form.
  useEffect(() => {
    if (params.get('new') === '1' && !isAgent) {
      setParams({}, { replace: true });
      newTicket();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !draft.trim()) return;
    reply(selected.id, draft.trim(), attachment);
    setDraft('');
    setAttachment(undefined);
    toast(isAgent ? `Reply sent to ${selected.client}.` : `Reply sent to ${SUPPORT_TEAM[selected.company]}.`);
  };

  const newTicket = () =>
    modal.open({
      title: 'New support ticket',
      body: (
        <>
          <p className="muted">It goes to the right support team for the company you choose. Replies show here and in your notifications.</p>
          <div className="form-row">
            <label htmlFor="nt-company">Company</label>
            <select className="field" id="nt-company" name="company" defaultValue={org === 'MIE' ? 'MIE' : 'XDS'}>
              <option value="XDS">XDS</option>
              <option value="MIE">MIE</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="nt-subject">Subject</label>
            <input className="field" id="nt-subject" name="subject" placeholder="For example, DOVS results not returning" />
          </div>
          <div className="nt-grid">
            <div className="form-row">
              <label htmlFor="nt-area">Product or area</label>
              <select className="field" id="nt-area" name="area">{TICKET_AREAS.map((a) => <option key={a}>{a}</option>)}</select>
            </div>
            <div className="form-row">
              <label htmlFor="nt-pri">Priority</label>
              <select className="field" id="nt-pri" name="priority" defaultValue="Normal">{PRIORITIES.map((p) => <option key={p.value}>{p.value}</option>)}</select>
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="nt-desc">What's happening?</label>
            <textarea className="field nt-area" id="nt-desc" name="description" rows={4} placeholder="What you expected, what happened, and when it started." />
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Log ticket',
          kind: 'primary',
          onClick: (form, formEl) => {
            const subject = String(form.get('subject') ?? '').trim();
            const description = String(form.get('description') ?? '').trim();
            if (!subject || !description) {
              formEl.querySelectorAll<HTMLInputElement>('#nt-subject, #nt-desc').forEach((el) => !el.value.trim() && el.classList.add('invalid'));
              toast('Add a subject and describe the problem.');
              return false;
            }
            const priority = form.get('priority') as TicketPriority;
            const tk = createTicket({ subject, description, company: form.get('company') as Company, area: String(form.get('area')), priority });
            setFilter('active');
            select(tk.id);
            toast(`${tk.id} logged. First reply ${RESPONSE_TIME[priority]}.`);
          },
        },
      ],
    });

  return (
    <>
      <PageHeader
        title={isAgent ? 'Support desk' : 'Support tickets'}
        description={isAgent
          ? 'Tickets from client organisations for XDS and MIE. Replies go straight to the client in their portal.'
          : 'Everything you have asked XDS and MIE support, in one place. When support replies, you get a notification.'}
        actions={!isAgent && <button className="btn primary" type="button" onClick={newTicket}>New ticket</button>}
      />

      <div className="tk-layout">
        <section className="card tk-list">
          <div className="tk-list-head">
            <div className="tabs" role="tablist" aria-label="Filter tickets">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" role="tab" className="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label} <span className="count">{tickets.filter(f.test).length}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="tk-company">
            <label htmlFor="tk-company">Company</label>
            <select id="tk-company" className="field" value={company} onChange={(e) => setCompany(e.target.value as 'All' | Company)}>
              <option value="All">XDS and MIE</option>
              <option value="XDS">XDS</option>
              <option value="MIE">MIE</option>
            </select>
          </div>
          <ul>
            {visible.map((tk) => {
              const unread = unreadIds.has(tk.id);
              return (
                <li key={tk.id}>
                  <button type="button" className={`tk-item${tk.id === selected?.id ? ' on' : ''}${unread ? ' unread' : ''}`} onClick={() => select(tk.id)} aria-current={tk.id === selected?.id}>
                    <span className="tk-item-top">
                      <span className="code">{tk.id}</span>
                      <span className="muted">{when(tk.updatedAt)}</span>
                    </span>
                    <span className="tk-item-subject">
                      {unread && <span className="unread-dot" aria-label="Unread reply" />}
                      {tk.subject}
                    </span>
                    <span className="tk-item-meta">
                      <span>{tk.company} · {isAgent ? tk.client : tk.area}</span>
                      <Pill tone={STATUS_TONE[tk.status]}>{labels[tk.status]}</Pill>
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && <li className="tk-empty">No tickets here. {isAgent ? 'Nice work.' : 'Choose New ticket if you need help.'}</li>}
          </ul>
        </section>

        {selected ? (
          <section className="card tk-thread">
            <div className="tk-thread-head">
              <div>
                <div className="tk-thread-id"><span className="code">{selected.id}</span> · {selected.company} · {selected.area} · {selected.priority} priority</div>
                <h2>{selected.subject}</h2>
                <div className="tk-thread-people">
                  {isAgent ? <>From <strong>{selected.requester}</strong>, {selected.client}</> : <>Handled by <strong>{selected.assignee ?? SUPPORT_TEAM[selected.company]}</strong>, {SUPPORT_TEAM[selected.company]}</>}
                  {selected.attached && <> · Call details: <span className="code">{selected.attached}</span></>}
                </div>
              </div>
              <div className="tk-thread-actions">
                <Pill tone={STATUS_TONE[selected.status]}>{labels[selected.status]}</Pill>
                {selected.status === 'resolved'
                  ? <button className="btn" type="button" onClick={() => { setStatus(selected.id, 'in-progress'); toast(`${selected.id} reopened.`); }}>Reopen</button>
                  : <button className="btn" type="button" onClick={() => { setStatus(selected.id, 'resolved'); toast(`${selected.id} marked resolved.`); }}>Mark resolved</button>}
              </div>
            </div>

            {isAgent && selected.assessment && <AssessmentPanel assessment={selected.assessment} ticketId={selected.id} resolved={selected.status === 'resolved'} />}

            <div className="tk-messages" ref={threadRef}>
              {selected.messages.map((m) => {
                const mine = (m.from === 'agent') === isAgent;
                return (
                  <article key={m.id} className={`tk-msg${mine ? ' mine' : ''}`}>
                    <span className={`tk-avatar ${m.from}`} aria-hidden="true">{initials(m.author)}</span>
                    <div className="tk-msg-body">
                      <div className="tk-msg-head">
                        <strong>{mine ? 'You' : m.author}</strong>
                        <span className="muted">{m.from === 'agent' ? SUPPORT_TEAM[selected.company] : selected.client}</span>
                        <span className="muted tk-msg-time">{when(m.at)}</span>
                      </div>
                      <p>{m.text}</p>
                      {m.attachment && (
                        <button type="button" className="tk-file" onClick={() => toast(`${m.attachment} would download here.`)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.5l-8.5 8.5a5 5 0 0 1-7-7L14 5.5a3.5 3.5 0 0 1 5 5L10.5 19a2 2 0 0 1-3-3l8-8" /></svg>
                          {m.attachment}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {selected.status === 'resolved' ? (
              <div className="tk-closed">This ticket is resolved. Reopen it if you need more help.</div>
            ) : (
              <form className="tk-compose" onSubmit={send}>
                <label htmlFor="tk-reply" className="sr-only">Reply</label>
                <textarea
                  id="tk-reply"
                  className="field"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isAgent ? `Reply to ${selected.requester}…` : `Reply to ${SUPPORT_TEAM[selected.company]}…`}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e); }}
                />
                <div className="tk-compose-foot">
                  <div className="tk-compose-left">
                    <button type="button" className="btn" onClick={() => setAttachment(attachment ? undefined : 'screenshot.png')}>
                      {attachment ? 'Remove attachment' : 'Attach a file'}
                    </button>
                    {attachment && <span className="tk-file static">{attachment}</span>}
                  </div>
                  <button className="btn primary" type="submit" disabled={!draft.trim()}>Send reply</button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <section className="card tk-thread tk-none">
            <p>Select a ticket to see the conversation.</p>
          </section>
        )}
      </div>
    </>
  );
}
