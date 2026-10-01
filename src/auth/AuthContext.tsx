import { createContext, useCallback, useContext, useState } from 'react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isStaffEmail, type Account, type ServiceId } from './accounts';
import { loadInvitedAccounts } from './invitedAccounts';

/** Everyone who can sign in: the fixed demo accounts, plus anyone invited live during this demo. */
const allAccounts = () => [...DEMO_ACCOUNTS, ...loadInvitedAccounts()];

type AuthApi = {
  user: Account | null;
  /** Step 1: check email and password. Returns the matching account, or an error message. */
  checkPassword: (email: string, password: string) => Promise<{ account?: Account; error?: string }>;
  /** Step 2: accept the verification code and start the session. */
  verifyCode: (account: Account, code: string, remember: boolean) => Promise<string | null>;
  signOut: () => void;
  /** Whether the signed-in account can use a service. Until a client submits the onboarding form, only Onboarding is available. */
  can: (service: ServiceId) => boolean;
  /** Mettus staff, and clients who have submitted the onboarding form. */
  onboarded: boolean;
  /** Called when the client submits the onboarding form. Unlocks the rest of Mettus Central. */
  completeOnboarding: () => void;
};

const STORAGE_KEY = 'mettus-central-session';
const ONBOARDED_KEY = 'mettus-central-onboarded';
/** Existing clients who onboarded before Mettus Central. Anyone else must complete the form on first use. */
const ALREADY_ONBOARDED = ['admin'];

const AuthContext = createContext<AuthApi | null>(null);
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readSession(): Account | null {
  try {
    const id = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
    return allAccounts().find((a) => a.id === id) ?? null;
  } catch {
    return null;
  }
}

function writeSession(id: string | null, remember = false) {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    if (id) (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable: the session just won't survive a refresh */
  }
}

function readOnboarded(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ONBOARDED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Sign-in for all of Mettus Central. One session gives access to every service on the account. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Account | null>(readSession);
  const [done, setDone] = useState<string[]>(readOnboarded);

  const checkPassword = useCallback(async (email: string, password: string) => {
    await delay(600);
    const normalised = email.trim().toLowerCase();
    const account = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === normalised);
    if (account) {
      if (password !== DEMO_PASSWORD) return { error: "That email and password don't match an account. Check them and try again." };
      return { account };
    }
    // Someone invited live during this demo: any password gets them in, so there's nothing to remember.
    const invited = loadInvitedAccounts().find((a) => a.email.toLowerCase() === normalised);
    if (!invited || !password) return { error: "That email and password don't match an account. Check them and try again." };
    return { account: invited };
  }, []);

  const verifyCode = useCallback(async (account: Account, code: string, remember: boolean) => {
    await delay(500);
    if (!/^\d{6}$/.test(code)) return 'Enter the 6-digit code.';
    writeSession(account.id, remember);
    setUser(account);
    return null;
  }, []);

  const signOut = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const onboarded = Boolean(user && (isStaffEmail(user.email) || ALREADY_ONBOARDED.includes(user.id) || done.includes(user.id)));

  const completeOnboarding = useCallback(() => {
    if (!user) return;
    const next = [...new Set([...readOnboarded(), user.id])];
    try { localStorage.setItem(ONBOARDED_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setDone(next);
  }, [user]);

  const can = useCallback(
    (service: ServiceId) => Boolean(user?.services.includes(service)) && (onboarded || service === 'onboarding'),
    [user, onboarded],
  );

  return <AuthContext.Provider value={{ user, checkPassword, verifyCode, signOut, can, onboarded, completeOnboarding }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
