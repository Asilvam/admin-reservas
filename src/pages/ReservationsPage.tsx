import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { exportReservationsExcel } from '../services/exportExcel';
import {
  EVENT_TYPES,
  getInitialEventType,
  getReservations,
  getScheduleReservations,
  saveEventType,
  type AdminEventType,
} from '../services/adminApi';
import type {
  ReservationFilters,
  ScheduleReservationGuardian,
  ScheduleReservationsGroup,
} from '../types/reservations';

const initialFilters: ReservationFilters = {
  search: '',
  state: 'all',
  checkIn: 'all',
  date: getTodayChileDateInput(),
};
const configuredRefreshSeconds = Number(import.meta.env.VITE_AUTO_REFRESH_SECONDS ?? 60);
const AUTO_REFRESH_MS =
  Number.isFinite(configuredRefreshSeconds) && configuredRefreshSeconds > 0
    ? configuredRefreshSeconds * 1000
    : 60_000;

function getTodayChileDateInput() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCompactSearch(value: string | null | undefined) {
  return normalizeSearch(value).replace(/\s+/g, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesDate(startTimeChile: string, date: string) {
  if (!date) return true;
  const [year, month, day] = date.split('-');
  return startTimeChile.startsWith(`${day}-${month}-${year}`);
}

function dateInputFromChileDateTime(startTimeChile: string) {
  const [datePart] = startTimeChile.split(' ');
  const [day, month, year] = datePart.split('-');
  return `${year}-${month}-${day}`;
}

function dateFromChileDateTime(startTimeChile: string) {
  const [datePart, timePart = '00:00:00'] = startTimeChile.split(' ');
  const [day, month, year] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
}

function chooseDefaultDate(schedules: ScheduleReservationsGroup[], preferredDate: string) {
  if (schedules.some((schedule) => matchesDate(schedule.startTimeChile, preferredDate))) {
    return preferredDate;
  }

  const today = getTodayChileDateInput();
  const futureActiveSchedule = schedules.find((schedule) => {
    const scheduleDate = dateInputFromChileDateTime(schedule.startTimeChile);
    return scheduleDate >= today && schedule.reservationCount > 0;
  });

  if (futureActiveSchedule) {
    return dateInputFromChileDateTime(futureActiveSchedule.startTimeChile);
  }

  const futureSchedule = schedules.find((schedule) => dateInputFromChileDateTime(schedule.startTimeChile) >= today);
  return futureSchedule ? dateInputFromChileDateTime(futureSchedule.startTimeChile) : preferredDate;
}

function stateLabel(state: string) {
  if (state === 'true') return 'Activa';
  if (state === 'false') return 'Cancelada';

  const labels: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
    waitlist: 'Lista espera',
  };

  return labels[state] ?? state;
}

function isActiveReservation(reservation: ScheduleReservationGuardian) {
  return reservation.state_reserve === true || reservation.state_reserve === 'true';
}

function dependentsLabel(reservation: ScheduleReservationGuardian) {
  if (reservation.attendingDependents.length === 0) {
    return 'Sin acompanantes';
  }

  return reservation.attendingDependents
    .map((dependent) => dependent.age ? `${dependent.name} (${dependent.age})` : dependent.name)
    .join(', ');
}

export function ReservationsPage() {
  const [eventType, setEventType] = useState<AdminEventType>(() => getInitialEventType());
  const [schedules, setSchedules] = useState<ScheduleReservationsGroup[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [filters, setFilters] = useState<ReservationFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [error, setError] = useState('');

  const loadFreshSchedules = async (adjustDefaultDate = false, showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    const data = await getScheduleReservations(eventType);
    const nextDate = adjustDefaultDate ? chooseDefaultDate(data, filters.date) : filters.date;
    setSchedules(data);
    if (nextDate !== filters.date) {
      setFilters((current) => ({ ...current, date: nextDate }));
    }
    setSelectedScheduleId((current) => {
      if (current && data.some((schedule) => schedule.scheduleId === current && matchesDate(schedule.startTimeChile, nextDate))) {
        return current;
      }

      return data.find((schedule) => matchesDate(schedule.startTimeChile, nextDate))?.scheduleId || '';
    });
    if (showRefreshIndicator) {
      window.setTimeout(() => setIsRefreshing(false), 250);
    }
    return data;
  };

  const loadSchedules = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loadFreshSchedules(true);
    } catch {
      setError('No se pudieron cargar los horarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedules();
  }, [eventType]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadFreshSchedules(false, true).catch(() => setIsRefreshing(false));
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [eventType, filters.date]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleEventTypeChange = (nextEventType: AdminEventType) => {
    saveEventType(nextEventType);
    setEventType(nextEventType);
    setSelectedScheduleId('');
    setFilters(initialFilters);
  };

  const downloadDateReservations = async () => {
    setIsExporting(true);
    setError('');

    try {
      await loadFreshSchedules();
      const rows = await getReservations(eventType);
      const dateRows = rows.filter((row) => row.fechaHoraChile && matchesDate(row.fechaHoraChile, filters.date));
      exportReservationsExcel(dateRows, eventType);
    } catch {
      setError('No se pudo descargar el archivo de reservas.');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => matchesDate(schedule.startTimeChile, filters.date));
  }, [filters.date, schedules]);

  const canExportSelectedDate = useMemo(() => {
    return (
      filteredSchedules.length > 0 &&
      filteredSchedules.every((schedule) => dateFromChileDateTime(schedule.startTimeChile).getTime() <= currentTime.getTime())
    );
  }, [currentTime, filteredSchedules]);

  const selectedSchedule = useMemo(() => {
    return filteredSchedules.find((schedule) => schedule.scheduleId === selectedScheduleId) ?? filteredSchedules[0] ?? null;
  }, [filteredSchedules, selectedScheduleId]);

  const selectedReservations = useMemo(() => {
    if (!selectedSchedule) return [];

    const searchTokens = normalizeSearch(filters.search).split(/\s+/).filter(Boolean);
    const compactSearchTokens = searchTokens.map(normalizeCompactSearch);
    return selectedSchedule.reservations.filter((reservation) => {
      const searchableFields = [
        reservation.nombre,
        reservation.rut,
        reservation.correo,
        reservation.telefono,
        reservation.attendingDependents.map((dependent) => dependent.name).join(' '),
      ];
      const searchableText = normalizeSearch(searchableFields.join(' '));
      const compactSearchableText = normalizeCompactSearch(searchableFields.join(' '));
      const textMatch =
        searchTokens.length === 0 ||
        searchTokens.every((token, index) => {
          const tokenPattern = new RegExp(escapeRegExp(token), 'i');
          const compactTokenPattern = new RegExp(escapeRegExp(compactSearchTokens[index]), 'i');
          return tokenPattern.test(searchableText) || compactTokenPattern.test(compactSearchableText);
        });
      const checkInMatch =
        filters.checkIn === 'all' ||
        (filters.checkIn === 'checked' && reservation.isCheckedIn) ||
        (filters.checkIn === 'pending' && !reservation.isCheckedIn);

      const stateMatch =
        filters.state === 'all' ||
        (filters.state === 'active' && isActiveReservation(reservation)) ||
        (filters.state === 'inactive' && !isActiveReservation(reservation));

      return textMatch && checkInMatch && stateMatch;
    });
  }, [filters, selectedSchedule]);

  const selectedInactiveCount = useMemo(() => {
    if (!selectedSchedule) return 0;
    return selectedSchedule.reservations.filter((reservation) => !isActiveReservation(reservation)).length;
  }, [selectedSchedule]);

  const selectedInactiveSpots = useMemo(() => {
    if (!selectedSchedule) return 0;
    return selectedSchedule.reservations
      .filter((reservation) => !isActiveReservation(reservation))
      .reduce((sum, reservation) => sum + reservation.totalSpotsConsumed, 0);
  }, [selectedSchedule]);

  const selectedCheckInPercentage = useMemo(() => {
    if (!selectedSchedule || selectedSchedule.reservedSpots === 0) return 0;
    return Math.round((selectedSchedule.checkedInSpots / selectedSchedule.reservedSpots) * 100);
  }, [selectedSchedule]);

  const generalSummary = useMemo(() => {
    const base = filteredSchedules.reduce(
      (acc, schedule) => {
        acc.capacity += schedule.totalCapacity;
        acc.reserved += schedule.reservedSpots;
        acc.available += schedule.availableSpots;
        acc.checkIns += schedule.checkInCount;
        acc.checkedInSpots += schedule.checkedInSpots;
        acc.activeReservations += schedule.reservationCount;
        schedule.reservations.forEach((reservation) => {
          if (!isActiveReservation(reservation)) {
            acc.inactiveReservations += 1;
            acc.inactiveSpots += reservation.totalSpotsConsumed;
          }
        });
        return acc;
      },
      {
        capacity: 0,
        reserved: 0,
        available: 0,
        checkIns: 0,
        checkedInSpots: 0,
        activeReservations: 0,
        inactiveReservations: 0,
        inactiveSpots: 0,
      },
    );

    return {
      schedules: filteredSchedules.length,
      checkInPercentage: base.reserved > 0 ? Math.round((base.checkedInSpots / base.reserved) * 100) : 0,
      ...base,
    };
  }, [filteredSchedules]);

  return (
    <section className="content-section">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operacion por bloque</p>
          <h2>Horarios y check-in</h2>
        </div>
        <div className="header-actions">
          <label className="compact-label">
            Evento
            <select
              value={eventType}
              onChange={(event) => handleEventTypeChange(event.target.value as AdminEventType)}
            >
              {EVENT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option === 'selva' ? 'Selva' : 'Patines'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={isExporting || !filters.date || !canExportSelectedDate}
            title={canExportSelectedDate ? 'Descargar reservas de la fecha' : 'Disponible cuando todos los horarios de la fecha hayan concluido'}
            onClick={downloadDateReservations}
          >
            {isExporting ? 'Descargando...' : 'Descargar fecha'}
          </button>
        </div>
      </header>

      {isRefreshing ? (
        <div className="refresh-indicator" role="status" aria-live="polite">
          <span className="refresh-spinner" aria-hidden="true" />
          Actualizando check-ins...
        </div>
      ) : null}

      <div className="metrics-grid">
        <MetricCard label="Horarios" value={generalSummary.schedules} />
        <MetricCard label="Capacidad" value={generalSummary.capacity} />
        <MetricCard label="Cupos ocupados" value={generalSummary.reserved} tone="warning" />
        <MetricCard
          label={`Check-in · ${generalSummary.checkedInSpots} cupos`}
          value={`${generalSummary.checkIns} · ${generalSummary.checkInPercentage}%`}
          tone="good"
        />
      </div>

      <div className="filters-bar">
        <label>
          Buscar
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Buscar solo en el horario seleccionado"
          />
        </label>
        <label>
          Fecha
          <input
            type="date"
            value={filters.date}
            onChange={(event) => {
              setFilters({ ...filters, date: event.target.value });
              setSelectedScheduleId('');
            }}
          />
        </label>
        <label>
          Estado
          <select
            value={filters.state}
            onChange={(event) => setFilters({ ...filters, state: event.target.value })}
          >
            <option value="all">Todos</option>
            <option value="active">Vigentes</option>
            <option value="inactive">No vigentes</option>
          </select>
        </label>
        <label>
          Check-in
          <select
            value={filters.checkIn}
            onChange={(event) => setFilters({ ...filters, checkIn: event.target.value as ReservationFilters['checkIn'] })}
          >
            <option value="all">Todos</option>
            <option value="checked">Ingresados</option>
            <option value="pending">No ingresados</option>
          </select>
        </label>
      </div>

      {error ? <p className="state-message error-message">{error}</p> : null}
      {isLoading ? <p className="state-message">Cargando horarios...</p> : null}

      {!isLoading ? (
        <div className="schedule-layout">
          <aside className="schedule-list" aria-label="Horarios disponibles">
            {filteredSchedules.map((schedule) => {
              const isSelected = schedule.scheduleId === selectedSchedule?.scheduleId;

              return (
                <button
                  key={schedule.scheduleId}
                  className={`schedule-button ${isSelected ? 'schedule-button-active' : ''}`}
                  type="button"
                  onClick={() => setSelectedScheduleId(schedule.scheduleId)}
                >
                  <strong>{schedule.startTimeChile}</strong>
                </button>
              );
            })}
            {filteredSchedules.length === 0 ? <p className="empty-message">Sin horarios para la fecha seleccionada.</p> : null}
          </aside>

          <div className="schedule-detail">
            {selectedSchedule ? (
              <>
                <div className="schedule-detail-header">
                  <div>
                    <p className="eyebrow">Horario seleccionado</p>
                    <h3>{selectedSchedule.startTimeChile}</h3>
                  </div>
                  <div className="schedule-badges">
                    <span className="schedule-badge">
                      <b>{selectedSchedule.reservationCount} reservas vigentes</b>
                      <small>{selectedSchedule.reservedSpots} cupos</small>
                    </span>
                    <span className="schedule-badge">
                      <b>{selectedInactiveCount} no vigentes</b>
                      <small>{selectedInactiveSpots} cupos</small>
                    </span>
                    <span className="schedule-badge">{selectedSchedule.availableSpots <= 0 ? 'Agotado' : `${selectedSchedule.availableSpots} libres`}</span>
                    <span className="schedule-badge">
                      <b>{selectedSchedule.checkInCount} check-in · {selectedCheckInPercentage}%</b>
                      <small>{selectedSchedule.checkedInSpots} cupos</small>
                    </span>
                  </div>
                </div>

                <div className="guardian-list">
                  {selectedReservations.map((reservation) => {
                    const active = isActiveReservation(reservation);

                    return (
                    <article className={`guardian-card ${active ? '' : 'guardian-card-inactive'}`} key={reservation._id}>
                      <div className="guardian-main">
                        <div>
                          <span className={`status-pill status-${String(reservation.state_reserve)}`}>
                            {active ? 'Vigente' : stateLabel(String(reservation.state_reserve))}
                          </span>
                          <h4>{reservation.nombre ?? 'Guardian sin datos'}</h4>
                          <p>{reservation.rut ?? 'Sin RUT'} · {reservation.telefono ?? 'Sin telefono'}</p>
                          <p>{reservation.correo ?? 'Sin correo'}</p>
                        </div>
                        <div className={`checkin-box ${reservation.isCheckedIn ? 'checkin-done' : 'checkin-pending'}`}>
                          <strong>{reservation.isCheckedIn ? 'Con check-in' : 'Sin check-in'}</strong>
                          <span>{reservation.checkInAtChile ?? `${reservation.totalSpotsConsumed} cupos`}</span>
                        </div>
                      </div>
                      <div className="dependents-row">
                        <strong>Acompanantes</strong>
                        <span>{dependentsLabel(reservation)}</span>
                      </div>
                    </article>
                    );
                  })}
                  {selectedReservations.length === 0 ? <p className="empty-message">Sin reservas para los filtros actuales.</p> : null}
                </div>
              </>
            ) : (
              <p className="empty-message">Selecciona un horario para ver guardianes y acompanantes.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
