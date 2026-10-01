import type { RouteObject } from 'react-router-dom';
import { ActivityPage } from './activity/ActivityPage';
import { ApiPage } from './api/ApiPage';
import { IntegrationsPage } from './integrations/IntegrationsPage';

/** Routes for the Support module. Mount these as children of <AppShell /> when combining modules. */
export const supportRoutes: RouteObject[] = [
  { path: 'support/integrations', element: <IntegrationsPage /> },
  { path: 'support/api', element: <ApiPage /> },
  { path: 'support/activity', element: <ActivityPage /> },
];
