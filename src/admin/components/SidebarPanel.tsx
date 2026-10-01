import { useSession } from '../auth/session'
import { actionsFor, secondaryActions } from '../data/actions'
import ActionCard from './ActionCard'

export default function SidebarPanel() {
  const { session } = useSession()
  const items = actionsFor(secondaryActions, session.role)
  if (items.length === 0) return null
  return (
    <aside aria-labelledby="more-actions" className="rounded-hero border border-line bg-subtle p-4 sm:p-5">
      <h2 id="more-actions" className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-sharkskin">
        Additional actions
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((a) => (
          <ActionCard key={a.key} action={a} variant="muted" />
        ))}
      </div>
    </aside>
  )
}
