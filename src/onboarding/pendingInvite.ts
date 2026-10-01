/**
 * Bridges the staff "Send invitation" wizard to the invitee's onboarding form, so a demo can show the
 * whole loop: Mettus staff invites a new client, and the fields are already filled in when they arrive.
 * Demo only: there's no real backend, so this travels through localStorage rather than email. Keyed by
 * email, so more than one invite can be sent in a demo without them overwriting each other.
 */
export type PendingInvite = {
  entityName: string;
  entityType: string;
  contactFirst: string;
  contactLast: string;
  email: string;
  mobile: string;
  /** From the invite's "Bank details" choice: true when "No bank details needed" was picked. */
  noBankDetails: boolean;
};

const KEY = 'mettus-central-pending-invites';

function loadAll(): Record<string, PendingInvite> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, PendingInvite>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

export function savePendingInvite(p: PendingInvite) {
  const all = loadAll();
  all[p.email.toLowerCase()] = p;
  saveAll(all);
}

export function loadPendingInvite(email: string): PendingInvite | null {
  return loadAll()[email.toLowerCase()] ?? null;
}

export function clearPendingInvite(email: string) {
  const all = loadAll();
  delete all[email.toLowerCase()];
  saveAll(all);
}
