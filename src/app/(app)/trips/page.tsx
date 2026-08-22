"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiMapMarker,
  mdiCalendar,
  mdiCheck,
  mdiArrowRight,
  mdiClockOutline,
  mdiFilterVariant,
  mdiChevronDown,
  mdiChevronUp
} from "@mdi/js";

const COOPERATIVES = ["TransNica", "El Expreso", "Tica Bus"];

const ALL_TRIPS = [
  { id: 1, origin: "Managua", destination: "León", departure: "06:00 AM", arrival: "08:30 AM", duration: "2h 30min", cooperative: "TransNica", price: 85, schedule: "mañana", type: "Directo" },
  { id: 2, origin: "Managua", destination: "Granada", departure: "12:30 PM", arrival: "01:45 PM", duration: "1h 15min", cooperative: "El Expreso", price: 65, schedule: "tarde", type: "Escalas" },
  { id: 3, origin: "Managua", destination: "Estelí", departure: "07:00 PM", arrival: "09:30 PM", duration: "2h 30min", cooperative: "Tica Bus", price: 90, schedule: "noche", type: "Directo" },
  { id: 4, origin: "Managua", destination: "Masaya", departure: "08:00 AM", arrival: "08:45 AM", duration: "45min", cooperative: "TransNica", price: 40, schedule: "mañana", type: "Escalas" },
  { id: 5, origin: "Managua", destination: "Chinandega", departure: "02:00 PM", arrival: "05:00 PM", duration: "3h", cooperative: "El Expreso", price: 100, schedule: "tarde", type: "Directo" },
  { id: 6, origin: "Managua", destination: "Rivas", departure: "06:30 PM", arrival: "08:30 PM", duration: "2h", cooperative: "Tica Bus", price: 75, schedule: "noche", type: "Directo" },
];

