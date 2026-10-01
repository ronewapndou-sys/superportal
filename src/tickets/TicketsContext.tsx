import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { companyFromRole } from '../auth/accounts';
import { useAuth } from '../auth/AuthContext';
import { useTickets as useClientPortalTickets } from '@/lib/api/queries';
import type { DecisionAssessment, Ticket as CxoTicket } from '@/lib/api/types';
import { SUITE_LABEL } from '@/lib/suites';
import { useToast } from '../ui';

/*
 * Support tickets and notifications shared by the client portal (Support tickets page, assistant, bell)
 * and the Mettus support desk. Demo only: stored in this browser's localStorage so a client and an agent
 * can talk to each other by switching accounts, or in two tabs.
 */

export type Company = 'XDS' | 'MIE';
export type TicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type TicketStatus = 'open' | 'in-progress' | 'waiting-client' | 'resolved';
export type Audience = 'client' | 'agent';

export type TicketMessage = { id: string; from: 'client' | 'agent'; author: string; text: string; at: number; attachment?: string };

export type Ticket = {
  id: string;
  subject: string;
  company: Company;
  area: string;
  priority: TicketPriority;
  status: TicketStatus;
  client: string;
  requester: string;
  assignee?: string;
  attached?: string;
  /** set on access requests the decision engine referred: for support staff only, never shown to the client */
  assessment?: DecisionAssessment;
  createdAt: number;
  updatedAt: number;
  messages: TicketMessage[];
};

export type Notice = { id: string; audience: Audience; title: string; text: string; at: number; link: string; ticketId?: string; read: boolean };

export type NewTicket = { subject: string; company: Company; area: string; priority: TicketPriority; description: string; attached?: string; attachment?: string; assessment?: DecisionAssessment };

const CLIENT_ORG = 'ABSA';
const AGENTS: Record<Company, string> = { XDS: 'Lerato M.', MIE: 'Sipho K.' };
export const SUPPORT_TEAM: Record<Company, string> = { XDS: 'XDS Support', MIE: 'MIE Support' };

const t = (iso: string) => new Date(iso).getTime();

const SEED_TICKETS: Ticket[] = [
  {
    id: 'MET-1050', subject: 'Add a new server address to the UAT allowed list', company: 'XDS', area: 'Integrations', priority: 'Normal', status: 'waiting-client',
    client: CLIENT_ORG, requester: 'Thandi Mokoena', assignee: AGENTS.XDS, createdAt: t('2026-09-28T09:10:00+02:00'), updatedAt: t('2026-09-30T09:05:00+02:00'),
    messages: [
      { id: 'm1', from: 'client', author: 'Thandi Mokoena', at: t('2026-09-28T09:10:00+02:00'), text: 'We moved our test server, so XDS Connect UAT now refuses our calls. Please add the new address to our allowed list.' },
      { id: 'm2', from: 'agent', author: AGENTS.XDS, at: t('2026-09-28T11:32:00+02:00'), text: 'Hi, thanks for letting us know. Which address are the calls coming from now?' },
      { id: 'm3', from: 'client', author: 'Thandi Mokoena', at: t('2026-09-28T12:04:00+02:00'), text: 'It is 203.0.113.24.' },
      { id: 'm4', from: 'agent', author: AGENTS.XDS, at: t('2026-09-30T09:05:00+02:00'), text: "We've added 203.0.113.24 to your UAT allowed list. It can take up to 2 hours to apply. Could you confirm here once your UAT calls work?" },
    ],
  },
  {
    id: 'MIE-2215', subject: 'Verification result not received', company: 'MIE', area: 'Verification results', priority: 'High', status: 'in-progress',
    client: CLIENT_ORG, requester: 'Thandi Mokoena', assignee: AGENTS.MIE, createdAt: t('2026-09-29T14:20:00+02:00'), updatedAt: t('2026-09-29T15:02:00+02:00'),
    messages: [
      { id: 'm1', from: 'client', author: 'Thandi Mokoena', at: t('2026-09-29T14:20:00+02:00'), text: 'We submitted a verification request on Monday and still have no result. Our reference is VR-10233.' },
      { id: 'm2', from: 'agent', author: AGENTS.MIE, at: t('2026-09-29T15:02:00+02:00'), text: "Thanks. I can see VR-10233 is waiting on a third party. I've escalated it and will update you here by tomorrow midday." },
    ],
  },
  {
    id: 'MET-1031', subject: 'Invoice query for August', company: 'XDS', area: 'Billing', priority: 'Low', status: 'resolved',
    client: CLIENT_ORG, requester: 'Thandi Mokoena', assignee: AGENTS.XDS, createdAt: t('2026-09-03T10:00:00+02:00'), updatedAt: t('2026-09-04T16:40:00+02:00'),
    messages: [
      { id: 'm1', from: 'client', author: 'Thandi Mokoena', at: t('2026-09-03T10:00:00+02:00'), text: 'The DOVS line on our August invoice looks higher than expected.' },
      { id: 'm2', from: 'agent', author: AGENTS.XDS, at: t('2026-09-04T16:40:00+02:00'), text: 'The August total includes 212 DOVS requests that were resent after failed liveness checks. I have attached the breakdown. Marking this resolved, but reply here if anything is unclear.', attachment: 'dovs-august-breakdown.csv' },
    ],
  },
];

