import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import PageShell from '../components/PageShell'
import { institutions } from '../data/mock'

export default function DovsAdminPage() {
  const [saved, setSaved] = useState(false)
  return (
    <PageShell title="DovsAdmin" subtitle="Manage Dovs institution configuration">
      <form onSubmit={(e) => { e.preventDefault(); setSaved(true) }} className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <div>
          <label className="xa-label" htmlFor="inst">Institution</label>
          <select id="inst" className="xa-input">{institutions.map((i) => <option key={i.code}>{i.name}</option>)}</select>
        </div>
        <div><label className="xa-label" htmlFor="dovs">Dovs institution code</label><input id="dovs" className="xa-input" defaultValue="DOVS-001" /></div>
        <div><label className="xa-label" htmlFor="limit">Daily verification limit</label><input id="limit" type="number" className="xa-input" defaultValue={500} /></div>
        <div className="flex items-end gap-2 pb-2.5">
          <input id="enabled" type="checkbox" defaultChecked className="h-4 w-4 accent-mettus" />
          <label htmlFor="enabled" className="text-[13px] font-medium">Dovs enabled</label>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="xa-btn-primary">Save configuration</button>
          {saved && <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success"><CheckCircle2 size={16} aria-hidden /> Saved (mock — nothing was saved)</span>}
        </div>
      </form>
    </PageShell>
  )
}
