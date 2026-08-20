"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Bus, ArrowRight, MapPin, Calendar, Search, Clock, Shield } from "lucide-react";
import { UserChip } from "@/components/ui/UserChip";

const POPULAR_ROUTES = [
  { origin: "Managua", destination: "León",       duration: "2h 30min", price: 85  },
  { origin: "Managua", destination: "Granada",    duration: "1h 15min", price: 65  },
  { origin: "Managua", destination: "Estelí",     duration: "2h 30min", price: 90  },
  { origin: "Managua", destination: "Masaya",     duration: "45min",    price: 40  },
  { origin: "Managua", destination: "Chinandega", duration: "3h",       price: 100 },
  { origin: "Managua", destination: "Rivas",      duration: "2h",       price: 75  },
];

export default function HomePage() {
  const router = useRouter();
  const userName = "Usuario Prueba";
  const userEmail = "usuario@ejemplo.com";
  const firstName = userName.split(" ")[0];

  const goTrips = () => router.push("/viajes");
  const goLanding = () => router.push("/");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#F97316] rounded-xl flex items-center justify-center">
              <Bus className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-gray-900">InterlocApp</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold text-gray-900 border-b-2 border-[#F97316] pb-0.5">Inicio</span>
            <button onClick={goTrips} className="text-gray-500 hover:text-gray-700 transition-colors">
              Ver viajes
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserChip name={userName} email={userEmail} />
          <button
            onClick={goLanding}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-[1fr_auto] gap-10 items-center">
          <div>
            <p className="text-xs font-black text-[#F97316] uppercase tracking-widest mb-3">
              Bienvenido de vuelta
            </p>
            <h1 className="text-4xl font-black text-gray-950 leading-tight mb-3">
              Hola, {firstName}.
              <br />
              <span className="text-gray-400 font-semibold text-2xl">¿A dónde viajas hoy?</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-7 max-w-sm">
              Compra tu boleto en segundos, elige tu asiento y viaja con comodidad
              a cualquier destino desde Managua.
            </p>
            <button
              onClick={goTrips}
              className="inline-flex items-center gap-2.5 bg-[#F97316] hover:bg-orange-600 text-white font-black px-7 py-3.5 rounded-full transition-colors shadow-sm text-sm"
            >
              Comprar boleto
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick search panel */}
          <div className="bg-[#F8FAFC] border border-gray-200 rounded-2xl p-5 w-[320px]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Búsqueda rápida
            </p>
            <div className="space-y-2.5">
              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#F97316] flex-shrink-0" />
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Origen</p>
                  <p className="text-sm font-semibold text-gray-900">Managua</p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Destino</p>
                  <p className="text-sm text-gray-400">Seleccionar destino...</p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Fecha</p>
                  <p className="text-sm text-gray-400">Seleccionar fecha...</p>
                </div>
              </div>
              <button
                onClick={goTrips}
                className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar viajes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popular routes */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-950">Rutas populares</h2>
            <p className="text-sm text-gray-500 mt-0.5">Salidas diarias desde Managua</p>
          </div>
          <button
            onClick={goTrips}
            className="text-sm font-semibold text-[#F97316] hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            Ver todos los viajes <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {POPULAR_ROUTES.map((r) => (
            <button
              key={r.destination}
              onClick={goTrips}
              className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-orange-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                  <Bus className="w-5 h-5 text-gray-400 group-hover:text-[#F97316] transition-colors" />
                </div>
                <span className="text-lg font-black text-[#F97316]">C${r.price}</span>
              </div>
              <p className="font-black text-gray-950 text-base leading-tight">{r.destination}</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">desde {r.origin}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {r.duration}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer strip */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#F97316] rounded-lg flex items-center justify-center">
              <Bus className="text-white w-3 h-3" />
            </div>
            <span className="text-sm font-bold text-gray-900">InterlocApp</span>
          </div>
          <p className="text-xs text-gray-400">Transportes seguros en Nicaragua</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            Pagos encriptados SSL
          </div>
        </div>
      </div>
    </div>
  );
}
