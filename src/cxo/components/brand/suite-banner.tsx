import { cx } from "@/lib/cx";
import type { Suite } from "@/lib/suites";

/**
 * Product banner: static blue gradient (style guide suite heroes).
 * No icons, logo artwork or looping motion — only the product name.
 */
export function SuiteBanner({
  suite,
  className,
  tall,
  children,
}: {
  suite: Suite;
  className?: string;
  tall?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "on-brand relative isolate overflow-hidden text-white",
        suite.heroClass,
        tall ? "min-h-[180px] md:min-h-[220px]" : "h-[110px]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Tagline with the product keyword wrapped in the .kw dark-blue accent. */
export function SuiteTagline({ suite, className }: { suite: Suite; className?: string }) {
  const i = suite.tagline.toLowerCase().indexOf(suite.keyword.toLowerCase());
  if (i < 0) return <p className={className}>{suite.tagline}</p>;
  return (
    <p className={className}>
      {suite.tagline.slice(0, i)}
      <span className="kw">{suite.tagline.slice(i, i + suite.keyword.length)}</span>
      {suite.tagline.slice(i + suite.keyword.length)}
    </p>
  );
}
