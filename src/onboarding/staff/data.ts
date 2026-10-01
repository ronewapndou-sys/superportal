/** Demo data for the staff onboarding screen. Seeded so the numbers are the same on every load. */

export type DivisionId = 'xds' | 'mie' | 'mettus';
/** 'mettus' is a client invited to both businesses at once, not a third Jira-style pipeline of its own. */
export const DIVISION_NAME: Record<DivisionId, string> = { xds: 'XDS', mie: 'MIE', mettus: 'Mettus' };

export type OnbStatus =
  | 'DRAFT' | 'PENDING_REG' | 'PENDING_COMP' | 'INCOMPLETE' | 'UNDER_REVIEW'
  | 'CHANGE_REQUEST' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EMAIL_FAILED';

type Tone = 'green' | 'grey' | 'red' | 'amber';
export const STATUS: Record<OnbStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Complete invite fields', tone: 'grey' },
  PENDING_REG: { label: 'Waiting for registration', tone: 'grey' },
  PENDING_COMP: { label: 'Waiting for completion', tone: 'grey' },
  INCOMPLETE: { label: 'Incomplete', tone: 'amber' },
  UNDER_REVIEW: { label: 'Under review', tone: 'grey' },
  CHANGE_REQUEST: { label: 'Change request', tone: 'grey' },
  ACCEPTED: { label: 'Accepted', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
  EMAIL_FAILED: { label: 'Email failed', tone: 'red' },
};

const PRE_SUBMISSION: OnbStatus[] = ['DRAFT', 'PENDING_REG', 'PENDING_COMP', 'INCOMPLETE'];
const IN_REVIEW: OnbStatus[] = ['UNDER_REVIEW', 'CHANGE_REQUEST'];

export type QueueId = 'my' | 'pending' | 'review' | 'unsuccessful' | 'completed';
export const QUEUES: { id: QueueId; label: string; test: (o: Onboarding, me: string) => boolean }[] = [
  { id: 'my', label: 'My queue', test: (o, me) => IN_REVIEW.includes(o.status) && o.approvers.includes(me) },
  { id: 'pending', label: 'Pending', test: (o) => PRE_SUBMISSION.includes(o.status) },
  { id: 'review', label: 'In review', test: (o) => IN_REVIEW.includes(o.status) },
  { id: 'unsuccessful', label: 'Unsuccessful', test: (o) => ['CANCELLED', 'EMAIL_FAILED', 'REJECTED'].includes(o.status) },
  { id: 'completed', label: 'Completed', test: (o) => o.status === 'ACCEPTED' },
];

export const STEPS = ['Account manager approval', 'Pricing approval', 'Sales manager approval', 'Onboarding vetting', 'Legal counter-signature'];

export const STAFF = ['Thandi Mokoena', 'Pieter van Wyk', 'Aisha Patel', 'Sipho Dlamini', 'Lerato Nkosi', 'Daniel Fourie'];

export const TEMPLATES = ['New supplier onboarding', 'New client onboarding', 'Addendum', 'Renewal', 'Evaluation agreement', 'Service provider agreement'];

export const ENTITY_TYPES = [
  'Private company', 'Public company', 'Close corporation', 'Sole proprietor', 'Trust', 'Partnership',
  'Non-profit organisation', 'Government entity', 'Municipality', 'Education institution', 'Company registered outside SA',
];

export const PAYMENT_OPTIONS = [
  'Bank details registered in South Africa',
  'Bank details registered outside South Africa',
  'No bank details needed',
];

export type Doc = {
  id: string;
  entityId: string;
  type: string;
  file: string;
  expires: number | null;
  uploadedAt: number;
  uploadedBy: string;
  notify: string;
  update: '' | 'requested' | 'review';
  versions: number;
  sizeKB: number;
};

export type Onboarding = {
  id: string;
  ref: string;
  entityId: string;
  name: string;
  contact: string;
  email: string;
  division: DivisionId;
  template: string;
  status: OnbStatus;
  step: number;
  approvers: string[];
  invitedBy: string;
  invitedAt: number;
  lastAt: number;
  expiresAt: number;
  bounced: boolean;
  selfCert: boolean;
};

