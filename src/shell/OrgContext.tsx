import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useBusiness } from '@/lib/business';
import { useAuth } from '../auth/AuthContext';
import { syncBusiness } from '../cxo/CxoProviders';
import type { Organisation } from './navConfig';

const KEY = 'mettus-org';

type OrgApi = { org: Organisation; setOrg: (org: Organisation) => void; options: Organisation[] };

const OrgContext = createContext<OrgApi>({ org: 'XDS', setOrg: () => {}, options: ['XDS'] });

/** The company picked in the top bar, limited to the ones on the signed-in account. Read it with useOrg(). */
export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const orgs: Organisation[] = user?.orgs ?? ['XDS'];
  const options: Organisation[] = orgs.length > 1 ? [...orgs, 'All organisations'] : orgs;
  // remembered between visits; the portal's XDS / MIE business follows it, so the top bar and the pages always agree
  const [org, setOrgState] = useState<Organisation>(() => {
    try {
      const saved = localStorage.getItem(KEY) as Organisation | null;
      if (saved && options.includes(saved)) return saved;
    } catch { /* storage blocked */ }
    return options[0];
  });
  const setOrg = (next: Organisation) => {
    setOrgState(next);
    try { localStorage.setItem(KEY, next); } catch { /* the choice lasts for this visit */ }
  };
  useEffect(() => syncBusiness(org), [org]);

  // a page can change the business on its own (opening an MIE product while on XDS); the top bar follows it
  const business = useBusiness();
  const lastBusiness = useRef(business);
  useEffect(() => {
    if (lastBusiness.current === business) return;
    lastBusiness.current = business;
    const want: Organisation = business === 'mie' ? 'MIE' : 'XDS';
    if (org !== 'All organisations' && org !== want && options.includes(want)) setOrg(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);
  return <OrgContext.Provider value={{ org, setOrg, options }}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  return useContext(OrgContext);
}
