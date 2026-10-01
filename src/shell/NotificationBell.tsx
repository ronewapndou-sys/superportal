import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orgApi } from '@/lib/api/endpoints';
import { qk, useNotifications } from '@/lib/api/queries';
import { useBusiness } from '@/lib/business';
import { useTickets, when } from '../tickets/TicketsContext';

type Item = { id: string; title: string; text: string; at: number; link: string; read: boolean; source: 'support' | 'account' };

/** Top-bar bell: support replies and ticket updates, plus billing, wallet and report notices from the client portal. */
export function NotificationBell() {
  const { notices, markNoticeRead, markAllRead, audience } = useTickets();
  const business = useBusiness();
  const qc = useQueryClient();
  const account = useNotifications().data;
  const markAccountRead = useMutation({ mutationFn: orgApi.markAllRead, onSuccess: (list) => qc.setQueryData(qk.notifications, list) });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const items: Item[] = [
    ...notices.map((n) => ({ id: n.id, title: n.title, text: n.text, at: n.at, link: n.link, read: n.read, source: 'support' as const })),
    // Client-portal notices only make sense for client users, and only for the business being viewed.
    ...(audience === 'client'
      ? (account ?? [])
          .filter((n) => !n.business || n.business === business)
          .map((n) => ({ id: `acc-${n.id}`, title: n.title, text: n.body, at: Date.parse(n.at), link: n.href ?? '/', read: n.read, source: 'account' as const }))
      : []),
  ].sort((a, b) => b.at - a.at);
  const unread = items.filter((i) => !i.read).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (i: Item) => {
    if (i.source === 'support') markNoticeRead(i.id);
    setOpen(false);
    navigate(i.link);
  };

  return (
    <div className="bell-wrap">
      <button
        ref={btnRef}
        type="button"
        className="bell"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel" ref={panelRef} role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="link-btn" onClick={() => { markAllRead(); if (audience === 'client') markAccountRead.mutate(); }}>
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="bell-empty">You're all caught up.</p>
          ) : (
            <ul>
              {items.slice(0, 10).map((n) => (
                <li key={n.id}>
                  <button type="button" className={`bell-item${n.read ? '' : ' unread'}`} onClick={() => openItem(n)}>
                    {!n.read && <span className="unread-dot" aria-label="Unread" />}
                    <span className="bell-text">
                      <span className="bell-title">{n.title}</span>
                      <span className="bell-sub">{n.text}</span>
                      <span className="bell-time">{when(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="bell-foot" onClick={() => { setOpen(false); navigate(audience === 'agent' ? '/support/desk' : '/support/tickets'); }}>
            {audience === 'agent' ? 'Open the support desk' : 'View all support tickets'}
          </button>
        </div>
      )}
    </div>
  );
}
