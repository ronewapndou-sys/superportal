"use client";

import Link from "next/link";
import { forwardRef, useId } from "react";
import { BUTTON_VARIANTS, buttonClass, cx, type ButtonVariant } from "@/lib/cx";
import { Icon } from "./icons";

export { buttonClass, cx };

/**
 * Small, consistent UI primitives styled with Mettus tokens.
 * Radii follow the style guide: controls 12px (rounded-xl), cards 16px
 * (rounded-2xl), hero blocks 24px (rounded-3xl), pills rounded-full.
 */

/* ------------------------------------------------------------------ Button */

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "md" | "sm";
    loading?: boolean;
  }
>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, type, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 ease-mettus",
        size === "md" ? "min-h-11 px-5 text-[13px]" : "min-h-9 px-3.5 text-xs",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 active:scale-[0.98]",
        BUTTON_VARIANTS[variant],
        className
      )}
      {...props}
    >
      {loading && (
        <Spinner
          className={cx(
            "h-4 w-4",
            variant === "primary" || variant === "on-brand" ? "border-white/40 border-t-white" : undefined
          )}
        />
      )}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-ink/5 hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- Spinner */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-block animate-spin rounded-full border-2 border-brand/25 border-t-brand", className ?? "h-5 w-5")}
      role="status"
      aria-label="Loading"
    />
  );
}

/* ------------------------------------------------------------------ Fields */

const CONTROL =
  "w-full rounded-xl border border-field-line bg-surface text-[14px] text-ink transition-colors placeholder:text-muted/70 hover:border-muted/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:bg-surface-2 disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(CONTROL, "min-h-11 px-3.5", className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cx(CONTROL, "px-3.5 py-2.5 leading-relaxed", className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cx(CONTROL, "min-h-11 px-3.5", className)} {...props}>
        {children}
      </select>
    );
  }
);

