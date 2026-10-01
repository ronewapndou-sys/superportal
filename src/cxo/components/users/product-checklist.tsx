"use client";

import { useOrg } from "@/lib/api/queries";
import type { SuiteId } from "@/lib/api/types";
import { BUSINESSES, SUITE_BY_ID } from "@/lib/suites";

/** Products on the organisation's subscription, grouped XDS / MIE, as checkboxes. */
export function ProductChecklist({
  value,
  onChange,
  error,
  legend,
  hint,
}: {
  value: SuiteId[];
  onChange: (v: SuiteId[]) => void;
  error?: string;
  legend: string;
  hint?: string;
}) {
  const products = useOrg().data?.products ?? [];
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-ink">{legend}</legend>
      {hint && <p className="mb-2.5 text-xs leading-snug text-muted">{hint}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["xds", "mie"] as const).map((biz) => {
          const own = products.filter((p) => SUITE_BY_ID[p].business === biz);
          if (own.length === 0) return null;
          return (
            <div key={biz}>
              <p className="mb-2 text-xs font-medium text-muted">{BUSINESSES[biz].name} products</p>
              <div className="space-y-2">
                {own.map((p) => {
                  const checked = value.includes(p);
                  return (
                    <label
                      key={p}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-field-line bg-surface px-3.5 py-2.5 text-[13px] text-ink transition-colors hover:border-brand/40 has-checked:border-brand/50 has-checked:bg-brand/[0.04]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onChange(checked ? value.filter((x) => x !== p) : [...value, p])}
                        className="h-4 w-4 shrink-0 accent-brand"
                      />
                      <span className="font-medium">{SUITE_BY_ID[p].name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** "Credit Enquiry, Trace and ID Verification", or "…and 6 more" past three names. */
export function productNames(list: SuiteId[], max = 3) {
  const names = list.map((p) => SUITE_BY_ID[p].short);
  if (names.length <= 1) return names.join("");
  if (names.length > max) return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
