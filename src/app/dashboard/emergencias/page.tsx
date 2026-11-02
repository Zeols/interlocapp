"use client";

import React from "react";
import Icon from "@mdi/react";
import { mdiAlertOctagonOutline } from "@mdi/js";

export default function EmergenciasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiAlertOctagonOutline} size={0.85} className="text-amber-600" />
            Módulo de Emergencias
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Protocolos de seguridad y reporte de incidentes en ruta.
          </p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
          <Icon path={mdiAlertOctagonOutline} size={1} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Sección en Desarrollo</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Este módulo se encuentra reservado para futuras herramientas de comunicación de emergencia y asistencia en carretera.
        </p>
      </div>
    </div>
  );
}