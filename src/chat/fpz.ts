import type { PillTone } from '../ui';

/** MIE Fingerprint Zone: where candidates go to have fingerprints captured for a criminal record check. */
export type FpzBranch = { id: string; name: string; address: string; hours: string };

export const FPZ_BRANCHES: FpzBranch[] = [
  { id: 'jhb', name: 'Johannesburg, Sandton', address: '11 Alice Lane, Sandton, 2196', hours: 'Mon to Fri, 08:00 to 16:00' },
  { id: 'pta', name: 'Pretoria, Hatfield', address: '1122 Burnett Street, Hatfield, 0083', hours: 'Mon to Fri, 08:00 to 16:00' },
  { id: 'cpt', name: 'Cape Town, City Bowl', address: '2 Long Street, Cape Town, 8001', hours: 'Mon to Fri, 08:00 to 16:00' },
  { id: 'dbn', name: 'Durban, Umhlanga', address: '1 Richefond Circle, Umhlanga, 4319', hours: 'Mon to Fri, 08:00 to 16:00' },
  { id: 'pe', name: 'Gqeberha, Newton Park', address: '45 Cape Road, Newton Park, 6045', hours: 'Mon to Fri, 08:00 to 16:00' },
];

export const FPZ_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];

export type FpzBookingStatus = 'booked' | 'completed' | 'cancelled';

export type FpzBooking = {
  id: string;
  candidateName: string;
  idNumber?: string;
  branchId: string;
  /** yyyy-mm-dd */
  date: string;
  time: string;
  bookedBy: string;
  status: FpzBookingStatus;
  createdAt: number;
};

export type NewFpzBooking = { candidateName: string; idNumber?: string; branchId: string; date: string; time: string };

export const FPZ_STATUS_LABEL: Record<FpzBookingStatus, string> = { booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled' };
export const FPZ_STATUS_TONE: Record<FpzBookingStatus, PillTone> = { booked: 'amber', completed: 'green', cancelled: 'red' };

/** Earliest a slot can be booked: tomorrow, so there's time to notify the branch. */
export const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const formatFpzDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
