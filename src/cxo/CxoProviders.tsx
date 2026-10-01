import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SpecNotesProvider } from '@/components/notes/spec-notes';
import { SessionGate } from '@/components/shell/session-gate';
import { DEMO_EMAIL, resetToFreshOrg, signInAs } from '@/lib/api/mocks/store';
import { setBusiness } from '@/lib/business';

/*
 * Runs the client-portal modules (products, billing, top-up, reports, users, account) inside Mettus Central.
 * Their data comes from the MSW mock API in src/cxo/lib/api/mocks until a real backend URL is set.
 */

const MOCKS_ENABLED = !import.meta.env.VITE_API_URL;

// Start the mock worker once, even when React runs effects twice in development.
let mockStart: Promise<unknown> | null = null;
const startMocks = () => (mockStart ??= import('@/lib/api/mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass', quiet: true })));

/** Starts the mock API before anything renders, so no request slips past it. */
export function CxoDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKS_ENABLED);

  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    let cancelled = false;
    startMocks().then(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <LoadingScreen label="Starting Mettus Central" />;
  return <>{children}</>;
}

/**
 * One data cache and client-portal session per signed-in person. Key it by email: switching accounts
 * remounts it with a fresh cache, so one person's data never shows for the next.
 */
export function CxoSession({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [queryClient] = useState(() => {
    // Set before the session request goes out, so the mock returns this person.
    if (user && MOCKS_ENABLED) {
      // Only ABSA (via Thandi) has real history. Anyone else — invited live during a demo — is a genuinely
      // new client: no products, no invoices, no usage, until they actually switch something on themselves.
      if (user.email.toLowerCase() === DEMO_EMAIL.toLowerCase()) signInAs(user.email);
      else resetToFreshOrg(user);
    }
    return new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } } });
  });
  return (
    <QueryClientProvider client={queryClient}>
      <SpecNotesProvider>
        <SessionGate>{children}</SessionGate>
      </SpecNotesProvider>
    </QueryClientProvider>
  );
}

/** Keeps the client portal's XDS/MIE business in step with the organisation picked in the sidebar. */
export function syncBusiness(org: string) {
  if (org === 'XDS') setBusiness('xds');
  else if (org === 'MIE') setBusiness('mie');
}
