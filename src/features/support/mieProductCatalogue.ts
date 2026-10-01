/**
 * Every MIE verification product and its Product ID. Smaller than the XDS catalogue — MIE's
 * business is identity, document and background verification rather than credit and tracing.
 */
export const MIE_PRODUCT_CATALOGUE: [id: number, name: string][] = [
  [401, 'Document Verification'],
  [402, 'Facial Match Verification'],
  [403, 'Liveness Check'],
  [404, 'Address Verification'],
  [405, 'Bank Account Verification'],
  [406, 'Qualification Verification'],
  [407, 'Professional Membership Verification'],
  [408, 'Criminal Record Check'],
  [409, 'Credit Record Check'],
  [410, 'Directorship Check'],
  [411, 'Sanctions and Watchlist Screening'],
  [412, 'Employment Verification'],
  [413, 'Reference Check'],
  [414, 'ID Number Validation'],
  [415, 'Passport Verification'],
  [416, 'Work Permit Verification'],
  [417, 'Company Registration Check'],
  [418, 'VAT Registration Check'],
  [419, 'Biometric Enrolment'],
  [420, 'Ongoing Monitoring Alert'],
];
