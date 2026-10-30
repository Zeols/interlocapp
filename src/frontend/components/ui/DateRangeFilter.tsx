"use client";

import React, { useState } from "react";
import { getManaguaDateISO } from "@/lib/date-time";

export type DateRangePreset = "hoy" | "ayer" | "7dias" | "mes" | "custom";

export interface DateRangeValue {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  preset: DateRangePreset;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (val: DateRangeValue) => void;
  className?: string;
}

export function computePresetRange(preset: DateRangePreset): { desde: string; hasta: string } {
  const hoyIso = getManaguaDateISO();
  const [year, month, day] = hoyIso.split("-").map(Number);
  const today = new Date(year, month - 1, day);

  if (preset === "hoy") {
    return { desde: hoyIso, hasta: hoyIso };
  }

  if (preset === "ayer") {
    const ayer = new Date(today);
    ayer.setDate(ayer.getDate() - 1);
    const ayerIso = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, "0")}-${String(ayer.getDate()).padStart(2, "0")}`;
    return { desde: ayerIso, hasta: ayerIso };
  }

  if (preset === "7dias") {
    const hace7 = new Date(today);
    hace7.setDate(hace7.getDate() - 6);
    const hace7Iso = `${hace7.getFullYear()}-${String(hace7.getMonth() + 1).padStart(2, "0")}-${String(hace7.getDate()).padStart(2, "0")}`;
    return { desde: hace7Iso, hasta: hoyIso };
  }

  if (preset === "mes") {
    const primerDiaIso = `${year}-${String(month).padStart(2, "0")}-01`;
    return { desde: primerDiaIso, hasta: hoyIso };
  }

  return { desde: hoyIso, hasta: hoyIso };
}

export function DateRangeFilter({
  value,
  onChange,
  className = "",
}: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(value.preset === "custom");

  const handlePresetClick = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      onChange({ ...value, preset: "custom" });
    } else {
      setShowCustom(false);
      const range = computePresetRange(preset);
      onChange({ ...range, preset });
    }
  };

  const handleCustomDateChange = (field: "desde" | "hasta", newDate: string) => {
    if (!newDate) return;
    const updated = {
      ...value,
      preset: "custom" as const,
      [field]: newDate,
    };
    // Ensure 'hasta' is not before 'desde'
    if (field === "desde" && updated.hasta < newDate) {
      updated.hasta = newDate;
    }
    if (field === "hasta" && updated.desde > newDate) {
      updated.desde = newDate;
    }
    onChange(updated);
  };

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Botones de atajo rápido */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto shrink-0">
        {(
          [
            { id: "hoy", label: "Hoy" },
            { id: "ayer", label: "Ayer" },
            { id: "7dias", label: "7 días" },
            { id: "mes", label: "Este mes" },
            { id: "custom", label: "Rango..." },
          ] as const
        ).map((item) => {
          const isActive = value.preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePresetClick(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Inputs personalizados */}
      {showCustom && (
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <input
            type="date"
            value={value.desde}
            onChange={(e) => handleCustomDateChange("desde", e.target.value)}
            className="text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-slate-400"
            title="Fecha inicio"
          />
          <span className="text-xs text-slate-400 font-semibold px-0.5">a</span>
          <input
            type="date"
            value={value.hasta}
            onChange={(e) => handleCustomDateChange("hasta", e.target.value)}
            className="text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-slate-400"
            title="Fecha fin"
          />
        </div>
      )}
    </div>
  );
}

