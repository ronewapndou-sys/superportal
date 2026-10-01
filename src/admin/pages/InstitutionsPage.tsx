import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import PageShell from '../components/PageShell'
import StatusBadge from '../components/StatusBadge'
import { institutions } from '../data/mock'

export default function InstitutionsPage() {
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return institutions.filter((i) => !s || i.name.toLowerCase().includes(s) || i.code.toLowerCase().includes(s))
  }, [q])
  return (
    <PageShell title="Institutions" subtitle="Search and manage institutions">
      <div className="relative mb-5 max-w-md">
        <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
        <input className="xa-input pl-10" placeholder="Search by name or code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search institutions" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.5px] text-sharkskin">
              {['Code', 'Institution', 'Users', 'Status', 'Contact'].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.code} className="border-b border-line/70 last:border-0">
                <td className="px-3 py-3 font-semibold">{i.code}</td>
                <td className="px-3 py-3">{i.name}</td>
                <td className="px-3 py-3">{i.users}</td>
                <td className="px-3 py-3"><StatusBadge status={i.status} /></td>
                <td className="px-3 py-3 text-sharkskin">{i.contact}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sharkskin">No institutions found.</td></tr>}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
