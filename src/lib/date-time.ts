/**
 * Utilidad Canónica de Fechas y Zona Horaria para InterlocApp (RutaCorp)
 * Zona horaria oficial: America/Managua (UTC-6, sin horario de verano)
 */

export const MANAGUA_TIMEZONE = 'America/Managua';
export const MANAGUA_OFFSET = '-06:00';

/**
 * Retorna el instante actual (Date en JS almacena siempre epoch UTC universal).
 * Nota: Anteriormente se re-parseaba toLocaleString('en-US', { timeZone: 'America/Managua' }),
 * lo cual en servidores Linux/Docker en UTC desplazaba el epoch -6 horas adicionales.
 */
export function getNowInManagua(): Date {
  return new Date();
}

/**
 * Retorna la fecha en formato ISO 'YYYY-MM-DD' bajo la zona horaria de Managua.
 * Ideal para filtros de queries y campos tipo <input type="date">.
 */
export function getManaguaDateISO(dateInput: Date | string | number = new Date()): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANAGUA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Formato YYYY-MM-DD
}

/**
 * Retorna la hora en formato 24h 'HH:mm' bajo la zona horaria de Managua.
 * Ideal para inicializar campos <input type="time">.
 */
export function getManaguaTimeHHMM(dateInput: Date | string | number = new Date()): string {
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '07:00';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MANAGUA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const hh = parts.find((p) => p.type === 'hour')?.value || '07';
  const mm = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hh === '24' ? '00' : hh}:${mm}`;
}

/**
 * Obtiene la hora numérica (0-23) en la zona horaria de Managua,
 * independientemente de si el servidor corre en UTC (Railway) o local.
 */
export function getManaguaHour(dateInput: Date | string | number): number {
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return 6;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MANAGUA_TIMEZONE,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const hh = parseInt(parts.find((p) => p.type === 'hour')?.value || '6', 10);
  return hh === 24 ? 0 : hh;
}

/**
 * Retorna el inicio del día (00:00:00.000) en hora de Managua (-06:00) como objeto Date UTC.
 */
export function getManaguaStartOfDay(dateISO?: string): Date {
  const iso = dateISO && /^\d{4}-\d{2}-\d{2}$/.test(dateISO.trim())
    ? dateISO.trim()
    : getManaguaDateISO();
  return new Date(`${iso}T00:00:00.000${MANAGUA_OFFSET}`);
}

/**
 * Retorna el fin del día (23:59:59.999) en hora de Managua (-06:00) como objeto Date UTC.
 */
export function getManaguaEndOfDay(dateISO?: string): Date {
  const iso = dateISO && /^\d{4}-\d{2}-\d{2}$/.test(dateISO.trim())
    ? dateISO.trim()
    : getManaguaDateISO();
  return new Date(`${iso}T23:59:59.999${MANAGUA_OFFSET}`);
}

/**
 * Convierte una fecha 'YYYY-MM-DD' (o Date/ISO) a Date en medianoche UTC ('YYYY-MM-DDT00:00:00.000Z')
 * para almacenar y consultar correctamente columnas PostgreSQL @db.Date sin desfases de día.
 */
export function parseDateOnlyUTC(dateInput: Date | string): Date {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return new Date(`${match[1]}T00:00:00.000Z`);
    }
  }
  const iso = getManaguaDateISO(dateInput);
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * Parsea una fecha/hora programada garantizando que se interprete en hora de Nicaragua (-06:00).
 * Soporta tanto ('2026-11-06', '07:00') como strings ISO ('2026-11-06T07:00:00.000-06:00' o '2026-11-06T07:00').
 */
export function parseManaguaDateTime(fechaOrIso: string | Date, horaHHMM?: string): Date {
  if (fechaOrIso instanceof Date) {
    return fechaOrIso;
  }
  const raw = fechaOrIso.trim();

  if (horaHHMM) {
    const cleanDate = raw.slice(0, 10);
    const cleanTime = horaHHMM.trim().slice(0, 5);
    return new Date(`${cleanDate}T${cleanTime}:00.000${MANAGUA_OFFSET}`);
  }

  // Si ya trae offset explícito (-06:00, +00:00, etc.), respetarlo
  if (/[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw);
  }

  // Si viene como 'YYYY-MM-DDTHH:mm(:ss)' sin zona o con 'Z' accidental desde input local
  const localMatch = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/);
  if (localMatch) {
    const [, ymd, hm, sec] = localMatch;
    return new Date(`${ymd}T${hm}:${sec || '00'}.000${MANAGUA_OFFSET}`);
  }

  return new Date(raw);
}

/**
 * Formatea una columna @db.Date (o string YYYY-MM-DD) sin cambiarla de día por el offset UTC-6.
 * Ej: "06 nov 2026"
 */
export function formatDateOnlyEsNI(
  dateInput: Date | string | null | undefined,
  formatStyle: 'short' | 'medium' = 'medium'
): string {
  if (!dateInput) return '--';
  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const d = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
      return new Intl.DateTimeFormat('es-NI', {
        timeZone: 'UTC',
        day: '2-digit',
        month: formatStyle === 'short' ? '2-digit' : 'short',
        year: 'numeric',
      }).format(d);
    }
  }
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '--';

  return new Intl.DateTimeFormat('es-NI', {
    timeZone: 'UTC',
    day: '2-digit',
    month: formatStyle === 'short' ? '2-digit' : 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Formatea una fecha u hora a formato legible de Nicaragua.
 * Ej: "29 oct 2026, 08:30 a. m."
 */
export function formatManaguaDateTime(
  dateInput: Date | string | number | null | undefined,
  includeSeconds = false
): string {
  if (!dateInput) return '--:--';
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '--:--';

  return new Intl.DateTimeFormat('es-NI', {
    timeZone: MANAGUA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).format(d);
}

/**
 * Formatea solo la hora en formato 12h (con a. m. / p. m.) para Managua.
 * Ej: "07:45 a. m."
 */
export function formatManaguaTime(
  dateInput: Date | string | number | null | undefined,
  includeSeconds = false
): string {
  if (!dateInput) return '--:--';
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '--:--';

  return new Intl.DateTimeFormat('es-NI', {
    timeZone: MANAGUA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).format(d);
}

/**
 * Formatea solo la fecha (día, mes, año) en zona horaria de Managua.
 */
export function formatManaguaDate(
  dateInput: Date | string | number | null | undefined,
  formatStyle: 'short' | 'long' = 'short'
): string {
  if (!dateInput) return '--/--/----';
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '--/--/----';

  if (formatStyle === 'long') {
    return new Intl.DateTimeFormat('es-NI', {
      timeZone: MANAGUA_TIMEZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat('es-NI', {
    timeZone: MANAGUA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Calcula la diferencia en minutos entre dos marcas de tiempo (real vs programado).
 * Positivo indica retraso, negativo indica adelanto.
 */
export function calculateDelayMinutes(
  scheduled: Date | string | number,
  actual: Date | string | number = new Date()
): number {
  const dScheduled = typeof scheduled === 'object' ? scheduled : new Date(scheduled);
  const dActual = typeof actual === 'object' ? actual : new Date(actual);

  const diffMs = dActual.getTime() - dScheduled.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Evalúa si una diferencia de tiempo califica como retraso relevante (> tolerancia).
 */
export function getPunctualityStatus(diffMinutes: number, toleranceMinutes = 5): {
  status: 'A_TIEMPO' | 'ADELANTADO' | 'RETRASADO';
  label: string;
  className: string;
} {
  if (diffMinutes > toleranceMinutes) {
    return {
      status: 'RETRASADO',
      label: `Retraso de ${diffMinutes} min`,
      className: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  }
  if (diffMinutes < -toleranceMinutes) {
    return {
      status: 'ADELANTADO',
      label: `Adelantado ${Math.abs(diffMinutes)} min`,
      className: 'text-sky-700 bg-sky-50 border-sky-200',
    };
  }
  return {
    status: 'A_TIEMPO',
    label: 'A tiempo',
    className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
}
