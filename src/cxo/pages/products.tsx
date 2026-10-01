"use client";

import { SpecNote } from "@/components/notes/spec-notes";
import { PendingOffers, Recommendations } from "@/components/intelligence/intelligence";
import { ActiveProducts } from "@/components/products/active-products";
import { RequestProducts } from "@/components/products/request-products";
import { SuiteCard } from "@/components/products/suite-card";
import { Icon } from "@/components/ui/icons";
import { Card, PageHeader } from "@/components/ui/primitives";
import { useDashboard } from "@/lib/api/queries";
import { useBusiness } from "@/lib/business";
import { useAccess } from "@/lib/use-access";
import { BUSINESSES, suitesByCategory, suitesFor } from "@/lib/suites";
import { useAuth } from "../../auth/AuthContext";
import { ServicesPage } from "../../onboarding/ServicesPage";

const HOW_IT_WORKS = [
  { icon: "Key" as const, title: "Sign in once", body: "Your sign-in carries into every product. You won't see a second login screen." },
  { icon: "Shield" as const, title: "Access follows your role", body: "Your admin decides which products you can open. Changes apply the next time you open a product." },
  { icon: "Wallet" as const, title: "One wallet pays for all", body: "Enquiries in every product draw from the same prepaid wallet, so you only have one balance to watch." },
];

export default function ProductsPage() {
  const { data } = useDashboard();
  const business = useBusiness();
  const biz = BUSINESSES[business];
  const access = useAccess();
  const { can } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Your ${biz.name} products`}
        description={
          access.branch
            ? `${biz.description}. Showing what you can open at ${access.branch.name}, where you're a ${access.roleAt(access.branch.id)?.name.toLowerCase() ?? "member"}.`
            : `${biz.description}. You don't have a role at any division yet, so ask your admin to add you to one.`
        }
      />

      <SpecNote
        title="Single sign-on handoff"
        questions={[
          "Does each product accept an OIDC token from the host portal's sign-in, or does it need a SAML assertion?",
          "Should products open in a new tab, or inside the portal frame?",
          "Who approves an access request: the account manager or the client's own admin?",
          "XDS and MIE product descriptions, features and categories here are placeholders. Can the product owners confirm them?",
        ]}
      >
        Opening a product starts a token exchange with that suite. The client never re-enters credentials. If a suite
        isn&apos;t subscribed, the card leads to an access request, which becomes a support ticket for the account manager.
      </SpecNote>

      <ActiveProducts business={business} />

      <PendingOffers />

      <Recommendations />

      <RequestProducts business={business} />

      <section aria-labelledby="all-products-heading" className="space-y-4 pt-2">
        <div>
          <h2 id="all-products-heading" className="text-section font-semibold tracking-[-0.3px] text-ink">
            All {biz.name} products
          </h2>
          <p className="mt-1 text-[13px] text-muted">Open the ones you have, or find out about the rest.</p>
        </div>
        {suitesFor(business).length <= 8 ? (
          // a short catalogue reads better as one grid than as near-empty category rows
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {suitesFor(business).map((s) => (
              <SuiteCard key={s.id} suite={s} hasAccess={access.suites.includes(s.id)} usage={data?.usageBySuite[s.id]} />
            ))}
          </div>
        ) : (
        <div className="space-y-8">
          {suitesByCategory(business).map((c) => (
            <div key={c.name} className="space-y-3">
              <div>
                <h3 className="text-[15px] font-semibold text-ink">{c.name}</h3>
                <p className="text-[13px] text-muted">{c.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {c.suites.map((s) => (
                  <SuiteCard key={s.id} suite={s} hasAccess={access.suites.includes(s.id)} usage={data?.usageBySuite[s.id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      <Card className="p-5 md:p-6">
        <h2 className="text-section font-semibold tracking-[-0.3px] text-ink">How access works</h2>
        <ul className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {HOW_IT_WORKS.map((h) => {
            const Glyph = Icon[h.icon];
            return (
              <li key={h.title} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand dark:text-kw">
                  <Glyph className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{h.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{h.body}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {can("onboarding") && (
        <Card className="p-5 md:p-6">
          <ServicesPage embedded />
        </Card>
      )}
    </div>
  );
}