export type Verification = 'Verified' | 'Review' | 'Not verified yet' | 'Self-certified' | 'Inactive' | 'Prepaid client' | 'Terms client';
export type Entity = {
  id: string;
  ref: string;
  legalName: string;
  tradingName: string;
  division: DivisionId;
  type: string;
  regNumber: string;
  contact: string;
  email: string;
  verification: Verification;
  reviewReason: string;
  bank: string;
  account: string;
  accountType: string;
  updatedAt: number;
};

export const REVIEW_REASONS = [
  'Account holder name does not match the legal name',
  'Account number could not be confirmed with the bank',
  'Bank letter is older than three months',
  'Branch code does not match the bank',
];

export const DOC_TYPES: { name: string; expires: boolean }[] = [
  { name: 'Signed NDA', expires: false },
  { name: 'Signed pricing annexure', expires: false },
  { name: 'Bank account confirmation', expires: false },
  { name: 'CIPC registration certificate', expires: false },
  { name: 'B-BBEE certificate', expires: true },
  { name: 'Tax clearance certificate', expires: true },
  { name: 'Proof of address', expires: true },
];

export const DAY = 86400000;
export const NOW = new Date(2026, 9, 1, 9, 0).getTime();

// ---- seeded generator ----
let seed = 20261001;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const rint = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;

const NAMES_A = ['Karoo', 'Lighthouse', 'Ubuntu', 'Protea', 'Highveld', 'Cape Ridge', 'Baobab', 'Summit', 'Delta', 'Kgalagadi', 'Savanna', 'Tafelberg', 'Umhlanga', 'Drakensberg', 'Limpopo', 'Zambezi', 'Oryx', 'Fynbos', 'Springbok', 'Marula'];
const NAMES_B = ['Logistics', 'Holdings', 'Financial Services', 'Mining Supplies', 'Healthcare', 'Properties', 'Energy', 'Insurance Brokers', 'Engineering', 'Foods', 'Motors', 'Retail Group', 'Telecoms', 'Legal Services', 'Agri'];
const FIRST = ['Naledi', 'Johan', 'Fatima', 'Bongani', 'Megan', 'Tshepo', 'Anele', 'Ruan', 'Zanele', 'Kabelo', 'Chantal', 'Vusi'];
const LAST = ['Khumalo', 'Botha', 'Naidoo', 'Mahlangu', 'Pretorius', 'Sithole', 'Jacobs', 'Molefe', 'Venter', 'Dube'];
const BANKS = ['Absa', 'FNB', 'Standard Bank', 'Nedbank', 'Capitec Business'];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '');

export const ENTITIES: Entity[] = [];
export const ONBOARDINGS: Onboarding[] = [];
export const DOCS: Doc[] = [];

function weightedStatus(): OnbStatus {
  const r = rnd();
  if (r < 0.1) return 'DRAFT';
  if (r < 0.22) return 'PENDING_REG';
  if (r < 0.34) return 'PENDING_COMP';
  if (r < 0.4) return 'INCOMPLETE';
  if (r < 0.58) return 'UNDER_REVIEW';
  if (r < 0.64) return 'CHANGE_REQUEST';
  if (r < 0.82) return 'ACCEPTED';
  if (r < 0.87) return 'REJECTED';
  if (r < 0.94) return 'CANCELLED';
  return 'EMAIL_FAILED';
}

let docSeq = 0;
function addDoc(e: Entity, type: string, expires: number | null, uploadedAt: number) {
  const d: Doc = {
    id: `d${++docSeq}`, entityId: e.id, type, expires, uploadedAt,
    file: `${e.tradingName.replace(/\s+/g, '_')}_${type.replace(/\s+/g, '_')}.pdf`,
    uploadedBy: e.contact, notify: e.contact, update: '', versions: 1, sizeKB: rint(80, 2400),
  };
  if (expires && expires < NOW + 30 * DAY && chance(0.4)) d.update = chance(0.3) ? 'review' : 'requested';
  DOCS.push(d);
}

