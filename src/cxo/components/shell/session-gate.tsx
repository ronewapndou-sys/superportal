"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "@/components/ui/primitives";
import { LoadingMark } from "../../../ui/LoadingScreen";
import { authApi } from "@/lib/api/endpoints";
import { setSession, useSession } from "@/lib/session";

/**
 * No login screen: the host portal has already signed the user in.
 * The gate exchanges that sign-in for a session here, and fetches again
 * whenever the session is dropped (e.g. an API call returns 401).
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const q = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const s = await authApi.session();
      setSession(s);
      return s;
    },
    enabled: !session,
    staleTime: 0,
    gcTime: 0,
    // the first request can land while the demo's mock server is still starting after a reload, so try a few times
    retry: 4,
    retryDelay: 500,
  });

  if (session) return <>{children}</>;

  if (q.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Alert tone="danger" title="Couldn't confirm who you are">
            Your session may have ended. Try again, or sign in again and reopen this page.
          </Alert>
          <Button variant="secondary" onClick={() => q.refetch()} loading={q.isFetching}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-[13px] text-muted" role="status">
      <LoadingMark size={64} />
      Connecting to your Mettus account
    </div>
  );
}
