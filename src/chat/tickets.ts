import type { TicketPriority } from '../tickets/TicketsContext';

/** Form options for support tickets, used by the assistant and the Support tickets page. */
export type TicketDraft = { subject?: string; area?: string; attached?: string };

export const TICKET_AREAS = [
  'Credit Enquiry',
  'DOVS',
  'Consumer Trace',
  'Realtime IDV',
  'Business Enquiry',
  'XDS Connect sign-in and tickets',
  'Integrations',
  'Verification results',
  'MIE screening checks',
  'MIE Fingerprint Zone bookings',
  'MIE training',
  'Portal access',
  'Billing',
  'Something else',
];

export const PRIORITIES: { value: TicketPriority; hint: string }[] = [
  { value: 'Low', hint: 'Question or small request' },
  { value: 'Normal', hint: 'Something is not working, but there is a workaround' },
  { value: 'High', hint: 'A product is failing for many of your calls' },
  { value: 'Urgent', hint: 'You cannot process any enquiries' },
];

/** Sample first-response targets shown to the user. */
export const RESPONSE_TIME: Record<TicketPriority, string> = {
  Low: 'within 3 business days',
  Normal: 'within 1 business day',
  High: 'within 4 business hours',
  Urgent: 'within 1 hour',
};
