import { Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useSession } from '../auth/session'
import type { Role } from '../data/roles'
import PageShell from './PageShell'

/** Route guard. Client-side only, so it hides pages in the prototype but is not real security. */
export default function RequireRole({ roles }: { roles: Role[] }) {
  const { session } = useSession()
  if (roles.includes(session.role)) return <Outlet />
  return (
    <PageShell title="Access denied">
      <div className="flex items-start gap-3 text-sharkskin">
        <ShieldAlert size={20} aria-hidden className="mt-0.5 shrink-0 text-danger" />
        <p>Your access level ({session.accessLevel}) doesn’t include this page. Contact your administrator if you need access.</p>
      </div>
    </PageShell>
  )
}
