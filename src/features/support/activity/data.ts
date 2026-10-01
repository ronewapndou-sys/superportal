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

// Sample events for MIE. Method names follow the MIE Verification API's REST shape; the values are made up.
export const EVENTS_MIE: ActivityEvent[] = [
  {
    time: '30 Sep 09:41:03', user: 'svc_onboarding_mie', method: 'POST /v2/verify/document', product: 'Document Verification', productId: 401, ref: 'ONB-8820',
    tone: 'green', status: 'Success', group: 'success', title: 'Document verified',
    what: 'The ID document matched the claimed identity with a match score of 0.97, and no signs of tampering were found.',
    steps: ['No action needed.'],
    request: '{\n  "documentImage": "<base64>",\n  "idNumber": "•••••••••0082"\n}',
  },
  {
    time: '30 Sep 09:38:47', user: 'svc_screening_mie', method: 'POST /v2/verify/address', product: 'Address Verification', productId: 404, ref: 'SCR-5541',
    tone: 'red', status: 'Failed', group: 'failed', title: 'Session token expired',
    what: 'The session token sent with this call had expired. Session tokens from POST /v2/sessions are valid for 12 hours, and this one was issued at 21:30 the previous day.',
    steps: ['Call POST /v2/sessions again to get a new session token.', 'Check the token with GET /v2/sessions/current before you start a batch of calls.', "Don't store session tokens for longer than 12 hours."],
    request: '{\n  "idNumber": "•••••••••0145",\n  "address": "•••••••••••••••"\n}',
  },
  {
    time: '30 Sep 09:30:12', user: 'svc_onboarding_mie', method: 'POST /v2/verify/document', product: 'Document Verification', productId: 401, ref: 'ONB-8815',
    tone: 'amber', status: 'Mismatch', group: 'warning', title: 'Document mismatch',
    what: "The photo on the ID document did not match the selfie submitted (match score 0.41, below the 0.80 threshold).",
    steps: ['Ask the consumer to resubmit clearer photos in good light.', 'If it fails again, verify the consumer another way.'],
    request: '{\n  "documentImage": "<base64>",\n  "selfieImage": "<base64>",\n  "idNumber": "•••••••••0391"\n}',
  },
  {
    time: '30 Sep 09:12:55', user: 'svc_screening_mie', method: 'POST /v2/verify/employment', product: 'Employment Verification', productId: 412, ref: 'SCR-5538',
    tone: 'amber', status: 'No match', group: 'warning', title: 'No consumer found',
    what: 'No record matched the ID number and employer name sent.',
    steps: ['Confirm the ID number is correct.', 'Try the employer\'s registered trading name instead of a shortened name.'],
    request: '{\n  "idNumber": "•••••••••0276",\n  "employerName": "•••••••••"\n}',
  },
  {
    time: '30 Sep 08:55:20', user: 'svc_screening_mie', method: 'POST /v2/verify/address', product: 'Address Verification', productId: 404, ref: 'SCR-5530',
    tone: 'green', status: 'Success', group: 'success', title: 'Address verified',
    what: 'The address matched a record on file with an addressMatch score of 0.91.',
    steps: ['No action needed.'],
    request: '{\n  "idNumber": "•••••••••0519",\n  "address": "•••••••••••••••"\n}',
  },
  {
    time: '30 Sep 08:40:02', user: 'svc_onboarding_mie', method: 'GET /v2/sessions/current', product: 'Sign-in', ref: 'None',
    tone: 'green', status: 'Success', group: 'success', title: 'Session valid',
    what: 'The session token issued at 20:40 the previous day was checked and is valid. It expires 12 hours after it was issued.',
    steps: ['No action needed.'],
    request: '{\n  "Authorization": "Bearer ••••••••"\n}',
  },
];
export const PRODUCTS_MIE = ['Document Verification', 'Address Verification', 'Employment Verification'];
export const TOTAL_EVENTS_MIE = 941;