const SEED_NOTICES: Notice[] = [
  { id: 'n1', audience: 'client', title: `${AGENTS.XDS} from XDS Support replied`, text: 'MET-1050: We’ve added 203.0.113.24 to your UAT allowed list…', at: t('2026-09-30T09:05:00+02:00'), link: '/support/tickets?id=MET-1050', ticketId: 'MET-1050', read: false },
  { id: 'n2', audience: 'client', title: 'Mettus incident update', text: 'Realtime IDV: a fix is being rolled out (INC-2291).', at: t('2026-09-30T10:05:00+02:00'), link: '/monitoring', read: false },
  { id: 'n3', audience: 'client', title: `${AGENTS.MIE} from MIE Support replied`, text: 'MIE-2215: I can see VR-10233 is waiting on a third party…', at: t('2026-09-29T15:02:00+02:00'), link: '/support/tickets?id=MIE-2215', ticketId: 'MIE-2215', read: true },
  { id: 'n4', audience: 'agent', title: 'Waiting on client: MET-1050', text: `${CLIENT_ORG} has not confirmed the UAT change yet.`, at: t('2026-09-30T09:05:00+02:00'), link: '/support/desk?id=MET-1050', ticketId: 'MET-1050', read: true },
];

type Store = { tickets: Ticket[]; notices: Notice[]; next: Record<Company, number> };
const KEY = 'mettus-central-support-v2';
const seed = (): Store => ({ tickets: SEED_TICKETS, notices: SEED_NOTICES, next: { XDS: 1060, MIE: 2220 } });

const PRIORITY: Record<CxoTicket['priority'], TicketPriority> = { low: 'Low', medium: 'Normal', high: 'High', urgent: 'Urgent' };
const STATUS: Record<CxoTicket['status'], TicketStatus> = { open: 'open', in_progress: 'in-progress', waiting_on_you: 'waiting-client', resolved: 'resolved' };

/** Converts a client-portal (Jira-synced) ticket into the shared format. */
function fromClientPortal(t: CxoTicket): Ticket {
  const company: Company = t.business === 'mie' ? 'MIE' : 'XDS';
  return {
    id: t.key,
    subject: t.subject,
    company,
    area: SUITE_LABEL[t.suite] ?? 'Something else',
    priority: PRIORITY[t.priority],
    status: STATUS[t.status],
    client: CLIENT_ORG,
    requester: t.requester,
    assignee: t.assignee?.split(',')[0],
    createdAt: Date.parse(t.createdAt),
    updatedAt: Date.parse(t.updatedAt),
    messages: t.messages
      .filter((m) => m.from !== 'system')
      .map((m) => ({ id: m.id, from: m.from === 'agent' ? 'agent' : 'client', author: m.author, text: m.body, at: Date.parse(m.createdAt), attachment: m.attachments?.[0] })),
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : seed();
  } catch {
    return seed();
  }
}

type TicketsApi = {
  audience: Audience;
  tickets: Ticket[];
  notices: Notice[];
  unread: number;
  createTicket: (t: NewTicket) => Ticket;
  reply: (ticketId: string, text: string, attachment?: string) => void;
  setStatus: (ticketId: string, status: TicketStatus) => void;
  markTicketRead: (ticketId: string) => void;
  markNoticeRead: (id: string) => void;
  markAllRead: () => void;
  resetDemo: () => void;
};

