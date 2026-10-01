import Link from "next/link";
import { SuiteBanner, SuiteTagline } from "@/components/brand/suite-banner";
import { Pill, Trend } from "@/components/ui/primitives";
import { buttonClass, cx } from "@/lib/cx";
import { count } from "@/lib/format";
import type { Suite } from "@/lib/suites";

/**
 * One of the four suite blocks. Blue gradient banner (no icons, no emoji —
 * style guide rule), then tagline, usage and the launch action.
 */
export function SuiteCard({
  suite,
  hasAccess,
  usage,
  compact,
}: {
  suite: Suite;
  hasAccess: boolean;
  usage?: { enquiries: number; trendPct: number };
  compact?: boolean;
}) {
  return (
    <article className="card-lift flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <SuiteBanner suite={suite}>
        <div className="flex h-full flex-col justify-end p-5">
          <h3 className="text-section leading-tight font-semibold tracking-[-0.3px]">{suite.name}</h3>
        </div>
      </SuiteBanner>
      <div className="flex flex-1 flex-col p-5">
        <SuiteTagline suite={suite} className="text-[14px] leading-snug font-semibold text-ink" />
        {!compact && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{suite.description}</p>}

        <div className="mt-4 flex min-h-6 items-center gap-2 text-xs text-muted">
          {hasAccess && usage ? (
            <>
              <span className="font-semibold text-ink tabular-nums">{count(usage.enquiries)}</span> enquiries · 30 days
              <Trend value={usage.trendPct} />
            </>
          ) : hasAccess ? (
            <span>Ready when you are</span>
          ) : (
            <Pill tone="neutral" dot={false}>Not subscribed</Pill>
          )}
        </div>

        <div className="mt-auto pt-5">
          <Link
            href={`/products/${suite.id}`}
            className={cx(buttonClass(hasAccess ? "primary" : "secondary"), "w-full")}
            aria-label={hasAccess ? `Open ${suite.name}` : `Find out more about ${suite.name}`}
          >
            {hasAccess ? "Open" : "Find out more"}
          </Link>
        </div>
      </div>
    </article>
  );
}
