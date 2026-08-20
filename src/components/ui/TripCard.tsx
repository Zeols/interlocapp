import React from "react";
import { Bus, ArrowRight } from "lucide-react";
import { Trip } from "@/types";
import { SCHEDULE_STYLE } from "@/lib/mockData";

export function TripCard({ trip, onSelect }: { trip: Trip; onSelect: (t: Trip) => void }) {
  const sched = SCHEDULE_STYLE[trip.schedule];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-100 transition-all duration-200 p-6 group">
      {/* Top row: badge + type */}
      <div className="flex items-center justify-between mb-5">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${sched.pill}`}>
          {sched.label}
        </span>
        <span className="text-xs text-gray-400 font-medium">{trip.type}</span>
      </div>

      {/* Main content row */}
      <div className="flex items-center gap-4">
        {/* Departure */}
        <div className="w-28 flex-shrink-0">
          <p className="text-4xl font-black text-gray-950 leading-none tabular-nums">
            {trip.departure.split(" ")[0]}
          </p>
          <p className="text-xs font-black text-[#F97316] mt-0.5 tracking-wider">
            {trip.departure.split(" ")[1]}
          </p>
          <p className="text-sm text-gray-500 mt-2 font-semibold">{trip.origin}</p>
        </div>

        {/* Route line */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <p className="text-xs text-gray-400 font-semibold">{trip.duration}</p>
          <div className="w-full flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
            <div className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Bus className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#F97316] flex-shrink-0" />
          </div>
          <p className="text-xs text-gray-400 font-medium">{trip.cooperative}</p>
        </div>

        {/* Arrival */}
        <div className="w-28 flex-shrink-0 text-right">
          <p className="text-4xl font-black text-gray-950 leading-none tabular-nums">
            {trip.arrival.split(" ")[0]}
          </p>
          <p className="text-xs font-black text-[#F97316] mt-0.5 tracking-wider">
            {trip.arrival.split(" ")[1]}
          </p>
          <p className="text-sm text-gray-500 mt-2 font-semibold">{trip.destination}</p>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-gray-100 flex-shrink-0 mx-2" />

        {/* Price + CTA */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0 min-w-[140px]">
          <div className="text-right">
            <p className="text-3xl font-black text-[#F97316] leading-none">C${trip.price}</p>
            <p className="text-xs text-gray-400 mt-0.5">por persona</p>
          </div>
          <button
            onClick={() => onSelect(trip)}
            className="bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 w-full justify-center"
          >
            Seleccionar Asiento
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
