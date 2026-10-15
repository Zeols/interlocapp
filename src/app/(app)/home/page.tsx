"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiMapMarker,
  mdiCalendar,
  mdiMagnify,
  mdiClockOutline,
} from "@mdi/js";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { getRutasActivas } from "@/backend/actions/rutas";

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Pasajero");
  const [routes, setRoutes] = useState<
    {
      id: number;
      name: string;
      origin: string;
      destination: string;
      duration: string;
      price: number;
      cooperative: string;
    }[]
  >([]);

  useEffect(() => {
    getCurrentUserAction().then((session) => {
      if (session?.nombre) {
        setUserName(session.nombre);
      }
    });

    getRutasActivas().then((res) => {
      if (res.success && res.data) {
        setRoutes(res.data);
      }
    });
  }, []);

  const goTrips = () => router.push("/trips");
  const firstName = userName.split(" ")[0];

  return (
    <div className="w-full">
      {/* Hero unificado */}
      <div className="w-full bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-16 items-center">
          <div>
            <span className="inline-block bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-4">
              Bienvenido de vuelta
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.12] tracking-tight mb-4">
              Hola, {firstName}.
              <br />
              <span className="text-primary">¿A dónde viajas hoy?</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-md leading-relaxed">
              Compra tu boleto en segundos, elige tu asiento y viaja con total comodidad a cualquier destino de la región.
            </p>
            <button
              onClick={goTrips}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Comprar boleto
            </button>
          </div>

          {/* Panel de Búsqueda Rápida Unificado */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/40">
            <h3 className="text-base font-extrabold text-gray-900 mb-5 tracking-tight">
              Búsqueda rápida
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                <Icon path={mdiMapMarker} size={0.9} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origen</p>
                  <p className="text-sm font-bold text-gray-900 truncate">Managua (UCA)</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                <Icon path={mdiMapMarker} size={0.9} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destino</p>
                  <p className="text-sm font-medium text-gray-400 truncate">Seleccionar destino...</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                <Icon path={mdiCalendar} size={0.9} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha</p>
                  <p className="text-sm font-medium text-gray-400 truncate">Hoy, 14 Oct</p>
                </div>
              </div>

              <button
                onClick={goTrips}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-2xl mt-2 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-sm sm:text-base hover:shadow-md"
              >
                <Icon path={mdiMagnify} size={0.8} />
                Buscar viajes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rutas Disponibles */}
      {routes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Rutas disponibles
              </h2>
              <p className="text-sm text-gray-500 mt-1">Salidas programadas y frecuencias garantizadas</p>
            </div>
            <button
              onClick={goTrips}
              className="inline-flex items-center text-sm font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer"
            >
              Ver todos los viajes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {routes.map((r) => (
              <button
                key={r.id}
                onClick={goTrips}
                className="bg-white border border-gray-100 p-6 rounded-3xl text-left hover:border-primary/40 hover:shadow-lg hover:shadow-orange-950/5 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Icon path={mdiBus} size={0.8} />
                  </div>
                  <span className="text-base sm:text-lg font-black text-gray-900">C$ {r.price}.00</span>
                </div>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight mb-0.5">
                  {r.destination}
                </p>
                <p className="text-xs text-gray-400 mb-4 font-medium">desde {r.origin}</p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                  <Icon path={mdiClockOutline} size={0.6} />
                  {r.duration}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
