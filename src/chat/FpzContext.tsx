import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { FpzBooking, NewFpzBooking } from './fpz';

/**
 * FPZ (Fingerprint Zone) bookings made through the assistant. Demo only: stored in this browser's
 * localStorage, the same way support tickets are (see src/tickets/TicketsContext.tsx).
 */

const KEY = 'mettus-central-fpz-bookings';
let seq = 10231;
const nextReference = () => `FPZ-${seq++}`;

function load(): FpzBooking[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FpzBooking[]) : [];
  } catch {
    return [];
  }
}

type FpzApi = {
  bookings: FpzBooking[];
  createBooking: (b: NewFpzBooking) => FpzBooking;
};

const FpzContext = createContext<FpzApi | null>(null);

export function FpzProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<FpzBooking[]>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(bookings)); } catch { /* storage unavailable */ }
  }, [bookings]);

  const createBooking = useCallback((b: NewFpzBooking) => {
    const created: FpzBooking = { id: nextReference(), ...b, bookedBy: user?.name ?? 'Client user', status: 'booked', createdAt: Date.now() };
    setBookings((s) => [created, ...s]);
    return created;
  }, [user]);

  return <FpzContext.Provider value={{ bookings, createBooking }}>{children}</FpzContext.Provider>;
}

export function useFpz() {
  const ctx = useContext(FpzContext);
  if (!ctx) throw new Error('useFpz must be used inside <FpzProvider>');
  return ctx;
}
