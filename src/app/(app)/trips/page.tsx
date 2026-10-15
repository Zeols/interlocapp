"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiMapMarker,
  mdiCalendar,
  mdiCheck,
  mdiClockOutline,
  mdiFilterVariant,
  mdiChevronDown,
  mdiChevronUp,
  mdiLoading,
} from "@mdi/js";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";
import {
  getViajesDisponiblesAction,
  type ViajeDisponibleItem,
} from "@/backend/actions/viajes";

export default function TripsPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<ViajeDisponibleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<Record<string, boolean>>({
    mañana: false,
    tarde: false,
    noche: false,
  });
  const [coopFilter, setCoopFilter] = useState<Record<string, boolean>>({});
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    getViajesDisponiblesAction({
      origin: origin.trim() || undefined,
      destination: destination.trim() || undefined,
      date: date || undefined,
    }).then((res) => {
      if (res.success && res.data) {
        setTrips(res.data);
      } else {
        setTrips([]);
      }
      setLoading(false);
    });
  }, [origin, destination, date]);

  // Obtener lista dinámica de cooperativas a partir de los viajes reales
  const availableCooperatives = Array.from(
    new Set(trips.map((t) => t.cooperative))
  ).filter(Boolean);

  const toggleSchedule = (k: string) =>
    setScheduleFilter((p) => ({ ...p, [k]: !p[k] }));

  const toggleCoop = (c: string) =>
    setCoopFilter((p) => ({ ...p, [c]: !p[c] }));

  const clearFilters = () => {
    setScheduleFilter({ mañana: false, tarde: false, noche: false });
    setCoopFilter({});
  };

  const activeSchedules = Object.entries(scheduleFilter)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const activeCoops = Object.entries(coopFilter)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const hasFilters = activeSchedules.length > 0 || activeCoops.length > 0;

  const filtered = trips.filter((t) => {
    if (activeSchedules.length && !activeSchedules.includes(t.schedule)) return false;
    if (activeCoops.length && !activeCoops.includes(t.cooperative)) return false;
    return true;
  });

  const goPurchase = (trip: {
    origin: string;
    destination: string;
    departure: string;
    cooperative: string;
    price: number;
  }) => {
    const params = new URLSearchParams({
      origin: trip.origin,
      destination: trip.destination,
      departure: trip.departure,
      cooperative: trip.cooperative,
      price: trip.price.toString(),
    });
    router.push(`/compra?${params.toString()}`);
  };

  return (
    <div className="w-full pb-16">
      {/* Search Area */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-3 items-center">
          <div className="flex flex-1 w-full flex-col md:flex-row bg-gray-50/80 rounded-xl border border-gray-200/80 divide-y md:divide-y-0 md:divide-x divide-gray-200/80 overflow-hidden shadow-2xs">
            <div className="flex-1 flex items-center px-3.5 py-2.5 gap-2.5 bg-white">
              <Icon path={mdiMapMarker} size={0.7} className="text-primary shrink-0" />
              <input
                className="w-full outline-none bg-transparent text-gray-900 font-semibold text-xs sm:text-sm placeholder:text-gray-400"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Origen (Ej. Managua)"
              />
            </div>
            <div className="flex-1 flex items-center px-3.5 py-2.5 gap-2.5 bg-white">
              <Icon path={mdiMapMarker} size={0.7} className="text-gray-400 shrink-0" />
              <input
                className="w-full outline-none bg-transparent text-gray-900 font-semibold text-xs sm:text-sm placeholder:text-gray-400"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destino (Ej. León, Granada)"
              />
            </div>
            <div className="flex-1 flex items-center px-3.5 py-2.5 gap-2.5 bg-white">
              <Icon path={mdiCalendar} size={0.7} className="text-gray-400 shrink-0" />
              <input
                type="date"
                className="w-full outline-none bg-transparent text-gray-900 font-semibold text-xs sm:text-sm placeholder:text-gray-400 uppercase"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar de Filtros */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs sticky top-[76px]">
          <div
            className={`flex items-center justify-between ${
              showMobileFilters
                ? "mb-4 pb-3 border-b border-gray-100"
                : "lg:mb-4 lg:pb-3 lg:border-b lg:border-gray-100"
            }`}
          >
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-1.5 lg:pointer-events-none cursor-pointer"
            >
              <Icon path={mdiFilterVariant} size={0.75} className="text-gray-900 lg:hidden" />
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Filtros</h2>
              <Icon
                path={showMobileFilters ? mdiChevronUp : mdiChevronDown}
                size={0.7}
                className="text-gray-500 lg:hidden ml-1"
              />
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className={`${showMobileFilters ? "block" : "hidden"} lg:block`}>
            <div className="mb-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Horario de salida
              </p>
              <div className="space-y-2">
                {["mañana", "tarde", "noche"].map((k) => (
                  <button
                    key={k}
                    onClick={() => toggleSchedule(k)}
                    className="flex items-center gap-2.5 w-full group cursor-pointer"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-colors ${
                        scheduleFilter[k]
                          ? "bg-primary border-primary"
                          : "bg-gray-50 border border-gray-300 group-hover:border-primary/50"
                      }`}
                    >
                      {scheduleFilter[k] && <Icon path={mdiCheck} size={0.45} className="text-white" />}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        scheduleFilter[k]
                          ? "text-gray-900 font-bold"
                          : "text-gray-600 group-hover:text-gray-900"
                      }`}
                    >
                      {k.charAt(0).toUpperCase() + k.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {availableCooperatives.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Cooperativa
                </p>
                <div className="space-y-2">
                  {availableCooperatives.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleCoop(c)}
                      className="flex items-center gap-2.5 w-full group cursor-pointer"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-colors ${
                          coopFilter[c]
                            ? "bg-primary border-primary"
                            : "bg-gray-50 border border-gray-300 group-hover:border-primary/50"
                        }`}
                      >
                        {coopFilter[c] && <Icon path={mdiCheck} size={0.45} className="text-white" />}
                      </div>
                      <span
                        className={`text-xs truncate ${
                          coopFilter[c]
                            ? "text-gray-900 font-bold"
                            : "text-gray-600 group-hover:text-gray-900"
                        }`}
                      >
                        {c}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">
              Mostrando <span className="text-gray-900 font-extrabold">{filtered.length}</span> salidas
            </p>
          </div>

          {loading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-xs">
              <Icon path={mdiLoading} size={1.2} className="animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-600">Consultando viajes disponibles...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-xs">
              <div className="w-10 h-10 bg-gray-50 rounded-xl mx-auto mb-2.5 flex items-center justify-center text-gray-300">
                <Icon path={mdiBus} size={1} />
              </div>
              <p className="font-extrabold text-sm text-gray-900 mb-0.5">
                No hay viajes disponibles
              </p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                No se encontraron salidas programadas en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filtered.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-gray-200 transition-all"
                >
                  <div className="flex flex-col md:flex-row items-center gap-3.5 md:gap-0">
                    <div className="flex-1 flex flex-row items-center w-full justify-between">
                      <div className="text-center w-16 md:w-24 shrink-0">
                        <p className="text-lg md:text-2xl font-extrabold text-gray-900 leading-none">
                          {trip.departure.split(" ")[0]}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                          {trip.departure.split(" ")[1]}
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-1 truncate">
                          {trip.origin}
                        </p>
                      </div>

                      <div className="flex-1 flex flex-col items-center px-2 md:px-4 min-w-[60px] md:min-w-[120px]">
                        <p className="text-[11px] font-semibold text-gray-400 mb-1 flex items-center justify-center gap-1 whitespace-nowrap">
                          <Icon path={mdiClockOutline} size={0.5} /> {trip.duration}
                        </p>
                        <div className="w-full flex items-center relative h-5">
                          <div className="w-1.5 h-1.5 rounded-full border-2 border-primary bg-white z-10" />
                          <div className="flex-1 h-px border-b border-dashed border-gray-200" />
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-10">
                            <Icon path={mdiBus} size={0.5} />
                          </div>
                          <div className="flex-1 h-px border-b border-dashed border-gray-200" />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary z-10" />
                        </div>
                        <p className="text-xs font-bold text-primary mt-1">{trip.cooperative}</p>
                      </div>

                      <div className="text-center w-16 md:w-24 shrink-0">
                        <p className="text-lg md:text-2xl font-extrabold text-gray-900 leading-none">
                          {trip.arrival.split(" ")[0]}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                          {trip.arrival.split(" ")[1]}
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-1 truncate">
                          {trip.destination}
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-px h-px md:h-12 bg-gray-100 mx-0 md:mx-4 shrink-0" />

                    {/* Widget de Ocupación con AnimatedCircularProgressBar no saturado */}
                    <div className="hidden sm:flex flex-col items-center justify-center shrink-0 px-2">
                      <AnimatedCircularProgressBar
                        value={trip.occupancy}
                        gaugePrimaryColor={
                          trip.occupancy >= 85
                            ? "#ef4444"
                            : trip.occupancy >= 60
                            ? "#FE7D22"
                            : "#10b981"
                        }
                        gaugeSecondaryColor="rgba(0, 0, 0, 0.06)"
                        strokeWidth={6}
                        className="size-10"
                        textClassName="text-[11px] font-extrabold text-gray-800"
                      />
                      <span className="text-[10px] font-medium text-gray-400 mt-0.5">Ocupación</span>
                    </div>

                    <div className="hidden sm:block w-px h-12 bg-gray-100 mx-3 shrink-0" />

                    <div className="w-full md:w-auto flex flex-row md:flex-col items-center justify-between shrink-0 gap-2.5">
                      <div className="text-left md:text-right">
                        <p className="text-lg sm:text-xl font-black text-gray-900">
                          C$ {trip.price}.00
                        </p>
                        <p className="text-[10px] font-medium text-gray-400">por boleto</p>
                      </div>
                      <button
                        onClick={() => goPurchase(trip)}
                        className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
                      >
                        Seleccionar
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
