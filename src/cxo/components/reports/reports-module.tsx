"use client";

import Link from "next/link";
import { useState } from "react";
import { SpecNote } from "@/components/notes/spec-notes";
import { cx } from "@/components/ui/primitives";
import type { CurrentUser } from "@/lib/api/types";
import { useBusiness } from "@/lib/business";
import { can } from "@/lib/permissions";
import { SUITE_BY_ID } from "@/lib/suites";
import { useBranches, useOrg } from "@/lib/api/queries";
import { useAccess } from "@/lib/use-access";
import { BusinessSwitch } from "@/components/shell/business-switch";
import { BulkReportsSection } from "./bulk-reports";
import { presetQuery } from "./date-range";
import { MonthlyReportsSection, monthBounds } from "./monthly-reports";
import { ScheduledReports } from "./scheduled-reports";
import { UsageSection, type UsageSelection } from "./usage-section";

const SECTIONS = [
  { id: "usage", label: "Usage and spend" },
  { id: "monthly", label: "Monthly reports" },
  { id: "bulk", label: "Bulk reports" },
  { id: "scheduled", label: "Scheduled reports" },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * All of Reports on one page, as one self-contained module: usage with
 * date filtering, monthly reports, bulk uploads and schedules. It needs only
 * the current user and a QueryClient, so a host portal can mount it
 * directly (or iframe /embed/reports) without this app's navbar.
 */
export function ReportsModule({
  user,
  stickyOffset = "top-[74px]",
  showBusinessSwitch,
}: {
  user: CurrentUser;
  stickyOffset?: string;
  /** embeds have no navbar, so they show the XDS / MIE switch inside the module */
  showBusinessSwitch?: boolean;
}) {
  const business = useBusiness();
  // only the selected business's products — XDS and MIE report separately
  const access = useAccess();
  const orgProducts = useOrg().data?.products;
  const allBranches = useBranches().data ?? [];
  const isAdmin = can(user.role, "users.manage");
  // admins report on the whole organisation; everyone else on the products and branches they work with
  const suites = (isAdmin ? (orgProducts ?? access.anywhere) : access.anywhere).filter((s) => SUITE_BY_ID[s].business === business);
  const reportBranches = isAdmin ? allBranches : access.myBranches;
  const [selection, setSelection] = useState<UsageSelection>({ range: "30d", query: presetQuery("30d") });
  const canExport = can(user.role, "reports.schedule");
  const canRun = can(user.role, "products.launch");

  return (
    <div className="space-y-10">
      <nav
        aria-label="Report sections"
        className={cx("sticky z-20 -mx-1 overflow-x-auto rounded-2xl border border-line bg-surface/90 p-1.5 shadow-card backdrop-blur", stickyOffset)}
      >
        <ul className="flex items-center gap-1">
          {showBusinessSwitch && (
            <li className="mr-1 shrink-0">
              <BusinessSwitch tone="surface" />
            </li>
          )}
          {SECTIONS.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(s.id);
                }}
                className="inline-flex min-h-9 items-center rounded-lg px-3.5 text-[13px] font-semibold whitespace-nowrap text-muted transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <SpecNote
        title="Reports on one page"
        questions={[
          "Does the host portal mount this through an iframe (token) or as a React package (prop)?",
          "How fresh does usage need to be? The mock says every 15 minutes.",
          "Should monthly spend match the invoice to the cent, or is it an estimate until month end?",
          "Bulk runs: is 10 000 rows per file right? Do results need to go back as XLSX, or is CSV enough?",
          "Which bulk report types does the bureau support for batch, and do they need a permissible-purpose code per row?",
        ]}
      >
        Every reporting feature sits on this one page so the host portal can embed it. Usage covers any date
        range back 24 months, daily or monthly. Monthly reports give a statement per month. Bulk reports runs a CSV of IDs
        as a background job. Scheduled reports emails any of these on a timetable.
      </SpecNote>

      <Section id="usage" title="Usage and spend" description="Filter by any date range, daily or monthly, then export exactly what you see.">
        <UsageSection key={business} suites={suites} branches={reportBranches} allowAllBranches={isAdmin} canExport={canExport} selection={selection} onSelection={setSelection} />
      </Section>

      <Section
        id="monthly"
        title="Monthly reports"
        description={
          <>
            A statement per calendar month, by product, with a link to its invoice. For statements, invoices and usage reports split by branch or combined across branches and companies, use the{" "}
            <Link href="/billing#documents" className="font-semibold text-brand hover:underline dark:text-kw">
              download centre on Billing
            </Link>
            .
          </>
        }
      >
        <MonthlyReportsSection
          suites={suites}
          business={business}
          onViewMonth={(ym) => {
            setSelection({ range: "custom", query: { ...monthBounds(ym), granularity: "day" } });
            scrollToSection("usage");
          }}
          onEmailMonthly={() => scrollToSection("scheduled")}
        />
      </Section>

      <Section id="bulk" title="Bulk reports" description="Upload a file of ID or registration numbers and run up to 10 000 reports in one go.">
        <BulkReportsSection key={business} suites={suites} canRun={canRun} />
      </Section>

      <Section id="scheduled" title="Scheduled reports" description="Email any report to your team on a daily, weekly or monthly timetable.">
        <ScheduledReports canManage={canExport} defaultEmail={user.email} />
      </Section>

      <p className="sr-only" aria-live="polite">
        {selection.range === "custom" ? `Showing usage from ${selection.query.from} to ${selection.query.to}` : ""}
      </p>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-40 space-y-4">
      <div>
        <h2 id={`${id}-heading`} className="text-[22px] font-bold tracking-[-0.3px] text-ink">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

