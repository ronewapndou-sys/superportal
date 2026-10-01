import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useSession } from '../auth/session'
import type { Role } from '../data/roles'

const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const blurb: Record<Role, string> = {
  super: '',
  clientAdmin: 'Manage the users at your institution.',
  user: 'Manage your profile and password.',
}

export default function WelcomeHero() {
  const { session } = useSession()
  const canSearch = session.role !== 'user'
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/admin/users/search?q=${encodeURIComponent(q.trim())}` : '/admin/users/search')
  }
  return (
    <section className="relative overflow-hidden rounded-hero bg-mettus-gradient p-6 text-white shadow-card sm:p-8">
      <div className="relative max-w-xl">
        <span className="xa-badge bg-white/15 text-white">{session.accessLevel}</span>
        <h2 className="mt-3 text-[24px] font-bold tracking-[-0.5px] sm:text-[28px]">Welcome back, {session.firstName}</h2>
        <p className="mt-1 text-[13px] text-white/80">{today}</p>
        {blurb[session.role] && <p className="mt-1 text-[14px] text-white/90">{blurb[session.role]}</p>}
        {canSearch && <form onSubmit={submit} className="relative mt-5" role="search">
          <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Quick user search"
            placeholder="Quick search: name, username, email or institution"
            className="w-full rounded-ctl border-0 bg-surface py-3 pl-10 pr-24 text-[14px] text-ink placeholder:text-steel focus:outline-none focus:ring-2 focus:ring-white/60"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-badge bg-mettus px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-mettus-hover">
            Search
          </button>
        </form>}
      </div>
    </section>
  )
}