export function SearchInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx("relative", className)}>
      <Icon.Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input type="search" className="pl-10" {...props} />
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  required,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1 text-[13px] font-medium text-ink">
        {label}
        {required && <span aria-hidden className="text-brand">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs leading-snug text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs font-medium leading-snug text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: string }) {
  return (
    <label
      className={cx(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-field-line bg-surface px-3.5 py-3 text-[13px] text-ink transition-colors hover:border-brand/40 has-checked:border-brand/50 has-checked:bg-brand/[0.04] has-disabled:cursor-not-allowed has-disabled:opacity-60",
        className
      )}
    >
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-brand" {...props} />
      <span className="leading-snug">
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** On/off switch. A real checkbox underneath, so it's keyboard- and form-native. */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-snug text-muted">{description}</span>}
      </label>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-7 w-12 cursor-pointer appearance-none rounded-full bg-steel/60 transition-colors checked:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full bg-surface shadow-card transition-transform duration-200 ease-mettus peer-checked:translate-x-5 dark:bg-foreground"
        />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------- Alert */

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const ALERT_TONES: Record<Exclude<Tone, "neutral">, string> = {
  danger: "border-danger/25 bg-danger-bg text-ink",
  info: "border-brand/15 bg-brand/[0.05] text-ink dark:bg-brand/10",
  success: "border-success/25 bg-success-bg text-ink",
  warning: "border-warning/25 bg-warning-bg text-ink",
};

const ALERT_ICON_TONE: Record<Exclude<Tone, "neutral">, string> = {
  danger: "text-danger",
  info: "text-brand dark:text-kw",
  success: "text-success",
  warning: "text-warning",
};

export function Alert({
  tone = "danger",
  title,
  children,
  action,
  onDismiss,
  className,
}: {
  tone?: Exclude<Tone, "neutral">;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const Glyph = tone === "success" ? Icon.Check : tone === "info" ? Icon.Info : Icon.Alert;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed sm:flex-row sm:items-center",
        ALERT_TONES[tone],
        className
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <Glyph className={cx("mt-0.5 h-[18px] w-[18px] shrink-0", ALERT_ICON_TONE[tone])} />
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? "text-muted" : undefined}>{children}</div>}
        </div>
      </div>
      {(action || onDismiss) && (
        <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
          {action}
          {onDismiss && (
            <IconButton label="Dismiss" onClick={onDismiss} className="h-9 w-9">
              <Icon.X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- Card */

/** The one card recipe. Every content container is this. */
export function Card({
  className,
  children,
  interactive,
  as: Tag = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & { interactive?: boolean; as?: "section" | "div" | "article" }) {
  return (
    <Tag
      className={cx(
        "rounded-2xl border border-line bg-surface shadow-card",
        interactive && "card-lift",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-section font-semibold tracking-[-0.3px] text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- Page header */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.5px] text-ink md:text-title">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Status */

// Settled states read as ordinary text; only states that need attention colour the words.
// Brand blue stays reserved for things you can click.
/**
 * Status label, shared with the rest of Mettus Central: coloured status text inside one uniform
 * neutral box (see .pill in src/ui/ui.css). `dot` is kept for compatibility and no longer draws a glyph.
 */
const PILL_TONE: Record<Tone, string> = { success: "green", warning: "amber", danger: "red", info: "grey", neutral: "grey" };

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  return <span className={cx("pill", PILL_TONE[tone])}>{children}</span>;
}

export type { Tone };

/* ------------------------------------------------------------------ Metric */

export function Trend({ value, invert }: { value: number; invert?: boolean }) {
  // Success for up, Danger for down, muted for flat. `invert` for metrics
  // where down is good (e.g. spend, response time).
  const flat = Math.abs(value) < 0.5;
  const good = invert ? value < 0 : value > 0;
  const Glyph = flat ? Icon.Minus : value > 0 ? Icon.ArrowUp : Icon.ArrowDown;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        flat ? "text-muted" : good ? "text-success" : "text-danger"
      )}
    >
      <Glyph className="h-3.5 w-3.5" />
      {flat ? "Flat" : `${Math.abs(value).toFixed(1)}%`}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  trend,
  trendInvert,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: number;
  trendInvert?: boolean;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-[26px] leading-tight font-semibold tracking-[-0.5px] text-ink tabular-nums md:text-[28px]">{value}</p>
      {(sub || trend !== undefined) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {trend !== undefined && <Trend value={trend} invert={trendInvert} />}
          {sub}
        </div>
      )}
    </>
  );
  const cls = cx("block rounded-2xl border border-line bg-surface p-5 shadow-card", href && "card-lift", className);
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cx(
        "mettus-gradient inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-9 w-9 text-xs",
        size === "lg" && "h-14 w-14 text-base"
      )}
    >
      {initials}
    </span>
  );
}

/* -------------------------------------------------------------------- Tabs */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cx(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="font-normal text-muted tabular-nums">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ States */

export function PendingState({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center justify-center gap-3 py-16 text-[13px] text-muted", className)}>
      <Spinner />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-4 p-5">
      <Alert tone="danger">{message}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        <Icon.Refresh className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon.Search className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Centred terminal state: gradient medallion + title + reference chip. */
export function SuccessPanel({
  title,
  children,
  reference,
  referenceLabel,
  actions,
}: {
  title: string;
  children?: React.ReactNode;
  reference?: string;
  referenceLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="success-banner rounded-2xl border border-success/20 px-6 py-10 text-center" role="status">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-white">
        <Icon.Check className="h-6 w-6" />
      </span>
      <p className="mt-5 text-section font-semibold tracking-[-0.3px] text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-[13px] text-muted">{children}</div>}
      {reference && (
        <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-[13px] text-muted">
          {referenceLabel}
          <span className="font-bold text-brand tabular-nums dark:text-kw">{reference}</span>
        </p>
      )}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- Table */

export function TableWrap({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export const TH = "px-5 py-3 text-left text-xs font-medium text-muted whitespace-nowrap";
export const TD = "px-5 py-3.5 text-[13px] text-ink align-middle";
export const TR = "border-b border-line last:border-0 transition-colors hover:bg-surface-2/60";
