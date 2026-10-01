import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useOrg } from '../shell/OrgContext';
import { useTickets, type Ticket, type TicketPriority } from '../tickets/TicketsContext';
import { useAuth } from '../auth/AuthContext';
import { SUITE_BY_ID } from '@/lib/suites';
import type { SuiteId } from '@/lib/api/types';
import { useFpz } from './FpzContext';
import { FPZ_BRANCHES, formatFpzDate, type FpzBooking, type NewFpzBooking } from './fpz';
import { replyTo } from './replies';
import { RESPONSE_TIME, type TicketDraft } from './tickets';

export type ChatMessage =
  | { id: number; from: 'user' | 'bot'; kind?: 'text'; content: React.ReactNode }
  | { id: number; from: 'bot'; kind: 'ticket-form'; draft: TicketDraft; submitted?: string; cancelled?: boolean }
  | { id: number; from: 'bot'; kind: 'ticket-list' }
  | { id: number; from: 'bot'; kind: 'advice' }
  | { id: number; from: 'bot'; kind: 'product-request'; suite: SuiteId }
  | { id: number; from: 'bot'; kind: 'check-status' }
  | { id: number; from: 'bot'; kind: 'fpz-form'; submitted?: string; cancelled?: boolean }
  | { id: number; from: 'bot'; kind: 'fpz-list' };

type BotPayload =
  | { content: React.ReactNode }
  | { kind: 'ticket-form'; draft: TicketDraft }
  | { kind: 'ticket-list' }
  | { kind: 'advice' }
  | { kind: 'product-request'; suite: SuiteId }
  | { kind: 'check-status' }
  | { kind: 'fpz-form' }
  | { kind: 'fpz-list' };

export type TicketInput = { subject: string; area: string; priority: TicketPriority; description: string; attached?: string };

type ChatApi = {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: ChatMessage[];
  typing: boolean;
  /** Opens the assistant and asks a question on the user's behalf. */
  ask: (question: string) => void;
  /** Opens the assistant with a support ticket form, optionally filled in. */
  startTicket: (draft?: TicketDraft) => void;
  submitTicket: (formMessageId: number, ticket: TicketInput) => Ticket;
  cancelTicket: (formMessageId: number) => void;
  submitFpzBooking: (formMessageId: number, booking: NewFpzBooking) => FpzBooking;
  cancelFpzBooking: (formMessageId: number) => void;
};

const GREETING: ChatMessage = {
  id: 0,
  from: 'bot',
  content: 'Hi, I can help with XDS Connect, your integrations and failed calls, and MIE screening checks and fingerprint bookings. I can also log a support ticket for you.',
};

/** The example conversation shown when a page is opened with ?assistant=open. */
const EXAMPLE: ChatMessage[] = [
  GREETING,
  { id: 1, from: 'user', content: <>Why did <span className="code">ConnectConsumerMatch</span> fail for LOAN-20931?</> },
  { id: 2, from: 'bot', content: replyTo('ticket expired') },
];

const TICKET_INTENT = /(log|raise|open|create|submit|new)\b.*\b(support )?(ticket|case|query)|support ticket|talk to a person|speak to (a|someone)|human|agent/;
const RECOMMEND_INTENT = /recommend|suggest|what (should|could|can) i (add|get|use|buy)|which products?|what else|save (money|costs?)|cheaper|new products?|improve/;
const REQUEST_VERB = /\b(request|add|get|need|want|switch on|enable|activate|sign (me|us) up|apply|can (i|we) have)\b/;
const PRODUCT_ALIASES: [RegExp, SuiteId][] = [
  [/risk ?guard/, 'riskguard'],
  [/multi(ple)? (consumer )?trace|batch trace/, 'multi_trace'],
  [/pre-?screen/, 'prescreen_trace'],
  [/identity verification|id verification/, 'id_verification'],
  [/authentication/, 'consumer_auth'],
];
/** Which product a question names, from its full name or a common alias. */
function productIn(q: string): SuiteId | undefined {
  const alias = PRODUCT_ALIASES.find(([re]) => re.test(q));
  if (alias) return alias[1];
  return (Object.keys(SUITE_BY_ID) as SuiteId[]).find((id) => q.includes(SUITE_BY_ID[id].name.toLowerCase()));
}
const LIST_INTENT = /my (support )?(tickets|cases)|ticket status|status of my (ticket|case)/;
const TRAINING_INTENT = /training|fingerprint.*(class|course)|(class|course).*fingerprint|learn (to|how).*(fingerprint|prints)|teach.*(fingerprint|prints)/;
const CHECK_INTENT = /(how far|progress|status|where).{0,20}(my |our )?(checks?|screenings?|candidates?|batch(es)?)|(checks?|screenings?|candidates?).{0,20}(how far|progress|status)/;
const FPZ_LIST_INTENT = /my (fpz|fingerprint) bookings?|fingerprint (appointment|booking) status|status of my (fpz|fingerprint) (booking|appointment)|where.*my (fpz|fingerprint) (booking|appointment)/;
const FPZ_BOOK_INTENT = /book(ing)?.*(fingerprint|fpz)|fingerprint.*(book|appointment|slot)|fpz.*(book|appointment|slot)|schedule.*(fingerprint|fpz)/;
const MIE_ONLY_NOTE = 'That’s an MIE service, and your account doesn’t have MIE access yet. Ask your administrator to add it, or say "log a support ticket".';

