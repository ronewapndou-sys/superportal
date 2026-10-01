"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SpecNote } from "@/components/notes/spec-notes";
import { RowMenu, type RowMenuItem } from "@/components/users/row-menu";
import { EditAccessDialog, InviteUserDialog, StatusDialog } from "@/components/users/user-dialogs";
import { Icon } from "@/components/ui/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PendingState,
  Pill,
  SearchInput,
  Select,
  Stat,
  Tabs,
  TableWrap,
  TD,
  TH,
  TR,
} from "@/components/ui/primitives";
import { usersApi } from "@/lib/api/endpoints";
import { qk, useAudit, useBranches, useProductRoles, useUsers } from "@/lib/api/queries";
import { BranchesTab } from "@/components/users/branches-tab";
import { productNames } from "@/components/users/product-checklist";
import { ProductRolesTab } from "@/components/users/product-roles-tab";
import type { PortalUser, Role } from "@/lib/api/types";
import { ago, dateAndTime } from "@/lib/format";
import { CAPABILITIES, can, ROLE_CAPS } from "@/lib/permissions";
import { useSession } from "@/lib/session";
import { ROLE_DESCRIPTION, ROLE_LABEL, USER_STATUS_LABEL, USER_STATUS_TONE } from "@/lib/status";
import { useBusiness } from "@/lib/business";
import { BUSINESSES, SUITE_BY_ID, SUITE_LABEL } from "@/lib/suites";
import { useOrg as useTopBarOrg } from "../../shell/OrgContext";

type TabId = "people" | "branches" | "productRoles" | "roles" | "audit";
const ROLES: Role[] = ["admin", "billing", "analyst", "viewer"];

export default function UsersPage() {
  return (
    <Suspense>
      <Users />
    </Suspense>
  );
}

function Users() {
  const me = useSession()!.user;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabId>("people");
  const inviteOpen = params.get("invite") === "1";
  const isAdmin = can(me.role, "users.manage");

  // invite state lives in the URL so Home and other screens can deep-link to it
  function setInvite(open: boolean) {
    router.replace(open ? `${pathname}?invite=1` : pathname, { scroll: false });
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users and access" description="See who in your organisation can use Mettus." />
        <Alert tone="info" title="Only admins can manage users">
          Ask an admin on your account to invite someone or change their access. You can find your admins in the list
          your account manager shares during onboarding.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users and access"
        description="Invite colleagues, give them roles at your divisions, and see who changed what."
        actions={
          <Button onClick={() => setInvite(true)}>
            <Icon.Plus className="h-4 w-4" /> Invite user
          </Button>
        }
      />

      <SpecNote
        title="Users and access"
        questions={[
          "Which identity provider do clients use: Entra ID, Okta or Google? Do we need SAML as well as OIDC?",
          "Do we need SCIM provisioning so the client's HR system adds and removes people automatically?",
          "Should roles be per product (analyst in Credit, viewer in Risk), or one role across the portal?",
          "How long must the audit log be kept? POPIA and FICA may set a minimum.",
          "Is a division the right level, or do you also need regions or departments above divisions?",
          "Should division managers be able to manage their own division's people, without seeing other divisions?",
          "Do divisions need their own wallets, spend limits or invoices, or does the group pay for everything?",
          "Should an admin be able to give one person an extra product as an exception, outside their role?",
        ]}
      >
        Access has two parts. Portal permissions decide what someone can manage here. Division roles decide which products
        they can open, and where: at each division, the products their role includes and that the division has switched on.
        Admins manage their own organisation&apos;s users without calling Mettus. Product access can only include
        products the organisation subscribes to. The role controls what each person can do in the portal itself.
      </SpecNote>

      <Tabs<TabId>
        label="User management sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "people", label: "People" },
          { id: "branches", label: "Divisions" },
          { id: "productRoles", label: "Product roles" },
          { id: "roles", label: "Portal permissions" },
          { id: "audit", label: "Audit log" },
        ]}
      />

      {tab === "people" && <People meId={me.id} onInvite={() => setInvite(true)} />}
      {tab === "branches" && <BranchesTab />}
      {tab === "productRoles" && <ProductRolesTab />}
      {tab === "roles" && <RolesMatrix />}
      {tab === "audit" && <AuditLog />}

      <InviteUserDialog open={inviteOpen} onClose={() => setInvite(false)} />
    </div>
  );
}

