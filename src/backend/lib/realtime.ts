import Pusher from 'pusher';

// Singleton del servidor Pusher
let pusherServerInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (pusherServerInstance) return pusherServerInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

  if (!appId || !key || !secret) {
    return null;
  }

  pusherServerInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherServerInstance;
}

export type EstadoAsientoRealtime = 'DISPONIBLE' | 'BLOQUEADO' | 'RESERVADO' | 'OCUPADO';

export interface SeatRealtimeEvent {
  idViaje: number;
  idAsiento: number;
  numeroAsiento: string;
  estado: EstadoAsientoRealtime;
  idUsuario?: number | null;
  nombreUsuario?: string | null;
  expiraEn?: string | null; // ISO timestamp para bloqueo con TTL (10 min)
  timestamp: string;
}

export interface OccupancyRealtimeEvent {
  idViaje: number;
  totalAsientos: number;
  boletosVendidos: number;
  bloqueados: number;
  porcentaje: number;
  timestamp: string;
}

/**
 * Emite una actualización en tiempo real del estado de un asiento específico vía WebSocket.
 * Canal: trip-{idViaje}
 * Evento: seat:updated
 */
export async function broadcastSeatUpdate(payload: SeatRealtimeEvent): Promise<boolean> {
  try {
    const pusher = getPusherServer();
    if (!pusher) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Realtime Mock - trip-${payload.idViaje}] seat:updated ->`, payload);
      }
      return false;
    }

    const channel = `trip-${payload.idViaje}`;
    await pusher.trigger(channel, 'seat:updated', payload);
    return true;
  } catch (err) {
    console.error('Error al emitir actualización de asiento por WebSocket:', err);
    return false;
  }
}

/**
 * Emite una actualización en lote de varios asientos.
 */
export async function broadcastSeatsBatch(idViaje: number, seats: SeatRealtimeEvent[]): Promise<boolean> {
  try {
    const pusher = getPusherServer();
    if (!pusher) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Realtime Mock - trip-${idViaje}] seats:batch ->`, seats.length, 'asientos');
      }
      return false;
    }

    const channel = `trip-${idViaje}`;
    await pusher.trigger(channel, 'seats:batch', { idViaje, seats });
    return true;
  } catch (err) {
    console.error('Error al emitir lote de asientos por WebSocket:', err);
    return false;
  }
}

/**
 * Emite el porcentaje y conteo de ocupación global del viaje en tiempo real.
 */
export async function broadcastTripOccupancy(payload: OccupancyRealtimeEvent): Promise<boolean> {
  try {
    const pusher = getPusherServer();
    if (!pusher) return false;

    const channel = `trip-${payload.idViaje}`;
    await pusher.trigger(channel, 'trip:occupancy', payload);
    return true;
  } catch (err) {
    console.error('Error al emitir ocupación global por WebSocket:', err);
    return false;
  }
}
