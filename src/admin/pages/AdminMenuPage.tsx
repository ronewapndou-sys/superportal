import { useSession } from '../auth/session'
import { actionsFor, mainActions } from '../data/actions'
import ActionCard from '../components/ActionCard'
import InfoBar from '../components/InfoBar'
import MetricTiles from '../components/MetricTiles'
import RecentActivity from '../components/RecentActivity'
import SidebarPanel from '../components/SidebarPanel'
import WelcomeHero from '../components/WelcomeHero'

export default function AdminMenuPage() {
  const { session } = useSession()
  const isUser = session.role === 'user'
  const actions = actionsFor(mainActions, session.role)
  return (
    <div>
      <h1 className="mb-4">{isUser ? 'My Account' : 'Administration Menu'}</h1>
      <InfoBar />
      <div className="mt-6 space-y-6">
        <WelcomeHero />
        {!isUser && <MetricTiles />}
      </div>
      <div className={`mt-8 grid gap-6 ${isUser ? '' : 'lg:grid-cols-[minmax(0,1fr)_20rem]'}`}>
        <section aria-label="Primary actions" className={`grid content-start gap-4 sm:grid-cols-2 ${isUser ? 'lg:grid-cols-3' : ''}`}>
          {actions.map((a) => (
            <ActionCard key={a.key} action={a} />
          ))}
        </section>
        {!isUser && (
          <div className="space-y-6">
            <SidebarPanel />
            <RecentActivity />
          </div>
        )}
      </div>
    </div>
  )
}
