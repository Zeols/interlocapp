/**
 * Utilidad Canónica de Fechas y Zona Horaria para InterlocApp (RutaCorp)
 * Zona horaria oficial: America/Managua (UTC-6)
 */

export const MANAGUA_TIMEZONE = 'America/Managua';

/**
 * Obtiene la fecha y hora actual garantizando la zona horaria de Nicaragua (America/Managua).
 */
export function getNowInManagua(): Date {
  const now = new Date();
  // Convierte el timestamp UTC al equivalente en string de America/Managua y crea Date
  const managuaString = now.toLocaleString('en-US', { timeZone: MANAGUA_TIMEZONE });
  return new Date(managuaString);
}

/**
 * Formatea una fecha u hora a formato legible de Nicaragua.
 * Ej: "29 oct 2026, 08:30 am"
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
 * Formatea solo la hora en formato 12h (con am/pm) para Managua.
 * Ej: "07:45 am"
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
 * Formatea solo la fecha (día, mes, año).
 * Ej: "29 de octubre de 2026" o "29/10/2026"
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
 * Retorna la fecha actual en formato ISO 'YYYY-MM-DD' bajo la zona de Managua.
 * Ideal para filtros de queries y campos tipo input date.
 */
export function getManaguaDateISO(dateInput: Date | string | number = new Date()): string {
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

