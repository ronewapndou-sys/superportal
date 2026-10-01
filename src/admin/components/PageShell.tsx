import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function PageShell({ title, subtitle, children }: Props) {
  return (
    <div>
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-mettus hover:text-mettus-hover">
        <ArrowLeft size={14} aria-hidden /> Administration Menu
      </Link>
      <h1>{title}</h1>
      {subtitle && <p className="mt-1 text-sharkskin">{subtitle}</p>}
      <div className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">{children}</div>
    </div>
  )
}
