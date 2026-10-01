import type { RouteObject } from 'react-router-dom';
import { ClientMonitoringPage } from './ClientMonitoringPage';
import { PlatformHealthPage } from './PlatformHealthPage';

/** Monitoring: the client view of their own connections, and the company-wide Mettus platform view. */
export const monitoringRoutes: RouteObject[] = [
  { path: 'monitoring', element: <ClientMonitoringPage /> },
  { path: 'monitoring/platform', element: <PlatformHealthPage /> },
];
