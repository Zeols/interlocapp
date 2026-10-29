"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiMapMarker,
  mdiClockOutline,
  mdiShieldCheck,
  mdiCheckCircleOutline,
  mdiMinus,
  mdiPlus,
  mdiEmailOutline,
  mdiWifi,
  mdiLockOutline,
  mdiTimerOutline,
  mdiAlertCircleOutline,
  mdiBagSuitcase,
} from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { useSeatRealtime } from "@/frontend/hooks/useSeatRealtime";
import { AsientoRealtimeItem } from "@/backend/actions/asientos-realtime";
import { procesarVentaBoletos } from "@/backend/actions/ventas";

interface VentaConfirmadaItem {
  idBoleto: number;
  codigoBoleto: string;
  idAsiento: number;
  monto: number;
}

interface VentaConfirmada {
  idVenta: number;
  idViaje: number;
  total: number;
  boletos: VentaConfirmadaItem[];
}

function PurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Identificador de viaje (desde URL o por defecto 1)
  const idViaje = Number(searchParams.get("tripId") || searchParams.get("idViaje")) || 1;

  const trip = {
    origin: searchParams.get("origin") || "Managua",
    destination: searchParams.get("destination") || "León",
    departure: searchParams.get("departure") || "06:00 AM",
    cooperative: searchParams.get("cooperative") || "COOTRANSTEL R.L.",
    price: Number(searchParams.get("price")) || 85,
  };

  const BAGGAGE_PRICE = 50;

  // Hook WebSocket en tiempo real para sincronización de asientos
  const {
    seats,
    selectedSeats,
    isConnected,
    isLoading,
    error: realtimeError,
    timeRemainingSeconds,
    toggleSelectSeat,
  } = useSeatRealtime({
    idViaje,
  });

  const [baggage, setBaggage] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ventaConfirmada, setVentaConfirmada] = useState<VentaConfirmada | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const ticketTotal = selectedSeats.length * trip.price;
  const baggageTotal = baggage * BAGGAGE_PRICE;
  const total = ticketTotal + baggageTotal;

  const { formatPrice } = useCurrency();
  const fmt = (n: number) => formatPrice(n);

  const goTrips = () => router.push("/trips");
  const goHome = () => router.push("/home");

  // Formato mm:ss para el TTL de bloqueo temporal
  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Manejo de clic en asiento con bloqueo / liberación en tiempo real
  const handleSeatClick = async (seat: AsientoRealtimeItem) => {
    setActionError(null);
    const result = await toggleSelectSeat(seat);
    if (!result.success && result.error) {
      setActionError(result.error);
    }
  };

  // Confirmación de pago transaccional en PostgreSQL y notificación WebSocket
  const handlePayment = async () => {
    if (selectedSeats.length === 0) return;
    setIsProcessingPayment(true);
    setActionError(null);

    try {
      const boletosPayload = selectedSeats.map((seat, idx) => ({
        idAsiento: seat.idAsiento,
        monto: trip.price,
        ...(idx === 0 && baggage > 0
          ? {
              equipaje: {
                cantidad: baggage,
                monto: baggageTotal,
                descripcion: `Equipaje extra (${baggage} bulto${baggage > 1 ? "s" : ""})`,
              },
            }
          : {}),
      }));

      const res = await procesarVentaBoletos({
        idViaje,
        boletos: boletosPayload,
      });

      if (!res.success || !res.data) {
        setActionError(res.error || "No se pudo procesar la compra.");
        setIsProcessingPayment(false);
        return;
      }

      setVentaConfirmada(res.data as VentaConfirmada);
      setShowSuccess(true);
    } catch (err: any) {
      console.error("Error al procesar pago de asientos:", err);
      setActionError(err.message || "Ocurrió un error al confirmar la compra.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Agrupar asientos dinámicamente en filas de 4 (2 izquierda, pasillo, 2 derecha)
  const rows: AsientoRealtimeItem[][] = [];
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4));
  }

  return (
    <div className="w-full pb-16 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Compra de Boleto
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md">
                <Icon path={mdiMapMarker} size={0.55} className="text-slate-600" />
                {trip.origin} → {trip.destination}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md">
                <Icon path={mdiClockOutline} size={0.55} className="text-slate-500" />
                Salida: {trip.departure}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                {trip.cooperative}
              </span>
            </div>
          </div>

          {/* Sincronización en tiempo real */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border ${
                isConnected
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <Icon path={mdiWifi} size={0.5} />
              <span>{isConnected ? "Sincronizado en vivo" : "Conexión estándar"}</span>
            </div>

            {timeRemainingSeconds !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                <Icon path={mdiTimerOutline} size={0.55} className="text-amber-700" />
                <span>Tiempo de reserva: {formatCountdown(timeRemainingSeconds)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Asientos y Equipaje */}
        <div className="flex-1 w-full space-y-6 min-w-0">
          {(actionError || realtimeError) && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-2xs">
              <Icon path={mdiAlertCircleOutline} size={0.7} className="text-amber-700 shrink-0" />
              <span>{actionError || realtimeError}</span>
            </div>
          )}

          {/* Croquis de Asientos Responsivo */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-2xs">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Selección de Asientos
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toca para seleccionar tus asientos en el croquis oficial de la unidad.
                </p>
              </div>

              {isLoading && (
                <span className="text-xs font-semibold text-slate-400 animate-pulse">
                  Actualizando asientos...
                </span>
              )}
            </div>

            {/* Contenedor del Autobús con protección responsive */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[280px] max-w-sm mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 relative">
                {/* Cabecera del Chofer */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[9px]">
                      BUS
                    </span>
                    <span>Frente / Conductor</span>
                  </div>
                  <span className="text-slate-300 font-mono">Puerta</span>
                </div>

                {/* Filas de Asientos */}
                <div className="flex flex-col gap-3">
                  {rows.map((row, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      {/* 2 Asientos Izquierda */}
                      <div className="flex items-center gap-2">
                        {row.slice(0, 2).map((seat) => {
                          const isSelectedByMe = seat.esMio && seat.estado === "BLOQUEADO";
                          const isLockedByOther = !seat.esMio && seat.estado === "BLOQUEADO";
                          const isOccupied = seat.estado === "OCUPADO" || seat.estado === "RESERVADO";

                          let style = "bg-white border-slate-300 text-slate-800 hover:border-slate-900";
                          let title = `Asiento #${seat.numero} Disponible`;

                          if (isSelectedByMe) {
                            style = "bg-slate-900 border-slate-900 text-white shadow-2xs font-black";
                            title = `Asiento #${seat.numero} Seleccionado por ti`;
                          } else if (isLockedByOther) {
                            style = "bg-amber-50 border-amber-300 text-amber-900 cursor-not-allowed";
                            title = `Asiento #${seat.numero} en proceso por otro usuario`;
                          } else if (isOccupied) {
                            style = "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed";
                            title = `Asiento #${seat.numero} Ocupado`;
                          }

                          return (
                            <button
                              key={seat.idAsiento}
                              onClick={() => handleSeatClick(seat)}
                              disabled={isOccupied || isLockedByOther}
                              title={title}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer relative shrink-0 ${style}`}
                            >
                              <span>{seat.numero}</span>
                              {isLockedByOther && (
                                <Icon path={mdiLockOutline} size={0.3} className="absolute bottom-0.5 text-amber-700" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Pasillo central */}
                      <div className="w-4 sm:w-6 text-center text-[9px] text-slate-300 font-mono uppercase tracking-widest shrink-0">
                        ·
                      </div>

                      {/* 2 Asientos Derecha */}
                      <div className="flex items-center gap-2">
                        {row.slice(2, 4).map((seat) => {
                          const isSelectedByMe = seat.esMio && seat.estado === "BLOQUEADO";
                          const isLockedByOther = !seat.esMio && seat.estado === "BLOQUEADO";
                          const isOccupied = seat.estado === "OCUPADO" || seat.estado === "RESERVADO";

                          let style = "bg-white border-slate-300 text-slate-800 hover:border-slate-900";
                          let title = `Asiento #${seat.numero} Disponible`;

                          if (isSelectedByMe) {
                            style = "bg-slate-900 border-slate-900 text-white shadow-2xs font-black";
                            title = `Asiento #${seat.numero} Seleccionado por ti`;
                          } else if (isLockedByOther) {
                            style = "bg-amber-50 border-amber-300 text-amber-900 cursor-not-allowed";
                            title = `Asiento #${seat.numero} en proceso por otro usuario`;
                          } else if (isOccupied) {
                            style = "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed";
                            title = `Asiento #${seat.numero} Ocupado`;
                          }

                          return (
                            <button
                              key={seat.idAsiento}
                              onClick={() => handleSeatClick(seat)}
                              disabled={isOccupied || isLockedByOther}
                              title={title}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer relative shrink-0 ${style}`}
                            >
                              <span>{seat.numero}</span>
                              {isLockedByOther && (
                                <Icon path={mdiLockOutline} size={0.3} className="absolute bottom-0.5 text-amber-700" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leyenda sobria */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-4 pt-4 border-t border-slate-100 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-white" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-900" />
                <span>Tu selección</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border border-amber-300 bg-amber-100" />
                <span>En proceso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border border-slate-200 bg-slate-200" />
                <span>Ocupado</span>
              </div>
            </div>
          </div>

          {/* Equipaje Extra */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-2xs">
            <div className="mb-3">
              <h2 className="text-base font-bold text-slate-900">Equipaje Extra</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Añade bultos adicionales que no quepan en el portaequipaje de mano superior.
              </p>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                  <Icon path={mdiBagSuitcase} size={0.7} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">Bulto o Maleta Adicional</p>
                  <p className="text-[11px] text-slate-500 font-mono">+C$ 50.00 c/u</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setBaggage(Math.max(0, baggage - 1))}
                  disabled={baggage === 0}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                    baggage === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  aria-label="Restar equipaje extra"
                >
                  <Icon path={mdiMinus} size={0.55} />
                </button>
                <span className="w-5 text-center font-bold text-xs sm:text-sm text-slate-900">{baggage}</span>
                <button
                  type="button"
                  onClick={() => setBaggage(baggage + 1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Sumar equipaje extra"
                >
                  <Icon path={mdiPlus} size={0.55} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Resumen de Pago */}
        <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 text-slate-900 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Resumen de Compra
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-600 font-semibold">Boletos ({selectedSeats.length})</p>
                  {selectedSeats.length > 0 && (
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Asientos: {selectedSeats.map((s) => `#${s.numero}`).join(", ")}
                    </p>
                  )}
                </div>
                <p className="font-bold text-slate-900">{fmt(ticketTotal)}</p>
              </div>

              {baggage > 0 && (
                <div className="flex items-start justify-between">
                  <p className="text-slate-600 font-semibold">Equipaje extra ({baggage})</p>
                  <p className="font-bold text-slate-900">{fmt(baggageTotal)}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total a pagar</span>
              <span className="text-2xl font-black text-slate-900">{fmt(total)}</span>
            </div>

            <button
              onClick={handlePayment}
              disabled={selectedSeats.length === 0 || isProcessingPayment}
              className={`w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs ${
                selectedSeats.length === 0 || isProcessingPayment ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              {isProcessingPayment ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando pago...</span>
                </>
              ) : (
                `Confirmar y Pagar (${selectedSeats.length})`
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 pt-1">
              <Icon path={mdiShieldCheck} size={0.55} className="text-emerald-600" />
              <span>Transacción cifrada y garantizada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Éxito de Compra */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => {
                setShowSuccess(false);
                goTrips();
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-xl p-6 relative z-10 shadow-2xl flex flex-col items-center text-center max-h-[90vh] overflow-y-auto border border-slate-200"
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 border border-emerald-200">
                <Icon path={mdiCheckCircleOutline} size={1.2} />
              </div>

              <span className="inline-block bg-slate-100 text-slate-800 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded border border-slate-200 mb-1.5">
                Transacción Exitosa
              </span>
              <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">
                Compra Confirmada
              </h2>

              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Icon path={mdiBus} size={0.6} className="text-slate-700" />
                    <span>{trip.origin} → {trip.destination}</span>
                  </div>
                  <span className="font-black text-slate-900">{fmt(total)}</span>
                </div>

                {selectedSeats.length > 0 && (
                  <p className="text-slate-600">
                    Asiento{selectedSeats.length > 1 ? "s" : ""}:{" "}
                    <span className="font-bold text-slate-900">
                      #{selectedSeats.map((s) => s.numero).join(", #")}
                    </span>
                  </p>
                )}
                <p className="text-slate-500">
                  Salida: <span className="font-semibold text-slate-800">{trip.departure}</span> · {trip.cooperative}
                </p>

                {ventaConfirmada?.boletos && ventaConfirmada.boletos.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Códigos de Boleto (Offline QR Disponible)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ventaConfirmada.boletos.map((b) => (
                        <span
                          key={b.idBoleto}
                          className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs"
                        >
                          {b.codigoBoleto}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2.5 text-left bg-slate-50 text-slate-700 p-3 rounded-lg mb-4 border border-slate-200 w-full text-xs">
                <Icon path={mdiEmailOutline} size={0.7} className="text-slate-500 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Tus boletos se encuentran disponibles en tu bóveda digital y pueden presentarse directamente al abordar.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowSuccess(false);
                  router.push("/tickets");
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition-colors shadow-2xs mb-2 cursor-pointer text-xs uppercase tracking-wider"
              >
                Ver mis boletos
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  goHome();
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg transition-colors cursor-pointer text-xs"
              >
                Volver al inicio
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-20 text-slate-500 font-semibold text-xs">
          Cargando selección de viaje...
        </div>
      }
    >
      <PurchaseContent />
    </Suspense>
  );
}
