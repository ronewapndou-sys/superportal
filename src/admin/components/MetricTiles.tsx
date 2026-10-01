import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useSession } from '../auth/session'

type Trend = 'up' | 'down' | 'flat'
interface Metric { label: string; value: string; delta: string; trend: Trend }

const trendStyle: Record<Trend, { cls: string; Icon: typeof Minus }> = {
  up: { cls: 'text-success', Icon: ArrowUpRight },
  down: { cls: 'text-danger', Icon: ArrowDownRight },
  flat: { cls: 'text-sharkskin', Icon: Minus },
}

const fmt = (n: number) => n.toLocaleString('en-US')

export default function MetricTiles() {
  const { scopedUsers, scopedInstitutions, isInternal } = useSession()
  const disabled = scopedUsers.filter((u) => u.status === 'Disabled').length
  const metrics: Metric[] = isInternal
    ? [
        { label: 'Total users', value: fmt(scopedUsers.length), delta: '+12 this week', trend: 'up' },
        { label: 'Institutions', value: String(scopedInstitutions.length), delta: '+1 this month', trend: 'up' },
        { label: 'Disabled accounts', value: fmt(disabled), delta: '-3 this week', trend: 'down' },
        { label: 'Pending welcome emails', value: '4', delta: 'No change', trend: 'flat' },
      ]
    : [
        { label: 'Your users', value: fmt(scopedUsers.length), delta: '+2 this month', trend: 'up' },
        { label: 'Active users', value: fmt(scopedUsers.length - disabled), delta: 'No change', trend: 'flat' },
        { label: 'Disabled accounts', value: fmt(disabled), delta: 'No change', trend: 'flat' },
        { label: 'Pending welcome emails', value: '1', delta: 'Needs attention', trend: 'flat' },
      ]
  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((m) => {
        const { cls, Icon } = trendStyle[m.trend]
        return (
          <div key={m.label} className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-sharkskin">{m.label}</div>
            <div className="mt-1 text-[30px] font-bold leading-tight text-ink [font-feature-settings:'tnum']">{m.value}</div>
            <div className={`mt-1 flex items-center gap-1 text-[12px] font-semibold ${cls}`}>
              <Icon size={14} aria-hidden /> {m.delta}
            </div>
          </div>
        )
      })}
    </section>
  )
}
