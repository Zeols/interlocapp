"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { 
  mdiBus, 
  mdiMapMarker,
  mdiClockOutline,
  mdiShieldCheck,
  mdiCheckCircleOutline,
  mdiMinus,
  mdiPlus,
  mdiArrowRight,
  mdiEmailOutline
} from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";

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

export default function PurchasePage() {
  const router = useRouter();
  const userEmail = "maria@example.com";
  
  // Simulated trip info
  const trip = {
    origin: "Managua",
    destination: "León",
    departure: "06:00 AM",
    cooperative: "TransNica",
    price: 85
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

  const fmt = (n: number) => `C$${n.toFixed(2)}`;

  const goTrips = () => router.push("/trips");
  const goHome = () => router.push("/home");

  return (
    <div className="w-full pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 py-10 px-8">
        <div className="max-w-6xl mx-auto">
          <p className="inline-block bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            Transportes Seguros
          </p>
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-6">Compra de Boleto</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl">
              <Icon path={mdiMapMarker} size={0.7} className="text-primary" />
              {trip.origin} → {trip.destination}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl">
              <Icon path={mdiClockOutline} size={0.7} className="text-gray-400" />
              {trip.departure}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 mt-8 flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column */}
        <div className="flex-1 w-full space-y-8">
          {/* Seats Selection */}
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-xl font-black text-gray-900">Selección de Asientos</h2>
              <p className="text-gray-500 mt-1">Haz clic en los asientos disponibles para seleccionarlos</p>
            </div>
            
            <div className="flex flex-col items-center max-w-sm mx-auto bg-gray-50 border border-gray-200 rounded-3xl p-8 mb-8 relative">
              <div className="absolute top-4 w-1/2 h-2 bg-gray-200 rounded-full" />
              <div className="w-10 h-10 border-4 border-gray-200 rounded-full absolute -top-5 bg-white" />
              
              <div className="w-full flex flex-col gap-4 mt-6">
                {SEAT_ROWS.map((row, i) => (
                  <div key={i} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      {row.slice(0, 2).map(id => {
                        const s = seats.find(x => x.id === id)!;
                        let style = "bg-white border-gray-300 text-gray-600 hover:border-primary";
                        if (s.status === 'selected') style = "bg-primary border-primary text-white scale-110 shadow-md";
                        if (s.status === 'occupied') style = "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed opacity-70";
                        if (s.status === 'unavailable') style = "bg-gray-100 border-gray-100 text-transparent cursor-not-allowed";
                        
                        return (
                          <button 
                            key={id} 
                            onClick={() => toggleSeat(id)} 
                            disabled={s.status === 'occupied' || s.status === 'unavailable'}
                            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition-all ${style}`}
                          >
                            {s.status !== 'unavailable' ? id : ''}
                          </button>
                        );
                      })}
                    </div>
                    <div className="w-8 shrink-0" /> {/* Aisle */}
                    <div className="flex items-center gap-3">
                      {row.slice(2, 4).map(id => {
                        const s = seats.find(x => x.id === id)!;
                        let style = "bg-white border-gray-300 text-gray-600 hover:border-primary";
                        if (s.status === 'selected') style = "bg-primary border-primary text-white scale-110 shadow-md";
                        if (s.status === 'occupied') style = "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed opacity-70";
                        if (s.status === 'unavailable') style = "bg-gray-100 border-gray-100 text-transparent cursor-not-allowed";
                        
                        return (
                          <button 
                            key={id} 
                            onClick={() => toggleSeat(id)} 
                            disabled={s.status === 'occupied' || s.status === 'unavailable'}
                            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition-all ${style}`}
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

            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white" /> Disponible
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <div className="w-4 h-4 rounded border-2 border-primary bg-primary" /> Seleccionado
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <div className="w-4 h-4 rounded border-2 border-gray-200 bg-gray-200" /> Ocupado
              </div>
            </div>
          </div>

          {/* Baggage */}
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-black text-gray-900">Equipaje Extra</h2>
              <p className="text-gray-500 mt-1">Agrega piezas adicionales de equipaje</p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                  <Icon path={mdiBus} size={1} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Pieza adicional</p>
                  <p className="text-sm font-medium text-gray-500">+C$50.00 c/u</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button 
                  onClick={() => setBaggage(Math.max(0, baggage - 1))} 
                  disabled={baggage === 0} 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${baggage === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icon path={mdiMinus} size={0.7} />
                </button>
                <span className="w-4 text-center font-bold text-gray-900">{baggage}</span>
                <button 
                  onClick={() => setBaggage(baggage + 1)} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Icon path={mdiPlus} size={0.7} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="w-full lg:w-96 shrink-0 sticky top-[100px]">
          <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-2xl font-black mb-8 relative z-10">Resumen de pago</h2>
            
            <div className="space-y-4 mb-8 relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 font-medium">Boletos ({selectedSeats.length})</p>
                  {selectedSeats.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Asientos: {selectedSeats.map(s => `#${s.id}`).join(", ")}</p>
                  )}
                </div>
                <p className="font-bold text-lg">{fmt(ticketTotal)}</p>
              </div>
              
              {baggage > 0 && (
                <div className="flex items-start justify-between">
                  <p className="text-gray-400 font-medium">Equipaje ({baggage})</p>
                  <p className="font-bold text-lg">{fmt(baggageTotal)}</p>
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-white/10 flex items-end justify-between mb-8 relative z-10">
              <p className="text-gray-400 font-bold uppercase tracking-wider text-sm">Total</p>
              <p className="text-4xl font-black text-white">{fmt(total)}</p>
            </div>

            <button 
              onClick={() => setShowSuccess(true)} 
              disabled={selectedSeats.length === 0}
              className={`w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all group relative z-10 ${selectedSeats.length === 0 ? 'opacity-50 cursor-not-allowed hover:bg-primary' : ''}`}
            >
              Pagar Boleto
              <Icon path={mdiArrowRight} size={0.9} className="transition-transform group-hover:translate-x-1" />
            </button>
            
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 mt-6 relative z-10">
              <Icon path={mdiShieldCheck} size={0.7} />
              Pago procesado con encriptación SSL
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
              className="bg-white w-full max-w-md rounded-[2rem] p-10 relative z-10 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <Icon path={mdiCheckCircleOutline} size={2.5} />
              </div>
              
              <p className="inline-block bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-3">
                Pago confirmado
              </p>
              <h2 className="text-3xl font-black text-gray-900 mb-8">¡Compra realizada!</h2>
              
              <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 text-left">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 font-bold text-gray-900">
                    <Icon path={mdiBus} size={0.8} className="text-primary" />
                    <span>{trip.origin} → {trip.destination}</span>
                  </div>
                  <span className="font-black text-lg text-primary">{fmt(total)}</span>
                </div>
                {selectedSeats.length > 0 && (
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Asiento{selectedSeats.length > 1 ? "s" : ""} <span className="font-bold text-gray-900">#{selectedSeats.map(s => s.id).join(", #")}</span>
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  Salida <span className="font-bold text-gray-900">{trip.departure}</span> · {trip.cooperative}
                </p>
              </div>
              
              <div className="flex items-start gap-4 text-left bg-blue-50 text-blue-800 p-4 rounded-2xl mb-8">
                <div className="mt-0.5 shrink-0">
                  <Icon path={mdiEmailOutline} size={1} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-sm mb-1">Boleto enviado por correo</p>
                  <p className="text-xs text-blue-600/80 leading-relaxed">
                    Recibirás tu ticket en <span className="font-bold">{userEmail}</span>. 
                    También estará registrado en el sistema.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => { setShowSuccess(false); goHome(); }} 
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-colors mb-3"
              >
                Volver al inicio
              </button>
              <button 
                onClick={() => { setShowSuccess(false); goTrips(); }} 
                className="w-full bg-transparent text-gray-500 hover:text-gray-900 font-bold py-3 rounded-xl transition-colors"
              >
                Ver detalles del viaje
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
