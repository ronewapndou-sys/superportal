import type { RouteObject } from 'react-router-dom';
import { ConfigurationPage } from './ConfigurationPage';

/** Organisation-wide configuration: report field exclusions, alert channels, sign-in defaults. */
export const configRoutes: RouteObject[] = [{ path: 'configuration', element: <ConfigurationPage /> }];
