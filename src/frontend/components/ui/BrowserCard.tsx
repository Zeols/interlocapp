"use client";

import React from "react";
import { motion } from "framer-motion";
import Icon from "@mdi/react";
import { mdiBus } from "@mdi/js";

export function BrowserCard() {
  return (
    <div className="w-full max-w-[310px] sm:max-w-[330px] mx-auto relative select-none">
      {/* Resplandor suave y minimalista */}
      <div className="absolute -inset-2 bg-gradient-to-b from-primary/12 via-transparent to-transparent rounded-2xl blur-lg -z-10 pointer-events-none" />

      {/* Tarjeta Boleto Minimalista & Sereno */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="bg-white rounded-2xl border border-gray-200/80 shadow-lg shadow-gray-200/40 overflow-hidden"
      >
        {/* Cuerpo Principal del Boleto */}
        <div className="p-5 sm:p-6">
          {/* Fila superior: ID y Estado */}
          <div className="flex items-center justify-between text-xs mb-5">
            <div className="flex items-center gap-2 text-gray-500 font-semibold">
              <div className="w-6 h-6 rounded-lg bg-orange-50 text-primary flex items-center justify-center">
                <Icon path={mdiBus} size={0.55} />
              </div>
              <span className="font-mono text-[11px] text-gray-400">#B-8942</span>
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Confirmado
            </span>
          </div>

          {/* Ruta: Managua → León */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
              Ruta directa
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                Managua
              </h3>
              <span className="text-gray-300 text-lg font-light">→</span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                León
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Terminal UCA • Salida 07:30 AM
            </p>
          </div>

          {/* Datos esenciales: Asiento y Tarifa */}
          <div className="flex items-center justify-between pt-3.5 border-t border-gray-100 text-xs sm:text-sm">
            <div>
              <span className="text-[11px] font-medium text-gray-400 block">Asiento</span>
              <p className="font-bold text-gray-900 mt-0.5">12 (Ventana)</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-gray-400 block">Tarifa</span>
              <p className="font-extrabold text-gray-900 text-sm sm:text-base mt-0.5">C$ 85.00</p>
            </div>
          </div>
        </div>

        {/* Separador de corte minimalista con muescas */}
        <div className="relative flex items-center py-0.5">
          <div className="absolute -left-2 w-4 h-4 rounded-full bg-gray-50 border border-gray-200" />
          <div className="w-full border-t border-dashed border-gray-200 mx-3.5" />
          <div className="absolute -right-2 w-4 h-4 rounded-full bg-gray-50 border border-gray-200" />
        </div>

        {/* Talón inferior: Código de barras limpio y minimalista */}
        <div className="px-5 py-4 bg-gray-50/50 flex items-center justify-between gap-3.5">
          <div>
            <p className="text-[11px] font-semibold text-gray-600">Boleto Digital</p>
            <p className="text-[10px] text-gray-400">Muestra al conductor</p>
          </div>

          {/* Código de barras gráfico limpio */}
          <div className="flex items-center gap-[2px] h-6 px-1.5 py-0.5 bg-white rounded border border-gray-200/80">
            <span className="w-[1.5px] h-full bg-gray-800" />
            <span className="w-[1px] h-full bg-gray-400" />
            <span className="w-[2.5px] h-full bg-gray-800" />
            <span className="w-[1px] h-full bg-gray-300" />
            <span className="w-[1.5px] h-full bg-gray-800" />
            <span className="w-[1px] h-full bg-gray-400" />
            <span className="w-[2.5px] h-full bg-gray-800" />
            <span className="w-[1px] h-full bg-gray-300" />
            <span className="w-[1.5px] h-full bg-gray-800" />
            <span className="w-[1px] h-full bg-gray-800" />
            <span className="w-[1px] h-full bg-gray-300" />
            <span className="w-[2px] h-full bg-gray-800" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
