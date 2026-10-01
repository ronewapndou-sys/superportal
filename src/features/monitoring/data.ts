import type { Business } from '@/lib/api/types';
import type { PillTone } from '../../ui';

/**
 * Sample monitoring data shared by the Mettus platform view (company-wide) and the client view,
 * so an incident at Mettus shows up for the clients who use the affected service.
 */
export type Company = 'XDS' | 'MIE' | 'Mettus';
export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

export const STATUS: Record<ServiceStatus, { tone: PillTone; label: string }> = {
  operational: { tone: 'green', label: 'Operational' },
  degraded: { tone: 'amber', label: 'Degraded' },
  outage: { tone: 'red', label: 'Outage' },
  maintenance: { tone: 'grey', label: 'Maintenance' },
};

export type PlatformService = {
  id: string;
  name: string;
  company: Company;
  description: string;
  status: ServiceStatus;
  uptime30d: number;
  p95Ms: number;
  errorRate: number;
  /** Calls per hour for the last 24 hours, oldest first. */
  hourly: number[];
  /** Worst status per day for the last 30 days, oldest first. */
  history: ServiceStatus[];
};

/** The demo is set at about 11:00 on 30 Sep 2026. */
const NOW_HOUR = 11;

// Deterministic daily curve so the demo looks the same on every load.
function curve(peak: number, seed: number): number[] {
  return Array.from({ length: 24 }, (_, i) => {
    const h = (NOW_HOUR + 1 + i) % 24;
    const day = Math.max(0, Math.sin(((h - 5) / 24) * Math.PI * 2 * 0.62)) ** 1.4;
    const wobble = 0.92 + 0.16 * Math.abs(Math.sin(h * 1.7 + seed));
    return Math.round((peak * 0.06 + peak * day) * wobble);
  });
}

function days(bad: Record<number, ServiceStatus> = {}): ServiceStatus[] {
  return Array.from({ length: 30 }, (_, i) => bad[i] ?? 'operational');
}

export const SERVICES: PlatformService[] = [
  { id: 'xds-connect', name: 'XDS Connect Production', company: 'XDS', description: 'SOAP web service that carries every API product.', status: 'operational', uptime30d: 99.98, p95Ms: 740, errorRate: 0.8, hourly: curve(21000, 1), history: days({ 11: 'degraded' }) },
  { id: 'xds-uat', name: 'XDS Connect UAT', company: 'XDS', description: 'Test environment for client integrations.', status: 'operational', uptime30d: 99.9, p95Ms: 910, errorRate: 2.4, hourly: curve(1400, 2), history: days({ 4: 'maintenance', 18: 'maintenance' }) },
  { id: 'xds-credit', name: 'Credit Enquiry', company: 'XDS', description: 'Consumer Credit Report (Product ID 15).', status: 'operational', uptime30d: 99.99, p95Ms: 690, errorRate: 0.6, hourly: curve(9800, 3), history: days() },
  { id: 'xds-dovs', name: 'DOVS', company: 'XDS', description: 'Digital onboarding: SMS link, photo match and liveness check (Product ID 194).', status: 'operational', uptime30d: 99.95, p95Ms: 1850, errorRate: 1.2, hourly: curve(1600, 4), history: days({ 7: 'degraded' }) },
  { id: 'xds-idv', name: 'Realtime IDV', company: 'XDS', description: 'Identity verification returned while the client waits (Product ID 153).', status: 'degraded', uptime30d: 99.6, p95Ms: 2400, errorRate: 3.8, hourly: curve(4300, 5), history: days({ 22: 'degraded', 29: 'degraded' }) },
  { id: 'xds-trace', name: 'Consumer Trace', company: 'XDS', description: 'Current contact and address details for a consumer (Product ID 2).', status: 'operational', uptime30d: 99.97, p95Ms: 820, errorRate: 0.5, hourly: curve(3100, 6), history: days() },
  { id: 'xds-business', name: 'Business Enquiry', company: 'XDS', description: 'Company information and director details (Product ID 12).', status: 'operational', uptime30d: 99.98, p95Ms: 950, errorRate: 0.4, hourly: curve(1700, 7), history: days({ 14: 'maintenance' }) },
  { id: 'xds-triggers', name: 'Monitoring triggers', company: 'XDS', description: 'Default alerts and changes pushed to client endpoints.', status: 'operational', uptime30d: 99.97, p95Ms: 320, errorRate: 0.4, hourly: curve(2600, 8), history: days() },
  { id: 'mie-api', name: 'MIE verification API', company: 'MIE', description: 'Verification requests from client systems.', status: 'operational', uptime30d: 99.96, p95Ms: 980, errorRate: 0.9, hourly: curve(6800, 9), history: days({ 15: 'degraded' }) },
  { id: 'mie-portal', name: 'MIE client portal', company: 'MIE', description: 'Web portal for requesting and tracking verifications.', status: 'maintenance', uptime30d: 99.9, p95Ms: 520, errorRate: 0.3, hourly: curve(2100, 10), history: days({ 29: 'maintenance' }) },
  { id: 'portal', name: 'Mettus Central', company: 'Mettus', description: 'This portal, for every company and client.', status: 'operational', uptime30d: 99.99, p95Ms: 380, errorRate: 0.1, hourly: curve(1900, 11), history: days() },
  { id: 'identity', name: 'Sign-in and identity', company: 'Mettus', description: 'Portal sign-in, verification codes and sessions.', status: 'operational', uptime30d: 99.99, p95Ms: 210, errorRate: 0.3, hourly: curve(1200, 12), history: days() },
  { id: 'notify', name: 'Notifications (SMS and email)', company: 'Mettus', description: 'SMS for DOVS and sign-in codes, and email alerts.', status: 'operational', uptime30d: 99.93, p95Ms: 1300, errorRate: 0.7, hourly: curve(3300, 13), history: days({ 20: 'degraded' }) },
];

