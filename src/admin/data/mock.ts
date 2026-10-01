export type UserStatus = 'Active' | 'Disabled'

export interface MockUser {
  id: number
  username: string
  name: string
  email: string
  institution: string
  status: UserStatus
  lastLogin: string
}

const seedUsers: MockUser[] = [
  { id: 1001, username: 'SetjhabaT', name: 'Thabo Setjhaba', email: 'thabo.setjhaba@xds.co.za', institution: 'XDS', status: 'Active', lastLogin: '2026-09-29 08:14' },
  { id: 1002, username: 'NkosiA', name: 'Ayanda Nkosi', email: 'ayanda.nkosi@xds.co.za', institution: 'XDS', status: 'Active', lastLogin: '2026-09-28 16:40' },
  { id: 1003, username: 'MokoenaT', name: 'Thandi Mokoena', email: 'thandi@absa.example', institution: 'ABSA', status: 'Active', lastLogin: '2026-09-25 11:02' },
  { id: 1004, username: 'MokoenaP', name: 'Palesa Mokoena', email: 'palesa@harborfinance.example', institution: 'Harbor Finance', status: 'Disabled', lastLogin: '2026-07-03 09:30' },
  { id: 1005, username: 'NaidooR', name: 'Reshen Naidoo', email: 'reshen@summitcredit.example', institution: 'Summit Credit', status: 'Active', lastLogin: '2026-09-30 07:55' },
  { id: 1006, username: 'DlaminiS', name: 'Sipho Dlamini', email: 'sipho@harborfinance.example', institution: 'Harbor Finance', status: 'Disabled', lastLogin: '2026-05-19 14:21' },
]

const firstNames = ['Thabo','Ayanda','Lize','Palesa','Reshen','Sipho','Nomsa','Johan','Zanele','Pieter','Lerato','Kagiso','Fatima','Bongani','Megan','Themba','Naledi','Andile','Sarah','Kabelo','Thandi','Riaan','Precious','Mpho','Ashley','Sibusiso','Anele','Dineo','Werner','Yusuf']
const lastNames = ['Nkosi','Dlamini','Naidoo','Mokoena','van der Merwe','Khumalo','Pillay','Botha','Mahlangu','Sithole','Jacobs','Molefe','Ndlovu','Smith','Zulu','Venter','Mthembu','Govender','Maseko','Cele','Peters','Radebe','Nel','Tshabalala','Ferreira']
const instMix: [string, number][] = [['XDS', 1050], ['ABSA', 110], ['Summit Credit', 60], ['Harbor Finance', 40], ['Lakeside Microfinance', 18]]