for (let i = 0; i < 48; i++) {
  const tradingName = `${NAMES_A[i % NAMES_A.length]} ${NAMES_B[(i * 7 + 3) % NAMES_B.length]}`;
  const division: DivisionId = chance(0.55) ? 'xds' : 'mie';
  const contact = `${pick(FIRST)} ${pick(LAST)}`;
  const status = weightedStatus();
  const verification: Verification = status === 'ACCEPTED'
    ? pick<Verification>(['Verified', 'Verified', 'Verified', 'Review', 'Self-certified', 'Not verified yet', 'Prepaid client', 'Terms client'])
    : 'Not verified yet';
  const e: Entity = {
    id: `e${i + 1}`, ref: status === 'ACCEPTED' || chance(0.5) ? `${division === 'xds' ? 'XDS' : 'MIE'}-${rint(10000, 99999)}` : '',
    legalName: `${tradingName} (Pty) Ltd`, tradingName, division, type: pick(ENTITY_TYPES),
    regNumber: `20${rint(10, 24)}/${rint(100000, 999999)}/07`, contact,
    email: `${slug(contact.split(' ')[0])}@${slug(tradingName)}.co.za`,
    verification, reviewReason: verification === 'Review' ? pick(REVIEW_REASONS) : '',
    bank: pick(BANKS), account: String(rint(1000000000, 9999999999)), accountType: pick(['Current', 'Cheque', 'Savings']),
    updatedAt: NOW - rint(1, 120) * DAY,
  };
  if (i % 17 === 5) e.verification = 'Inactive';
  ENTITIES.push(e);

  const invitedAt = NOW - rint(1, 160) * DAY;
  const inReview = IN_REVIEW.includes(status);
  const step = inReview ? rint(0, STEPS.length - 1) : status === 'ACCEPTED' ? STEPS.length : 0;
  ONBOARDINGS.push({
    id: `o${i + 1}`, ref: `ONB-${String(2400 + i)}`, entityId: e.id, name: e.legalName, contact, email: e.email, division,
    template: pick(TEMPLATES), status, step,
    approvers: inReview ? [pick(STAFF), ...(chance(0.4) ? [pick(STAFF)] : [])] : [],
    invitedBy: pick(STAFF), invitedAt, lastAt: Math.min(NOW, invitedAt + rint(0, 40) * DAY),
    expiresAt: PRE_SUBMISSION.includes(status) || status === 'EMAIL_FAILED' ? NOW + rint(-6, 14) * DAY : invitedAt + 30 * DAY,
    bounced: status === 'EMAIL_FAILED', selfCert: verification === 'Self-certified',
  });

  const base = e.updatedAt - rint(1, 30) * DAY;
  addDoc(e, 'Signed NDA', null, base);
  if (chance(0.6)) addDoc(e, 'Signed pricing annexure', null, base + 3600e3);
  if (verification !== 'Prepaid client' && chance(0.7)) addDoc(e, 'Bank account confirmation', null, base + 7200e3);
  if (status === 'ACCEPTED' || chance(0.3)) {
    const t = pick(DOC_TYPES.filter((d) => d.expires));
    addDoc(e, t.name, NOW + rint(-60, 400) * DAY, base + 1800e3);
  }
}
DOCS.sort((a, b) => b.uploadedAt - a.uploadedAt);

export type ExpiryState = 'none' | 'valid' | 'expiring' | 'expired';
export const expiryState = (d: Doc): ExpiryState =>
  !d.expires ? 'none' : d.expires < NOW ? 'expired' : d.expires < NOW + 30 * DAY ? 'expiring' : 'valid';

export const EXPIRY_LABEL: Record<ExpiryState, string> = {
  none: 'No expiry date', valid: 'Valid', expiring: 'Expiring within 30 days', expired: 'Expired',
};

export const fDate = (t: number) => new Date(t).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
export const toISO = (t: number) => new Date(t).toISOString().slice(0, 10);
