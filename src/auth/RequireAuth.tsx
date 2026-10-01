import { Navigate, useLocation } from 'react-router-dom';
import { NAV, findNav } from '../shell/navConfig';
import { useAuth } from './AuthContext';

/** Sends signed-out visitors to /login, then back to where they were going. Blocks services the account can't use. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, can } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  const nav = findNav(location.pathname);
  if (nav && !can(nav.item.service)) {
    // Land on the first page this account can use (an invited supplier only has Onboarding), not a page it can't.
    const fallback = NAV.flatMap((s) => s.items).find((i) => i.path && can(i.service) && !i.staffOnly)?.path ?? NAV.flatMap((s) => s.items).find((i) => i.path && can(i.service))?.path;
    if (!fallback || fallback === location.pathname) return <Navigate to="/login" replace />;
    return <Navigate to={fallback} replace state={{ denied: nav.item.label }} />;
  }

  return <>{children}</>;
}
