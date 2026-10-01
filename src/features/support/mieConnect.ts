import type { CallStep, ConnectProduct } from './xdsConnect';

/**
 * Reference facts about the MIE Verification API. Unlike XDS Connect's SOAP ticket model, MIE is
 * a REST/JSON API authenticated with a short-lived session token. Shared by the API page, the
 * activity log and the assistant. Everything else in the demo is sample data.
 */
export const MIE_CONNECT = {
  name: 'MIE Verification API',
  protocol: 'REST API · JSON responses',
  productionUrl: 'https://api.mie.co.za/v2',
  uatUrl: 'https://sandbox.mie.co.za/v2',
  ticketHours: 12,
  tokenNoun: 'session token',
  supportPhone: '+27 11 517 0200',
  supportEmail: 'support@mie.co.za',
};

const AUTH: CallStep = { method: 'POST /v2/sessions', sends: 'apiKey, apiSecret', returns: 'A session token valid for 12 hours' };
const CHECK: CallStep = { method: 'GET /v2/sessions/current', sends: 'Authorization: Bearer <token>', returns: '200 OK if the session is still valid, 401 if not' };

export const MIE_CONNECT_PRODUCTS: ConnectProduct[] = [
  {
    id: 'docv',
    name: 'Document Verification',
    productId: 401,
    summary: 'Checks a photographed or scanned ID document for signs of tampering and confirms its details match the claimed identity.',
    steps: [
      AUTH,
      CHECK,
      { method: 'POST /v2/verify/document', sends: 'Bearer token, documentImage, idNumber', returns: 'matchScore, documentAuthenticity and a pass/fail result' },
    ],
  },
  {
    id: 'addr',
    name: 'Address Verification',
    productId: 404,
    summary: "Confirms a consumer's residential address against municipal, utility and credit-bureau records.",
    steps: [
      AUTH,
      CHECK,
      { method: 'POST /v2/verify/address', sends: 'Bearer token, idNumber, address', returns: 'addressMatch score and the closest matching record on file' },
    ],
  },
  {
    id: 'emp',
    name: 'Employment Verification',
    productId: 412,
    summary: "Confirms a consumer's current employer and length of service where the employer participates in MIE's data pool.",
    steps: [
      AUTH,
      CHECK,
      { method: 'POST /v2/verify/employment', sends: 'Bearer token, idNumber, employerName', returns: 'employmentStatus, employer and tenureMonths' },
    ],
  },
];
