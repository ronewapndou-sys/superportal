"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icons";
import {
  Alert,
  Button,
  buttonClass,
  Card,
  CardHeader,
  Checkbox,
  cx,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PendingState,
  Pill,
  Select,
  SuccessPanel,
  TableWrap,
  TD,
  TH,
  TR,
  type Tone,
} from "@/components/ui/primitives";
import { reportsApi } from "@/lib/api/endpoints";
import { qk, useBulkJobs, useWallet } from "@/lib/api/queries";
import type { BulkJob, BulkJobStatus, BulkReportType, SuiteId } from "@/lib/api/types";
import { ago, count, dateAndTime, money } from "@/lib/format";
import { SUITE_BY_ID } from "@/lib/suites";
import {
  BULK_REPORTS,
  formatBytes,
  ID_KIND_LABEL,
  MAX_FILE_BYTES,
  MAX_ROWS,
  parseBulkCsv,
  sampleCsv,
  templateRows,
  type ParsedFile,
} from "./bulk-file";
import { downloadCsv } from "./series";

const STATUS_LABEL: Record<BulkJobStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};
const STATUS_TONE: Record<BulkJobStatus, Tone> = {
  queued: "neutral",
  processing: "info",
  completed: "success",
  failed: "danger",
};

const DEMO = process.env.NEXT_PUBLIC_API_URL === undefined;

/**
 * Bulk reports: upload a CSV of ID or registration numbers, check it in the
 * browser, see the cost against the wallet, then run it as a background job.
 */
export function BulkReportsSection({ suites, canRun }: { suites: SuiteId[]; canRun: boolean }) {
  return (
    <div className="space-y-6">
      {canRun ? (
        <UploadCard suites={suites} />
      ) : (
        <Alert tone="info" title="Your role can't start bulk runs">
          Bulk runs spend wallet credits, so only admins and analysts can start them. You can still see past runs below.
        </Alert>
      )}
      <JobsCard canRun={canRun} />
    </div>
  );
}

