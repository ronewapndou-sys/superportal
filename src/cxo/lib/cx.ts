/**
 * Class helpers with no "use client" boundary, so server components can use
 * them too. primitives.tsx re-exports both.
 */
export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "on-brand";

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep",
  // Mettus default button: white, 1px border, hover lifts 1px with a soft shadow
  secondary:
    "border border-line bg-surface text-ink hover:-translate-y-px hover:shadow-card hover:border-field-line",
  ghost: "text-muted hover:bg-ink/5 hover:text-ink",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-bg",
  "on-brand": "border border-white/30 bg-white/10 text-white hover:bg-white/20",
};

/** Same look as Button, for links that navigate. */
export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "sm" = "md", className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 ease-mettus active:scale-[0.98]",
    size === "md" ? "min-h-11 px-5 text-[13px]" : "min-h-9 px-3.5 text-xs",
    BUTTON_VARIANTS[variant],
    className
  );
}
