import { Link } from 'react-router-dom'
import type { AdminAction } from '../data/actions'

interface Props {
  action: AdminAction
  variant?: 'primary' | 'muted'
}

export default function ActionCard({ action, variant = 'primary' }: Props) {
  const { icon: Icon, title, description, to } = action
  const muted = variant === 'muted'
  return (
    <Link
      to={to}
      className={`group flex items-start gap-4 rounded-card border p-5 transition duration-200 ease-mettus hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mettus ${
        muted ? 'border-line bg-subtle/60 shadow-none' : 'border-line bg-surface shadow-card'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl ${
          muted ? 'bg-surface text-sharkskin' : 'bg-mettus/10 text-mettus'
        }`}
      >
        <Icon size={22} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className={`block font-semibold tracking-[-0.3px] ${muted ? 'text-[15px] text-sharkskin' : 'text-[17px] text-ink'}`}>
          {title}
        </span>
        <span className={`mt-0.5 block text-[13px] leading-normal ${muted ? 'text-sharkskin/80' : 'text-sharkskin'}`}>
          {description}
        </span>
      </span>
    </Link>
  )
}
