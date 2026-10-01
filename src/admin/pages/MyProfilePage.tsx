import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import PageShell from '../components/PageShell'
import { useSession } from '../auth/session'

export default function MyProfilePage() {
  const { session } = useSession()
  const [form, setForm] = useState({
    firstName: session.firstName,
    surname: session.surname,
    email: session.email,
    cellularCode: session.cellularCode,
    cellularNo: session.cellularNo,
  })
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof form, v: string) => { setForm({ ...form, [k]: v }); setSaved(false) }
  const submit = (e: FormEvent) => { e.preventDefault(); setSaved(true) }

  return (
    <PageShell title="My Profile" subtitle="View and update your contact details">
      <form onSubmit={submit} className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <div><span className="xa-label">Username</span><div className="py-2.5 text-[14px]">{session.username}</div></div>
        <div><span className="xa-label">Institution</span><div className="py-2.5 text-[14px]">{session.institution}</div></div>
        <div><span className="xa-label">Access level</span><div className="py-2.5 text-[14px]">{session.accessLevel}</div></div>
        <div className="hidden sm:block" />
        <div><label className="xa-label" htmlFor="p-first">First name *</label><input id="p-first" className="xa-input" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
        <div><label className="xa-label" htmlFor="p-last">Surname *</label><input id="p-last" className="xa-input" required value={form.surname} onChange={(e) => set('surname', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="xa-label" htmlFor="p-email">Email address *</label><input id="p-email" type="email" className="xa-input" required value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div><label className="xa-label" htmlFor="p-code">Cellular code</label><input id="p-code" className="xa-input" value={form.cellularCode} onChange={(e) => set('cellularCode', e.target.value)} /></div>
        <div><label className="xa-label" htmlFor="p-cell">Cellular number</label><input id="p-cell" inputMode="tel" className="xa-input" value={form.cellularNo} onChange={(e) => set('cellularNo', e.target.value)} /></div>
        <p className="text-[12px] text-sharkskin sm:col-span-2">Your username, institution and access level can only be changed by an administrator.</p>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="xa-btn-primary">Save changes</button>
          {saved && <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success"><CheckCircle2 size={16} aria-hidden /> Saved (mock — nothing was saved)</span>}
        </div>
      </form>
    </PageShell>
  )
}
