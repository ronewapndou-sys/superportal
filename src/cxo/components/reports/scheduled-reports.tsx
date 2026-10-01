"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icons";
import { Dialog } from "@/components/ui/overlay";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PendingState,
  Select,
} from "@/components/ui/primitives";
import { reportsApi } from "@/lib/api/endpoints";
import { qk, useScheduledReports } from "@/lib/api/queries";
import type { ScheduledReport } from "@/lib/api/types";
import { date } from "@/lib/format";

export const REPORT_LABEL: Record<ScheduledReport["report"], string> = {
  usage: "Usage by product",
  spend: "Spend by product",
  enquiry_detail: "Enquiry detail",
  invoice_pack: "Invoice pack",
};
const FREQUENCY_LABEL: Record<ScheduledReport["frequency"], string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FORMAT_LABEL: Record<ScheduledReport["format"], string> = { csv: "CSV", pdf: "PDF", xlsx: "Excel" };

const parseEmails = (v: string) =>
  v
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const schema = z.object({
  name: z.string().trim().min(3, "Give the schedule a name of at least 3 characters, like “Monthly spend”."),
  report: z.enum(["usage", "spend", "enquiry_detail", "invoice_pack"]),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  format: z.enum(["csv", "pdf", "xlsx"]),
  recipients: z
    .string()
    .refine((v) => parseEmails(v).length > 0, "Add at least one email address to send the report to.")
    .refine(
      (v) => parseEmails(v).every((e) => z.email().safeParse(e).success),
      "One of those email addresses doesn't look right. Separate addresses with commas."
    ),
});
type Values = z.infer<typeof schema>;

export function ScheduledReports({ canManage, defaultEmail }: { canManage: boolean; defaultEmail: string }) {
  const q = useScheduledReports();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ScheduledReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (r: ScheduledReport) => reportsApi.deleteSchedule(r.id),
    onSuccess: (_d, r) => {
      qc.invalidateQueries({ queryKey: qk.scheduled });
      setDeleting(null);
      setNotice(`Deleted “${r.name}”. No more emails will go out for it.`);
    },
  });

  return (
    <Card className="p-5 md:p-6" aria-labelledby="scheduled-title">
      <CardHeader
        id="scheduled-title"
        title="Your schedules"
        description="Reports emailed to your team automatically. Times are South African Standard Time."
        action={
          canManage && (
            <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
              <Icon.Plus className="h-4 w-4" /> Schedule a report
            </Button>
          )
        }
      />

      {notice && <Alert tone="success" className="mt-5" onDismiss={() => setNotice(null)}>{notice}</Alert>}

      <div className="mt-5">
        {q.isPending ? (
          <PendingState label="Loading your scheduled reports…" className="py-10" />
        ) : q.isError ? (
          <ErrorState message="Couldn't load your scheduled reports." onRetry={() => q.refetch()} />
        ) : q.data.length === 0 ? (
          <EmptyState
            title="No scheduled reports yet"
            description="Schedule a report to email it to your team daily, weekly or monthly."
          />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {q.data.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {FREQUENCY_LABEL[r.frequency]} {REPORT_LABEL[r.report].toLowerCase()} as {FORMAT_LABEL[r.format]}. Next run{" "}
                    <time dateTime={r.nextRunAt} title={new Date(r.nextRunAt).toLocaleString("en-ZA")}>
                      {date(r.nextRunAt)}
                    </time>
                  </p>
                  <p className="mt-1 text-[13px] break-all text-muted">Sent to {r.recipients.join(", ")}</p>
                </div>
                {canManage && (
                  <Button variant="danger" size="sm" className="self-start sm:self-center" onClick={() => setDeleting(r)}>
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <ScheduleDialog
          defaultEmail={defaultEmail}
          onClose={() => setCreating(false)}
          onCreated={(r) => {
            setCreating(false);
            setNotice(`“${r.name}” is scheduled. The first one goes out on ${date(r.nextRunAt)}.`);
          }}
        />
      )}

      <Dialog
        open={!!deleting}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        title={deleting ? `Delete “${deleting.name}”?` : ""}
        description="Reports already sent stay in people's inboxes."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>
              Delete schedule
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {deleting && `This report stops going to ${deleting.recipients.length} ${deleting.recipients.length === 1 ? "person" : "people"}.`}
        </p>
        {remove.isError && <Alert className="mt-4">{remove.error.message}</Alert>}
      </Dialog>
    </Card>
  );
}

function ScheduleDialog({
  defaultEmail,
  onClose,
  onCreated,
}: {
  defaultEmail: string;
  onClose: () => void;
  onCreated: (r: ScheduledReport) => void;
}) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { name: "", report: "usage", frequency: "weekly", format: "pdf", recipients: defaultEmail },
  });

  const create = useMutation({
    mutationFn: (v: Values) => reportsApi.createSchedule({ ...v, name: v.name.trim(), recipients: parseEmails(v.recipients) }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.scheduled });
      onCreated(r);
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Schedule a report"
      description="Sent as an attachment on the schedule you pick."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" loading={create.isPending}>
            Schedule report
          </Button>
        </>
      }
    >
      <form
        id="schedule-form"
        noValidate
        onSubmit={handleSubmit(
          (v) => create.mutate(v),
          () =>
            requestAnimationFrame(() =>
              document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" })
            )
        )}
      >
        <fieldset disabled={create.isPending} className="space-y-5">
          {create.isError && <Alert>{create.error.message}</Alert>}
          <Field label="Name" error={errors.name?.message} required>
            <Input placeholder="e.g. Monthly spend for finance" aria-invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label="Report" error={errors.report?.message}>
            <Select aria-invalid={!!errors.report} {...register("report")}>
              {Object.entries(REPORT_LABEL).map(([id, l]) => (
                <option key={id} value={id}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="How often" error={errors.frequency?.message}>
              <Select aria-invalid={!!errors.frequency} {...register("frequency")}>
                {Object.entries(FREQUENCY_LABEL).map(([id, l]) => (
                  <option key={id} value={id}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Format" error={errors.format?.message}>
              <Select aria-invalid={!!errors.format} {...register("format")}>
                {Object.entries(FORMAT_LABEL).map(([id, l]) => (
                  <option key={id} value={id}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Send to"
            required
            error={errors.recipients?.message}
            hint="Separate email addresses with commas."
          >
            <Input
              type="text"
              inputMode="email"
              autoComplete="off"
              placeholder="finance@company.co.za, risk@company.co.za"
              aria-invalid={!!errors.recipients}
              {...register("recipients")}
            />
          </Field>
        </fieldset>
      </form>
    </Dialog>
  );
}
