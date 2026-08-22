"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiArrowRight,
  mdiMapMarker,
  mdiCalendar,
  mdiMagnify,
  mdiClockOutline,
  mdiShieldCheckOutline
} from "@mdi/js";

const POPULAR_ROUTES = [
  { origin: "Managua", destination: "León", duration: "2h 30min", price: 85 },
  { origin: "Managua", destination: "Granada", duration: "1h 15min", price: 65 },
  { origin: "Managua", destination: "Estelí", duration: "2h 30min", price: 90 },
  { origin: "Managua", destination: "Masaya", duration: "45min", price: 40 },
  { origin: "Managua", destination: "Chinandega", duration: "3h", price: 100 },
  { origin: "Managua", destination: "Rivas", duration: "2h", price: 75 },
];

export default function HomePage() {
  const router = useRouter();

  const goTrips = () => router.push("/trips");

  // Simulating logged-in user
  const userName = "Enrique Pomares";
  const firstName = userName.split(" ")[0];

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="w-full bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-20 items-center">
          <div>
            <p className="inline-block bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              Bienvenido de vuelta
            </p>
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-[1.1] mb-4">
              Hola, {firstName}.
              <br />
              <span className="text-primary">¿A dónde viajas hoy?</span>
            </h1>
            <p className="text-lg text-gray-500 mb-8 max-w-md leading-relaxed">
              Compra tu boleto en segundos, elige tu asiento y viaja con comodidad
              a cualquier destino desde Managua.
            </p>
            <button
              onClick={goTrips}
              className="inline-flex items-center gap-3 bg-primary hover:bg-primary-dark text-white font-bold text-base px-6 py-3 rounded-xl transition-colors group"
            >
              Comprar boleto
              <Icon path={mdiArrowRight} size={0.8} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Quick search panel */}
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="text-sm font-bold text-gray-900 mb-6">Búsqueda rápida</p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <Icon path={mdiMapMarker} size={1} className="text-primary" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Origen</p>
                  <p className="text-sm font-bold text-gray-900">Managua</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <Icon path={mdiMapMarker} size={1} className="text-gray-300" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Destino</p>
                  <p className="text-sm font-medium text-gray-400">Seleccionar destino...</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <Icon path={mdiCalendar} size={1} className="text-gray-300" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</p>
                  <p className="text-sm font-medium text-gray-400">Seleccionar fecha...</p>
                </div>
              </div>

              <button
                onClick={goTrips}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-2xl mt-2 flex items-center justify-center gap-2 transition-colors"
              >
                <Icon path={mdiMagnify} size={0.8} />
                Buscar viajes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popular routes */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Rutas populares</h2>
            <p className="text-gray-500 mt-1">Salidas diarias desde Managua</p>
          </div>
          <button
            onClick={goTrips}
            className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark transition-colors group"
          >
            Ver todos los viajes
            <Icon path={mdiArrowRight} size={0.7} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POPULAR_ROUTES.map((r) => (
            <button
              key={r.destination}
              onClick={goTrips}
              className="bg-white border border-gray-100 p-6 rounded-3xl text-left hover:border-primary/30 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Icon path={mdiBus} size={1} />
                </div>
                <span className="text-lg font-black text-gray-900">C${r.price}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-1">{r.destination}</p>
              <p className="text-sm text-gray-500 mb-4">desde {r.origin}</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <Icon path={mdiClockOutline} size={0.6} />
                {r.duration}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer strip */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
              <Icon path={mdiBus} size={0.6} />
            </div>
            <span className="font-black text-gray-900 tracking-tight">Turkitin</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Transportes seguros en Nicaragua</p>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <Icon path={mdiShieldCheckOutline} size={0.7} />
            Pagos encriptados SSL
          </div>
        </div>
      </footer>
    </div>
  );
}