const TicketsContext = createContext<TicketsApi | null>(null);

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const { user, can } = useAuth();
  const toast = useToast();
  const audience: Audience = can('support-desk') ? 'agent' : 'client';
  // Only ABSA has pre-existing tickets; anyone else invited live during a demo starts with none of their own.
  const myOrgName = user ? companyFromRole(user.role) : CLIENT_ORG;
  const [store, setStore] = useState<Store>(load);

  // Pull in tickets raised elsewhere in the client portal (for example product access requests), once each.
  const clientPortal = useClientPortalTickets();
  useEffect(() => {
    if (!clientPortal.data) return;
    setStore((s) => {
      const missing = clientPortal.data.filter((t) => !s.tickets.some((x) => x.id === t.key)).map(fromClientPortal);
      return missing.length ? { ...s, tickets: [...s.tickets, ...missing] } : s;
    });
  }, [clientPortal.data]);
  const audienceRef = useRef(audience);
  audienceRef.current = audience;

  // Save, and pick up changes made in another tab (for example the agent replying).
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
  }, [store]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      const next = JSON.parse(e.newValue) as Store;
      setStore((prev) => {
        const fresh = next.notices.filter((n) => n.audience === audienceRef.current && !n.read && !prev.notices.some((p) => p.id === n.id));
        if (fresh[0]) toast(fresh[0].title);
        return next;
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [toast]);

  const notify = (s: Store, n: Omit<Notice, 'id' | 'read' | 'at'>): Notice[] => [{ ...n, id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), read: false }, ...s.notices];

  const nextRef = useRef(store.next);
  nextRef.current = { XDS: Math.max(nextRef.current.XDS, store.next.XDS), MIE: Math.max(nextRef.current.MIE, store.next.MIE) };

  const createTicket = useCallback((nt: NewTicket) => {
    const now = Date.now();
    const id = `${nt.company === 'MIE' ? 'MIE' : 'MET'}-${nextRef.current[nt.company]++}`;
    const created: Ticket = {
      id, subject: nt.subject, company: nt.company, area: nt.area, priority: nt.priority, status: 'open', client: myOrgName,
      requester: user?.name ?? 'Client user', attached: nt.attached, assessment: nt.assessment, createdAt: now, updatedAt: now,
      messages: [{ id: 'm1', from: 'client', author: user?.name ?? 'Client user', at: now, text: nt.description, attachment: nt.attachment ?? (nt.attached ? `call-details-${nt.attached}.txt` : undefined) }],
    };
    setStore((s) => ({
      next: { XDS: Math.max(s.next.XDS, nextRef.current.XDS), MIE: Math.max(s.next.MIE, nextRef.current.MIE) },
      tickets: [created, ...s.tickets],
      notices: notify(s, { audience: 'agent', title: `New ticket ${id} from ${myOrgName}`, text: `${nt.company} · ${nt.area} · ${nt.priority}: ${nt.subject}`, link: `/support/desk?id=${id}`, ticketId: id }),
    }));
    const company = nt.company;
    // Demo: support acknowledges new tickets automatically after a few seconds.
    window.setTimeout(() => {
      setStore((s) => {
        const tk = s.tickets.find((x) => x.id === id);
        if (!tk || tk.messages.some((m) => m.from === 'agent')) return s;
        const agent = AGENTS[company];
        const msg: TicketMessage = { id: `m${Date.now()}`, from: 'agent', author: agent, at: Date.now(), text: `Hi, this is ${agent} from ${SUPPORT_TEAM[company]}. Thanks for logging this. I'm looking into it now and will update you here.` };
        return {
          ...s,
          tickets: s.tickets.map((x) => (x.id === id ? { ...x, assignee: agent, status: 'in-progress', updatedAt: Date.now(), messages: [...x.messages, msg] } : x)),
          notices: notify(s, { audience: 'client', title: `${agent} from ${SUPPORT_TEAM[company]} replied`, text: `${id}: Thanks for logging this. I'm looking into it now…`, link: `/support/tickets?id=${id}`, ticketId: id }),
        };
      });
      if (audienceRef.current === 'client') toast(`${AGENTS[company]} from ${SUPPORT_TEAM[company]} replied to ${id}.`);
    }, 6000);
    return created;
  }, [toast, user, myOrgName]);

  const reply = useCallback((ticketId: string, text: string, attachment?: string) => {
    const from = audienceRef.current;
    setStore((s) => {
      const tk = s.tickets.find((x) => x.id === ticketId);
      if (!tk) return s;
      const author = from === 'agent' ? tk.assignee ?? AGENTS[tk.company] : user?.name ?? 'Client user';
      const msg: TicketMessage = { id: `m${Date.now()}`, from, author, at: Date.now(), text, attachment };
      const status: TicketStatus = from === 'agent' ? 'waiting-client' : tk.assignee ? 'in-progress' : 'open';
      return {
        ...s,
        tickets: s.tickets.map((x) => (x.id === ticketId ? { ...x, status, assignee: from === 'agent' ? author : x.assignee, updatedAt: Date.now(), messages: [...x.messages, msg] } : x)),
        notices: from === 'agent'
          ? notify(s, { audience: 'client', title: `${author} from ${SUPPORT_TEAM[tk.company]} replied`, text: `${ticketId}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`, link: `/support/tickets?id=${ticketId}`, ticketId })
          : notify(s, { audience: 'agent', title: `${CLIENT_ORG} replied on ${ticketId}`, text: text.slice(0, 90), link: `/support/desk?id=${ticketId}`, ticketId }),
      };
    });
  }, [user]);

  const setStatus = useCallback((ticketId: string, status: TicketStatus) => {
    setStore((s) => {
      const tk = s.tickets.find((x) => x.id === ticketId);
      if (!tk) return s;
      const other: Audience = audienceRef.current === 'agent' ? 'client' : 'agent';
      const label = status === 'resolved' ? 'resolved' : 'reopened';
      return {
        ...s,
        tickets: s.tickets.map((x) => (x.id === ticketId ? { ...x, status, updatedAt: Date.now() } : x)),
        notices: notify(s, { audience: other, title: `${ticketId} was ${label}`, text: tk.subject, link: other === 'agent' ? `/support/desk?id=${ticketId}` : `/support/tickets?id=${ticketId}`, ticketId }),
      };
    });
  }, []);

  const markTicketRead = useCallback((ticketId: string) => {
    setStore((s) => (s.notices.some((n) => n.ticketId === ticketId && n.audience === audienceRef.current && !n.read)
      ? { ...s, notices: s.notices.map((n) => (n.ticketId === ticketId && n.audience === audienceRef.current ? { ...n, read: true } : n)) }
      : s));
  }, []);

  const markNoticeRead = useCallback((id: string) => setStore((s) => ({ ...s, notices: s.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) })), []);
  const markAllRead = useCallback(() => setStore((s) => ({ ...s, notices: s.notices.map((n) => (n.audience === audienceRef.current ? { ...n, read: true } : n)) })), []);
  const resetDemo = useCallback(() => setStore(seed()), []);

  // Staff see every client's tickets; a client only ever sees their own company's.
  const visibleTickets = audience === 'agent' ? store.tickets : store.tickets.filter((t) => t.client === myOrgName);
  const visibleTicketIds = new Set(visibleTickets.map((t) => t.id));
  const notices = store.notices
    .filter((n) => n.audience === audience && (audience === 'agent' || !n.ticketId || visibleTicketIds.has(n.ticketId)))
    .sort((a, b) => b.at - a.at);
  const unread = notices.filter((n) => !n.read).length;

  return (
    <TicketsContext.Provider value={{ audience, tickets: visibleTickets, notices, unread, createTicket, reply, setStatus, markTicketRead, markNoticeRead, markAllRead, resetDemo }}>
      {children}
    </TicketsContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketsContext);
  if (!ctx) throw new Error('useTickets must be used inside <TicketsProvider>');
  return ctx;
}

/** "Just now", "12 min ago", "Today, 09:05", "28 Sep, 11:32". */
export function when(at: number) {
  const d = new Date(at);
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return `Today, ${hm}`;
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}, ${hm}`;
}

export const STATUS_LABEL: Record<Audience, Record<TicketStatus, string>> = {
  client: { open: 'Open', 'in-progress': 'In progress', 'waiting-client': 'Waiting for you', resolved: 'Resolved' },
  agent: { open: 'New', 'in-progress': 'In progress', 'waiting-client': 'Waiting for client', resolved: 'Resolved' },
};

export const STATUS_TONE: Record<TicketStatus, 'green' | 'grey' | 'amber' | 'red'> = {
  open: 'grey',
  'in-progress': 'amber',
  'waiting-client': 'red',
  resolved: 'green',
};
