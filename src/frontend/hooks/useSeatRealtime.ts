'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAsientosViajeRealtimeAction,
  bloquearAsientoTemporalAction,
  liberarAsientoTemporalAction,
  AsientoRealtimeItem,
  EstadoAsientoRealtime,
} from '@/backend/actions/asientos-realtime';
import {
  getPusherClient,
  SeatRealtimeClientEvent,
  OccupancyRealtimeClientEvent,
} from '../lib/pusherClient';

interface UseSeatRealtimeProps {
  idViaje: number;
  idUsuarioActual?: number;
  nombreUsuarioActual?: string;
}

export interface UseSeatRealtimeReturn {
  seats: AsientoRealtimeItem[];
  selectedSeats: AsientoRealtimeItem[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  occupancy: OccupancyRealtimeClientEvent | null;
  timeRemainingSeconds: number | null;
  toggleSelectSeat: (seat: AsientoRealtimeItem) => Promise<{ success: boolean; error?: string }>;
  releaseMyLocks: () => Promise<void>;
  refreshSeats: () => Promise<void>;
}

export function useSeatRealtime({
  idViaje,
  idUsuarioActual,
  nombreUsuarioActual,
}: UseSeatRealtimeProps): UseSeatRealtimeReturn {
  const [seats, setSeats] = useState<AsientoRealtimeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyRealtimeClientEvent | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  // Referencia a asientos propios para liberarlos en cleanup si se requiere
  const myLockedSeatsRef = useRef<number[]>([]);

  // 1. Cargar estado inicial de los asientos desde el servidor
  const loadInitialSeats = useCallback(async () => {
    if (!idViaje) return;
    setIsLoading(true);
    try {
      const res = await getAsientosViajeRealtimeAction(idViaje, idUsuarioActual);
      if (res.success && res.data) {
        setSeats(res.data);
        const myIds = res.data.filter((s) => s.esMio).map((s) => s.idAsiento);
        myLockedSeatsRef.current = myIds;
        setError(null);
      } else {
        setError(res.error || 'No se pudieron cargar los asientos');
      }
    } catch (err: any) {
      console.error('Error al cargar asientos iniciales:', err);
      setError('Error de conexión al cargar los asientos');
    } finally {
      setIsLoading(false);
    }
  }, [idViaje, idUsuarioActual]);

  useEffect(() => {
    loadInitialSeats();
  }, [loadInitialSeats]);

  // 2. Suscripción en tiempo real vía Pusher WebSocket
  useEffect(() => {
    if (!idViaje) return;

    const pusher = getPusherClient();
    if (!pusher) {
      // Si no hay Pusher configurado en el entorno, simulamos estado conectado pasivo
      setIsConnected(false);
      return;
    }

    const channelName = `trip-${idViaje}`;
    const channel = pusher.subscribe(channelName);

    // Estado de la conexión
    const updateConnectionStatus = () => {
      const state = pusher.connection.state;
      setIsConnected(state === 'connected');
    };

    updateConnectionStatus();
    pusher.connection.bind('state_change', updateConnectionStatus);

    // Evento de asiento individual actualizado
    const handleSeatUpdated = (event: SeatRealtimeClientEvent) => {
      if (event.idViaje !== idViaje) return;

      setSeats((prevSeats) => {
        const index = prevSeats.findIndex((s) => s.idAsiento === event.idAsiento);
        const isMine =
          idUsuarioActual != null && event.idUsuario != null && event.idUsuario === idUsuarioActual;

        const updatedItem: AsientoRealtimeItem = {
          idAsiento: event.idAsiento,
          numero: event.numeroAsiento,
          estado: event.estado,
          esMio: event.estado === 'BLOQUEADO' ? isMine : false,
          expiraEn: event.expiraEn,
        };

        if (index >= 0) {
          const next = [...prevSeats];
          next[index] = updatedItem;
          return next;
        } else {
          return [...prevSeats, updatedItem];
        }
      });
    };

    // Evento de asientos en lote
    const handleSeatsBatch = (data: { idViaje: number; seats: SeatRealtimeClientEvent[] }) => {
      if (data.idViaje !== idViaje || !Array.isArray(data.seats)) return;

      setSeats((prevSeats) => {
        const next = [...prevSeats];
        for (const item of data.seats) {
          const idx = next.findIndex((s) => s.idAsiento === item.idAsiento);
          const isMine =
            idUsuarioActual != null && item.idUsuario != null && item.idUsuario === idUsuarioActual;
          const updated: AsientoRealtimeItem = {
            idAsiento: item.idAsiento,
            numero: item.numeroAsiento,
            estado: item.estado,
            esMio: item.estado === 'BLOQUEADO' ? isMine : false,
            expiraEn: item.expiraEn,
          };
          if (idx >= 0) {
            next[idx] = updated;
          } else {
            next.push(updated);
          }
        }
        return next;
      });
    };

    // Evento de ocupación global
    const handleTripOccupancy = (data: OccupancyRealtimeClientEvent) => {
      if (data.idViaje === idViaje) {
        setOccupancy(data);
      }
    };

    channel.bind('seat:updated', handleSeatUpdated);
    channel.bind('seats:batch', handleSeatsBatch);
    channel.bind('trip:occupancy', handleTripOccupancy);

    return () => {
      channel.unbind('seat:updated', handleSeatUpdated);
      channel.unbind('seats:batch', handleSeatsBatch);
      channel.unbind('trip:occupancy', handleTripOccupancy);
      pusher.unsubscribe(channelName);
      pusher.connection.unbind('state_change', updateConnectionStatus);
    };
  }, [idViaje, idUsuarioActual]);

  // 3. Temporizador de cuenta regresiva para el TTL (10 minutos)
  useEffect(() => {
    const mySeatsWithExp = seats.filter((s) => s.esMio && s.expiraEn);
    if (mySeatsWithExp.length === 0) {
      setTimeRemainingSeconds(null);
      return;
    }

    // Tomamos la expiración más cercana
    const expTimestamps = mySeatsWithExp
      .map((s) => (s.expiraEn ? new Date(s.expiraEn).getTime() : 0))
      .filter((t) => t > 0);

    if (expTimestamps.length === 0) {
      setTimeRemainingSeconds(null);
      return;
    }

    const minExp = Math.min(...expTimestamps);

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((minExp - Date.now()) / 1000));
      setTimeRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        // Refrescar al expirar
        loadInitialSeats();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [seats, loadInitialSeats]);

  // Asientos actualmente seleccionados por este usuario
  const selectedSeats = seats.filter((s) => s.esMio && s.estado === 'BLOQUEADO');

  // Actualizar ref
  useEffect(() => {
    myLockedSeatsRef.current = selectedSeats.map((s) => s.idAsiento);
  }, [selectedSeats]);

  // 4. Alternar selección y bloqueo de un asiento
  const toggleSelectSeat = async (seat: AsientoRealtimeItem): Promise<{ success: boolean; error?: string }> => {
    // Si ya es mío y está bloqueado -> Deseleccionar / Liberar
    if (seat.esMio && seat.estado === 'BLOQUEADO') {
      // Optimista
      setSeats((prev) =>
        prev.map((s) =>
          s.idAsiento === seat.idAsiento
            ? { ...s, estado: 'DISPONIBLE', esMio: false, expiraEn: null }
            : s
        )
      );

      const res = await liberarAsientoTemporalAction({
        idViaje,
        idAsiento: seat.idAsiento,
        numeroAsiento: seat.numero,
        idUsuario: idUsuarioActual,
      });

      if (!res.success) {
        await loadInitialSeats(); // Revertir si falló
        return { success: false, error: res.error };
      }
      return { success: true };
    }

    // Si está ocupado o bloqueado por otro usuario -> No permitir
    if (seat.estado === 'OCUPADO' || seat.estado === 'RESERVADO') {
      return { success: false, error: 'Este asiento ya se encuentra vendido.' };
    }

    if (seat.estado === 'BLOQUEADO' && !seat.esMio) {
      return { success: false, error: 'Asiento en proceso de compra por otro usuario en tiempo real.' };
    }

    // Si está disponible -> Bloquear temporalmente para este usuario
    const res = await bloquearAsientoTemporalAction({
      idViaje,
      idAsiento: seat.idAsiento,
      numeroAsiento: seat.numero,
      idUsuario: idUsuarioActual,
      nombreUsuario: nombreUsuarioActual,
    });

    if (res.success) {
      setSeats((prev) =>
        prev.map((s) =>
          s.idAsiento === seat.idAsiento
            ? {
                ...s,
                estado: 'BLOQUEADO',
                esMio: true,
                expiraEn: res.expiraEn,
              }
            : s
        )
      );
      return { success: true };
    } else {
      // Actualizar vista para mostrar que otro usuario lo tomó
      await loadInitialSeats();
      return { success: false, error: res.error || 'No se pudo reservar el asiento.' };
    }
  };

  // 5. Liberar todos los asientos bloqueados por este usuario
  const releaseMyLocks = async () => {
    const seatIds = [...myLockedSeatsRef.current];
    if (seatIds.length === 0) return;

    for (const idAsiento of seatIds) {
      const seat = seats.find((s) => s.idAsiento === idAsiento);
      await liberarAsientoTemporalAction({
        idViaje,
        idAsiento,
        numeroAsiento: seat ? seat.numero : `${idAsiento}`,
        idUsuario: idUsuarioActual,
      });
    }
  };

  return {
    seats,
    selectedSeats,
    isConnected,
    isLoading,
    error,
    occupancy,
    timeRemainingSeconds,
    toggleSelectSeat,
    releaseMyLocks,
    refreshSeats: loadInitialSeats,
  };
}
