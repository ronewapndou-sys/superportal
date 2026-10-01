"use client";

import { ReportsModule } from "@/components/reports/reports-module";
import { PageHeader } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";

export default function ReportsPage() {
  const user = useSession()!.user;
  return (
    <>
      <PageHeader
        title="Reports"
        description="Usage and spend for any date range, monthly statements, bulk report runs and scheduled emails."
      />
      <ReportsModule user={user} />
    </>
  );
}