function UploadCard({ suites }: { suites: SuiteId[] }) {
  const qc = useQueryClient();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const wallet = useWallet();
  const types = (Object.keys(BULK_REPORTS) as BulkReportType[]).filter((t) => suites.includes(BULK_REPORTS[t].suite));
  const [reportType, setReportType] = useState<BulkReportType | "">(types[0] ?? "");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<{ name: string; size: number; text: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [dragging, setDragging] = useState(false);

  const parsed: ParsedFile | null = file && reportType ? parseBulkCsv(file.text, reportType) : null;
  const meta = reportType ? BULK_REPORTS[reportType] : null;
  const cost = parsed && meta ? parsed.valid.length * meta.priceCents : 0;
  const short = wallet.data ? cost > wallet.data.balanceCents : false;
  const tooMany = parsed ? parsed.rows > MAX_ROWS : false;

  const run = useMutation({
    mutationFn: reportsApi.createBulkJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bulk });
      qc.invalidateQueries({ queryKey: qk.wallet });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });

  async function accept(f: File | undefined) {
    setFileError(null);
    run.reset();
    if (!f) return;
    if (/\.(xlsx?|ods)$/i.test(f.name)) {
      return setFileError("Excel files can't be read directly yet. In Excel, choose File → Save as → CSV, then upload that.");
    }
    if (!/\.(csv|txt)$/i.test(f.name)) return setFileError("Upload a .csv or .txt file with one ID or registration number per row.");
    if (f.size > MAX_FILE_BYTES) return setFileError(`${f.name} is ${formatBytes(f.size)}. Files can be up to 5 MB, so split it into smaller files.`);
    if (f.size === 0) return setFileError(`${f.name} is empty. Check you saved the right file.`);
    setFile({ name: f.name, size: f.size, text: await f.text() });
  }

  function useSample() {
    if (!reportType) return;
    const text = sampleCsv(reportType);
    setFileError(null);
    run.reset();
    setFile({ name: `sample-${reportType}.csv`, size: new Blob([text]).size, text });
  }

  function clear() {
    setFile(null);
    setConsent(false);
    setConsentError(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    if (!parsed || !meta || !reportType || !file) return;
    if (meta.needsConsent && !consent) {
      setConsentError(true);
      return;
    }
    run.mutate({
      fileName: file.name,
      suite: meta.suite,
      reportType,
      clientReference: reference.trim() || undefined,
      identifiers: parsed.valid.map((v) => v.identifier),
    });
  }

  if (run.isSuccess) {
    return (
      <SuccessPanel
        title="Your bulk run has started"
        reference={run.data.reference}
        referenceLabel="Reference"
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              run.reset();
              clear();
            }}
          >
            <Icon.Plus className="h-4 w-4" /> Upload another file
          </Button>
        }
      >
        {count(run.data.rows)} {BULK_REPORTS[run.data.reportType].label.toLowerCase()} requests are queued, and{" "}
        {money(run.data.costCents)} is reserved from your wallet. Follow progress below. You can leave this page. An email arrives when
        the results are ready.
      </SuccessPanel>
    );
  }

  if (types.length === 0) {
    return (
      <Card>
        <EmptyState title="No bulk reports available" description="Bulk runs need access to at least one product that supports them. Ask your admin for product access." />
      </Card>
    );
  }

  return (
    <Card className="p-5 md:p-6">
      <CardHeader
        title="Run reports in bulk"
        description="Upload a CSV with one ID or registration number per row. The file is checked before anything is charged."
        action={
          reportType && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadCsv(`mettus-bulk-template-${reportType}.csv`, templateRows(reportType))}
            >
              <Icon.Download className="h-4 w-4" /> Download template
            </Button>
          )
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Report to run" required hint={meta ? `${money(meta.priceCents)} per row · needs a ${ID_KIND_LABEL[meta.idKind]}` : undefined}>
          <Select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as BulkReportType);
              setConsent(false);
            }}
            disabled={run.isPending}
          >
            {suites
              .filter((s) => types.some((t) => BULK_REPORTS[t].suite === s))
              .map((s) => (
                <optgroup key={s} label={SUITE_BY_ID[s].name}>
                  {types
                    .filter((t) => BULK_REPORTS[t].suite === s)
                    .map((t) => (
                      <option key={t} value={t}>
                        {BULK_REPORTS[t].label}
                      </option>
                    ))}
                </optgroup>
              ))}
          </Select>
        </Field>
        <Field label="Your reference" hint="Optional. Shows on the results file and your invoice.">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} placeholder="e.g. Loan book review Q4" disabled={run.isPending} />
        </Field>
      </div>

      {!file ? (
        <div className="mt-5">
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files[0]);
            }}
            className={cx(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-brand bg-brand/[0.05]" : "border-field-line/60 hover:border-brand/50 hover:bg-surface-2/50",
              fileError && "border-danger/50"
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/[0.08] text-brand dark:text-kw">
              <Icon.File className="h-6 w-6" />
            </span>
            <span className="text-[14px] font-semibold text-ink">Drop your CSV here, or choose a file</span>
            <span className="text-xs text-muted">CSV or TXT, up to 5 MB and {count(MAX_ROWS)} rows. The first column is the ID.</span>
          </label>
          <input
            id={inputId}
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={(e) => accept(e.target.files?.[0])}
            aria-describedby={fileError ? `${inputId}-error` : undefined}
          />
          {fileError && (
            <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs font-medium text-danger">
              {fileError}
            </p>
          )}
          {DEMO && (
            <p className="mt-3 text-xs text-muted">
              Demo mode:{" "}
              <button type="button" onClick={useSample} className="rounded font-semibold text-brand hover:underline dark:text-kw">
                use a sample file
              </button>{" "}
              with made-up IDs and a few broken rows.
            </p>
          )}
        </div>
      ) : (
        parsed && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3.5">
              <Icon.File className="h-5 w-5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{file.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(file.size)} · {count(parsed.rows)} rows{parsed.hadHeader ? " plus a header row" : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={clear} disabled={run.isPending}>
                Choose another file
              </Button>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Summary label="Ready to run" value={count(parsed.valid.length)} tone="success" />
              <Summary label="Need fixing" value={count(parsed.errors.length)} tone={parsed.errors.length ? "danger" : "neutral"} />
              <Summary label="Duplicates removed" value={count(parsed.duplicates)} tone="neutral" />
              <Summary label="Estimated cost" value={money(cost)} tone={short ? "danger" : "neutral"} />
            </dl>

            {tooMany && (
              <Alert tone="danger" title={`Your file has ${count(parsed.rows)} rows`}>
                A bulk run can have up to {count(MAX_ROWS)} rows. Split the file and upload each part separately.
              </Alert>
            )}

            {parsed.errors.length > 0 && (
              <Alert
                tone="warning"
                title={`${count(parsed.errors.length)} ${parsed.errors.length === 1 ? "row needs" : "rows need"} fixing and won't be run or charged`}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      downloadCsv(`${file.name.replace(/\.\w+$/, "")}-errors.csv`, [
                        ["Line", "Value", "Problem"],
                        ...parsed.errors.map((e) => [String(e.line), e.value, e.message]),
                      ])
                    }
                  >
                    Download error list
                  </Button>
                }
              >
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {parsed.errors.slice(0, 5).map((e) => (
                    <li key={e.line}>{e.message}</li>
                  ))}
                  {parsed.errors.length > 5 && <li>…and {count(parsed.errors.length - 5)} more in the error list.</li>}
                </ul>
              </Alert>
            )}

            {parsed.valid.length === 0 && !tooMany && (
              <Alert tone="danger">None of the rows in this file can be run. Fix the rows listed above and upload it again.</Alert>
            )}

            {short && wallet.data && (
              <Alert
                tone="danger"
                title="Your wallet doesn't cover this run"
                action={
                  <Link href="/top-up" className={buttonClass("primary", "sm")}>
                    Top up
                  </Link>
                }
              >
                This run costs {money(cost)} and your balance is {money(wallet.data.balanceCents)}. Top up, or upload fewer rows.
              </Alert>
            )}

            {meta?.needsConsent && (
              <div>
                <Checkbox
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setConsentError(false);
                  }}
                  label="We have a lawful reason and, where needed, consent for every person in this file"
                  description="Required by the National Credit Act and POPIA. Every run is logged against your name."
                  aria-invalid={consentError}
                />
                {consentError && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                    Confirm you have a lawful reason to run these reports before you continue.
                  </p>
                )}
              </div>
            )}

            {run.error && <Alert tone="danger">{run.error.message}</Alert>}

            <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">Credits are reserved when the run starts. Unmatched rows are refunded.</p>
              <Button onClick={submit} loading={run.isPending} disabled={parsed.valid.length === 0 || tooMany || short}>
                Run {count(parsed.valid.length)} {parsed.valid.length === 1 ? "report" : "reports"} for {money(cost)}
              </Button>
            </div>
          </div>
        )
      )}
    </Card>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="rounded-xl border border-line p-3.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd
        className={cx(
          "mt-1 text-lg font-bold tabular-nums",
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function JobsCard({ canRun }: { canRun: boolean }) {
  const qc = useQueryClient();
  const { data, isPending, isError, refetch } = useBulkJobs();
  const cancel = useMutation({
    mutationFn: reportsApi.cancelBulkJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bulk });
      qc.invalidateQueries({ queryKey: qk.wallet });
    },
  });

  function downloadResults(j: BulkJob) {
    // mock results — the real file comes from the bureau via a signed URL
    const rows = [["Row", "Result", "Report reference", "Your reference"]];
    for (let i = 1; i <= j.rows; i++) {
      const miss = i % Math.max(1, Math.round(j.rows / Math.max(1, j.noMatchRows))) === 0 && j.noMatchRows > 0;
      rows.push([String(i), miss ? "No match, refunded" : "Report ready", miss ? "" : `${j.reference}-${String(i).padStart(5, "0")}`, j.clientReference ?? ""]);
    }
    downloadCsv(`${j.reference}-results.csv`, rows);
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 p-5 md:p-6">
        <CardHeader title="Bulk runs" description="Runs from everyone on your account. Results stay available for 90 days." />
        {data?.some((j) => j.status === "queued" || j.status === "processing") && (
          <p className="shrink-0 text-xs text-muted" aria-live="polite">Updating as runs progress</p>
        )}
      </div>
      {cancel.error && <Alert tone="danger" className="mx-5 mb-4 md:mx-6">{cancel.error.message}</Alert>}
      {isPending ? (
        <PendingState label="Loading bulk runs…" />
      ) : isError ? (
        <ErrorState message="Couldn't load your bulk runs." onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="No bulk runs yet" description="Upload a file above to run up to 10 000 reports in one go." />
      ) : (
        <div className="border-t border-line">
          <TableWrap label="Bulk runs">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={TH}>Run</th>
                  <th scope="col" className={TH}>Report</th>
                  <th scope="col" className={cx(TH, "text-right")}>Rows</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={cx(TH, "text-right")}>Cost</th>
                  <th scope="col" className={TH}>Started</th>
                  <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.map((j) => (
                  <tr key={j.id} className={TR}>
                    <td className={TD}>
                      <p className="font-semibold tabular-nums">{j.reference}</p>
                      <p className="max-w-[220px] truncate text-xs text-muted" title={j.fileName}>
                        {j.fileName}
                        {j.clientReference && ` · ${j.clientReference}`}
                      </p>
                    </td>
                    <td className={TD}>
                      <p>{BULK_REPORTS[j.reportType].label}</p>
                      <p className="text-xs text-muted">{SUITE_BY_ID[j.suite].name}</p>
                    </td>
                    <td className={cx(TD, "text-right tabular-nums")}>{count(j.rows)}</td>
                    <td className={cx(TD, "min-w-[180px]")}>
                      <Pill tone={STATUS_TONE[j.status]}>{STATUS_LABEL[j.status]}</Pill>
                      {j.status === "processing" && (
                        <div className="mt-2">
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={j.progress}
                            aria-label={`${j.reference} progress`}
                          >
                            <div
                              className="mettus-gradient h-full origin-left rounded-full transition-transform duration-700 ease-mettus"
                              style={{ transform: `scaleX(${j.progress / 100})` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted tabular-nums">
                            {count(j.processedRows)} of {count(j.rows)} done
                          </p>
                        </div>
                      )}
                      {j.status === "completed" && j.noMatchRows > 0 && (
                        <p className="mt-1 text-[11px] text-muted">{count(j.noMatchRows)} no match, refunded</p>
                      )}
                      {j.status === "failed" && (
                        <p className="mt-1 text-[11px] text-muted">{j.costCents === 0 ? "Not charged" : "Refunded"}</p>
                      )}
                    </td>
                    <td className={cx(TD, "text-right tabular-nums whitespace-nowrap")}>{j.costCents ? money(j.costCents) : <span className="text-muted">None</span>}</td>
                    <td className={cx(TD, "whitespace-nowrap text-muted")}>
                      <time dateTime={j.createdAt} title={dateAndTime(j.createdAt)}>
                        {ago(j.createdAt)}
                      </time>
                      <p className="text-xs">{j.by}</p>
                    </td>
                    <td className={cx(TD, "text-right whitespace-nowrap")}>
                      {j.status === "completed" && (
                        <Button variant="secondary" size="sm" onClick={() => downloadResults(j)}>
                          <Icon.Download className="h-4 w-4" /> Results
                        </Button>
                      )}
                      {j.status === "queued" && canRun && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={cancel.isPending && cancel.variables === j.id}
                          onClick={() => cancel.mutate(j.id)}
                        >
                          Cancel {j.reference}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}
    </Card>
  );
}
