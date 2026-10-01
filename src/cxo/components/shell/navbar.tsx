"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BrandMark, Wordmark } from "@/components/brand/logo";
import { BranchSwitch } from "@/components/shell/branch-switch";
import { BusinessSwitch } from "@/components/shell/business-switch";
import { useSpecNotes } from "@/components/notes/spec-notes";
import { Icon } from "@/components/ui/icons";
import { MenuItem, Popover, useDismiss, useFocusTrap } from "@/components/ui/overlay";
import { Avatar, cx, Spinner } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { orgApi } from "@/lib/api/endpoints";
import { qk, useNotifications, useWallet } from "@/lib/api/queries";
import type { CurrentUser } from "@/lib/api/types";
import { ago, moneyWhole } from "@/lib/format";
import { useBusiness } from "@/lib/business";
import { can, type Capability } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/status";

export const NAV: { href: string; label: string; icon: keyof typeof Icon; cap?: Capability }[] = [
  { href: "/home", label: "Home", icon: "Home" },
  { href: "/products", label: "Products", icon: "Grid" },
  { href: "/billing", label: "Billing", icon: "Receipt", cap: "billing.view" },
  { href: "/top-up", label: "Top up", icon: "Wallet", cap: "wallet.top_up" },
  { href: "/support", label: "Support", icon: "Support" },
  { href: "/reports", label: "Reports", icon: "Chart", cap: "reports.view" },
  { href: "/users", label: "Users", icon: "Users", cap: "users.manage" },
];

const CHROME_BTN =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-white/90 transition-colors hover:bg-white/10";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const items = NAV.filter((n) => !n.cap || can(user.role, n.cap));

  return (
    <>
      <header className="on-brand sticky top-0 z-30 border-b-2 border-brand bg-brand-navy text-white">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3.5 sm:gap-3 md:px-6">
          <button
            type="button"
            className={cx(CHROME_BTN, "xl:hidden")}
            aria-label="Open menu"
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <Icon.Menu />
          </button>

          <Link href="/home" className="flex shrink-0 items-center gap-3 rounded-xl" aria-label="Mettus home">
            <BrandMark className="sm:hidden" />
            <Wordmark onDark className="hidden w-[108px] sm:block" />
          </Link>

          <BusinessSwitch className="ml-1" />
          <BranchSwitch className="hidden md:block" />

          <nav aria-label="Main" className="ml-2 hidden flex-1 items-center gap-0.5 xl:flex">
            {items.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "inline-flex min-h-11 items-center rounded-[10px] px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors 2xl:px-3",
                    active ? "bg-white/15 font-semibold text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <BalancePill show={can(user.role, "wallet.top_up")} />
            <Notifications />
            <ThemeToggle className={CHROME_BTN} />
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      {drawer && <MobileDrawer items={items} user={user} pathname={pathname} onClose={() => setDrawer(false)} />}
    </>
  );
}

function BalancePill({ show }: { show: boolean }) {
  const { data } = useWallet();
  if (!show) return null;
  const low = data ? data.balanceCents < data.lowBalanceThresholdCents : false;
  return (
    <Link
      href="/top-up"
      className="hidden min-h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 text-[13px] font-semibold tabular-nums transition-colors hover:bg-white/15 sm:inline-flex xl:hidden 2xl:inline-flex"
      title="Wallet balance. Select to top up."
    >
      {low ? <Icon.Alert className="h-4 w-4 text-accent-gold" /> : <Icon.Wallet className="h-4 w-4 text-white/80" />}
      {data ? moneyWhole(data.balanceCents) : <Spinner className="h-3.5 w-3.5 border-white/30 border-t-white" />}
      <span className="sr-only">{low ? "wallet balance is low, top up" : "wallet balance, top up"}</span>
    </Link>
  );
}

function Notifications() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const business = useBusiness();
  const all = useNotifications().data;
  // the other business's notifications stay hidden until you switch to it
  const data = all?.filter((n) => !n.business || n.business === business);
  const unread = data?.filter((n) => !n.read).length ?? 0;
  const markAll = useMutation({
    mutationFn: orgApi.markAllRead,
    onSuccess: (list) => qc.setQueryData(qk.notifications, list),
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={CHROME_BTN}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon.Bell />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white tabular-nums"
            aria-hidden
          >
            {unread}
          </span>
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} className="w-[min(92vw,380px)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-[14px] font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5 dark:text-kw"
              onClick={() => markAll.mutate()}
            >
              Mark all as read
            </button>
          )}
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {data?.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-muted">You&apos;re all caught up.</li>}
          {data?.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href ?? "#"}
                onClick={() => setOpen(false)}
                className="flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-ink/5"
              >
                <span
                  className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">
                    {n.title}
                    {!n.read && <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="block text-xs leading-snug text-muted">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-muted">{ago(n.at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}

function UserMenu({ user }: { user: CurrentUser }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const notes = useSpecNotes();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex min-h-10 items-center gap-2 rounded-full p-0.5 pr-1 transition-colors hover:bg-white/10 sm:pr-2"
        aria-label={`Account menu for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={user.name} />
        <Icon.ChevronDown className="hidden h-4 w-4 text-white/80 sm:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} className="w-72 p-2">
        <div className="border-b border-line px-3 pt-2 pb-3">
          <p className="text-[14px] font-semibold text-ink">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <p className="mt-2 text-xs text-muted">
            {user.orgName} · <span className="font-semibold text-ink">{ROLE_LABEL[user.role]}</span>
          </p>
        </div>
        <div role="menu" className="pt-2">
          <MenuItem href="/account" onClick={() => setOpen(false)}>
            <Icon.User className="h-4 w-4 text-muted" /> Profile and security
          </MenuItem>
          <MenuItem onClick={notes.toggle}>
            <Icon.Book className="h-4 w-4 text-muted" />
            <span className="flex-1">Spec notes</span>
            <span className={cx("text-xs font-semibold", notes.on ? "text-brand dark:text-kw" : "text-muted")}>
              {notes.on ? "On" : "Off"}
            </span>
          </MenuItem>
        </div>
      </Popover>
    </div>
  );
}

function MobileDrawer({
  items,
  user,
  pathname,
  onClose,
}: {
  items: typeof NAV;
  user: CurrentUser;
  pathname: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);
  useFocusTrap(ref, true);
  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <div className="absolute inset-0 bg-brand-ink/50 backdrop-blur-sm" aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="on-brand pop-in absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-brand-navy p-4 text-white shadow-modal"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <Wordmark onDark className="w-[108px]" />
          </span>
          <button type="button" className={CHROME_BTN} aria-label="Close menu" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <p className="mt-5 px-3 text-xs text-white/70">{user.orgName}</p>
        <BranchSwitch className="mt-1" />
        <nav aria-label="Main" className="mt-2 flex flex-col gap-1">
          {items.map((n) => {
            const Glyph = Icon[n.icon];
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors",
                  active ? "bg-white/15 font-semibold" : "text-white/85 hover:bg-white/10"
                )}
              >
                <Glyph className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/top-up"
          onClick={onClose}
          className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 text-[13px] font-semibold hover:bg-white/15"
        >
          <Icon.Wallet className="h-4 w-4" /> Top up credits
        </Link>
      </div>
    </div>
  );
}
