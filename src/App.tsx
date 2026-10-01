import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { CxoDataProvider } from './cxo/CxoProviders';
import { adminRoutes } from './admin/routes';
import { OnboardingPage } from './onboarding/OnboardingPage';
import { cxoRoutes } from './cxo/routes';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { configRoutes } from './features/config/routes';
import { HomePage } from './features/home/HomePage';
import { mieRoutes } from './features/mie/routes';
import { monitoringRoutes } from './features/monitoring/routes';
import { supportRoutes } from './features/support/routes';
import { TicketsPage } from './tickets/TicketsPage';
import { AppShell } from './shell';

// One sign-in for all of Mettus Central. Each module contributes its routes as children of the shared shell.
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      ...supportRoutes,
      ...monitoringRoutes,
      ...mieRoutes,
      ...configRoutes,
      { path: 'support/tickets', element: <TicketsPage /> },
      { path: 'support/desk', element: <TicketsPage /> },
      ...cxoRoutes,
      ...adminRoutes,
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <CxoDataProvider>
        <RouterProvider router={router} />
      </CxoDataProvider>
    </AuthProvider>
  );
}
