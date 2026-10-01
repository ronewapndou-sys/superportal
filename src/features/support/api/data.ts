import type { PillTone } from '../../../ui';

export type Environment = 'Production' | 'UAT';

/** A web service login. XDS Connect uses a username and password to get a ticket, not an API key. */
export type ApiUser = {
  id: string;
  username: string;
  environment: Environment;
  products: string;
  status: { tone: PillTone; label: string };
  lastLogin: string;
  locked?: boolean;
};

export const INITIAL_USERS: ApiUser[] = [
  { id: 'u1', username: 'svc_lending_prod', environment: 'Production', products: 'Credit Enquiry', status: { tone: 'green', label: 'Active' }, lastLogin: 'Today, 10:14' },
  { id: 'u2', username: 'svc_onboarding_prod', environment: 'Production', products: 'DOVS, Realtime IDV', status: { tone: 'amber', label: 'Password expires in 5 days' }, lastLogin: 'Today, 09:52' },
  { id: 'u3', username: 'uat_integration_test', environment: 'UAT', products: 'Credit Enquiry, DOVS', status: { tone: 'green', label: 'Active' }, lastLogin: '29 Sep 2026' },
  { id: 'u4', username: 'svc_collections_old', environment: 'Production', products: 'Consumer Trace', status: { tone: 'red', label: 'Locked' }, lastLogin: '12 Sep 2026', locked: true },
];

export const INITIAL_USERS_MIE: ApiUser[] = [
  { id: 'm1', username: 'svc_onboarding_mie', environment: 'Production', products: 'Document Verification', status: { tone: 'green', label: 'Active' }, lastLogin: 'Today, 09:40' },
  { id: 'm2', username: 'svc_screening_mie', environment: 'Production', products: 'Address Verification, Employment Verification', status: { tone: 'green', label: 'Active' }, lastLogin: 'Today, 08:55' },
  { id: 'm3', username: 'uat_mie_integration', environment: 'UAT', products: 'Document Verification, Address Verification', status: { tone: 'green', label: 'Active' }, lastLogin: '28 Sep 2026' },
];

export type ProductAccess = { name: string; productId: number; area: string; tone: PillTone; label: string };

/**
 * This client's products (chosen during onboarding) that are called through the API.
 * IDs are from the XDS product list (Products and IDs Updated.xlsx).
 */
export const INITIAL_PRODUCTS: ProductAccess[] = [
  { name: 'Consumer Credit Enquiry', productId: 15, area: 'Credit', tone: 'green', label: 'Production and UAT' },
  { name: 'DOVS', productId: 194, area: 'Identity', tone: 'green', label: 'Production and UAT' },
  { name: 'Realtime IDV', productId: 153, area: 'Identity', tone: 'green', label: 'Production and UAT' },
  { name: 'Consumer Trace', productId: 2, area: 'Tracing', tone: 'green', label: 'Production and UAT' },
  { name: 'Business Enquiry', productId: 12, area: 'Commercial', tone: 'amber', label: 'UAT only' },
];

/** This client's MIE products (chosen during onboarding). IDs are from the MIE product list. */
export const INITIAL_PRODUCTS_MIE: ProductAccess[] = [
  { name: 'Document Verification', productId: 401, area: 'Identity', tone: 'green', label: 'Production and UAT' },
  { name: 'Address Verification', productId: 404, area: 'Identity', tone: 'green', label: 'Production and UAT' },
  { name: 'Employment Verification', productId: 412, area: 'Screening', tone: 'amber', label: 'UAT only' },
];

const pick = (chars: string, n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

/** A fake temporary password. Nothing here is a real credential. */
export function tempPassword() {
  return `${pick('ABCDEFGHJKLMNPQRSTUVWXYZ', 3)}-${pick('23456789', 4)}-${pick('abcdefghjkmnpqrstuvwxyz', 4)}`;
}
