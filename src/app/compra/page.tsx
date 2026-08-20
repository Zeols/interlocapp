"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bus, MapPin, Clock, CreditCard, Minus, Plus, CheckCircle, Mail, ChevronDown, ArrowRight } from "lucide-react";
import { UserChip } from "@/components/ui/UserChip";
import { SeatButton } from "@/components/ui/SeatButton";
import { ALL_TRIPS, initSeats, SEAT_ROWS } from "@/lib/mockData";
import { Seat, SeatStatus, Trip } from "@/types";

const BAGGAGE_PRICE = 50;
const ROUTES = [
  "Managua → León",
  "Managua → Granada",
  "Managua → Masaya",
  "Managua → Chinandega",
  "Managua → Rivas",
  "Managua → Estelí",
];

function PurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripIdStr = searchParams.get("tripId");
  
  const trip = tripIdStr 
    ? ALL_TRIPS.find(t => t.id === parseInt(tripIdStr)) || null 
    : null;

  const initialName = "Usuario Prueba";
  const initialEmail = "usuario@ejemplo.com";
  
  const effectivePrice = trip?.price ?? 85;
  const [seats, setSeats] = useState<Seat[]>(initSeats());
  const [baggage, setBaggage] = useState(0);
  const [route, setRoute] = useState(trip ? `${trip.origin} → ${trip.destination}` : "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedSeats = seats.filter((s) => s.status === "selected");
  const ticketTotal = selectedSeats.length * effectivePrice;
  const baggageTotal = baggage * BAGGAGE_PRICE;
  const total = ticketTotal + baggageTotal;

  const toggleSeat = (id: number) => {
    setSeats((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (s.status === "available") return { ...s, status: "selected" as SeatStatus };
        if (s.status === "selected") return { ...s, status: "available" as SeatStatus };
        return s;
      })
    );
  };

  const fmt = (n: number) => `C$${n.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="bg-white px-8 py-4 flex items-center justify-between shadow-sm border-b border-gray-100">
        <button onClick={() => router.push("/viajes")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-[#F97316] rounded-xl flex items-center justify-center">
            <Bus className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-gray-900">InterlocApp</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            Pago 100% seguro
          </div>
          <UserChip name={initialName} email={initialEmail} />
        </div>
      </nav>

      {/* Page header */}
      <div className="text-center pt-10 pb-8">
        <p className="text-[#F97316] text-[10px] font-black tracking-[0.2em] uppercase mb-2">
          Transportes Seguros
        </p>
        <h1 className="text-3xl font-black text-gray-950 mb-3">Compra de Boleto</h1>
        {trip && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
              {trip.origin} → {trip.destination}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {trip.departure}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
              <Bus className="w-3.5 h-3.5 text-gray-400" />
              {trip.cooperative}
            </span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="max-w-5xl mx-auto px-6 pb-16 grid grid-cols-[1fr_0.82fr] gap-5 items-start">
        {/* Left: Seat map */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-gray-950 text-lg">Mapa de Asientos</h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Salida {trip?.departure ?? "06:30 AM"}
            </div>
          </div>
          <div className="flex items-center gap-5 mb-6">
            {[
              { label: "Disponible",    cls: "border-2 border-green-500 bg-white" },
              { label: "Seleccionado",  cls: "bg-[#F97316]" },
              { label: "Ocupado",       cls: "border-2 border-rose-200 bg-rose-50" },
              { label: "No disponible", cls: "border-2 border-gray-200 bg-gray-100" },
            ].map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded ${cls}`} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[260px] bg-gray-100 rounded-xl py-2 mb-4 text-center text-xs font-semibold text-gray-500 flex items-center justify-center gap-2">
              <Bus className="w-3.5 h-3.5" />
              Conductor
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl px-8 py-5 flex flex-col gap-2.5">
              {SEAT_ROWS.map((row, ri) => (
                <div key={ri} className="flex items-center gap-2">
                  <SeatButton seat={seats[row[0] - 1]} onSelect={toggleSeat} />
                  <SeatButton seat={seats[row[1] - 1]} onSelect={toggleSeat} />
                  <div className="w-8 flex-shrink-0" />
                  <SeatButton seat={seats[row[2] - 1]} onSelect={toggleSeat} />
                  <SeatButton seat={seats[row[3] - 1]} onSelect={toggleSeat} />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.15em] uppercase mt-4">Parte Trasera</p>
          </div>
          <div className="mt-6 bg-gray-50 rounded-xl py-3 px-4 text-center border border-gray-100">
            <p className="text-sm text-gray-500">
              {selectedSeats.length > 0
                ? `Asiento ${selectedSeats.map((s) => s.id).join(", ")} seleccionado`
                : "Toca un asiento disponible para seleccionarlo"}
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-950 text-lg mb-4">Datos del Pasajero</h2>
          
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-black text-[#F97316]">
                {(initialName || initialEmail).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{initialName}</p>
              <p className="text-xs text-gray-500 truncate">{initialEmail}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-[10px] font-bold text-green-600">Verificado</span>
            </div>
          </div>

          <div className="mb-5">
            <label className="flex items-center gap-1.5 text-[10px] font-black text-[#F97316] uppercase tracking-[0.12em] mb-1.5">
              <MapPin className="w-3 h-3" /> Ruta
            </label>
            <div className="relative">
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] bg-white pr-9 transition-all"
              >
                <option value="">Selecciona tu ruta...</option>
                {ROUTES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-gray-900 font-bold text-sm mb-3">
              <CreditCard className="w-4 h-4 text-[#F97316]" /> Información de Pago
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1.5">Número de Tarjeta</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234  5678  9012  3456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1.5">Vencimiento</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/AA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1.5">CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl p-4 border border-orange-100 bg-orange-50/60">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900 text-sm">Equipaje Extra</p>
                <p className="text-xs text-gray-500 mt-0.5">C$50 por maleta adicional</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setBaggage((b) => Math.max(0, b - 1))}
                  className="w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-500 hover:border-[#F97316] hover:text-[#F97316] transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-black text-gray-900 text-sm w-3 text-center">{baggage}</span>
                <button
                  onClick={() => setBaggage((b) => b + 1)}
                  className="w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-500 hover:border-[#F97316] hover:text-[#F97316] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-3">Resumen del Pedido</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Boletos ({selectedSeats.length} × C${effectivePrice}.00)</span>
                <span className="font-semibold text-gray-900">{fmt(ticketTotal)}</span>
              </div>
              {baggage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Equipaje ({baggage} × C${BAGGAGE_PRICE}.00)</span>
                  <span className="font-semibold text-gray-900">{fmt(baggageTotal)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100">
              <span className="font-bold text-gray-950">Total</span>
              <span className="font-black text-[#F97316] text-lg">{fmt(total)}</span>
            </div>
          </div>

          <button
            onClick={() => setShowSuccess(true)}
            className="w-full mt-5 bg-[#F97316] hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            Pagar Boleto
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            Pago procesado con encriptación SSL de 256 bits
          </p>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowSuccess(false); router.push("/home"); }} />
          <div className="relative bg-white rounded-3xl shadow-xl w-[440px] p-10 flex flex-col items-center text-center mx-4">
            <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={1.5} />
            </div>
            <p className="text-[10px] font-black text-[#F97316] uppercase tracking-widest mb-2">Pago confirmado</p>
            <h2 className="text-2xl font-black text-gray-950 mb-3">¡Compra realizada!</h2>
            <div className="w-full bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4 mb-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-[#F97316]" />
                  <span className="text-sm font-bold text-gray-900">{trip ? `${trip.origin} → ${trip.destination}` : route || "Tu ruta"}</span>
                </div>
                <span className="text-sm font-black text-[#F97316]">{fmt(total)}</span>
              </div>
              {selectedSeats.length > 0 && (
                <p className="text-xs text-gray-500">
                  Asiento{selectedSeats.length > 1 ? "s" : ""} <span className="font-semibold text-gray-700">#{selectedSeats.map((s) => s.id).join(", #")}</span>
                </p>
              )}
            </div>
            <button onClick={() => { setShowSuccess(false); router.push("/home"); }} className="w-full bg-gray-950 hover:bg-gray-800 text-white font-black py-4 rounded-2xl transition-colors text-sm">
              Volver al inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchasePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PurchaseContent />
    </Suspense>
  );
}