function generateUsers(): MockUser[] {
  const out: MockUser[] = []
  const seen = new Set(seedUsers.map((u) => u.username.toLowerCase()))
  const pool = instMix.flatMap(([name, n]) => Array<string>(n).fill(name))
  let seed = 7
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
  for (let i = 0; i < pool.length; i++) {
    const first = firstNames[Math.floor(rnd() * firstNames.length)]
    const last = lastNames[Math.floor(rnd() * lastNames.length)]
    const inst = pool[Math.floor(rnd() * pool.length)]
    const domain = inst === 'XDS' ? 'xds.co.za' : inst.toLowerCase().replace(/\s.*/, '') + '.example'
    const day = 1 + Math.floor(rnd() * 28)
    const month = 6 + Math.floor(rnd() * 4)
    const base = `${last.replace(/\s/g, '')}${first[0]}`
    let username = base
    for (let n = 2; seen.has(username.toLowerCase()); n++) username = `${base}${n}`
    seen.add(username.toLowerCase())
    out.push({
      id: 2000 + i,
      username,
      name: `${first} ${last}`,
      email: `${first}.${last.replace(/\s/g, '')}${i % 5 === 0 ? i % 89 : ''}@${domain}`.toLowerCase(),
      institution: inst,
      status: rnd() < 0.013 ? 'Disabled' : 'Active',
      lastLogin: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(7 + Math.floor(rnd() * 11)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`,
    })
  }
  return out
}

export const users: MockUser[] = [...seedUsers, ...generateUsers()]

export interface MockInstitution {
  code: string
  name: string
  users: number
  status: 'Active' | 'Suspended'
  contact: string
}

const baseInstitutions: MockInstitution[] = [
  { code: 'XDS', name: 'XDS', users: 42, status: 'Active', contact: 'support@xds.co.za' },
  { code: 'ABSA', name: 'ABSA', users: 118, status: 'Active', contact: 'admin@absa.example' },
  { code: 'HARB', name: 'Harbor Finance', users: 27, status: 'Active', contact: 'it@harborfinance.example' },
  { code: 'SUMC', name: 'Summit Credit', users: 64, status: 'Active', contact: 'ops@summitcredit.example' },
  { code: 'LAKE', name: 'Lakeside Microfinance', users: 9, status: 'Suspended', contact: 'office@lakeside.example' },
]

export const institutions: MockInstitution[] = baseInstitutions.map((i) => ({
  ...i,
  users: users.filter((u) => u.institution === i.name).length,
}))

export interface Activity {
  id: number
  action: string
  target: string
  by: string
  when: string
  institution: string
  tone: 'success' | 'warning' | 'danger' | 'info'
}

export const recentActivity: Activity[] = [
  { id: 1, action: 'User added', target: 'NaidooR · Summit Credit', by: 'Daniel Mahlangu', when: '09:12', institution: 'Summit Credit', tone: 'success' },
  { id: 2, action: 'Password reset', target: 'MokoenaT · ABSA', by: 'NkosiA', when: '08:47', institution: 'ABSA', tone: 'info' },
  { id: 3, action: 'User deactivated', target: 'MokoenaP · Harbor Finance', by: 'Daniel Mahlangu', when: 'Yesterday', institution: 'Harbor Finance', tone: 'warning' },
  { id: 4, action: 'User added', target: 'NdlovuS · ABSA', by: 'MokoenaT', when: 'Yesterday', institution: 'ABSA', tone: 'success' },
  { id: 5, action: 'User deleted', target: 'TestUser9 · Lakeside', by: 'NkosiA', when: 'Yesterday', institution: 'Lakeside Microfinance', tone: 'danger' },
  { id: 6, action: 'Welcome mail resent', target: 'DlaminiS · Harbor Finance', by: 'Daniel Mahlangu', when: 'Mon', institution: 'Harbor Finance', tone: 'info' },
  { id: 7, action: 'User deactivated', target: 'PetersA · ABSA', by: 'MokoenaT', when: 'Mon', institution: 'ABSA', tone: 'warning' },
]

export interface SystemUserDetails {
  subscriberName: string
  email: string
  username: string
  role: 'Admin' | 'User' | 'Read Only'
  firstName: string
  surname: string
  idNo: string
  jobPosition: string
  cellularCode: string
  cellularNo: string
  active: 'Yes' | 'No'
  overrideDeactivate: 'Yes' | 'No'
  stayAlive: string
  createdBy: string
  createdOn: string
  changedBy: string
  changedOn: string
}

/** Builds the full "system user" record for the review dialog from a list row (mock values). */
export function systemUserDetails(u: MockUser): SystemUserDetails {
  const [firstName, ...rest] = u.name.split(' ')
  const created = new Date(2022, 0, 1 + ((u.id * 37) % 900))
  const changed = new Date(2025, 8, 1 + (u.id % 28))
  const us = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
  return {
    subscriberName: u.institution === 'XDS' ? 'XDS Operations' : u.institution,
    email: u.email,
    username: u.username,
    role: u.id % 11 === 0 ? 'Admin' : u.id % 13 === 0 ? 'Read Only' : 'User',
    firstName,
    surname: rest.join(' '),
    idNo: '',
    jobPosition: '',
    cellularCode: '',
    cellularNo: '',
    active: u.status === 'Active' ? 'Yes' : 'No',
    overrideDeactivate: 'No',
    stayAlive: '180',
    createdBy: 'L_manana',
    createdOn: us(created),
    changedBy: 'Jdaniesl_xds',
    changedOn: us(changed),
  }
}

export interface WebService {
  key: string
  name: string
  detail: string
}

// Placeholder list of downstream systems a user record is pushed to.
export const webServices: WebService[] = [
  { key: 'dia', name: 'DIA Web Service', detail: 'User profile and access level' },
  { key: 'mie', name: 'MIE Upload Portal', detail: 'Manager login and role' },
  { key: 'dovs', name: 'Dovs', detail: 'Institution user configuration' },
]
