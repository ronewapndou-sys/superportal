import Image from "next/image";
import { cx } from "@/lib/cx";

/*
 * Official Mettus artwork (public/brand, from the Mettus logo pack). The
 * icon is always a PNG — the style guide forbids converting it to SVG.
 */

/** Square icon chip: white-tint background holding the colour icon PNG. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/95", className)}>
      <Image src="/brand/mettus-icon.png" alt="" width={34} height={34} priority />
    </span>
  );
}

/** Horizontal logo. `onDark` = white wordmark (navbar, gradients); otherwise theme-aware. */
export function Wordmark({ onDark, className }: { onDark?: boolean; className?: string }) {
  const white = (
    <Image src="/brand/mettus-horizontal-white.png" alt="Mettus" width={600} height={95} priority className={cx("h-auto", className)} />
  );
  if (onDark) return white;
  return (
    <>
      <Image src="/brand/mettus-horizontal-dark.png" alt="Mettus" width={600} height={95} priority className={cx("h-auto dark:hidden", className)} />
      <span className="hidden dark:inline">{white}</span>
    </>
  );
}

/** "In association with MIE & XDS" lockup, theme-aware. */
export function AssociationLockup({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/brand/in-association-dark.png"
        alt="In association with MIE and XDS"
        width={377}
        height={56}
        className={cx("h-auto dark:hidden", className)}
      />
      <Image
        src="/brand/in-association-white.png"
        alt="In association with MIE and XDS"
        width={373}
        height={59}
        className={cx("hidden h-auto dark:block", className)}
      />
    </>
  );
}
