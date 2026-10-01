import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { useSession } from '../auth/session'
import { helpTopics } from '../data/help'

export default function HelpPanel({ onClose }: { onClose: () => void }) {
  const { session, isInternal } = useSession()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const topics = useMemo(() => {
    const s = q.trim().toLowerCase()
    return helpTopics.filter((t) => t.roles.includes(session.role)).filter((t) => !s || [t.question, ...t.steps].some((x) => x.toLowerCase().includes(s)))
  }, [q, session.role])

  return (
    <div className="fixed inset-0 z-[60] bg-navy/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface text-ink shadow-modal"
      >
        <header className="flex items-center justify-between bg-navy px-5 py-3.5 text-white">
          <h2 id="help-title" className="text-[18px] font-semibold tracking-[-0.3px]">Help</h2>
          <button type="button" onClick={onClose} aria-label="Close help" className="rounded-badge p-1.5 hover:bg-white/15">
            <X size={18} />
          </button>
        </header>
        <div className="border-b border-line p-4">
          <div className="relative">
            <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
            <input ref={input} className="xa-input pl-10" placeholder="Search help, e.g. password" aria-label="Search help" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {topics.length === 0 && <p className="py-8 text-center text-[13px] text-sharkskin">No help topics match “{q}”.</p>}
          <ul className="space-y-2">
            {topics.map((t) => {
              const isOpen = open === t.id || q.trim() !== ''
              return (
                <li key={t.id} className="rounded-card border border-line">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(open === t.id ? null : t.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[14px] font-semibold"
                  >
                    {t.question}
                    <ChevronDown size={16} aria-hidden className={`shrink-0 text-sharkskin transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line/70 px-4 pb-4 pt-3">
                      <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-sharkskin">
                        {[...t.steps, ...(isInternal ? (t.staffSteps ?? []) : [])].map((s) => <li key={s}>{s}</li>)}
                      </ol>
                      <Link to={t.to} onClick={onClose} className="xa-btn-primary mt-3 px-3 py-2">{t.cta}</Link>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </div>
  )
}
