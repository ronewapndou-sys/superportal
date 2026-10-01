import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import PageShell from '../components/PageShell'
import { useSession } from '../auth/session'

export default function AddUserPage() {
  const { scopedInstitutions, isInternal } = useSession()
  const [done, setDone] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setDone(true)
  }
  return (
    <PageShell title="Add User" subtitle="Create a single new user">
      <form onSubmit={submit} className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <div><label className="xa-label" htmlFor="first">First name</label><input id="first" className="xa-input" required /></div>
        <div><label className="xa-label" htmlFor="last">Last name</label><input id="last" className="xa-input" required /></div>
        <div><label className="xa-label" htmlFor="username">Username</label><input id="username" className="xa-input" required /></div>
        <div><label className="xa-label" htmlFor="email">Email</label><input id="email" type="email" className="xa-input" required /></div>
        <div>
          <label className="xa-label" htmlFor="inst">Institution</label>
          <select id="inst" className="xa-input" disabled={!isInternal}>{scopedInstitutions.map((i) => <option key={i.code}>{i.name}</option>)}</select>
        </div>
        <div>
          <label className="xa-label" htmlFor="level">Access level</label>
          <select id="level" className="xa-input"><option>Standard User</option><option>Institution Admin</option>{isInternal && <option>Super User (All Sub)</option>}</select>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="xa-btn-primary">Create user</button>
          <button type="reset" className="xa-btn-default" onClick={() => setDone(false)}>Clear</button>
          {done && (
            <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
              <CheckCircle2 size={16} aria-hidden /> User created (mock — nothing was saved)
            </span>
          )}
        </div>
      </form>
    </PageShell>
  )
}
