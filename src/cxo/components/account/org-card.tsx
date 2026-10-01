"use client";

import { Card, CardHeader, ErrorState, PendingState } from "@/components/ui/primitives";
import { useOrg } from "@/lib/api/queries";
import type { Role } from "@/lib/api/types";
import { ROLE_LABEL } from "@/lib/status";

export function OrgCard({ role }: { role: Role }) {
  const q = useOrg();
  return (
    <Card className="p-5 md:p-6" aria-labelledby="org-title">
      <CardHeader id="org-title" title="Organisation" description="Managed by Mettus. Ask your account manager to change these." />
      {q.isPending ? (
        <PendingState label="Loading your organisation…" className="py-10" />
      ) : q.isError ? (
        <ErrorState message="Couldn't load your organisation details." onRetry={() => q.refetch()} />
      ) : (
        <dl className="mt-5 space-y-4 text-[13px]">
          <Row label="Organisation" value={q.data.name} />
          <Row label="Registration number" value={q.data.registrationNumber} mono />
          <Row label="Mettus account number" value={q.data.accountNumber} mono />
          <Row label="Your role" value={ROLE_LABEL[role]} />
          <div className="border-t border-line pt-4">
            <dt className="text-xs text-muted">Account manager</dt>
            <dd className="mt-1 font-semibold text-ink">{q.data.accountManager.name}</dd>
            <dd className="mt-1">
              <a
                href={`mailto:${q.data.accountManager.email}`}
                className="inline-flex min-h-9 items-center rounded font-semibold break-all text-brand hover:underline dark:text-kw"
              >
                {q.data.accountManager.email}
              </a>
            </dd>
            <dd>
              <a
                href={`tel:${q.data.accountManager.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-9 items-center rounded font-semibold text-brand tabular-nums hover:underline dark:text-kw"
              >
                {q.data.accountManager.phone}
              </a>
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={mono ? "mt-0.5 font-medium text-ink tabular-nums" : "mt-0.5 font-medium text-ink"}>{value}</dd>
    </div>
  );
}
