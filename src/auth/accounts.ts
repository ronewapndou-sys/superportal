import type { Organisation } from '../shell/navConfig';

/** Every service in Mettus Central. Nav items and home tiles are tagged with one of these. */
export type ServiceId =
  | 'home'
  | 'products'
  | 'onboarding'
  | 'billing'
  | 'support'
  | 'tickets'
  | 'reports'
  | 'monitoring'
  | 'users'
  | 'portal-admin'
  | 'config'
  | 'platform-health'
  | 'support-desk';

/** Everything a client organisation's administrator can have. Platform health and the support desk are for Mettus staff. */
export const CLIENT_SERVICES: ServiceId[] = ['home', 'products', 'onboarding', 'billing', 'support', 'tickets', 'reports', 'monitoring', 'users', 'portal-admin', 'config'];

export type Account = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  /** Last digits of the cellphone the verification code "goes" to. */
  cellEnding: string;
  orgs: Exclude<Organisation, 'All organisations'>[];
  services: ServiceId[];
};

/**
 * Presentation accounts. This is a front-end mock: there is no real authentication.
 * Replace with the real identity service when integrating. People and the organisation
 * match the client portal's mock data (src/cxo/lib/api/mocks/store.ts).
 */
export const DEMO_PASSWORD = 'Demo@2026';

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: 'admin',
    name: 'Thandi Mokoena',
    email: 'thandi@absa.example',
    role: 'Administrator, ABSA',
    initials: 'TM',
    cellEnding: '321',
    orgs: ['XDS', 'MIE'],
    services: CLIENT_SERVICES,
  },
  {
    id: 'xds-ops',
    name: 'Ziyaad Raymond',
    email: 'ziyaad.raymond@xds.co.za',
    role: 'Support and operations, XDS',
    initials: 'ZR',
    cellEnding: '114',
    orgs: ['XDS', 'MIE'],
    services: ['home', 'onboarding', 'platform-health', 'support-desk', 'portal-admin', 'config'],
  },
];

/** Mettus staff have an XDS, MIE or Mettus email address (for example name@xds.co.za). Everyone else is a client or invitee. */
export function isStaffEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return domain.split('.').some((part) => part === 'xds' || part === 'mie' || part === 'mettus');
}

/** Account roles read "Administrator, Company Name" — the part after the comma is the company. */
export function companyFromRole(role: string): string {
  return role.split(',').slice(1).join(',').trim() || role;
}