export default function TripsPage() {
  const router = useRouter();

  const [origin, setOrigin] = useState("Managua");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<Record<string, boolean>>({
    mañana: false, tarde: false, noche: false
  });
  const [coopFilter, setCoopFilter] = useState<Record<string, boolean>>(
    Object.fromEntries(COOPERATIVES.map(c => [c, false]))
  );
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const toggleSchedule = (k: string) => setScheduleFilter(p => ({ ...p, [k]: !p[k] }));
  const toggleCoop = (k: string) => setCoopFilter(p => ({ ...p, [k]: !p[k] }));
  const clearFilters = () => {
    setScheduleFilter({ mañana: false, tarde: false, noche: false });
    setCoopFilter(Object.fromEntries(COOPERATIVES.map(c => [c, false])));
  };

  const activeSchedules = Object.entries(scheduleFilter).filter(([, v]) => v).map(([k]) => k);
  const activeCoops = Object.entries(coopFilter).filter(([, v]) => v).map(([k]) => k);
  const hasFilters = activeSchedules.length > 0 || activeCoops.length > 0;

  const filtered = ALL_TRIPS.filter(t => {
    if (activeSchedules.length && !activeSchedules.includes(t.schedule)) return false;
    if (activeCoops.length && !activeCoops.includes(t.cooperative)) return false;
    if (destination && !t.destination.toLowerCase().includes(destination.toLowerCase())) return false;
    return true;
  });

  const goPurchase = () => router.push("/compra");

  return (
    <div className="w-full pb-16">
      {/* Search Area */}
      <div className="bg-white border-b border-gray-100 p-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="flex flex-1 w-full flex-col md:flex-row bg-gray-50 rounded-2xl border border-gray-200 divide-y md:divide-y-0 md:divide-x divide-gray-200 overflow-hidden">
            <div className="flex-1 flex items-center px-4 py-3 gap-3 bg-white">
              <Icon path={mdiMapMarker} size={0.9} className="text-primary" />
              <input
                className="w-full outline-none bg-transparent text-gray-900 font-medium placeholder:text-gray-400"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="Origen"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 gap-3 bg-white">
              <Icon path={mdiMapMarker} size={0.9} className="text-gray-400" />
              <input
                className="w-full outline-none bg-transparent text-gray-900 font-medium placeholder:text-gray-400"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Destino"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 gap-3 bg-white">
              <Icon path={mdiCalendar} size={0.9} className="text-gray-400" />
              <input
                type="date"
                className="w-full outline-none bg-transparent text-gray-900 font-medium text-sm placeholder:text-gray-400 uppercase"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 mt-8 flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm sticky top-[100px]">
          <div className={`flex items-center justify-between ${showMobileFilters ? 'mb-6 pb-4 border-b border-gray-100' : 'lg:mb-6 lg:pb-4 lg:border-b lg:border-gray-100'}`}>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-2 lg:pointer-events-none"
            >
              <Icon path={mdiFilterVariant} size={0.9} className="text-gray-900 lg:hidden" />
              <h2 className="text-lg font-black text-gray-900">Filtros</h2>
              <Icon path={showMobileFilters ? mdiChevronUp : mdiChevronDown} size={0.9} className="text-gray-500 lg:hidden ml-1" />
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm font-bold text-primary hover:text-primary-dark ml-4">
                Limpiar
              </button>
            )}
          </div>

          <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Horario de salida</p>
              <div className="space-y-3">
                {["mañana", "tarde", "noche"].map(k => (
                  <button key={k} onClick={() => toggleSchedule(k)} className="flex items-center gap-3 w-full group">
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${scheduleFilter[k] ? 'bg-primary border-primary' : 'bg-gray-50 border border-gray-300 group-hover:border-primary/50'}`}>
                      {scheduleFilter[k] && <Icon path={mdiCheck} size={0.6} className="text-white" />}
                    </div>
                    <span className={`text-sm font-medium ${scheduleFilter[k] ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {k.charAt(0).toUpperCase() + k.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Cooperativa</p>
              <div className="space-y-3">
                {COOPERATIVES.map(c => (
                  <button key={c} onClick={() => toggleCoop(c)} className="flex items-center gap-3 w-full group">
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${coopFilter[c] ? 'bg-primary border-primary' : 'bg-gray-50 border border-gray-300 group-hover:border-primary/50'}`}>
                      {coopFilter[c] && <Icon path={mdiCheck} size={0.6} className="text-white" />}
                    </div>
                    <span className={`text-sm font-medium ${coopFilter[c] ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {c}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full">
          <div className="mb-6">
            <p className="text-sm font-bold text-gray-500">
              Mostrando <span className="text-gray-900">{filtered.length}</span> viajes disponibles
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full mx-auto mb-4 flex items-center justify-center text-gray-300">
                <Icon path={mdiBus} size={1.5} />
              </div>
              <p className="font-bold text-lg text-gray-900 mb-1">No hay viajes</p>
              <p className="text-gray-500">Intenta ajustar tus filtros de búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(trip => (
                <div key={trip.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0">
                    <div className="flex-1 flex flex-row items-center w-full justify-between">
                      <div className="text-center w-16 md:w-24 shrink-0">
                        <p className="text-xl md:text-2xl font-black text-gray-900 leading-none">{trip.departure.split(" ")[0]}</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-1">{trip.departure.split(" ")[1]}</p>
                        <p className="text-xs md:text-sm font-semibold text-gray-600 mt-2 truncate">{trip.origin}</p>
                      </div>

                      <div className="flex-1 flex flex-col items-center px-2 md:px-4 min-w-[60px] md:min-w-[120px]">
                        <p className="text-xs font-bold text-gray-400 mb-2 flex items-center justify-center gap-1 whitespace-nowrap">
                          <Icon path={mdiClockOutline} size={0.6} /> {trip.duration}
                        </p>
                        <div className="w-full flex items-center relative h-6">
                          <div className="w-2 h-2 rounded-full border-2 border-primary bg-white z-10" />
                          <div className="flex-1 h-px border-b-2 border-dashed border-gray-200" />
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-10">
                            <Icon path={mdiBus} size={0.6} />
                          </div>
                          <div className="flex-1 h-px border-b-2 border-dashed border-gray-200" />
                          <div className="w-2 h-2 rounded-full bg-primary z-10" />
                        </div>
                        <p className="text-xs font-bold text-primary mt-2">{trip.cooperative}</p>
                      </div>

                      <div className="text-center w-16 md:w-24 shrink-0">
                        <p className="text-xl md:text-2xl font-black text-gray-900 leading-none">{trip.arrival.split(" ")[0]}</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-1">{trip.arrival.split(" ")[1]}</p>
                        <p className="text-xs md:text-sm font-semibold text-gray-600 mt-2 truncate">{trip.destination}</p>
                      </div>
                    </div>

                    <div className="w-full md:w-px h-px md:h-24 bg-gray-100 mx-0 md:mx-6 shrink-0" />

                    <div className="w-full md:w-auto flex flex-row md:flex-col items-center justify-between shrink-0 gap-4">
                      <div className="text-left md:text-right">
                        <p className="text-2xl font-black text-gray-900">C${trip.price}</p>
                        <p className="text-xs font-medium text-gray-400">por persona</p>
                      </div>
                      <button onClick={goPurchase} className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 transition-colors">
                        Seleccionar
                        <Icon path={mdiArrowRight} size={0.7} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
