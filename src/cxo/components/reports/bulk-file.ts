import type { BulkReportType, SuiteId } from "@/lib/api/types";

/**
 * Client-side checks for bulk report files. UX only: the backend must
 * re-validate every row, and must enforce size, row and MIME limits itself.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 10_000;

type IdKind = "sa_id" | "company_reg" | "either";

export const BULK_REPORTS: Record<
  BulkReportType,
  { suite: SuiteId; label: string; idKind: IdKind; priceCents: number; needsConsent: boolean }
> = {
  consumer_trace: { suite: "multi_trace", label: "Consumer Trace (batch)", idKind: "sa_id", priceCents: 380, needsConsent: false },
  credit_enquiry: { suite: "credit_enquiry", label: "Consumer Credit Enquiry", idKind: "sa_id", priceCents: 1_450, needsConsent: true },
  id_verification: { suite: "id_verification", label: "Identity Verification Trace", idKind: "sa_id", priceCents: 350, needsConsent: true },
  business_enquiry: { suite: "business_enquiry", label: "Business Enquiry", idKind: "company_reg", priceCents: 4_500, needsConsent: false },
  director_enquiry: { suite: "director_enquiry", label: "Director Enquiry", idKind: "sa_id", priceCents: 1_800, needsConsent: false },
  talent_screening: { suite: "talent", label: "Criminal record check", idKind: "sa_id", priceCents: 18_500, needsConsent: true },
  social_screening: { suite: "social_screening", label: "Social media screening", idKind: "sa_id", priceCents: 9_500, needsConsent: true },
  qualification_check: { suite: "swift", label: "Qualification verification", idKind: "sa_id", priceCents: 2_400, needsConsent: true },
  riskguard_add: { suite: "riskguard", label: "Add employees to Employee Risk Management", idKind: "sa_id", priceCents: 1_500, needsConsent: true },
};

export const ID_KIND_LABEL: Record<IdKind, string> = {
  sa_id: "13-digit South African ID number",
  company_reg: "company registration number, like 2014/204511/07",
  either: "SA ID number or company registration number",
};

/** SA ID: 13 digits, valid YYMMDD, Luhn check digit. */
export function isSaId(v: string) {
  if (!/^\d{13}$/.test(v)) return false;
  const mm = Number(v.slice(2, 4));
  const dd = Number(v.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(v[12 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const isCompanyReg = (v: string) => /^(19|20)\d{2}\/\d{6}\/\d{2}$/.test(v);

export interface RowError {
  line: number;
  value: string;
  message: string;
}

export interface ParsedFile {
  rows: number;
  valid: { identifier: string; reference?: string }[];
  errors: RowError[];
  duplicates: number;
  hadHeader: boolean;
}

/** Minimal CSV cell split — handles quoted cells with commas and "" escapes. */
function splitCsvLine(line: string, delimiter: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Parse a CSV of identifiers (first column) and an optional reference (second column). */
export function parseBulkCsv(text: string, reportType: BulkReportType): ParsedFile {
  const kind = BULK_REPORTS[reportType].idKind;
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  // Excel in South Africa often saves with semicolons
  const delimiter = (lines[0]?.split(";").length ?? 0) > (lines[0]?.split(",").length ?? 0) ? ";" : ",";
  const valid: ParsedFile["valid"] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let rows = 0;
  let hadHeader = false;

  lines.forEach((raw, i) => {
    if (!raw.trim()) return;
    const [first = "", reference] = splitCsvLine(raw, delimiter);
    // spreadsheets drop leading zeros and add spaces — normalise before judging
    const id = first.replace(/\s+/g, "");
    if (i === 0 && !/\d/.test(id)) {
      hadHeader = true;
      return;
    }
    rows++;
    const ok = kind === "sa_id" ? isSaId(id) : kind === "company_reg" ? isCompanyReg(id) : isSaId(id) || isCompanyReg(id);
    if (!ok) {
      const hint =
        kind !== "company_reg" && /^\d{12}$/.test(id)
          ? "has 12 digits. Excel may have dropped a leading zero. Format the column as text."
          : kind !== "company_reg" && /^\d+(\.\d+)?e\+?\d+$/i.test(first)
            ? "was turned into scientific notation by Excel. Format the column as text and save again."
            : `isn't a valid ${ID_KIND_LABEL[kind]}.`;
      errors.push({ line: i + 1, value: first || "(empty)", message: `Row ${i + 1}: “${first || "empty"}” ${hint}` });
      return;
    }
    if (seen.has(id)) {
      duplicates++;
      return;
    }
    seen.add(id);
    valid.push({ identifier: id, reference: reference || undefined });
  });

  return { rows, valid, errors, duplicates, hadHeader };
}

/** Header + guidance rows for the downloadable template. */
export function templateRows(reportType: BulkReportType): string[][] {
  const kind = BULK_REPORTS[reportType].idKind;
  return [
    [kind === "company_reg" ? "registration_number" : kind === "sa_id" ? "id_number" : "identifier", "your_reference"],
  ];
}

/**
 * Synthetic demo rows: Luhn-valid IDs built from a fixed pattern (not real
 * people), plus a few deliberately broken rows so the error list shows.
 * Demo mode only.
 */
export function sampleCsv(reportType: BulkReportType, n = 48) {
  const kind = BULK_REPORTS[reportType].idKind;
  const rows: string[] = [templateRows(reportType)[0].join(",")];
  for (let i = 0; i < n; i++) {
    if (kind === "company_reg") {
      rows.push(`20${String(10 + (i % 15)).padStart(2, "0")}/${String(100000 + i * 731).slice(0, 6)}/07,SAMPLE-${i + 1}`);
      continue;
    }
    const base = `9001${String(1 + (i % 28)).padStart(2, "0")}${String(5000 + i).padStart(4, "0")}08`;
    for (let c = 0; c <= 9; c++) {
      if (isSaId(base + c)) {
        rows.push(`${base + c},SAMPLE-${i + 1}`);
        break;
      }
    }
  }
  if (kind !== "company_reg") rows.push("900101500108,SAMPLE-BROKEN-1", "9.00101E+12,SAMPLE-BROKEN-2");
  else rows.push("14/204511/07,SAMPLE-BROKEN-1");
  rows.push(rows[1]); // one duplicate
  return rows.join("\r\n");
}

export const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
