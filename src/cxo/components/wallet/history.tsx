"use client";

import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PendingState,
  Pill,
  TableWrap,
  TD,
  TH,
  TR,
} from "@/components/ui/primitives";
import { useTopUps } from "@/lib/api/queries";
import { dateAndTime, money } from "@/lib/format";
import { TOPUP_STATUS_LABEL, TOPUP_STATUS_TONE } from "@/lib/status";

export function TopUpHistory() {
  const topUps = useTopUps();
  return (
    <Card aria-labelledby="history-title">
      <div className="p-5 md:p-6">
        <CardHeader id="history-title" title="Top-up history" description="Every top-up on your account, by anyone on your team." />
      </div>
      {topUps.isPending ? (
        <PendingState label="Loading your top-ups…" />
      ) : topUps.isError ? (
        <ErrorState message="Couldn't load your top-up history." onRetry={() => topUps.refetch()} />
      ) : topUps.data.length === 0 ? (
        <EmptyState title="No top-ups yet" description="Your first top-up will show up here with its reference." />
      ) : (
        <TableWrap label="Top-up history">
          <table className="w-full min-w-[680px] border-t border-line">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>Reference</th>
                <th scope="col" className={TH}>Date</th>
                <th scope="col" className={`${TH} text-right`}>Amount</th>
                <th scope="col" className={TH}>Method</th>
                <th scope="col" className={TH}>By</th>
                <th scope="col" className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {topUps.data.map((t) => (
                <tr key={t.id} className={TR}>
                  <td className={`${TD} font-semibold whitespace-nowrap tabular-nums`}>{t.reference}</td>
                  <td className={`${TD} whitespace-nowrap text-muted`}>
                    <time dateTime={t.createdAt}>{dateAndTime(t.createdAt)}</time>
                  </td>
                  <td className={`${TD} text-right font-semibold whitespace-nowrap tabular-nums`}>{money(t.amountCents)}</td>
                  <td className={`${TD} whitespace-nowrap`}>{t.methodLabel}</td>
                  <td className={`${TD} whitespace-nowrap text-muted`}>{t.by}</td>
                  <td className={TD}>
                    <Pill tone={TOPUP_STATUS_TONE[t.status]}>{TOPUP_STATUS_LABEL[t.status]}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}
