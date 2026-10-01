import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Search, UserRound, X } from 'lucide-react'
import PageShell from '../components/PageShell'
import StatusBadge from '../components/StatusBadge'
import { useSession } from '../auth/session'
import type { MockUser } from '../data/mock'

interface Props {
  title: string
  subtitle: string
  verb: string
  danger?: boolean
  /** restrict the search to users currently in this state */
  only?: 'Active' | 'Disabled'
}

const MAX_RESULTS = 10

/** Shared "search for a user, select them, confirm the action" page used by the single-user admin actions. */
export default function UserActionPage({ title, subtitle, verb, danger, only }: Props) {
  const { scopedUsers } = useSession()
  const [draft, setDraft] = useState('')
  const [term, setTerm] = useState<string | null>(null)
  const [selected, setSelected] = useState<MockUser | null>(null)
  const [done, setDone] = useState(false)

  const matches = useMemo(() => {
    if (term === null) return []
    const s = term.trim().toLowerCase()
    return scopedUsers
      .filter((u) => !only || u.status === only)
      .filter((u) => !s || [u.username, u.name, u.email].some((f) => f.toLowerCase().includes(s)))
      .sort((a, b) => a.username.localeCompare(b.username))
  }, [term, only, scopedUsers])

  const search = (e: FormEvent) => {
    e.preventDefault()
    setTerm(draft)
    setSelected(null)
    setDone(false)
  }
  const clear = () => {
    setDraft('')
    setTerm(null)
    setSelected(null)
    setDone(false)
  }

  const shown = matches.slice(0, MAX_RESULTS)
  const scope = only ? `${only.toLowerCase()} users` : 'users'

  return (
    <PageShell title={title} subtitle={subtitle}>
      <form onSubmit={search} role="search" className="max-w-2xl">
        <label className="xa-label" htmlFor="user-q">Find a user</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
            <input
              id="user-q"
              className="xa-input pl-10"
              placeholder="Search by name, username or email"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="xa-btn-primary"><Search size={15} aria-hidden /> Search</button>
            <button type="button" className="xa-btn-default" onClick={clear}><X size={15} aria-hidden /> Clear</button>
          </div>
        </div>
      </form>

      {term === null && (
        <p className="mt-5 text-[13px] text-sharkskin">Search for a user to get started. Only {scope} are listed.</p>
      )}

      {term !== null && !selected && (
        <div className="mt-5">
          <p role="status" className="mb-3 text-[13px] text-sharkskin">
            {matches.length === 0
              ? `No ${scope} match “${term}”.`
              : matches.length > MAX_RESULTS
                ? <>Showing the first <b className="text-ink">{MAX_RESULTS}</b> of <b className="text-ink">{matches.length.toLocaleString('en-US')}</b> {scope}. Refine your search to narrow it down.</>
                : <><b className="text-ink">{matches.length}</b> {matches.length === 1 ? 'user' : 'users'} found</>}
          </p>
          {shown.length > 0 && (
            <ul className="divide-y divide-line/70 rounded-card border border-line">
              {shown.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{u.username} <span className="font-normal text-sharkskin">· {u.name}</span></div>
                    <div className="truncate text-[13px] text-sharkskin">{u.email} · {u.institution}</div>
                  </div>
                  <StatusBadge status={u.status} />
                  <button type="button" className="xa-btn-default px-3 py-1.5" onClick={() => setSelected(u)}>Select</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <div className="mt-6 max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.3px]">
              <UserRound size={18} aria-hidden className="text-mettus" /> Selected user
            </h2>
            <button type="button" className="text-[13px] font-semibold text-mettus hover:text-mettus-hover" onClick={() => { setSelected(null); setDone(false) }}>
              Choose a different user
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card bg-subtle p-4 text-[13px]">
            <dt className="font-semibold">Username</dt><dd className="text-sharkskin">{selected.username}</dd>
            <dt className="font-semibold">Name</dt><dd className="text-sharkskin">{selected.name}</dd>
            <dt className="font-semibold">Email</dt><dd className="text-sharkskin">{selected.email}</dd>
            <dt className="font-semibold">Institution</dt><dd className="text-sharkskin">{selected.institution}</dd>
            <dt className="font-semibold">Status</dt><dd><StatusBadge status={selected.status} /></dd>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className={danger ? 'xa-btn-danger' : 'xa-btn-primary'} disabled={done} onClick={() => setDone(true)}>{verb}</button>
            {done && (
              <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
                <CheckCircle2 size={16} aria-hidden /> Done for {selected.username} (mock — nothing was saved)
              </span>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
