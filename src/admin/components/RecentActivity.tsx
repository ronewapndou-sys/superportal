import { useSession } from '../auth/session'
import { recentActivity, type Activity } from '../data/mock'

const dot: Record<Activity['tone'], string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-mettus',
}

export default function RecentActivity() {
  const { session, isInternal } = useSession()
  const items = isInternal ? recentActivity : recentActivity.filter((a) => a.institution === session.institution)
  return (
    <section aria-labelledby="recent" className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 id="recent" className="mb-4 text-[20px] font-semibold tracking-[-0.3px]">Recent activity</h2>
      <ul className="space-y-4">
        {items.length === 0 && <li className="text-[13px] text-sharkskin">No recent activity.</li>}
        {items.map((a) => (
          <li key={a.id} className="flex gap-3">
            <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot[a.tone]}`} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">{a.action}</div>
              <div className="truncate text-[13px] text-sharkskin">{a.target}</div>
              <div className="text-[11px] text-steel">by {a.by}</div>
            </div>
            <time className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.5px] text-steel">{a.when}</time>
          </li>
        ))}
      </ul>
    </section>
  )
}
