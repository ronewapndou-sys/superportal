import { useSession } from '../auth/session'

export default function InfoBar() {
  const { session } = useSession()
  const fields = [
    ['Institution', session.institution],
    ['User', session.user],
    ['Access level', session.accessLevel],
  ]
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 rounded-card border border-line bg-surface px-5 py-3.5 shadow-card">
      {fields.map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-2">
          <dt className="text-[13px] font-semibold text-ink">{k}:</dt>
          <dd className="text-[13px] text-sharkskin">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
