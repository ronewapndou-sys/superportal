import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Pencil, Search, X } from 'lucide-react'
import PageShell from '../components/PageShell'
import StatusBadge from '../components/StatusBadge'
import SystemUserModal from '../components/SystemUserModal'
import { useSession } from '../auth/session'
import type { MockUser } from '../data/mock'

const PAGE_SIZE = 25
const fmt = (n: number) => n.toLocaleString('en-US')

interface Criteria { q: string; inst: string; status: string }

export default function UserSearchPage() {
  const { scopedUsers, scopedInstitutions, isInternal, session } = useSession()
  const [params] = useSearchParams()
  const initial: Criteria = { q: params.get('q') ?? '', inst: 'All', status: 'All' }
  const [draft, setDraft] = useState<Criteria>(initial)
  const [applied, setApplied] = useState<Criteria>(initial)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<MockUser | null>(null)
  const [notice, setNotice] = useState('')

  const rows = useMemo(() => {
    const s = applied.q.trim().toLowerCase()
    return scopedUsers
      .filter((u) => applied.inst === 'All' || u.institution === applied.inst)
      .filter((u) => applied.status === 'All' || u.status === applied.status)
      .filter((u) => !s || [u.username, u.name, u.email].some((f) => f.toLowerCase().includes(s)))
      .sort((a, b) => a.username.localeCompare(b.username))
  }, [applied, scopedUsers])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * PAGE_SIZE
  const visible = rows.slice(start, start + PAGE_SIZE)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setApplied(draft)
    setPage(1)
  }
  const reset = () => {
    const blank = { q: '', inst: 'All', status: 'All' }
    setDraft(blank)
    setApplied(blank)
    setPage(1)
  }

  return (
    <PageShell title="Search / Update Users" subtitle={isInternal ? 'Find and edit users across institutions' : `Find and edit users at ${session.institution}`}>
      <form onSubmit={submit} role="search" className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_9rem_auto]">
        <div>
          <label className="xa-label" htmlFor="q">Name, username or email</label>
          <div className="relative">
            <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
            <input id="q" className="xa-input pl-10" placeholder="e.g. nkosi or thabo@xds.co.za" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
          </div>
        </div>
        {isInternal ? (
          <div>
            <label className="xa-label" htmlFor="inst">Institution</label>
            <select id="inst" className="xa-input" value={draft.inst} onChange={(e) => setDraft({ ...draft, inst: e.target.value })}>
              <option>All</option>
              {scopedInstitutions.map((i) => <option key={i.code}>{i.name}</option>)}
            </select>
          </div>
        ) : <div className="hidden md:block" />}
        <div>
          <label className="xa-label" htmlFor="status">Status</label>
          <select id="status" className="xa-input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option>All</option><option>Active</option><option>Disabled</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="xa-btn-primary"><Search size={15} aria-hidden /> Search</button>
          <button type="button" className="xa-btn-default" onClick={reset}><X size={15} aria-hidden /> Reset</button>
        </div>
      </form>

      {notice && (
        <p role="status" className="mb-3 inline-flex items-center gap-1.5 rounded-ctl bg-success-bg px-3 py-2 text-[13px] font-semibold text-success">
          <CheckCircle2 size={16} aria-hidden /> {notice}
        </p>
      )}
      <p role="status" className="mb-3 text-[13px] text-sharkskin">
        {rows.length === 0
          ? 'No users found.'
          : <>Showing <b className="text-ink">{fmt(start + 1)}–{fmt(start + visible.length)}</b> of <b className="text-ink">{fmt(rows.length)}</b> users</>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.5px] text-sharkskin">
              {['Username', 'Name', 'Institution', 'Status', 'Last login', ''].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} className="border-b border-line/70 last:border-0">
                <td className="px-3 py-3 font-semibold">{u.username}</td>
                <td className="px-3 py-3"><div>{u.name}</div><div className="text-sharkskin">{u.email}</div></td>
                <td className="px-3 py-3">{u.institution}</td>
                <td className="px-3 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-3 py-3 text-sharkskin">{u.lastLogin}</td>
                <td className="px-3 py-3 text-right">
                  <button type="button" className="xa-btn-default px-3 py-1.5" onClick={() => { setNotice(''); setEditing(u) }} aria-label={`Edit ${u.username}`}><Pencil size={13} aria-hidden /> Edit</button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-sharkskin">No users match those criteria. Try a shorter search or reset the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
          <button type="button" className="xa-btn-default px-3 py-2 disabled:opacity-50" disabled={current === 1} onClick={() => setPage(current - 1)}>
            <ChevronLeft size={15} aria-hidden /> Previous
          </button>
          <span className="text-[13px] text-sharkskin">Page <b className="text-ink">{fmt(current)}</b> of {fmt(pages)}</span>
          <button type="button" className="xa-btn-default px-3 py-2 disabled:opacity-50" disabled={current === pages} onClick={() => setPage(current + 1)}>
            Next <ChevronRight size={15} aria-hidden />
          </button>
        </nav>
      )}
      {editing && (
        <SystemUserModal
          user={editing}
          internal={isInternal}
          onClose={() => setEditing(null)}
          onSave={(_, synced) => {
            setNotice(
              synced.length && isInternal
                ? `Changes to ${editing.username} saved and synced to ${synced.join(', ')} (mock — nothing was saved)`
                : isInternal
                  ? `Changes to ${editing.username} saved, not synced (mock — nothing was saved)`
                  : `Changes to ${editing.username} saved (mock — nothing was saved)`,
            )
            setEditing(null)
          }}
        />
      )}
    </PageShell>
  )
}