export type IncidentUpdate = { time: string; text: string };
export type Incident = {
  id: string;
  title: string;
  serviceId: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  started: string;
  clientsAffected: number;
  updates: IncidentUpdate[];
};

export const SEVERITY: Record<Incident['severity'], PillTone> = { minor: 'amber', major: 'red', critical: 'red' };

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-2291', title: 'Slow Realtime IDV responses', serviceId: 'xds-idv', severity: 'minor', status: 'identified', started: '29 Sep 22:40', clientsAffected: 14,
    updates: [
      { time: '30 Sep 10:05', text: 'A fix is being rolled out. Responses are improving and should be back to normal by 12:00.' },
      { time: '30 Sep 06:30', text: 'Cause identified: an upstream identity data source is responding slowly, so some requests time out.' },
      { time: '29 Sep 22:40', text: 'Investigating slow Realtime IDV responses and some timeouts.' },
    ],
  },
  {
    id: 'INC-2288', title: 'Slow DOVS results', serviceId: 'xds-dovs', severity: 'minor', status: 'resolved', started: '23 Sep 14:10', clientsAffected: 6,
    updates: [
      { time: '23 Sep 15:02', text: 'Resolved. The liveness provider cleared its queue.' },
      { time: '23 Sep 14:10', text: 'ConnectGetDOVResult responses are slower than usual.' },
    ],
  },
  {
    id: 'INC-2280', title: 'MIE verification API errors', serviceId: 'mie-api', severity: 'major', status: 'resolved', started: '15 Sep 08:20', clientsAffected: 31,
    updates: [
      { time: '15 Sep 09:05', text: 'Resolved after a database failover.' },
      { time: '15 Sep 08:20', text: 'Some verification requests are failing.' },
    ],
  },
];

