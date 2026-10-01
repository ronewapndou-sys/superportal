import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react'
import { systemUserDetails, webServices, type MockUser, type SystemUserDetails } from '../data/mock'

interface Props {
  user: MockUser
  /** XDS staff see internal fields and choose sync targets; client users don't */
  internal: boolean
  onClose: () => void
  onSave: (details: SystemUserDetails, synced: string[]) => void
}

function Row({ label, required, htmlFor, children }: { label: string; required?: boolean; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-1 border-b border-line/70 py-2 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-sharkskin">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

type SyncState = 'pending' | 'syncing' | 'synced'

const ro = 'py-2 text-[13px] text-ink'
const field = 'xa-input py-2 text-[13px]'

export default function SystemUserModal({ user, internal, onClose, onSave }: Props) {
  const [d, setD] = useState<SystemUserDetails>(() => systemUserDetails(user))
  const set = <K extends keyof SystemUserDetails>(k: K, v: SystemUserDetails[K]) => setD((p) => ({ ...p, [k]: v }))
  const firstField = useRef<HTMLInputElement>(null)
  const original = useRef(d)
  const [syncOn, setSyncOn] = useState(true)
  const [targets, setTargets] = useState<string[]>(() => webServices.map((w) => w.key))
  const [progress, setProgress] = useState<Record<string, SyncState> | null>(null)
  const [finished, setFinished] = useState(false)
  const alive = useRef(true)
  const syncing = progress !== null && !finished

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const toggleTarget = (key: string) =>
    setTargets((t) => (t.includes(key) ? t.filter((k) => k !== key) : [...t, key]))

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // Mock sync: push to each selected service in turn.
  const runSync = async (keys: string[]) => {
    setProgress(Object.fromEntries(keys.map((k) => [k, 'pending'])))
    for (const k of keys) {
      if (!alive.current) return
      setProgress((p) => ({ ...p, [k]: 'syncing' }))
      await wait(700)
      if (!alive.current) return
      setProgress((p) => ({ ...p, [k]: 'synced' }))
    }
    setFinished(true)
  }

  // Client users have no sync controls: changes are pushed to every service automatically.
  useEffect(() => {
    if (finished && !internal) onSave(d, syncedNames())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  const submit = () => {
    const changed = JSON.stringify(d) !== JSON.stringify(original.current)
    const keys = webServices.map((w) => w.key).filter((k) => targets.includes(k))
    if (changed && syncOn && keys.length > 0) void runSync(keys)
    else onSave(d, [])
  }
  const syncedNames = () =>
    webServices.filter((w) => progress?.[w.key] === 'synced').map((w) => w.name)

  useEffect(() => {
    firstField.current?.focus()
    firstField.current?.select()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !syncing && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, syncing])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy/50 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && !progress && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="su-title"
        onSubmit={(e) => { e.preventDefault(); if (!progress) submit() }}
        className="w-full max-w-3xl overflow-hidden rounded-[18px] border border-line bg-surface shadow-modal"
      >
        <header className="flex items-center justify-between bg-navy px-5 py-3.5 text-white">
          <h2 id="su-title" className="text-[18px] font-semibold tracking-[-0.3px]">Review System User</h2>
          <button type="button" onClick={onClose} disabled={syncing} aria-label="Close" className="rounded-badge p-1.5 hover:bg-white/15 disabled:opacity-40">
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 sm:px-6">
          <p className="text-[13px] text-sharkskin">
            Please review system user information below. Click OK to save changes to this record, or click Cancel/Close to return back.
          </p>
          <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.3px]">System User</h3>
          <p className="mb-2 text-[13px] text-sharkskin">These are the fields of the system user record that can be edited.</p>

          <div className="border-t border-line/70">
            <Row label="Subscriber Name"><div className={ro}>{d.subscriberName}</div></Row>
            <Row label="Email Address" required htmlFor="su-email">
              <input id="su-email" ref={firstField} type="email" required className={field} value={d.email} onChange={(e) => set('email', e.target.value)} />
            </Row>
            <Row label="Username"><div className={ro}>{d.username}</div></Row>
            <Row label="System User Role" required htmlFor="su-role">
              <select id="su-role" className={`${field} sm:w-40`} value={d.role} onChange={(e) => set('role', e.target.value as SystemUserDetails['role'])}>
                <option>Admin</option><option>User</option><option>Read Only</option>
              </select>
            </Row>
            <Row label="First Name" required htmlFor="su-first">
              <input id="su-first" required className={field} value={d.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </Row>
            <Row label="Surname" required htmlFor="su-surname">
              <input id="su-surname" required className={field} value={d.surname} onChange={(e) => set('surname', e.target.value)} />
            </Row>
            <Row label="ID No" htmlFor="su-id">
              <input id="su-id" inputMode="numeric" maxLength={13} className={`${field} sm:w-56`} value={d.idNo} onChange={(e) => set('idNo', e.target.value)} />
            </Row>
            <Row label="Job Position" htmlFor="su-job">
              <input id="su-job" className={field} value={d.jobPosition} onChange={(e) => set('jobPosition', e.target.value)} />
            </Row>
            <Row label="Cellular Code" htmlFor="su-code">
              <input id="su-code" className={`${field} sm:w-24`} value={d.cellularCode} onChange={(e) => set('cellularCode', e.target.value)} />
            </Row>
            <Row label="Cellular No" htmlFor="su-cell">
              <input id="su-cell" inputMode="tel" className={field} value={d.cellularNo} onChange={(e) => set('cellularNo', e.target.value)} />
            </Row>
            <Row label="Active YN" required htmlFor="su-active">
              <select id="su-active" className={`${field} sm:w-28`} value={d.active} onChange={(e) => set('active', e.target.value as 'Yes' | 'No')}>
                <option>Yes</option><option>No</option>
              </select>
            </Row>
            {internal && <Row label="OverrideDeactivateYN" required htmlFor="su-override">
              <select id="su-override" className={`${field} sm:w-28`} value={d.overrideDeactivate} onChange={(e) => set('overrideDeactivate', e.target.value as 'Yes' | 'No')}>
                <option>No</option><option>Yes</option>
              </select>
            </Row>}
            {internal && <Row label="Stay Alive" htmlFor="su-alive">
              <input id="su-alive" type="number" min={0} className={`${field} sm:w-28`} value={d.stayAlive} onChange={(e) => set('stayAlive', e.target.value)} />
            </Row>}
            {internal && <Row label="Created By User"><div className={ro}>{d.createdBy}</div></Row>}
            <Row label="Created On Date"><div className={`${ro} [font-feature-settings:'tnum']`}>{d.createdOn}</div></Row>
            {internal && <Row label="Changed By User"><div className={ro}>{d.changedBy}</div></Row>}
            <Row label="Changed On Date"><div className={`${ro} [font-feature-settings:'tnum']`}>{d.changedOn}</div></Row>
          </div>
          <p className="mt-3 text-[12px] text-sharkskin"><span className="text-danger">*</span> indicates a required field</p>

          {internal && <section aria-labelledby="su-sync" className="mt-5 rounded-card border border-line bg-subtle/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="su-sync" className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.3px]">
                  <RefreshCw size={16} aria-hidden className="text-mettus" /> Sync to web services
                </h3>
                <p className="text-[13px] text-sharkskin">When you click OK, any changes are pushed to the services selected below.</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-[13px] font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-mettus" checked={syncOn} disabled={!!progress} onChange={(e) => setSyncOn(e.target.checked)} />
                Sync changes
              </label>
            </div>
            <ul className="mt-3 space-y-2">
              {webServices.map((w) => {
                const st = progress?.[w.key]
                return (
                  <li key={w.key} className="flex items-center gap-3 rounded-ctl bg-surface px-3 py-2.5">
                    <input
                      id={`svc-${w.key}`}
                      type="checkbox"
                      className="h-4 w-4 accent-mettus"
                      checked={targets.includes(w.key)}
                      disabled={!syncOn || !!progress}
                      onChange={() => toggleTarget(w.key)}
                    />
                    <label htmlFor={`svc-${w.key}`} className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">{w.name}</span>
                      <span className="block text-[12px] text-sharkskin">{w.detail}</span>
                    </label>
                    {st && (
                      <span role="status" className={`inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.5px] ${st === 'synced' ? 'text-success' : 'text-sharkskin'}`}>
                        {st === 'syncing' && <Loader2 size={14} className="animate-spin" aria-hidden />}
                        {st === 'synced' && <CheckCircle2 size={14} aria-hidden />}
                        {st === 'pending' ? 'Waiting' : st === 'syncing' ? 'Syncing' : 'Synced'}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>}
        </div>

        <footer className="flex justify-end gap-3 border-t border-line bg-subtle/60 px-5 py-3.5 sm:px-6">
          {finished ? (
            <button type="button" className="xa-btn-primary min-w-[5.5rem]" onClick={() => onSave(d, syncedNames())}>Done</button>
          ) : (
            <>
              <button type="submit" className="xa-btn-primary min-w-[5.5rem]" disabled={syncing}>
                {syncing ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Syncing</> : 'OK'}
              </button>
              <button type="button" className="xa-btn-default min-w-[5.5rem]" disabled={syncing} onClick={onClose}>Cancel</button>
            </>
          )}
        </footer>
      </form>
    </div>
  )
}