function People({ meId, onInvite }: { meId: string; onInvite: () => void }) {
  const bizName = BUSINESSES[useBusiness()].name;
  const showAll = useTopBarOrg().org === "All organisations";
  const branches = useBranches().data ?? [];
  const [branch, setBranchFilter] = useState<string>("all");
  const { data, isPending, isError, refetch } = useUsers();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [statusFor, setStatusFor] = useState<PortalUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resetMfa = useMutation({
    mutationFn: (u: PortalUser) => usersApi.resetMfa(u.id),
    onSuccess: (u) => {
      setNotice(`Multi-factor sign-in reset for ${u.name}. They'll set it up again next time they sign in.`);
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.audit });
    },
  });
  const resend = useMutation({
    mutationFn: (u: PortalUser) => usersApi.resendInvite(u.id),
    onSuccess: (u) => {
      setNotice(`Invite sent again to ${u.email}. The new link expires in 7 days.`);
      qc.invalidateQueries({ queryKey: qk.audit });
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (u) =>
        (role === "all" || u.role === role) &&
        (branch === "all" || u.assignments.some((a) => a.branchId === branch)) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [data, query, role, branch]);

  if (isPending) {
    return (
      <Card>
        <PendingState label="Loading your team…" />
      </Card>
    );
  }
  if (isError) {
    return (
      <Card>
        <ErrorState message="Couldn't load your users." onRetry={() => refetch()} />
      </Card>
    );
  }

  const active = data.filter((u) => u.status === "active").length;
  const invited = data.filter((u) => u.status === "invited").length;
  const noMfa = data.filter((u) => u.status === "active" && !u.mfaEnabled).length;

  function menuFor(u: PortalUser): RowMenuItem[] {
    const items: RowMenuItem[] = [{ label: "Edit access", onSelect: () => setEditing(u) }];
    if (u.status === "invited") items.push({ label: "Resend invite", onSelect: () => resend.mutate(u) });
    if (u.status === "active" && u.mfaEnabled) items.push({ label: "Reset multi-factor sign-in", onSelect: () => resetMfa.mutate(u) });
    if (u.id !== meId) {
      items.push(
        u.status === "deactivated"
          ? { label: "Reactivate", onSelect: () => setStatusFor(u) }
          : { label: "Deactivate", onSelect: () => setStatusFor(u), danger: true }
      );
    }
    return items;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Active users" value={active} sub={`of ${data.length} on your account`} />
        <Stat label="Waiting to accept" value={invited} sub={invited ? "Invites expire after 7 days" : "No pending invites"} />
        <Stat
          label="Without multi-factor"
          value={noMfa}
          sub={noMfa ? "They're prompted at next sign-in" : "Everyone is protected"}
        />
      </div>

      {notice && (
        <Alert tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {(resetMfa.error || resend.error) && (
        <Alert tone="danger">{(resetMfa.error ?? resend.error)!.message}</Alert>
      )}

      <Card>
        <div className="flex flex-col gap-3 p-5 sm:flex-row md:p-6">
          <SearchInput
            aria-label="Search users"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Select aria-label="Filter by division" value={branch} onChange={(e) => setBranchFilter(e.target.value)} className="sm:w-56">
            <option value="all">All divisions</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by permissions" value={role} onChange={(e) => setRole(e.target.value as Role | "all")} className="sm:w-48">
            <option value="all">All permissions</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No one matches that search"
            description="Try a different name or email, or clear the role filter."
            action={
              <Button variant="secondary" onClick={() => { setQuery(""); setRole("all"); }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden border-t border-line md:block">
              <TableWrap label="Users">
                <table className="w-full min-w-[1040px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={TH}>Person</th>
                      <th scope="col" className={TH}>Permissions</th>
                      <th scope="col" className={TH}>Divisions and roles</th>
                      <th scope="col" className={TH}>{showAll ? "XDS and MIE products" : `${bizName} products`}</th>
                      <th scope="col" className={TH}>Multi-factor</th>
                      <th scope="col" className={TH}>Status</th>
                      <th scope="col" className={TH}>Last active</th>
                      <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id} className={TR}>
                        <td className={TD}>
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-ink">
                                {u.name}
                                {u.id === meId && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
                              </p>
                              <p className="truncate text-xs text-muted">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className={TD}>{ROLE_LABEL[u.role]}</td>
                        <td className={TD}><BranchRoles user={u} /></td>
                        <td className={TD}><SuiteChips suites={u.suites} showAll={showAll} /></td>
                        <td className={TD}><MfaPill on={u.mfaEnabled} /></td>
                        <td className={TD}><Pill tone={USER_STATUS_TONE[u.status]}>{USER_STATUS_LABEL[u.status]}</Pill></td>
                        <td className={`${TD} whitespace-nowrap text-muted`}>{lastActive(u)}</td>
                        <td className={`${TD} text-right`}>
                          <RowMenu label={`Actions for ${u.name}`} items={menuFor(u)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>

            {/* mobile cards */}
            <ul className="divide-y divide-line border-t border-line md:hidden">
              {filtered.map((u) => (
                <li key={u.id} className="flex gap-3 p-5">
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-[13px] font-semibold text-ink">
                        {u.name}
                        {u.id === meId && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={USER_STATUS_TONE[u.status]}>{USER_STATUS_LABEL[u.status]}</Pill>
                      <MfaPill on={u.mfaEnabled} />
                      <span className="text-xs font-semibold text-ink">{ROLE_LABEL[u.role]}</span>
                    </div>
                    <BranchRoles user={u} />
                    <SuiteChips suites={u.suites} />
                    <p className="text-xs text-muted">{lastActive(u)}</p>
                  </div>
                  <RowMenu label={`Actions for ${u.name}`} items={menuFor(u)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {data.length <= 1 && (
        <Card className="p-5">
          <EmptyState
            title="It's just you so far"
            description="Invite colleagues so they can use Mettus products with their own sign-in."
            action={<Button onClick={onInvite}>Invite user</Button>}
          />
        </Card>
      )}

      <EditAccessDialog user={editing} onClose={() => setEditing(null)} />
      <StatusDialog user={statusFor} onClose={() => setStatusFor(null)} />
    </>
  );
}

function lastActive(u: PortalUser) {
  if (u.status === "invited") return "Hasn't accepted yet";
  return u.lastActiveAt ? ago(u.lastActiveAt) : "Never signed in";
}

/** "Fraud and Forensics: Credit officer", one line per division. */
function BranchRoles({ user }: { user: PortalUser }) {
  const branches = useBranches().data ?? [];
  const roles = useProductRoles().data ?? [];
  if (user.assignments.length === 0) return <span className="text-xs text-muted">No divisions</span>;
  return (
    <ul className="space-y-0.5 text-[13px]">
      {user.assignments.map((a) => (
        <li key={a.branchId} className="md:whitespace-nowrap">
          <span className="text-ink">{branches.find((b) => b.id === a.branchId)?.name ?? "Unknown division"}</span>
          <span className="text-muted">: {roles.find((r) => r.id === a.productRoleId)?.name ?? "No role"}</span>
        </li>
      ))}
    </ul>
  );
}

function SuiteChips({ suites, showAll }: { suites: PortalUser["suites"]; showAll?: boolean }) {
  const business = useBusiness();
  if (!showAll) {
    const own = suites.filter((s) => SUITE_BY_ID[s].business === business);
    if (own.length === 0) return <span className="text-muted">None</span>;
    return (
      <span className="text-[13px] text-ink" title={own.map((s) => SUITE_LABEL[s]).join(", ")}>
        {productNames(own)}
      </span>
    );
  }
  const xds = suites.filter((s) => SUITE_BY_ID[s].business === "xds");
  const mie = suites.filter((s) => SUITE_BY_ID[s].business === "mie");
  if (xds.length === 0 && mie.length === 0) return <span className="text-muted">None</span>;
  return (
    <span className="text-[13px] text-ink">
      {xds.length > 0 && (
        <span className="block" title={xds.map((s) => SUITE_LABEL[s]).join(", ")}>
          XDS: {productNames(xds)}
        </span>
      )}
      {mie.length > 0 && (
        <span className="block" title={mie.map((s) => SUITE_LABEL[s]).join(", ")}>
          MIE: {productNames(mie)}
        </span>
      )}
    </span>
  );
}

function MfaPill({ on }: { on: boolean }) {
  return <Pill tone={on ? "success" : "warning"}>{on ? "MFA on" : "MFA off"}</Pill>;
}

function RolesMatrix() {
  return (
    <Card>
      <div className="p-5 md:p-6">
        <h2 className="text-section font-semibold tracking-[-0.3px] text-ink">What each portal permission can do</h2>
        <p className="mt-1 text-[13px] text-muted">
          Portal permissions control what someone can manage here, across every division. Which products they can open
          comes from their division roles.
        </p>
      </div>
      <div className="border-t border-line">
        <TableWrap label="Roles and permissions">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>Permission</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className={`${TH} text-center`}>
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((c) => (
                <tr key={c.id} className={TR}>
                  <th scope="row" className={`${TD} text-left font-medium`}>{c.label}</th>
                  {ROLES.map((r) => {
                    const allowed = ROLE_CAPS[r].includes(c.id);
                    return (
                      <td key={r} className={`${TD} text-center`}>
                        {allowed ? (
                          <Icon.Check className="mx-auto h-[18px] w-[18px] text-success" />
                        ) : (
                          <Icon.Minus className="mx-auto h-[18px] w-[18px] text-steel" />
                        )}
                        <span className="sr-only">{allowed ? "Allowed" : "Not allowed"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </div>
      <dl className="grid gap-4 border-t border-line p-5 sm:grid-cols-2 md:p-6">
        {ROLES.map((r) => (
          <div key={r}>
            <dt className="text-[13px] font-semibold text-ink">{ROLE_LABEL[r]}</dt>
            <dd className="mt-0.5 text-[13px] text-muted">{ROLE_DESCRIPTION[r]}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function AuditLog() {
  const { data, isPending, isError, refetch } = useAudit();
  return (
    <Card>
      <div className="p-5 md:p-6">
        <h2 className="text-section font-semibold tracking-[-0.3px] text-ink">Audit log</h2>
        <p className="mt-1 text-[13px] text-muted">Every change to users, access, payments and settings on your account.</p>
      </div>
      {isPending ? (
        <PendingState label="Loading the audit log…" />
      ) : isError ? (
        <ErrorState message="Couldn't load the audit log." onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="Nothing logged yet" description="Changes to your account will show up here." />
      ) : (
        <div className="border-t border-line">
          <TableWrap label="Audit log">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={TH}>When</th>
                  <th scope="col" className={TH}>Who</th>
                  <th scope="col" className={TH}>What</th>
                  <th scope="col" className={TH}>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id} className={TR}>
                    <td className={`${TD} whitespace-nowrap text-muted`}>
                      <time dateTime={a.at} title={dateAndTime(a.at)}>
                        {ago(a.at)}
                      </time>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>{a.actor}</td>
                    <td className={`${TD} font-medium`}>{a.action}</td>
                    <td className={`${TD} text-muted`}>{a.target}</td>
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
