import React from "react";
import { Bus } from "lucide-react";

export function BrowserCard() {
  return (
    <div className="relative flex items-center justify-center h-[440px]">
      <div className="relative z-10 bg-white rounded-2xl shadow-xl p-5 w-[300px] border border-gray-100"
      >
        <div className="flex gap-1.5 mb-5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="mb-3">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
            <Bus className="w-5 h-5 text-[#F97316]" />
          </div>
          <p className="font-black text-gray-950 text-xl leading-tight">Asiento #12</p>
          <p className="text-sm text-gray-400 mt-0.5">Managua — León</p>
        </div>
        <div className="my-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#F97316] rounded-full w-3/4" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center">
              <Bus className="w-4 h-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">Boleto #8942</p>
              <p className="text-xs text-gray-400">Comprado</p>
            </div>
          </div>
          <div className="bg-gray-950 text-white text-xs px-3 py-2.5 rounded-xl text-center flex-shrink-0">
            <p className="font-black">Confirmado</p>
            <p className="opacity-50 text-[9px] mt-0.5">Listo para viajar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