const ChatContext = createContext<ChatApi | null>(null);

export function ChatProvider({ children, startOpen = false }: { children: React.ReactNode; startOpen?: boolean }) {
  const { createTicket } = useTickets();
  const { createBooking } = useFpz();
  const { org, options } = useOrg();
  const { can } = useAuth();
  // product advice and decisions are for client users, not Mettus staff
  const client = !(can('platform-health') || can('support-desk'));
  const hasMie = options.includes('MIE');
  const [open, setOpen] = useState(startOpen);
  const [messages, setMessages] = useState<ChatMessage[]>(startOpen ? EXAMPLE : [GREETING]);
  const [typing, setTyping] = useState(false);
  const nextId = useRef(10);

  const botSays = useCallback((msg: BotPayload, delay = 700 + Math.random() * 400) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: nextId.current++, from: 'bot', ...msg } as ChatMessage]);
    }, delay);
  }, []);

  const startTicket = useCallback((draft: TicketDraft = {}) => {
    setOpen(true);
    botSays({ kind: 'ticket-form', draft }, 500);
  }, [botSays]);

  const ask = useCallback((question: string) => {
    const q = question.trim();
    if (!q) return;
    setOpen(true);
    setMessages((m) => [...m, { id: nextId.current++, from: 'user', content: q }]);
    const lower = q.toLowerCase();
    if (LIST_INTENT.test(lower)) botSays({ kind: 'ticket-list' });
    else if (TICKET_INTENT.test(lower)) botSays({ kind: 'ticket-form', draft: {} });
    else if (TRAINING_INTENT.test(lower)) botSays({ content: replyTo(q) });
    else if (client && !hasMie && (FPZ_LIST_INTENT.test(lower) || FPZ_BOOK_INTENT.test(lower) || CHECK_INTENT.test(lower))) botSays({ content: MIE_ONLY_NOTE });
    else if (client && FPZ_LIST_INTENT.test(lower)) botSays({ kind: 'fpz-list' });
    else if (client && FPZ_BOOK_INTENT.test(lower)) botSays({ kind: 'fpz-form' });
    else if (client && CHECK_INTENT.test(lower)) botSays({ kind: 'check-status' });
    else if (client && REQUEST_VERB.test(lower) && productIn(lower)) botSays({ kind: 'product-request', suite: productIn(lower)! });
    else if (client && RECOMMEND_INTENT.test(lower)) botSays({ kind: 'advice' });
    else botSays({ content: replyTo(q) });
  }, [botSays, client, hasMie]);

  const submitTicket = useCallback((formMessageId: number, t: TicketInput) => {
    const company = org === 'MIE' ? 'MIE' : 'XDS';
    const ticket = createTicket({ ...t, company });
    setMessages((m) => m.map((msg) => (msg.id === formMessageId && msg.kind === 'ticket-form' ? { ...msg, submitted: ticket.id } : msg)));
    botSays({
      content: (
        <>
          Your ticket <strong className="code">{ticket.id}</strong> is logged with {company} support at {t.priority.toLowerCase()} priority. You'll get a reply {RESPONSE_TIME[t.priority]},
          here in the portal. The bell at the top shows when support responds.
        </>
      ),
    }, 600);
    return ticket;
  }, [botSays, createTicket, org]);

  const cancelTicket = useCallback((formMessageId: number) => {
    setMessages((m) => m.map((msg) => (msg.id === formMessageId && msg.kind === 'ticket-form' ? { ...msg, cancelled: true } : msg)));
    botSays({ content: "No problem, I haven't logged anything. What else can I help with?" }, 400);
  }, [botSays]);

  const submitFpzBooking = useCallback((formMessageId: number, input: NewFpzBooking) => {
    const booking = createBooking(input);
    setMessages((m) => m.map((msg) => (msg.id === formMessageId && msg.kind === 'fpz-form' ? { ...msg, submitted: booking.id } : msg)));
    const branch = FPZ_BRANCHES.find((b) => b.id === input.branchId);
    botSays({
      content: (
        <>
          Booked. Reference <strong className="code">{booking.id}</strong> for <strong>{input.candidateName}</strong> at {branch?.name ?? 'the branch'} on {formatFpzDate(input.date)} at {input.time}.
          Bring a valid ID document; the appointment takes about 15 minutes.
        </>
      ),
    }, 600);
    return booking;
  }, [botSays, createBooking]);

  const cancelFpzBooking = useCallback((formMessageId: number) => {
    setMessages((m) => m.map((msg) => (msg.id === formMessageId && msg.kind === 'fpz-form' ? { ...msg, cancelled: true } : msg)));
    botSays({ content: "No problem, nothing booked. What else can I help with?" }, 400);
  }, [botSays]);

  return (
    <ChatContext.Provider value={{ open, setOpen, messages, typing, ask, startTicket, submitTicket, cancelTicket, submitFpzBooking, cancelFpzBooking }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}
