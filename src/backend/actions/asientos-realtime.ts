'use server';

import { prisma } from '../db';
import { broadcastSeatUpdate, broadcastTripOccupancy, EstadoAsientoRealtime } from '../lib/realtime';
import { getSession } from '../lib/session';

export type { EstadoAsientoRealtime };

// Estructura de Asiento en tiempo real
export interface AsientoRealtimeItem {
  idAsiento: number;
  numero: string;
  estado: EstadoAsientoRealtime;
  esMio?: boolean;
  expiraEn?: string | null;
}

// Estructura de bloqueo temporal en memoria con TTL (10 minutos)
interface SeatLockRecord {
  idViaje: number;
  idAsiento: number;
  numeroAsiento: string;
  idUsuario?: number | null;
  expiraEn: number; // timestamp ms
}

// Almacenamiento en memoria para bloqueos temporales concurrentes
const temporaryLocks = new Map<string, SeatLockRecord>();

function getLockKey(idViaje: number, idAsiento: number): string {
  return `${idViaje}_${idAsiento}`;
}

// Limpieza automática de bloqueos expirados
function purgeExpiredLocks() {
  const now = Date.now();
  for (const [key, lock] of temporaryLocks.entries()) {
    if (lock.expiraEn <= now) {
      temporaryLocks.delete(key);
      // Notificamos liberación por websocket
      broadcastSeatUpdate({
        idViaje: lock.idViaje,
        idAsiento: lock.idAsiento,
        numeroAsiento: lock.numeroAsiento,
        estado: 'DISPONIBLE',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Consulta la matriz de asientos de un viaje con su estado de ocupación en tiempo real.
 */
export async function getAsientosViajeRealtimeAction(
  idViaje: number,
  idUsuarioActual?: number
): Promise<{ success: boolean; data: AsientoRealtimeItem[]; error?: string }> {
  try {
    purgeExpiredLocks();

    const session = await getSession();
    const effectiveUserId = idUsuarioActual ?? session?.idUsuario ?? undefined;

    const viaje = await prisma.viaje.findUnique({
      where: { idViaje },
      include: {
        despacho: {
          include: {
            asignacionUnidad: {
              include: {
                unidad: {
                  include: {
                    asientos: {
                      orderBy: { idAsiento: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
        boletos: {
          where: {
            estado: { in: ['PAGADO', 'ABORDADO', 'RESERVADO'] },
          },
          include: {
            asiento: true,
          },
        },
      },
    });

    if (!viaje) {
      return { success: false, error: 'El viaje no existe en el sistema.', data: [] };
    }

    // Obtenemos los asientos de la unidad asignada o generamos plantilla de 20 asientos
    let asientosBase = viaje.despacho?.asignacionUnidad?.unidad?.asientos || [];
    if (asientosBase.length === 0) {
      // Si la unidad aún no tiene asientos sembrados, usamos una plantilla estándar de 20 asientos
      asientosBase = Array.from({ length: 20 }, (_, i) => ({
        idAsiento: i + 1,
        idUnidad: 0,
        numero: `${i + 1}`,
        estado: 'DISPONIBLE' as any,
      }));
    }

    // Mapa de boletos vendidos
    const boletosOcupadosMap = new Map<number, string>();
    for (const b of viaje.boletos) {
      boletosOcupadosMap.set(b.idAsiento, b.estado);
    }

    const now = Date.now();

    const resultado: AsientoRealtimeItem[] = asientosBase.map((asiento) => {
      const lockKey = getLockKey(idViaje, asiento.idAsiento);
      const lock = temporaryLocks.get(lockKey);
      const isLocked = lock && lock.expiraEn > now;

      const boletoEstado = boletosOcupadosMap.get(asiento.idAsiento);

      let estado: EstadoAsientoRealtime = 'DISPONIBLE';
      let esMio = false;
      let expiraEn: string | null = null;

      if (boletoEstado === 'PAGADO' || boletoEstado === 'ABORDADO') {
        estado = 'OCUPADO';
      } else if (boletoEstado === 'RESERVADO') {
        estado = 'RESERVADO';
      } else if (isLocked) {
        estado = 'BLOQUEADO';
        esMio = effectiveUserId != null && lock.idUsuario === effectiveUserId;
        expiraEn = new Date(lock.expiraEn).toISOString();
      }

      return {
        idAsiento: asiento.idAsiento,
        numero: asiento.numero,
        estado,
        esMio,
        expiraEn,
      };
    });

    return { success: true, data: resultado };
  } catch (error) {
    console.error('Error al obtener asientos en tiempo real:', error);
    return { success: false, error: 'No se pudieron consultar los asientos.', data: [] };
  }
}

/**
 * Bloquea temporalmente un asiento durante 10 minutos (TTL) mientras el pasajero completa el checkout.
 * Emite inmediatamente un evento WebSocket (seat:updated -> BLOQUEADO).
 */
export async function bloquearAsientoTemporalAction(data: {
  idViaje: number;
  idAsiento: number;
  numeroAsiento: string;
  idUsuario?: number | null;
  nombreUsuario?: string | null;
}): Promise<{ success: boolean; expiraEn?: string; error?: string }> {
  try {
    const { idViaje, idAsiento, numeroAsiento, idUsuario, nombreUsuario } = data;
    purgeExpiredLocks();

    const session = await getSession();
    const effectiveUserId = idUsuario ?? session?.idUsuario ?? null;
    const effectiveUserName = nombreUsuario ?? session?.nombre ?? null;

    const lockKey = getLockKey(idViaje, idAsiento);
    const existingLock = temporaryLocks.get(lockKey);
    const now = Date.now();

    // Verificamos si ya está bloqueado por otro usuario
    if (existingLock && existingLock.expiraEn > now) {
      if (effectiveUserId && existingLock.idUsuario === effectiveUserId) {
        // Mismo usuario: renovamos los 10 minutos
        existingLock.expiraEn = now + 10 * 60 * 1000;
        return { success: true, expiraEn: new Date(existingLock.expiraEn).toISOString() };
      }
      return { success: false, error: 'Este asiento acaba de ser seleccionado por otro pasajero.' };
    }

    // Verificamos si ya está comprado en la base de datos
    const boletoExistente = await prisma.boleto.findFirst({
      where: {
        idViaje,
        idAsiento,
        estado: { in: ['PAGADO', 'ABORDADO'] },
      },
    });

    if (boletoExistente) {
      return { success: false, error: 'El asiento seleccionado ya está ocupado.' };
    }

    // Registramos el bloqueo temporal (10 minutos)
    const expiraEnMs = now + 10 * 60 * 1000;
    const expiraEnIso = new Date(expiraEnMs).toISOString();

    temporaryLocks.set(lockKey, {
      idViaje,
      idAsiento,
      numeroAsiento,
      idUsuario: effectiveUserId,
      expiraEn: expiraEnMs,
    });

    // 🚀 EMISIÓN WEBSOCKET GLOBAL VÍA PUSHER
    await broadcastSeatUpdate({
      idViaje,
      idAsiento,
      numeroAsiento,
      estado: 'BLOQUEADO',
      idUsuario: effectiveUserId,
      nombreUsuario: effectiveUserName,
      expiraEn: expiraEnIso,
      timestamp: new Date().toISOString(),
    });

    return { success: true, expiraEn: expiraEnIso };
  } catch (error) {
    console.error('Error al bloquear asiento temporal:', error);
    return { success: false, error: 'No se pudo reservar el asiento temporalmente.' };
  }
}

/**
 * Libera un asiento bloqueado si el usuario lo deselecciona o cancela la compra.
 * Emite inmediatamente un evento WebSocket (seat:updated -> DISPONIBLE).
 */
export async function liberarAsientoTemporalAction(data: {
  idViaje: number;
  idAsiento: number;
  numeroAsiento: string;
  idUsuario?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { idViaje, idAsiento, numeroAsiento, idUsuario } = data;
    const session = await getSession();
    const effectiveUserId = idUsuario ?? session?.idUsuario ?? null;

    const lockKey = getLockKey(idViaje, idAsiento);
    const existingLock = temporaryLocks.get(lockKey);

    if (existingLock) {
      if (effectiveUserId && existingLock.idUsuario && existingLock.idUsuario !== effectiveUserId) {
        return { success: false, error: 'No tienes permisos para liberar este asiento.' };
      }
      temporaryLocks.delete(lockKey);
    }

    // 🚀 EMISIÓN WEBSOCKET GLOBAL VÍA PUSHER
    await broadcastSeatUpdate({
      idViaje,
      idAsiento,
      numeroAsiento,
      estado: 'DISPONIBLE',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error al liberar asiento temporal:', error);
    return { success: false, error: 'No se pudo liberar el asiento.' };
  }
}

/**
 * Notifica que la compra fue completada exitosamente y el asiento ahora está OCUPADO.
 * Emite inmediatamente un evento WebSocket (seat:updated -> OCUPADO).
 */
export async function notificarCompraAsientoRealtimeAction(data: {
  idViaje: number;
  idAsiento: number;
  numeroAsiento: string;
}) {
  try {
    const { idViaje, idAsiento, numeroAsiento } = data;
    const lockKey = getLockKey(idViaje, idAsiento);
    temporaryLocks.delete(lockKey);

    // 🚀 EMISIÓN WEBSOCKET GLOBAL VÍA PUSHER
    await broadcastSeatUpdate({
      idViaje,
      idAsiento,
      numeroAsiento,
      estado: 'OCUPADO',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error al notificar compra de asiento por realtime:', error);
    return { success: false };
  }
}
