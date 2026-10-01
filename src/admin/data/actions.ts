import {
  Search, UserPlus, UserX, Trash2, Mail, Building2, BookOpen,
  UserCheck, KeyRound, Settings2, UserRound, LockKeyhole, type LucideIcon,
} from 'lucide-react'
import type { Role } from './roles'

export interface AdminAction {
  key: string
  title: string
  description: string
  to: string
  icon: LucideIcon
  roles: Role[]
}

const staff: Role[] = ['super', 'clientAdmin']
const everyone: Role[] = ['super', 'clientAdmin', 'user']

export const mainActions: AdminAction[] = [
  { key: 'search', title: 'Search / Update Users', description: 'Find and edit users across institutions', to: '/admin/users/search', icon: Search, roles: staff },
  { key: 'add', title: 'Add User', description: 'Create a single new user', to: '/admin/users/add', icon: UserPlus, roles: staff },
  { key: 'deactivate', title: 'Deactivate User', description: "Remove a user's access", to: '/admin/users/deactivate', icon: UserX, roles: staff },
  { key: 'delete', title: 'Delete User', description: 'Permanently remove a user', to: '/admin/users/delete', icon: Trash2, roles: ['super'] },
  { key: 'resend', title: 'Resend Mail', description: 'Resend the welcome email', to: '/admin/users/resend-mail', icon: Mail, roles: staff },
  { key: 'institutions', title: 'Institutions', description: 'Search and manage institutions', to: '/admin/institutions', icon: Building2, roles: ['super'] },
  { key: 'profile', title: 'My Profile', description: 'View and update your contact details', to: '/admin/account/profile', icon: UserRound, roles: ['clientAdmin', 'user'] },
  { key: 'password', title: 'Change Password', description: 'Choose a new password for your account', to: '/admin/account/password', icon: LockKeyhole, roles: ['clientAdmin', 'user'] },
  { key: 'manual', title: 'User Manual', description: 'Download the PDF user guide', to: '/admin/user-manual', icon: BookOpen, roles: everyone },
]

export const secondaryActions: AdminAction[] = [
  { key: 'activate', title: 'Activate User', description: 'Restore access to a disabled account', to: '/admin/users/activate', icon: UserCheck, roles: staff },
  { key: 'reset', title: 'Reset Password', description: "Reset a user's password", to: '/admin/users/reset-password', icon: KeyRound, roles: staff },
  { key: 'dovs', title: 'DovsAdmin', description: 'Manage Dovs institution configuration', to: '/admin/dovs-admin', icon: Settings2, roles: ['super'] },
]

export interface NavItem { label: string; to: string; roles: Role[] }
export interface NavMenu { label: string; items: NavItem[] }

export const navMenus: NavMenu[] = [
  {
    label: 'Users',
    items: [
      { label: 'Search / Update Users', to: '/admin/users/search', roles: staff },
      { label: 'Add User', to: '/admin/users/add', roles: staff },
      { label: 'Deactivate User', to: '/admin/users/deactivate', roles: staff },
      { label: 'Activate User', to: '/admin/users/activate', roles: staff },
      { label: 'Delete User', to: '/admin/users/delete', roles: ['super'] },
      { label: 'Resend Mail', to: '/admin/users/resend-mail', roles: staff },
      { label: 'Reset Password', to: '/admin/users/reset-password', roles: staff },
    ],
  },
  { label: 'Institutions', items: [{ label: 'Search Institutions', to: '/admin/institutions', roles: ['super'] }] },
  { label: 'DovsAdmin', items: [{ label: 'Dovs Configuration', to: '/admin/dovs-admin', roles: ['super'] }] },
  {
    label: 'My Account',
    items: [
      { label: 'My Profile', to: '/admin/account/profile', roles: ['clientAdmin', 'user'] },
      { label: 'Change Password', to: '/admin/account/password', roles: ['clientAdmin', 'user'] },
    ],
  },
]

/** Menus (and items within them) visible to a role; empty menus are dropped. */
export function menusFor(role: Role): NavMenu[] {
  return navMenus
    .map((m) => ({ ...m, items: m.items.filter((i) => i.roles.includes(role)) }))
    .filter((m) => m.items.length > 0)
}

export const actionsFor = (list: AdminAction[], role: Role) => list.filter((a) => a.roles.includes(role))
