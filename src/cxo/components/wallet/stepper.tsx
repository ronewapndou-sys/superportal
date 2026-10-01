import { Icon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

/**
 * Workflow pipeline (style guide): numbered circles in brand primary.
 * Completed = filled with a tick, current = ringed, future = muted.
 * Connectors are 2px, line colour until the step before them completes.
 */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center" aria-label="Top-up progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center last:flex-none" aria-current={active ? "step" : undefined}>
            <span className="flex items-center gap-2.5">
              <span
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums transition-colors",
                  done && "bg-brand text-white",
                  active && "border-2 border-brand bg-brand/10 text-brand ring-4 ring-brand/10 dark:text-kw",
                  !done && !active && "border-2 border-line text-muted"
                )}
              >
                {done ? <Icon.Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cx(
                  "text-[13px] font-semibold whitespace-nowrap",
                  active ? "text-ink" : done ? "text-ink" : "text-muted",
                  !active && "hidden sm:inline"
                )}
              >
                {label}
                <span className="sr-only">{done ? " (done)" : active ? " (current step)" : ""}</span>
              </span>
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className={cx("mx-3 h-0.5 min-w-4 flex-1 rounded-full transition-colors", done ? "bg-brand" : "bg-line")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
