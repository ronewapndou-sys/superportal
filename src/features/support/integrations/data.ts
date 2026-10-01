import type { PillTone } from '../../../ui';

export type IntegrationStatus = 'connected' | 'error' | 'attention' | 'not-connected' | 'working';

export type Integration = {
  id: string;
  initials: string;
  name: string;
  purpose: string;
  status: IntegrationStatus;
  lastActivity: string;
  /** One line describing the problem, shown in the alert banner. */
  issue?: string;
  /** Label shown while status is 'working', e.g. "Connecting". */
  workingLabel?: string;
};

export const STATUS_PILL: Record<IntegrationStatus, { tone: PillTone; label: string }> = {
  connected: { tone: 'green', label: 'Connected' },
  error: { tone: 'red', label: 'Error' },
  attention: { tone: 'amber', label: 'Needs attention' },
  'not-connected': { tone: 'grey', label: 'Not connected' },
  working: { tone: 'amber', label: 'Connecting' },
};

export const INITIAL_INTEGRATIONS: Integration[] = [
  { id: 'connect-prod', initials: 'XC', name: 'XDS Connect Production', purpose: 'Live enquiries from your systems through the SOAP web service', status: 'connected', lastActivity: 'Today, 10:14' },
  { id: 'connect-uat', initials: 'UA', name: 'XDS Connect UAT', purpose: 'Test your integration before going live', status: 'attention', lastActivity: 'Today, 08:41', issue: 'XDS Connect UAT refused calls from a server address that is not on your allowed list' },
  { id: 'alerts', initials: 'MT', name: 'Monitoring triggers', purpose: 'Get default alerts and changes for consumers and companies you monitor', status: 'error', lastActivity: 'Yesterday, 23:10', issue: 'Monitoring triggers are failing because your endpoint returned 503' },
  { id: 'sso', initials: 'ID', name: 'Single sign-on', purpose: 'Let your staff sign in to this portal with your identity provider', status: 'not-connected', lastActivity: 'Never' },
  { id: 'crm', initials: 'CR', name: 'CRM system', purpose: 'Attach enquiry results and support cases to client records', status: 'not-connected', lastActivity: 'Never' },
];

export const INITIAL_INTEGRATIONS_MIE: Integration[] = [
  { id: 'mie-connect-prod', initials: 'MC', name: 'MIE Verification API Production', purpose: 'Live verification requests from your systems through the REST API', status: 'connected', lastActivity: 'Today, 09:40' },
  { id: 'mie-connect-uat', initials: 'MU', name: 'MIE Verification API Sandbox', purpose: 'Test your integration before going live', status: 'connected', lastActivity: 'Today, 08:15' },
  { id: 'mie-webhooks', initials: 'WH', name: 'Verification webhooks', purpose: 'Get notified the moment a document or address verification result is ready', status: 'attention', lastActivity: 'Yesterday, 21:05', issue: 'Verification webhooks are failing because your endpoint returned 503' },
  { id: 'sso', initials: 'ID', name: 'Single sign-on', purpose: 'Let your staff sign in to this portal with your identity provider', status: 'not-connected', lastActivity: 'Never' },
  { id: 'crm', initials: 'CR', name: 'CRM system', purpose: 'Attach verification results and support cases to client records', status: 'not-connected', lastActivity: 'Never' },
];

/** Systems offered in the "Add integration" dialog. */
export const CATALOGUE = [
  { id: 'dw', initials: 'DW', name: 'Data warehouse', purpose: 'Export daily enquiry and billing data to your warehouse' },
  { id: 'email', initials: 'EM', name: 'Email alerts', purpose: 'Send failed-call and monitoring alerts to a shared mailbox' },
  { id: 'docs', initials: 'DS', name: 'Document storage', purpose: 'Save credit reports and verification results to your document store' },
];

export const CHECKLIST = [
  'You have administrator access for this organisation',
  "Your system's server addresses are on the allowed list",
  'Your integration works in UAT',
];
