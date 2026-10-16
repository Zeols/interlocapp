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
  mdiEmailOutline
} from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/frontend/context/CurrencyContext";

type SeatStatus = "available" | "occupied" | "selected" | "unavailable";

interface Seat {
  id: number;
  status: SeatStatus;
}

const OCCUPIED_IDS = [2, 5, 8, 13, 16];
const UNAVAILABLE_IDS = [11, 20];

function initSeats(): Seat[] {
  return Array.from({ length: 20 }, (_, i) => {
    const id = i + 1;
    const status: SeatStatus = OCCUPIED_IDS.includes(id)
      ? "occupied"
      : UNAVAILABLE_IDS.includes(id)
        ? "unavailable"
        : "available";
    return { id, status };
  });
}

const SEAT_ROWS = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

function PurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userEmail = "user@ejemplo.com";

  const trip = {
    origin: searchParams.get("origin") || "Managua",
    destination: searchParams.get("destination") || "León",
    departure: searchParams.get("departure") || "06:00 AM",
    cooperative: searchParams.get("cooperative") || "TransNica",
    price: Number(searchParams.get("price")) || 85
  };

  const BAGGAGE_PRICE = 50;

  const [seats, setSeats] = useState<Seat[]>(initSeats());
  const [baggage, setBaggage] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedSeats = seats.filter(s => s.status === "selected");
  const ticketTotal = selectedSeats.length * trip.price;
  const baggageTotal = baggage * BAGGAGE_PRICE;
  const total = ticketTotal + baggageTotal;

  const toggleSeat = (id: number) => {
    setSeats(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        if (s.status === "available") return { ...s, status: "selected" };
        if (s.status === "selected") return { ...s, status: "available" };
        return s;
      })
    );
  };

  const { formatPrice } = useCurrency();
  const fmt = (n: number) => formatPrice(n);

  const goTrips = () => router.push("/trips");
  const goHome = () => router.push("/home");

  return (
    <div className="w-full pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 py-8 px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Compra de Boleto
          </h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200/80 px-3.5 py-1.5 rounded-full">
              <Icon path={mdiMapMarker} size={0.65} className="text-primary" />
              {trip.origin} → {trip.destination}
            </span>
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200/80 px-3.5 py-1.5 rounded-full">
              <Icon path={mdiClockOutline} size={0.65} className="text-gray-400" />
              {trip.departure}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-6 sm:mt-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Left Column */}
        <div className="flex-1 w-full space-y-6 sm:space-y-8">
          {/* Seats Selection */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                Selección de Asientos
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Haz clic en los asientos disponibles para seleccionarlos
              </p>
            </div>

            <div className="flex flex-col items-center max-w-sm mx-auto bg-gray-50/80 border border-gray-200/80 rounded-3xl p-4 sm:p-8 mb-6 relative">
              <div className="absolute top-4 w-1/2 h-2 bg-gray-200 rounded-full" />
              <div className="w-9 h-9 border-4 border-gray-200 rounded-full absolute -top-4.5 bg-white shadow-xs" />

              <div className="w-full flex flex-col gap-3.5 mt-6">
                {SEAT_ROWS.map((row, i) => (
                  <div key={i} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {row.slice(0, 2).map(id => {
                        const s = seats.find(x => x.id === id)!;
                        let style = "bg-white border-gray-300 text-gray-700 hover:border-primary/80";
                        if (s.status === 'selected') style = "bg-primary border-primary text-white scale-105 shadow-md shadow-primary/20";
                        if (s.status === 'occupied') style = "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed opacity-60";
                        if (s.status === 'unavailable') style = "bg-gray-100 border-gray-100 text-transparent cursor-not-allowed";

                        return (
                          <button
                            key={id}
                            onClick={() => toggleSeat(id)}
                            disabled={s.status === 'occupied' || s.status === 'unavailable'}
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 flex items-center justify-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${style}`}
                          >
                            {s.status !== 'unavailable' ? id : ''}
                          </button>
                        );
                      })}
                    </div>
                    <div className="w-4 sm:w-8 shrink-0 text-center text-[10px] text-gray-300 font-mono">pasillo</div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      {row.slice(2, 4).map(id => {
                        const s = seats.find(x => x.id === id)!;
                        let style = "bg-white border-gray-300 text-gray-700 hover:border-primary/80";
                        if (s.status === 'selected') style = "bg-primary border-primary text-white scale-105 shadow-md shadow-primary/20";
                        if (s.status === 'occupied') style = "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed opacity-60";
                        if (s.status === 'unavailable') style = "bg-gray-100 border-gray-100 text-transparent cursor-not-allowed";

                        return (
                          <button
                            key={id}
                            onClick={() => toggleSeat(id)}
                            disabled={s.status === 'occupied' || s.status === 'unavailable'}
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 flex items-center justify-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${style}`}
                          >
                            {s.status !== 'unavailable' ? id : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <div className="w-3.5 h-3.5 rounded-md border-2 border-gray-300 bg-white" /> Disponible
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <div className="w-3.5 h-3.5 rounded-md border-2 border-primary bg-primary" /> Seleccionado
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <div className="w-3.5 h-3.5 rounded-md border-2 border-gray-200 bg-gray-200" /> Ocupado
              </div>
            </div>
          </div>

          {/* Baggage */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Equipaje Extra</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Agrega piezas adicionales de equipaje</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50/80 border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-xs">
                  <Icon path={mdiBus} size={0.8} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Pieza adicional</p>
                  <p className="text-xs text-gray-500">+C$ 50.00 c/u</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white border border-gray-200/80 rounded-xl p-1 shadow-xs">
                <button
                  onClick={() => setBaggage(Math.max(0, baggage - 1))}
                  disabled={baggage === 0}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${baggage === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icon path={mdiMinus} size={0.6} />
                </button>
                <span className="w-4 text-center font-bold text-sm text-gray-900">{baggage}</span>
                <button
                  onClick={() => setBaggage(baggage + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Icon path={mdiPlus} size={0.6} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="w-full lg:w-96 shrink-0 sticky top-[80px]">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 text-gray-900 shadow-xl shadow-gray-200/40 relative overflow-hidden">
            <h2 className="text-xl sm:text-2xl font-extrabold mb-6 tracking-tight">Resumen de pago</h2>

            <div className="space-y-3.5 mb-6">
              <div className="flex items-start justify-between text-sm">
                <div>
                  <p className="text-gray-600 font-semibold">Boletos ({selectedSeats.length})</p>
                  {selectedSeats.length > 0 && (
                    <p className="text-xs text-primary font-bold mt-0.5">Asientos: {selectedSeats.map(s => `#${s.id}`).join(", ")}</p>
                  )}
                </div>
                <p className="font-extrabold text-base text-gray-900">{fmt(ticketTotal)}</p>
              </div>

              {baggage > 0 && (
                <div className="flex items-start justify-between text-sm">
                  <p className="text-gray-600 font-semibold">Equipaje extra ({baggage})</p>
                  <p className="font-extrabold text-base text-gray-900">{fmt(baggageTotal)}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-baseline justify-between mb-6">
              <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Total</p>
              <p className="text-3xl font-black text-gray-900">{fmt(total)}</p>
            </div>

            <button
              onClick={() => setShowSuccess(true)}
              disabled={selectedSeats.length === 0}
              className={`w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-primary/20 ${selectedSeats.length === 0 ? 'opacity-50 cursor-not-allowed hover:bg-primary' : 'hover:scale-[1.01] active:scale-[0.99]'}`}
            >
              Pagar Boleto
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 mt-5">
              <Icon path={mdiShieldCheck} size={0.65} className="text-emerald-500" />
              Pago protegido con encriptación SSL
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => { setShowSuccess(false); goTrips(); }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl flex flex-col items-center text-center max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-5 border border-emerald-100">
                <Icon path={mdiCheckCircleOutline} size={2} />
              </div>

              <span className="inline-block bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-2">
                Pago confirmado
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 tracking-tight">¡Compra realizada!</h2>

              <div className="w-full bg-gray-50/80 border border-gray-100 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200/80">
                  <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                    <Icon path={mdiBus} size={0.7} className="text-primary" />
                    <span>{trip.origin} → {trip.destination}</span>
                  </div>
                  <span className="font-extrabold text-base text-primary">{fmt(total)}</span>
                </div>
                {selectedSeats.length > 0 && (
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 break-words">
                    Asiento{selectedSeats.length > 1 ? "s" : ""} <span className="font-bold text-gray-900">#{selectedSeats.map(s => s.id).join(", #")}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Salida <span className="font-bold text-gray-900">{trip.departure}</span> · {trip.cooperative}
                </p>
              </div>

              <div className="flex items-start gap-3 text-left bg-blue-50/80 text-blue-900 p-4 rounded-2xl mb-6 border border-blue-100 w-full">
                <div className="mt-0.5 shrink-0">
                  <Icon path={mdiEmailOutline} size={0.9} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm mb-0.5">Boleto digital emitido</p>
                  <p className="text-xs text-blue-700/80 leading-relaxed">
                    Recibirás tu ticket en <span className="font-bold">{userEmail}</span>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setShowSuccess(false); goHome(); }}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-2xl transition-all shadow-xs mb-2.5 cursor-pointer text-sm"
              >
                Volver al inicio
              </button>
              <button
                onClick={() => { setShowSuccess(false); goTrips(); }}
                className="w-full bg-transparent text-gray-500 hover:text-gray-900 font-bold py-2.5 rounded-2xl transition-colors cursor-pointer text-xs sm:text-sm"
              >
                Ver más viajes
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
    <Suspense fallback={<div className="flex w-full items-center justify-center p-20 text-gray-500 font-bold">Cargando...</div>}>
      <PurchaseContent />
    </Suspense>
  );
}
