import type { ReservationRow, ScheduleReservationsGroup } from '../types/reservations';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3500';
const DEFAULT_EVENT_TYPE = import.meta.env.VITE_ADMIN_EVENT_TYPE ?? 'selva';
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD ?? 'selva-admin';
export const EVENT_TYPES = ['selva', 'patines'] as const;
export type AdminEventType = typeof EVENT_TYPES[number];

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getInitialEventType(): AdminEventType {
  const stored = localStorage.getItem('adminEventType');
  if (stored === 'selva' || stored === 'patines') return stored;
  if (DEFAULT_EVENT_TYPE === 'patines') return 'patines';
  return 'selva';
}

export function saveEventType(eventType: AdminEventType) {
  localStorage.setItem('adminEventType', eventType);
}

export async function loginAdmin(password: string): Promise<string> {
  if (password.trim() !== DEMO_PASSWORD.trim()) {
    throw new Error('Clave incorrecta');
  }

  return `local-admin-token-${Date.now()}`;
}

export async function getReservations(eventType: AdminEventType = getInitialEventType()): Promise<ReservationRow[]> {
  return request<ReservationRow[]>(`/admin/reservations?eventType=${encodeURIComponent(eventType)}`);
}

export async function getScheduleReservations(eventType: AdminEventType = getInitialEventType()): Promise<ScheduleReservationsGroup[]> {
  return request<ScheduleReservationsGroup[]>(`/admin/schedule-reservations?eventType=${encodeURIComponent(eventType)}`);
}
