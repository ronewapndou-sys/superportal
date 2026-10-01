/**
 * Reference facts about XDS Connect, taken from the XDS technical specifications
 * (Credit Enquiry v1.2, Digital Onboarding Verification System v1.3). Shared by the API page,
 * the activity log and the assistant. Everything else in the demo is sample data.
 */
export const XDS_CONNECT = {
  name: 'XDS Connect',
  protocol: 'SOAP web service · XML responses',
  productionUrl: 'https://www.web.xds.co.za/xdsconnect/XDSConnectWS.asmx',
  uatUrl: 'https://www.uat.xds.co.za/xdsconnect/XDSConnectWS.asmx',
  ticketHours: 5,
  supportPhone: '+27 11 645 9100',
  supportEmail: 'info@xds.co.za',
};

export type CallStep = { method: string; sends: string; returns: string };

export type ConnectProduct = {
  id: string;
  name: string;
  productId: number;
  summary: string;
  steps: CallStep[];
};

const LOGIN: CallStep = { method: 'Login', sends: 'strUser, strPwd', returns: 'A ticket that is valid for 5 hours' };
const TICKET: CallStep = { method: 'IsTicketValid', sends: 'XDSConnectTicket', returns: 'true or false' };

export const CONNECT_PRODUCTS: ConnectProduct[] = [
  {
    id: 'credit',
    name: 'Consumer Credit Enquiry',
    productId: 15,
    summary: "Returns a consumer's credit history (Report ID 1, Consumer Credit Report) to support a lending decision.",
    steps: [
      LOGIN,
      TICKET,
      { method: 'ConnectConsumerMatch', sends: 'ConnectTicket, ProductId 15, EnquiryReason, and an ID number, passport number, or first name + surname + date of birth', returns: 'EnquiryID and EnquiryResultID for the matched consumer' },
      { method: 'ConnectGetResult', sends: 'ConnectTicket, EnquiryID, EnquiryResultID, ProductID 15', returns: 'The Consumer Credit Report as XML' },
    ],
  },
  {
    id: 'dovs',
    name: 'Digital Onboarding Verification (DOVS)',
    productId: 194,
    summary: 'Verifies a consumer with a facial check on their phone: photo match against the ID photo, plus a liveness test.',
    steps: [
      LOGIN,
      TICKET,
      { method: 'ConnectConsumerMatchDOVS', sends: 'ConnectTicket, ProductId 194, IdNumber, CellNumber', returns: 'EnquiryID and EnquiryResultID' },
      { method: 'ConnectDOVRequest', sends: 'ConnectTicket, EnquiryID, EnquiryResultID, ProductID 194, optional RedirectURL', returns: 'An SMS goes to the consumer to complete facial verification' },
      { method: 'ConnectGetDOVResult', sends: 'ConnectTicket, EnquiryID', returns: 'Photo match, liveness result and address details' },
    ],
  },
];
