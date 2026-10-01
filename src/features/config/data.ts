/** Configuration: organisation-wide settings, not personal preferences (see Account for those). */

export type ReportFieldId = 'idNumber' | 'fullName' | 'dob' | 'contactNumber' | 'email' | 'address' | 'bankDetails';

export const REPORT_FIELDS: { id: ReportFieldId; label: string; description: string }[] = [
  { id: 'idNumber', label: 'ID or passport number', description: "The consumer or candidate's identity document number." },
  { id: 'fullName', label: 'Full name', description: 'First name and surname.' },
  { id: 'dob', label: 'Date of birth', description: '' },
  { id: 'contactNumber', label: 'Contact number', description: 'Cellphone and landline numbers on file.' },
  { id: 'email', label: 'Email address', description: '' },
  { id: 'address', label: 'Residential address', description: '' },
  { id: 'bankDetails', label: 'Bank account details', description: '' },
];

export type ChannelId = 'email' | 'sms' | 'whatsapp' | 'phone';

export const CHANNELS: { id: ChannelId; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'phone', label: 'Phone call' },
];

export type AlertKindId = 'lowBalance' | 'invoices' | 'tickets' | 'incidents' | 'weeklySummary';

export const ALERT_KINDS: { id: AlertKindId; label: string; description: string }[] = [
  { id: 'lowBalance', label: 'Low wallet balance', description: 'Your credits are about to run out.' },
  { id: 'invoices', label: 'Invoices and overdue payments', description: 'A new invoice is ready, or one is overdue.' },
  { id: 'tickets', label: 'Support ticket updates', description: 'XDS or MIE support replies to a ticket.' },
  { id: 'incidents', label: 'Platform incidents affecting you', description: 'A service you use is degraded or down.' },
  { id: 'weeklySummary', label: 'Weekly usage summary', description: 'Enquiries and spend from the past week.' },
];

export const SESSION_TIMEOUTS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
];

export type ConfigState = {
  excludedReportFields: ReportFieldId[];
  alertChannels: Record<AlertKindId, ChannelId[]>;
  whatsappNumber: string;
  phoneNumber: string;
  requireMfa: boolean;
  sessionTimeoutMinutes: number;
};

export const DEFAULT_CONFIG: ConfigState = {
  excludedReportFields: [],
  alertChannels: {
    lowBalance: ['email'],
    invoices: ['email'],
    tickets: ['email'],
    incidents: ['email', 'sms'],
    weeklySummary: ['email'],
  },
  whatsappNumber: '',
  phoneNumber: '',
  requireMfa: true,
  sessionTimeoutMinutes: 60,
};

const KEY = 'mettus-central-configuration';

export function loadConfig(): ConfigState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(c: ConfigState) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage unavailable */ }
}
