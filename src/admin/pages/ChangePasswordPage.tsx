import { useState, type FormEvent } from 'react'
import { CheckCircle2, Check, Circle } from 'lucide-react'
import PageShell from '../components/PageShell'

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  const rules = [
    { label: 'At least 8 characters', ok: next.length >= 8 },
    { label: 'An uppercase and a lowercase letter', ok: /[a-z]/.test(next) && /[A-Z]/.test(next) },
    { label: 'A number', ok: /\d/.test(next) },
  ]
  const mismatch = confirm.length > 0 && confirm !== next
  const valid = current.length > 0 && rules.every((r) => r.ok) && next === confirm

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setDone(true)
    setCurrent(''); setNext(''); setConfirm('')
  }

  return (
    <PageShell title="Change Password" subtitle="Choose a new password for your account">
      <form onSubmit={submit} className="max-w-md space-y-5">
        <div><label className="xa-label" htmlFor="pw-current">Current password</label><input id="pw-current" type="password" autoComplete="current-password" className="xa-input" value={current} onChange={(e) => { setCurrent(e.target.value); setDone(false) }} /></div>
        <div>
          <label className="xa-label" htmlFor="pw-new">New password</label>
          <input id="pw-new" type="password" autoComplete="new-password" className="xa-input" value={next} onChange={(e) => { setNext(e.target.value); setDone(false) }} />
          <ul className="mt-2 space-y-1">
            {rules.map((r) => (
              <li key={r.label} className={`flex items-center gap-1.5 text-[12px] ${r.ok ? 'text-success' : 'text-sharkskin'}`}>
                {r.ok ? <Check size={13} aria-hidden /> : <Circle size={13} aria-hidden />} {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="xa-label" htmlFor="pw-confirm">Confirm new password</label>
          <input id="pw-confirm" type="password" autoComplete="new-password" aria-invalid={mismatch} className="xa-input" value={confirm} onChange={(e) => { setConfirm(e.target.value); setDone(false) }} />
          {mismatch && <p role="alert" className="mt-1.5 text-[12px] font-semibold text-danger">Passwords do not match.</p>}
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="xa-btn-primary disabled:opacity-50" disabled={!valid}>Update password</button>
          {done && <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success"><CheckCircle2 size={16} aria-hidden /> Password updated (mock — nothing was saved)</span>}
        </div>
      </form>
    </PageShell>
  )
}
