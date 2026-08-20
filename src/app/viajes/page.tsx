"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, MapPin, Calendar, Search, SlidersHorizontal, Clock } from "lucide-react";
import { UserChip } from "@/components/ui/UserChip";
import { FilterCheck } from "@/components/ui/FilterCheck";
import { TripCard } from "@/components/ui/TripCard";
import { ALL_TRIPS } from "@/lib/mockData";
import { Trip } from "@/types";

const COOPERATIVES = ["TransNica", "El Expreso", "Tica Bus"];

export default function TripsPage() {
  const router = useRouter();
  const userName = "Usuario Prueba";
  const userEmail = "usuario@ejemplo.com";

  const [origin, setOrigin] = useState("Managua");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  
  const [scheduleFilter, setScheduleFilter] = useState<Record<string, boolean>>({
    mañana: false,
    tarde: false,
    noche: false,
  });
  
  const [coopFilter, setCoopFilter] = useState<Record<string, boolean>>(
    Object.fromEntries(COOPERATIVES.map((c) => [c, false]))
  );

  const toggleSchedule = (k: string) => setScheduleFilter((p) => ({ ...p, [k]: !p[k] }));
  const toggleCoop = (k: string) => setCoopFilter((p) => ({ ...p, [k]: !p[k] }));

  const activeSchedules = Object.entries(scheduleFilter).filter(([, v]) => v).map(([k]) => k);
  const activeCoops = Object.entries(coopFilter).filter(([, v]) => v).map(([k]) => k);
  const hasFilters = activeSchedules.length > 0 || activeCoops.length > 0;

  const clearFilters = () => {
    setScheduleFilter({ mañana: false, tarde: false, noche: false });
    setCoopFilter(Object.fromEntries(COOPERATIVES.map((c) => [c, false])));
  };

  const filtered = ALL_TRIPS.filter((t) => {
    if (activeSchedules.length && !activeSchedules.includes(t.schedule)) return false;
    if (activeCoops.length && !activeCoops.includes(t.cooperative)) return false;
    if (destination && !t.destination.toLowerCase().includes(destination.toLowerCase())) return false;
    return true;
  });

  const onSelectTrip = (trip: Trip) => {
    // In a real app we'd pass trip ID via query string or context
    router.push(`/compra?tripId=${trip.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push("/home")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-[#F97316] rounded-xl flex items-center justify-center">
            <Bus className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-gray-900">InterlocApp</span>
        </button>
        <UserChip name={userName} email={userEmail} />
      </nav>

      {/* Search bar */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-stretch gap-3">
            {/* Origin */}
            <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-orange-300 focus-within:border-[#F97316] focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
              <MapPin className="w-4 h-4 text-[#F97316] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Origen</p>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-orange-300 focus-within:border-[#F97316] focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Destino</p>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="¿A dónde vas?"
                  className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Date */}
            <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-orange-300 focus-within:border-[#F97316] focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Fecha de viaje</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-full"
                />
              </div>
            </div>

            {/* Search button */}
            <button className="bg-[#F97316] hover:bg-orange-600 text-white px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm flex-shrink-0 self-stretch">
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Two-column: sidebar + results */}
      <div className="max-w-5xl mx-auto px-6 pt-5 pb-14 grid grid-cols-[220px_1fr] gap-6 items-start">
        {/* Sidebar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#F97316]" />
              <h3 className="font-black text-gray-900 text-sm">Filtros</h3>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="text-[10px] font-bold text-[#F97316] hover:text-orange-600 transition-colors">
                Limpiar
              </button>
            )}
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Horarios</p>
            <div className="space-y-3">
              <FilterCheck checked={scheduleFilter.mañana} onChange={() => toggleSchedule("mañana")} label="Mañana" sublabel="06:00 – 12:00" />
              <FilterCheck checked={scheduleFilter.tarde} onChange={() => toggleSchedule("tarde")} label="Tarde" sublabel="12:00 – 18:00" />
              <FilterCheck checked={scheduleFilter.noche} onChange={() => toggleSchedule("noche")} label="Noche" sublabel="18:00 – 00:00" />
            </div>
          </div>
          <div className="h-px bg-gray-100 mb-6" />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Cooperativas</p>
            <div className="space-y-3">
              {COOPERATIVES.map((name) => (
                <FilterCheck key={name} checked={coopFilter[name]} onChange={() => toggleCoop(name)} label={name} />
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-black text-gray-950">{filtered.length}</span>{" "}
              viaje{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" /> Ordenados por horario de salida
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-14 text-center border border-gray-100">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bus className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-bold text-gray-400 mb-1">Sin viajes disponibles</p>
              <p className="text-sm text-gray-400">Prueba ajustando los filtros o cambiando la búsqueda.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 text-sm text-[#F97316] font-semibold hover:text-orange-600 transition-colors">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            filtered.map((trip) => <TripCard key={trip.id} trip={trip} onSelect={onSelectTrip} />)
          )}
        </div>
      </div>
    </div>
  );
}
