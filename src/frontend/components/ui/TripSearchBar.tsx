"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import {
  mdiMapMarkerOutline,
  mdiSwapHorizontal,
  mdiCalendarMonthOutline,
  mdiAccountOutline,
  mdiMagnify,
} from "@mdi/js";

interface TripSearchBarProps {
  className?: string;
}

export function TripSearchBar({ className = "" }: TripSearchBarProps) {
  const router = useRouter();

  const [origin, setOrigin] = useState("Managua (UCA)");
  const [destination, setDestination] = useState("León");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [passengers, setPassengers] = useState("1");

  const popularCities = [
    "Managua (UCA)",
    "Managua (Mayoreo)",
    "León",
    "Granada",
    "Estelí",
    "Matagalpa",
    "Rivas",
    "Chinandega",
  ];

  const handleSwap = (e: React.MouseEvent) => {
    e.preventDefault();
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/trips");
  };

  return (
    <div
      className={`bg-white rounded-3xl p-5 md:p-6 shadow-xl shadow-gray-200/40 border border-gray-100 transition-all ${className}`}
    >
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
        <span className="flex items-center gap-2 text-primary font-bold">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Rutas Disponibles
        </span>
        <span className="text-gray-400 font-medium normal-case">
          Salidas directas hoy
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Origen */}
          <div className="md:col-span-4 relative group">
            <label
              htmlFor="origin-select"
              className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5"
            >
              Origen
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-primary pointer-events-none">
                <Icon path={mdiMapMarkerOutline} size={0.8} />
              </span>
              <select
                id="origin-select"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-gray-50/80 border border-gray-200/80 rounded-2xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer"
              >
                {popularCities.map((city) => (
                  <option key={`origin-${city}`} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botón Swap */}
          <div className="flex justify-center md:col-span-1 pt-2 md:pt-4">
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Intercambiar origen y destino"
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 flex items-center justify-center border border-gray-200/80 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
            >
              <Icon path={mdiSwapHorizontal} size={0.8} />
            </button>
          </div>

          {/* Destino */}
          <div className="md:col-span-4 relative group">
            <label
              htmlFor="destination-select"
              className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5"
            >
              Destino
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-primary pointer-events-none">
                <Icon path={mdiMapMarkerOutline} size={0.8} />
              </span>
              <select
                id="destination-select"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-gray-50/80 border border-gray-200/80 rounded-2xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer"
              >
                {popularCities.map((city) => (
                  <option key={`dest-${city}`} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha */}
          <div className="md:col-span-3 relative group">
            <label
              htmlFor="travel-date"
              className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5"
            >
              Fecha de viaje
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-gray-400 pointer-events-none">
                <Icon path={mdiCalendarMonthOutline} size={0.8} />
              </span>
              <input
                id="travel-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-gray-50/80 border border-gray-200/80 rounded-2xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Fila inferior: Pasajeros y Botón CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-gray-600 w-full sm:w-auto">
            <span className="text-gray-400">
              <Icon path={mdiAccountOutline} size={0.75} />
            </span>
            <label htmlFor="passengers-select" className="font-semibold text-gray-600">
              Pasajeros:
            </label>
            <select
              id="passengers-select"
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
              className="bg-transparent font-bold text-gray-900 border-none focus:ring-0 cursor-pointer text-xs"
            >
              <option value="1">1 Pasajero</option>
              <option value="2">2 Pasajeros</option>
              <option value="3">3 Pasajeros</option>
              <option value="4">4 Pasajeros</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-7 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-xs sm:text-sm"
          >
            <Icon path={mdiMagnify} size={0.85} />
            <span>Buscar viajes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
