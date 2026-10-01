import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { Role } from '../data/roles'
import { institutions, users, type MockInstitution, type MockUser } from '../data/mock'

export interface Session {
  role: Role
  user: string
  firstName: string
  surname: string
  username: string
  institution: string
  email: string
  cellularCode: string
  cellularNo: string
  accessLevel: string
}

// Mock sessions only — there is no real authentication in this prototype.
const sessions: Record<Role, Session> = {
  super: {
    role: 'super', user: 'Ziyaad Raymond', firstName: 'Ziyaad', surname: 'Raymond', username: 'RaymondZ',
    institution: 'XDS', email: 'ziyaad.raymond@xds.co.za', cellularCode: '+27', cellularNo: '825550114', accessLevel: 'Super User (All Sub)',
  },
  clientAdmin: {
    role: 'clientAdmin', user: 'Thandi Mokoena', firstName: 'Thandi', surname: 'Mokoena', username: 'MokoenaT',
    institution: 'ABSA', email: 'thandi@absa.example', cellularCode: '+27', cellularNo: '821234567',
    accessLevel: 'Institution Admin',
  },
  user: {
    role: 'user', user: 'Sipho Ndlovu', firstName: 'Sipho', surname: 'Ndlovu', username: 'NdlovuS',
    institution: 'ABSA', email: 'sipho@absa.example', cellularCode: '+27', cellularNo: '739876543',
    accessLevel: 'Standard User',
  },
}

interface Ctx {
  session: Session
  setRole: (r: Role) => void
  /** users this session may see: everyone for XDS staff, otherwise their own institution only */
  scopedUsers: MockUser[]
  scopedInstitutions: MockInstitution[]
  isInternal: boolean
}

const SessionContext = createContext<Ctx | null>(null)
/** The admin portal role follows the Mettus Central account: Mettus staff are XDS super users. */
function roleFor(accountId: string | undefined): Role {
  if (accountId === 'xds-ops') return 'super'
  return 'clientAdmin'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const role = roleFor(user?.id)
  // Kept for compatibility. The role comes from sign-in and is not switched here.
  const setRole = useCallback((_r: Role) => {}, [])

  const value = useMemo<Ctx>(() => {
    const session = sessions[role]
    const internal = role === 'super'
    return {
      session,
      setRole,
      isInternal: internal,
      scopedUsers: internal ? users : users.filter((u) => u.institution === session.institution),
      scopedInstitutions: internal ? institutions : institutions.filter((i) => i.name === session.institution),
    }
  }, [role, setRole])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
