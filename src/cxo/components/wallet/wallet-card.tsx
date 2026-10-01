import { Card, Pill } from "@/components/ui/primitives";
import type { Wallet } from "@/lib/api/types";
import { money, moneyWhole } from "@/lib/format";
import { Gauge } from "./gauge";

/** Balance against a comfortable level: 2.5× the low-balance alert. */
export function WalletCard({ wallet }: { wallet: Wallet }) {
  const target = Math.max(wallet.lowBalanceThresholdCents * 2.5, wallet.balanceCents, 1);
  const low = wallet.balanceCents < wallet.lowBalanceThresholdCents;
  const days = Math.round(wallet.balanceCents / Math.max(wallet.avgDailySpendCents, 1));

  return (
    <Card className="p-5 md:p-6" aria-labelledby="wallet-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="wallet-title" className="text-section font-semibold tracking-[-0.3px] text-ink">
          Wallet
        </h2>
        {low ? <Pill tone="warning">Running low</Pill> : <Pill tone="success">Healthy</Pill>}
      </div>
      <div className="mt-5">
        <Gauge
          value={wallet.balanceCents / target}
          label={`Wallet balance ${money(wallet.balanceCents)}, about ${days} days of usage`}
        >
          <span className="text-xs font-medium text-muted">Balance</span>
          <span className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.5px] text-ink tabular-nums">
            {moneyWhole(wallet.balanceCents)}
          </span>
          <span className="mt-1 text-xs text-muted tabular-nums">About {days} days</span>
        </Gauge>
      </div>
      <dl className="mt-6 space-y-2.5 text-[13px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Average daily spend</dt>
          <dd className="font-semibold text-ink tabular-nums">{money(wallet.avgDailySpendCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Low-balance alert</dt>
          <dd className="font-semibold text-ink tabular-nums">{moneyWhole(wallet.lowBalanceThresholdCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Auto top-up</dt>
          <dd className="font-semibold text-ink">
            {wallet.autoTopUp.enabled ? `On, adds ${moneyWhole(wallet.autoTopUp.amountCents)}` : "Off"}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Lasts about {days} days at your average spend over the last 30 days.
      </p>
    </Card>
  );
}