/** Client organisations (fictional names for the presentation). */
export const CLIENTS = [
  { name: 'Northcliff Bank', company: 'XDS', calls: 48210, failRate: 1.1, reason: 'Expired tickets', tone: 'green' as PillTone, label: 'Healthy' },
  { name: 'ABSA', company: 'XDS', calls: 3184, failRate: 2.1, reason: 'Expired tickets', tone: 'amber' as PillTone, label: 'Watch' },
  { name: 'Karoo Insurance', company: 'MIE', calls: 9120, failRate: 0.6, reason: 'Invalid input', tone: 'green' as PillTone, label: 'Healthy' },
  { name: 'Vantage Telecom', company: 'XDS', calls: 12877, failRate: 7.8, reason: 'Realtime IDV timeouts', tone: 'red' as PillTone, label: 'At risk' },
  { name: 'Summit Lending', company: 'XDS', calls: 5530, failRate: 4.2, reason: 'No consumer match', tone: 'amber' as PillTone, label: 'Watch' },
];

/* ---------- The signed-in client's own numbers (ABSA) ---------- */

/** Services this client uses, by platform service id, per business. */
export const CLIENT_SERVICE_IDS: Record<Business, string[]> = {
  xds: ['xds-connect', 'xds-uat', 'xds-credit', 'xds-dovs', 'xds-idv', 'xds-triggers'],
  mie: ['mie-api', 'mie-portal'],
};

/** Calls per hour today: [successful, failed], 00:00 to now (11:00). */
export const CLIENT_HOURLY: Record<Business, [number, number][]> = {
  xds: [
    [12, 0], [6, 0], [4, 0], [3, 0], [5, 0], [22, 9], [96, 3], [214, 5], [388, 7], [512, 12], [604, 31], [388, 4],
  ],
  mie: [
    [3, 0], [1, 0], [1, 0], [0, 0], [1, 0], [6, 1], [24, 1], [58, 2], [94, 3], [131, 4], [162, 6], [101, 2],
  ],
};

export const FAILURE_REASONS: Record<Business, { label: string; value: number }[]> = {
  xds: [
    { label: 'Ticket no longer valid', value: 41 },
    { label: 'No consumer found', value: 18 },
    { label: 'Liveness check failed', value: 9 },
    { label: 'Login failed', value: 3 },
  ],
  mie: [
    { label: 'Document mismatch', value: 7 },
    { label: 'Invalid input', value: 4 },
    { label: 'Verification timed out', value: 2 },
  ],
};

export type AlertRule = { id: string; name: string; condition: string; channel: string; on: boolean; lastFired: string };

export const ALERT_RULES: AlertRule[] = [
  { id: 'a1', name: 'Failure rate is high', condition: 'Failed calls above 5% for 15 minutes', channel: 'Email · it-ops@absa.example', on: true, lastFired: 'Today, 10:12' },
  { id: 'a2', name: 'API user locked', condition: 'Any API user is locked after failed logins', channel: 'SMS · •••321', on: true, lastFired: 'Today, 09:30' },
  { id: 'a3', name: 'Mettus incident', condition: 'A service you use is degraded or down', channel: 'Email · it-ops@absa.example', on: true, lastFired: '29 Sep, 22:40' },
  { id: 'a4', name: 'Slow responses', condition: 'p95 response time above 2 seconds for 10 minutes', channel: 'Email · it-ops@absa.example', on: false, lastFired: 'Never' },
];

export const RECENT_ALERTS = [
  { time: 'Today, 10:12', tone: 'red' as PillTone, label: 'Fired', text: 'Failed calls reached 5.1% (mostly expired tickets).' },
  { time: 'Today, 09:30', tone: 'red' as PillTone, label: 'Fired', text: 'API user svc_collections_old was locked.' },
  { time: '29 Sep, 22:40', tone: 'amber' as PillTone, label: 'Mettus', text: 'Realtime IDV is degraded (Mettus incident INC-2291).' },
];

/** Labels for the rolling last 24 hours, ending at the current hour (12:00 yesterday to 11:00 today). */
export const HOURS = Array.from({ length: 24 }, (_, i) => `${String((NOW_HOUR + 1 + i) % 24).padStart(2, '0')}:00`);
/** Labels for today so far, from 00:00. */
export const TODAY_HOURS = Array.from({ length: NOW_HOUR + 1 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
