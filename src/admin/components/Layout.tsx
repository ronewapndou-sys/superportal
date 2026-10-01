import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useOrg } from '../../shell/OrgContext'
import { SessionProvider } from '../auth/session'
import Navbar from './Navbar'

/** Portal Admin (the XDS admin portal) inside Mettus Central: its own sub-menu, the shared shell around it. */
export default function Layout() {
  // This is XDS-only. A direct link while MIE is picked in the top bar flips it to match.
  const { org, options, setOrg } = useOrg()
  useEffect(() => {
    if (options.includes('XDS') && org !== 'XDS' && org !== 'All organisations') setOrg('XDS')
  }, [org, options, setOrg])

  return (
    <SessionProvider>
      <div className="xa">
        <Navbar />
        <Outlet />
      </div>
    </SessionProvider>
  )
}
