import { useBulkJobs } from '@/lib/api/queries';
import type { BulkJob, BulkJobStatus } from '@/lib/api/types';
import { SUITE_BY_ID } from '@/lib/suites';
import type { PillTone } from '../../ui';

/**
 * MIE screening checks: the same bulk report runs Reports shows, filtered to MIE's screening products
 * (Criminal Record Checks, Qualification Verification, Social Media Screening, Employee Risk Management).
 * Shared by the MIE page and the assistant.
 */

export const CHECK_STATUS_LABEL: Record<BulkJobStatus, string> = { queued: 'Queued', processing: 'In progress', completed: 'Done', failed: 'Failed' };
export const CHECK_STATUS_TONE: Record<BulkJobStatus, PillTone> = { queued: 'grey', processing: 'amber', completed: 'green', failed: 'red' };

const n = (x: number) => x.toLocaleString('en-ZA');

export function checkLine(j: BulkJob): string {
  if (j.status === 'processing') return `${n(j.processedRows)} of ${n(j.rows)} candidates checked (${j.progress}%).`;
  if (j.status === 'queued') return `${n(j.rows)} candidates, waiting to start.`;
  if (j.status === 'failed') return "The file couldn't be processed, so nothing was charged.";
  return `${n(j.rows)} candidates checked${j.noMatchRows ? `, ${n(j.noMatchRows)} need a closer look` : ''}.`;
}

/** Your MIE screening batches, split into what's still running and what finished recently. */
export function useMieChecks() {
  const { data, isPending } = useBulkJobs();
  const jobs = (data ?? []).filter((j) => SUITE_BY_ID[j.suite].business === 'mie');
  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'processing');
  const recent = jobs.filter((j) => j.status === 'completed' || j.status === 'failed');
  return { isPending, jobs, active, recent };
}
