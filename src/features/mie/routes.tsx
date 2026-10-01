import type { RouteObject } from 'react-router-dom';
import { MieServicesPage } from './MieServicesPage';

/** MIE Fingerprint Zone: screening check status, FPZ bookings and fingerprint-taking training. */
export const mieRoutes: RouteObject[] = [{ path: 'mie/fingerprint-zone', element: <MieServicesPage /> }];
