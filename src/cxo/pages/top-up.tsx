"use client";

import { useEffect } from "react";
import { SpecNote } from "@/components/notes/spec-notes";
import { Alert, Card, ErrorState, PageHeader, PendingState } from "@/components/ui/primitives";
import { AutoTopUpCard } from "@/components/wallet/auto-top-up";
import { TopUpHistory } from "@/components/wallet/history";
import { TopUpFlow } from "@/components/wallet/top-up-flow";
import { WalletCard } from "@/components/wallet/wallet-card";
import { usePaymentMethods, useWallet } from "@/lib/api/queries";
import { money } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useBusiness } from "@/lib/business";
import { useSession } from "@/lib/session";
import { SUITE_BY_ID } from "@/lib/suites";

export default function TopUpPage() {
  const user = useSession()?.user;
  const business = useBusiness();
  const canTopUp = can(user?.role, "wallet.top_up");
  const wallet = useWallet();
  const methods = usePaymentMethods();
  const ready = !!wallet.data && !!methods.data;

  // /top-up#auto (from the assistant) — the card only exists once data loads
  useEffect(() => {
    if (ready && window.location.hash === "#auto") {
      document.getElementById("auto")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [ready]);

  const low = wallet.data ? wallet.data.balanceCents < wallet.data.lowBalanceThresholdCents : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Top up credits"
        description="Add credits by card or EFT. Credits are shared across your Mettus products unless you choose to split them."
      />

      {!canTopUp && (
        <Alert tone="info" title="You can see the wallet, but not top it up">
          Only admins and billing users can add credits or change auto top-up. Ask an admin on your account if you need
          your role changed.
        </Alert>
      )}

      {wallet.isPending || methods.isPending ? (
        <Card>
          <PendingState label="Loading your wallet…" />
        </Card>
      ) : wallet.isError || methods.isError ? (
        <Card>
          <ErrorState
            message="Couldn't load your wallet."
            onRetry={() => {
              wallet.refetch();
              methods.refetch();
            }}
          />
        </Card>
      ) : (
        <>
          {low && canTopUp && (
            <Alert tone="warning" title="Your balance is below your alert level">
              You have {money(wallet.data.balanceCents)}, below your {money(wallet.data.lowBalanceThresholdCents)} alert.
              Enquiries stop when the wallet reaches R 0.
            </Alert>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className={canTopUp ? "lg:col-span-2" : "lg:col-span-3"}>
              {canTopUp ? (
                <TopUpFlow wallet={wallet.data} methods={methods.data} suites={(user?.suites ?? []).filter((id) => SUITE_BY_ID[id].business === business)} />
              ) : (
                <WalletCard wallet={wallet.data} />
              )}
            </div>
            {canTopUp && <WalletCard wallet={wallet.data} />}
          </div>

          <SpecNote
            title="Top-up"
            questions={[
              "Which payment provider handles card and instant EFT: PayFast, Peach Payments, Stitch or Ozow?",
              "Do clients need credits split per product, or is one shared wallet enough?",
              "Is a top-up invoiced straight away (prepaid VAT invoice) or on the monthly statement?",
              "Are R 500 and R 500 000 the right minimum and maximum top-ups?",
            ]}
          >
            Prepaid wallet that every product draws from per enquiry. Card and instant EFT credit straight away. Standard EFT
            creates a pending top-up with a unique reference, which finance reconciles.
          </SpecNote>

          {canTopUp && <AutoTopUpCard wallet={wallet.data} methods={methods.data} />}
        </>
      )}

      <TopUpHistory />

      <SpecNote title="Auto top-up" questions={["Should auto top-up need a second approver above a certain amount?", "Can a debit order be used for auto top-up, or only a card?"]}>
        Runs server-side when the balance crosses the threshold. It charges the saved method and notifies admins and billing
        users. A failed charge falls back to the low-balance alert.
      </SpecNote>
    </div>
  );
}
