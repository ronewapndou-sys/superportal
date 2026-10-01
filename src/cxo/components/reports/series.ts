import type { SuiteId, UsagePoint } from "@/lib/api/types";
import { SUITE_BY_ID, suiteIdsFor } from "@/lib/suites";

/**
 * Chart palette from the style guide: blue, green, dark blue, then Blue Mid.
 * With up to 14 products, colours go by rank in each chart (top four, then
 * "Other" in steel) rather than one fixed colour per product. --kw is the
 * guide's Dark Blue in light mode and lifts to a readable blue in dark mode.
 */
export const PALETTE = ["var(--chart-blue)", "var(--chart-green)", "var(--kw)", "var(--brand-mid)"] as const;
export const OTHER_COLOR = "var(--steel)";

/** Fallback colour per product, cycling the palette in catalogue order within each business. */
export const SUITE_COLOR = Object.fromEntries(
  (["xds", "mie"] as const).flatMap((biz) => suiteIdsFor(biz).map((id, i) => [id, PALETTE[i % PALETTE.length]]))
) as Record<SuiteId, string>;

/** Real client-side CSV download. Every cell is quoted, so commas and quotes survive. */
export function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  // BOM so Excel opens UTF-8 names (e.g. “Processing”) correctly
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** CSV of the plotted series (daily or monthly points). */
export function downloadUsageCsv(fileName: string, series: UsagePoint[], suites: SuiteId[]) {
  const header = [series[0]?.date.length === 7 ? "Month" : "Date", ...suites.map((s) => SUITE_BY_ID[s].name)];
  downloadCsv(fileName, [header, ...series.map((p) => [p.date, ...suites.map((s) => String(p[s]))])]);
}
