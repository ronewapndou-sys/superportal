import type { PillTone } from '../../../ui';

export type EventGroup = 'success' | 'failed' | 'warning';

export type ActivityEvent = {
  time: string;
  user: string;
  method: string;
  product: string;
  productId?: number;
  ref: string;
  tone: PillTone;
  status: string;
  group: EventGroup;
  title: string;
  what: string;
  steps: string[];
  /** Simplified request body, with personal data masked. */
  request: string;
};

// Sample events. Method names, product IDs and fields follow the XDS Connect technical specs; the values are made up.
export const EVENTS: ActivityEvent[] = [
  {
    time: '30 Sep 10:14:22', user: 'svc_lending_prod', method: 'ConnectGetResult', product: 'Credit Enquiry', productId: 15, ref: 'ENQ 581578112',
    tone: 'green', status: 'Success', group: 'success', title: 'Report returned',
    what: 'The Consumer Credit Report (Report ID 1) was returned for enquiry 581578112.',
    steps: ['No action needed.'],
    request: '<ConnectGetResult>\n  <ConnectTicket>••••••••</ConnectTicket>\n  <EnquiryID>581578112</EnquiryID>\n  <EnquiryResultID>695986702</EnquiryResultID>\n  <ProductID>15</ProductID>\n</ConnectGetResult>',
  },
  {
    time: '30 Sep 10:12:08', user: 'svc_lending_prod', method: 'ConnectConsumerMatch', product: 'Credit Enquiry', productId: 15, ref: 'LOAN-20931',
    tone: 'red', status: 'Failed', group: 'failed', title: 'Ticket no longer valid',
    what: 'The ticket sent with this call had expired. Tickets from Login are valid for 5 hours, and this one was issued at 05:02.',
    steps: ['Call Login again to get a new ticket.', 'Check the ticket with IsTicketValid before you start a set of calls.', "Don't store tickets for longer than 5 hours."],
    request: '<ConnectConsumerMatch>\n  <ConnectTicket>•••••••• (expired)</ConnectTicket>\n  <EnquiryReason>CreditAssessment</EnquiryReason>\n  <ProductId>15</ProductId>\n  <IdNumber>•••••••••0082</IdNumber>\n  <YourReference>LOAN-20931</YourReference>\n</ConnectConsumerMatch>',
  },
  {
    time: '30 Sep 10:09:51', user: 'svc_onboarding_prod', method: 'ConnectDOVRequest', product: 'DOVS', productId: 194, ref: 'ENQ 465346702',
    tone: 'grey', status: 'Awaiting consumer', group: 'warning', title: 'Waiting for facial verification',
    what: "An SMS was sent to the consumer's cellphone. The result is available once they complete the facial check on their phone.",
    steps: ['Call ConnectGetDOVResult with the EnquiryID after the consumer finishes.', 'Use RedirectURL to send the consumer back to your site when they are done.'],
    request: '<ConnectDOVRequest>\n  <ConnectTicket>••••••••</ConnectTicket>\n  <EnquiryID>465346702</EnquiryID>\n  <EnquiryResultID>565827118</EnquiryResultID>\n  <ProductID>194</ProductID>\n  <RedirectURL>https://apply.absa.example/onboarding/done</RedirectURL>\n</ConnectDOVRequest>',
  },
  {
    time: '30 Sep 10:02:33', user: 'svc_onboarding_prod', method: 'ConnectGetDOVResult', product: 'DOVS', productId: 194, ref: 'ENQ 465346655',
    tone: 'amber', status: 'Liveness failed', group: 'warning', title: 'Liveness check failed',
    what: "The consumer's photo matched their ID photo, but the liveness test did not pass, so the verification is incomplete.",
    steps: ['Ask the consumer to try again in good light, facing the camera.', 'Send a new ConnectDOVRequest for the same enquiry.', 'If it fails again, verify the consumer another way.'],
    request: '<ConnectGetDOVResult>\n  <ConnectTicket>••••••••</ConnectTicket>\n  <EnquiryID>465346655</EnquiryID>\n</ConnectGetDOVResult>',
  },
  {
    time: '30 Sep 09:58:40', user: 'svc_lending_prod', method: 'ConnectConsumerMatch', product: 'Credit Enquiry', productId: 15, ref: 'LOAN-20927',
    tone: 'amber', status: 'No match', group: 'warning', title: 'No consumer found',
    what: 'No consumer matched the details sent. Only a surname was provided.',
    steps: ['Send an ID number, or a passport number.', 'Or send first name, surname and date of birth together.'],
    request: '<ConnectConsumerMatch>\n  <ConnectTicket>••••••••</ConnectTicket>\n  <ProductId>15</ProductId>\n  <Surname>••••••</Surname>\n  <YourReference>LOAN-20927</YourReference>\n</ConnectConsumerMatch>',
  },
  {
    time: '30 Sep 09:52:10', user: 'svc_onboarding_prod', method: 'ConnectConsumerMatchDOVS', product: 'DOVS', productId: 194, ref: 'ONB-7781',
    tone: 'green', status: 'Success', group: 'success', title: 'Consumer matched',
    what: 'The consumer was matched and an enquiry was created. The cellphone number sent is not yet linked to them at XDS (CellNumberMatched 0).',
    steps: ['Continue with ConnectDOVRequest to send the facial verification SMS.'],
    request: '<ConnectConsumerMatchDOVS>\n  <ConnectTicket>••••••••</ConnectTicket>\n  <ProductId>194</ProductId>\n  <IdNumber>•••••••••0145</IdNumber>\n  <CellNumber>•••••••321</CellNumber>\n  <YourReference>ONB-7781</YourReference>\n</ConnectConsumerMatchDOVS>',
  },
  {
    time: '30 Sep 09:30:02', user: 'svc_collections_old', method: 'Login', product: 'Sign-in', ref: 'None',
    tone: 'red', status: 'Failed', group: 'failed', title: 'Login failed',
    what: 'The username or password was not accepted. After repeated failures this API user was locked.',
    steps: ['Check the password stored in the calling system.', 'Unlock the user or reset its password on the API page.'],
    request: '<Login>\n  <strUser>svc_collections_old</strUser>\n  <strPwd>••••••••</strPwd>\n</Login>',
  },
  {
    time: '30 Sep 05:02:44', user: 'svc_lending_prod', method: 'IsTicketValid', product: 'Sign-in', ref: 'None',
    tone: 'green', status: 'Success', group: 'success', title: 'Ticket valid',
    what: 'The ticket from the 05:02 Login was checked and is valid. It expires 5 hours after it was issued.',
    steps: ['No action needed.'],
    request: '<IsTicketValid>\n  <XDSConnectTicket>••••••••</XDSConnectTicket>\n</IsTicketValid>',
  },
];

export const TOTAL_EVENTS = 3218;
export const PRODUCTS = ['Credit Enquiry', 'DOVS'];
