import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession } from '@/lib/session';
import { useAuth } from '../auth/AuthContext';
import { useChat } from '../chat';

import { ThemeToggle } from '../ui/theme';
import { ContextBar } from './ContextBar';
import { NotificationBell } from './NotificationBell';

/** Slim utility bar: where you are on the left, help and account on the right. Page titles live in <PageHeader>. */
export function Topbar({ section, page }: { section: string; page: string }) {
  const chat = useChat();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !accountRef.current?.contains(t)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="topbar-left">
      <ContextBar />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span>{section}</span>
        <span className="sep" aria-hidden="true">/</span>
        <span aria-current="page" className="here">{page}</span>
      </nav>
      </div>
      <div className="top-right">
        <ThemeToggle className="bell" />
        <NotificationBell />
        <button className="top-btn" type="button" onClick={() => chat.setOpen(true)}>
          Help
        </button>
        <button ref={accountRef} className="account" type="button" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="avatar" aria-hidden="true">{user?.initials}</span>
          <span className="account-name">{user?.name}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
        </button>
      </div>
      {menuOpen && (
        <div className="menu" ref={menuRef} role="menu">
          <div className="menu-name">{user?.name}</div>
          <div className="menu-sub">{user?.email}</div>
          <div className="menu-sub">{user?.role}</div>
          <div className="menu-sep" />
          <button className="menu-item" type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/account'); }}>
            Profile and preferences
          </button>
          <button className="menu-item" type="button" role="menuitem" onClick={() => { setMenuOpen(false); signOut(); clearSession(); navigate('/login', { replace: true }); }}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
