import type { ServiceId } from '../auth/accounts';
import type { NavIconName } from './navIcons';

/**
 * Sidebar navigation for the whole of Mettus Central. Each module adds its pages here.
 * `service` decides who sees an item: people only see services on their account.
 * `staffOnly` items are for Mettus staff and are hidden (not shown as locked) for client accounts.
 * `org` hides an item that only makes sense for one business: it shows only when that organisation
 * (or "All organisations") is picked in the top bar, so XDS-only and MIE-only pages don't show up
 * confusingly on the other tab. Leave it unset for items that cover both businesses.
 * `hideIfCan` hides an item for anyone who already has the named service: used so a client who has
 * been onboarded (and so has `products`) sees one "Products" tab instead of a separate Onboarding one,
 * while a not-yet-onboarded invitee or Mettus staff (who don't have `products`) still see it.
 * Items without a `path` show as "coming soon" until someone builds them.
 */
export type NavItem = { label: string; icon: NavIconName; service: ServiceId; path?: string; description?: string; staffOnly?: boolean; org?: 'XDS' | 'MIE'; hideIfCan?: ServiceId };
export type NavSection = { heading: string; items: NavItem[] };

export const NAV: NavSection[] = [
  { heading: 'Portal', items: [{ label: 'Home', icon: 'home', service: 'home', path: '/' }] },
  {
    heading: 'Products',
    items: [
      { label: 'Products', icon: 'products', service: 'products', path: '/products', description: 'Open your XDS and MIE products, and request more.' },
      { label: 'Fingerprint Zone', icon: 'fpz', service: 'products', org: 'MIE', path: '/mie/fingerprint-zone', description: 'MIE screening check status, FPZ appointment bookings and fingerprint-taking training.' },
      { label: 'Onboarding', icon: 'onboarding', service: 'onboarding', hideIfCan: 'products', path: '/onboarding', description: 'Complete your onboarding, or send and manage invitations (Mettus staff).' },
    ],
  },
  {
    heading: 'Billing',
    items: [
      { label: 'Billing', icon: 'billing', service: 'billing', path: '/billing', description: 'Invoices, subscriptions and payment methods.' },
      { label: 'Top up', icon: 'wallet', service: 'billing', path: '/top-up', description: 'Add credits to your wallet and set up auto top-up.' },
    ],
  },
  {
    heading: 'Support',
    items: [
      { label: 'Support tickets', icon: 'tickets', service: 'tickets', path: '/support/tickets', description: 'Talk to XDS and MIE support, and follow up on your tickets.' },
      { label: 'Integrations', icon: 'integrations', service: 'support', org: 'XDS', path: '/support/integrations', description: 'Connect your systems and check they are working.' },
      { label: 'API', icon: 'api', service: 'support', org: 'XDS', path: '/support/api', description: 'XDS Connect access, API users and products.' },
      { label: 'Activity log', icon: 'activity', service: 'support', org: 'XDS', path: '/support/activity', description: 'Calls your systems made, and how to fix failures.' },
      { label: 'Support desk', icon: 'desk', service: 'support-desk', staffOnly: true, path: '/support/desk', description: 'Answer tickets from client organisations.' },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { label: 'Reports', icon: 'insights', service: 'reports', path: '/reports', description: 'Usage, monthly reports, bulk runs and schedules.' },
      { label: 'Monitoring', icon: 'monitoring', service: 'monitoring', path: '/monitoring', description: 'How your connections are performing, and your alerts.' },
      { label: 'Platform health', icon: 'platform', service: 'platform-health', staffOnly: true, path: '/monitoring/platform', description: 'Every Mettus service, incidents and affected clients.' },
    ],
  },
  {
    heading: 'Manage',
    items: [
      { label: 'Users', icon: 'users', service: 'users', path: '/users', description: 'People, invites, branches, roles and the audit log.' },
      { label: 'Portal Admin', icon: 'admin', service: 'portal-admin', org: 'XDS', path: '/admin', description: 'Manage portal users, access, products and web service passwords (XDS).' },
      { label: 'Configuration', icon: 'config', service: 'config', path: '/configuration', description: 'Report field exclusions, alert channels and sign-in defaults for your organisation.' },
    ],
  },
];

export const ORGANISATIONS = ['XDS', 'MIE', 'All organisations'] as const;
export type Organisation = (typeof ORGANISATIONS)[number];

/** Pages that aren't in the sidebar but still need a breadcrumb and an access check. */
const EXTRA: { path: string; section: string; label: string; service: ServiceId }[] = [
  { path: '/account', section: 'Account', label: 'Profile and preferences', service: 'home' },
];

/** Finds the nav section and item for a URL, used for the breadcrumb, access checks and the assistant's context. */
export function findNav(pathname: string): { section: NavSection; item: NavItem } | undefined {
  // Longest matching path wins, so /monitoring/platform is not mistaken for /monitoring.
  let best: { section: NavSection; item: NavItem } | undefined;
  for (const section of NAV) {
    for (const item of section.items) {
      const p = item.path;
      if (!p || !(pathname === p || (p !== '/' && pathname.startsWith(p + '/')))) continue;
      if (!best || p.length > (best.item.path ?? '').length) best = { section, item };
    }
  }
  if (best) return best;
  const extra = EXTRA.find((e) => pathname === e.path || pathname.startsWith(e.path + '/'));
  return extra && { section: { heading: extra.section, items: [] }, item: { label: extra.label, icon: 'home', service: extra.service, path: extra.path } };
}
