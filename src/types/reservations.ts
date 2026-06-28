export type ReservationState = boolean | 'confirmed' | 'pending' | 'cancelled' | 'waitlist' | string;

export interface ReservationRow {
  idguardian: string;
  nombre: string | null;
  rut: string | null;
  correo: string | null;
  telefono: string | null;
  eventType: string;
  scheduleId: string;
  state_reserve: ReservationState;
  isCheckedIn: boolean;
  attendingDependents: ReservationDependent[] | number;
  totalSpotsConsumed: number;
  fechaHoraChile: string | null;
  checkMailDateChile: string | null;
  createdAtChile: string | null;
  checkMailDate: string | null;
  createdAt: string | null;
}

export interface ReservationDependent {
  name: string;
  rut?: string | null;
  age?: number | null;
}

export interface ScheduleReservationGuardian {
  _id: string;
  idguardian: string;
  nombre: string | null;
  rut: string | null;
  correo: string | null;
  telefono: string | null;
  state_reserve: ReservationState;
  isCheckedIn: boolean;
  checkInAtChile: string | null;
  attendingDependents: ReservationDependent[];
  totalSpotsConsumed: number;
  createdAtChile: string | null;
}

export interface ScheduleReservationsGroup {
  scheduleId: string;
  eventType: string;
  startTimeChile: string;
  totalCapacity: number;
  availableSpots: number;
  reservedSpots: number;
  checkedInSpots: number;
  reservationCount: number;
  checkInCount: number;
  reservations: ScheduleReservationGuardian[];
}

export interface ReservationFilters {
  search: string;
  state: string;
  checkIn: 'all' | 'checked' | 'pending';
  date: string;
}
