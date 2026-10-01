import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, CircleHelp, Menu, X } from 'lucide-react'
import HelpPanel from './HelpPanel'
import { useSession } from '../auth/session'
import { menusFor, type NavMenu } from '../data/actions'

const navBtn =
  'inline-flex items-center gap-1 rounded-badge px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-subtle'

function Dropdown({ menu, open, onToggle, onClose }: {
  menu: NavMenu; open: boolean; onToggle: () => void; onClose: () => void
}) {
  const { pathname } = useLocation()
  const active = menu.items.some((i) => pathname.startsWith(i.to))
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        className={`${navBtn} ${active || open ? 'bg-subtle font-semibold' : 'bg-transparent'}`}
      >
        {menu.label}
        <ChevronDown size={14} aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 min-w-[14rem] rounded-card border border-line bg-surface p-1.5 shadow-modal"
        >
          {menu.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={onClose}
              className="block rounded-ctl px-3 py-2 text-[13px] font-medium text-ink hover:bg-subtle"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const { session } = useSession()
  const menus = menusFor(session.role)

  useEffect(() => {
    setOpenMenu(null)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMenu(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header ref={ref} className="mb-6 rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-4 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <nav aria-label="Main" className={`${mobileOpen ? 'flex' : 'hidden'} w-full flex-col gap-1 md:flex md:w-auto md:flex-row md:items-center`}>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `${navBtn} ${isActive ? 'bg-subtle font-semibold' : 'bg-transparent'}`}
            >
              Overview
            </NavLink>
            {menus.map((m) => (
              <Dropdown
                key={m.label}
                menu={m}
                open={openMenu === m.label}
                onToggle={() => setOpenMenu(openMenu === m.label ? null : m.label)}
                onClose={() => setOpenMenu(null)}
              />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
        <button type="button" onClick={() => setHelpOpen(true)} className={navBtn}>
          <CircleHelp size={16} aria-hidden /> Help
        </button>
        <button
          type="button"
          className="rounded-badge p-2 hover:bg-subtle md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        </div>
        {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
      </div>
    </header>
  )
}
