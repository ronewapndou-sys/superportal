"use client";

import { useState } from "react";
import { Card, CardHeader, Switch } from "@/components/ui/primitives";

type Pref = "lowBalance" | "invoices" | "tickets" | "product" | "weekly";

const PREFS: { id: Pref; label: string; description: string }[] = [
  { id: "lowBalance", label: "Low wallet balance", description: "When your balance drops below your alert threshold." },
  { id: "invoices", label: "Invoices and payments", description: "New invoices, payment receipts and overdue reminders." },
  { id: "tickets", label: "Support ticket updates", description: "When Mettus support replies or changes a ticket's status." },
  { id: "product", label: "Product news", description: "New features in the Mettus products you use. About once a month." },
  { id: "weekly", label: "Weekly usage summary", description: "A Monday-morning email with last week's enquiries and spend." },
];

export function NotificationsCard() {
  const [prefs, setPrefs] = useState<Record<Pref, boolean>>({
    lowBalance: true,
    invoices: true,
    tickets: true,
    product: false,
    weekly: false,
  });
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <Card className="p-5 md:p-6" aria-labelledby="notif-title">
      <CardHeader
        id="notif-title"
        title="Email notifications"
        description="Choose which emails you get. You'll always see everything in the bell menu."
      />
      <div className="mt-4 divide-y divide-line">
        {PREFS.map((p) => (
          <div key={p.id} className="py-3">
            <Switch
              label={p.label}
              description={p.description}
              checked={prefs[p.id]}
              onChange={(v) => {
                setPrefs((s) => ({ ...s, [p.id]: v }));
                setSaved(`${p.label} emails ${v ? "on" : "off"}. Saved.`);
              }}
            />
          </div>
        ))}
      </div>
      <p role="status" className="mt-2 min-h-5 text-xs text-muted">
        {saved}
      </p>
    </Card>
  );
}
