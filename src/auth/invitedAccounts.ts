import type { Account } from './accounts';

/**
 * Accounts created live during a demo, when Mettus staff send an onboarding invitation (see
 * src/onboarding/staff/StaffOnboarding.tsx). They show up on the login screen immediately, so a
 * presenter can click straight into the invited company without setting anything up first.
 * Demo only: there's no real identity service, so this travels through localStorage.
 */
const KEY = 'mettus-central-invited-accounts';

export function loadInvitedAccounts(): Account[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Replaces any earlier invite for the same email, so re-inviting someone doesn't pile up duplicate cards. */
export function addInvitedAccount(account: Account) {
  try {
    const rest = loadInvitedAccounts().filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
    localStorage.setItem(KEY, JSON.stringify([account, ...rest]));
  } catch {
    /* storage unavailable — the account just won't show up on the login screen */
  }
}
