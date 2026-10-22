import Pusher from 'pusher-js';

// Instancia singleton de Pusher en el cliente
let pusherClientInstance: Pusher | null = null;

export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') {
    return null; // No ejecutar en SSR
  }

  if (pusherClientInstance) {
    return pusherClientInstance;
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

  if (!key) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[PusherClient] NEXT_PUBLIC_PUSHER_KEY no configurada. Las suscripciones en tiempo real funcionarán en modo local pasivo.'
      );
    }
    return null;
  }

  pusherClientInstance = new Pusher(key, {
    cluster,
    forceTLS: true,
  });

  return pusherClientInstance;
}

export interface SeatRealtimeClientEvent {
  idViaje: number;
  idAsiento: number;
  numeroAsiento: string;
  estado: 'DISPONIBLE' | 'BLOQUEADO' | 'RESERVADO' | 'OCUPADO';
  idUsuario?: number | null;
  nombreUsuario?: string | null;
  expiraEn?: string | null;
  timestamp: string;
}

export interface OccupancyRealtimeClientEvent {
  idViaje: number;
  totalAsientos: number;
  boletosVendidos: number;
  bloqueados: number;
  porcentaje: number;
  timestamp: string;
}
