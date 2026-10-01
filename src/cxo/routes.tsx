import { Navigate, useParams, useSearchParams, type RouteObject } from 'react-router-dom';
import AccountPage from './pages/account';
import BillingPage from './pages/billing';
import ProductSuitePage from './pages/product-suite';
import ProductsPage from './pages/products';
import ReportsPage from './pages/reports';
import TopUpPage from './pages/top-up';
import UsersPage from './pages/users';

/** Old client-portal support links (/support, /support/new, /support/MET-1048) open the shared Support tickets page. */
function SupportRedirect({ mode }: { mode: 'list' | 'new' | 'ticket' }) {
  const { key } = useParams();
  const [params] = useSearchParams();
  if (mode === 'ticket' && key) return <Navigate to={`/support/tickets?id=${encodeURIComponent(key)}`} replace />;
  if (mode === 'new') return <Navigate to={`/support/tickets?new=1${params.get('suite') ? `&suite=${params.get('suite')}` : ''}`} replace />;
  return <Navigate to="/support/tickets" replace />;
}

/** Client-portal modules, mounted as children of the Mettus Central shell. */
export const cxoRoutes: RouteObject[] = [
  { path: 'home', element: <Navigate to="/" replace /> },
  { path: 'products', element: <ProductsPage /> },
  { path: 'products/:suite', element: <ProductSuitePage /> },
  { path: 'billing', element: <BillingPage /> },
  { path: 'top-up', element: <TopUpPage /> },
  { path: 'reports', element: <ReportsPage /> },
  { path: 'users', element: <UsersPage /> },
  { path: 'account', element: <AccountPage /> },
  { path: 'support', element: <SupportRedirect mode="list" /> },
  { path: 'support/new', element: <SupportRedirect mode="new" /> },
  // Only Jira-style keys (MET-, MIE-) redirect, so /support/integrations and friends keep working.
  { path: 'support/:key', element: <KeyOrNothing /> },
];

function KeyOrNothing() {
  const { key = '' } = useParams();
  return /^(MET|MIE)-\d+$/.test(key) ? <SupportRedirect mode="ticket" /> : <Navigate to="/" replace />;
}
