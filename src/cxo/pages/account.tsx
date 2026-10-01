"use client";

import { NotificationsCard } from "@/components/account/notifications-card";
import { OrgCard } from "@/components/account/org-card";
import { ProfileCard } from "@/components/account/profile-card";
import { SecurityCard } from "@/components/account/security-card";
import { SpecNote } from "@/components/notes/spec-notes";
import { PageHeader } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";

export default function AccountPage() {
  const session = useSession();
  const user = session?.user;
  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Profile and security"
        description="Your details, how you sign in, and which emails you get. These settings apply across every Mettus product."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <SpecNote
            title="Profile and security"
            questions={[
              "Who owns identity: a Mettus identity service, or each client's own identity provider (Entra ID / Okta over SAML)?",
              "When a client uses single sign-on, do password and MFA settings here disappear, since their provider enforces them?",
              "Should admins be able to require an authenticator app instead of SMS for everyone on their account?",
            ]}
          >
            One profile for all Mettus products, so changing a password or second factor here applies everywhere.
            Profile, password and session changes are mocked in the browser for now. They need endpoints in the API
            contract.
          </SpecNote>
          <ProfileCard user={user} />
          <SecurityCard />
          <NotificationsCard />
        </div>
        <div className="min-w-0 space-y-6">
          <OrgCard role={user.role} />
        </div>
      </div>
    </>
  );
}
