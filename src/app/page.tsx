"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bus, ArrowRight, Ticket, LayoutGrid, Navigation, Shield } from "lucide-react";
import { BrowserCard } from "@/components/ui/BrowserCard";

export default function LandingPage() {
  const router = useRouter();
  
  const goLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="px-8 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#F97316] rounded-xl flex items-center justify-center">
            <Bus className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-gray-900 text-base">InterlocApp</span>
        </div>
        <button
          onClick={goLogin}
          className="bg-[#F97316] hover:bg-orange-600 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-colors"
        >
          Iniciar Sesión
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-10 pt-16 pb-20 grid grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-[3.4rem] font-black text-gray-950 leading-[1.08] tracking-tight mb-5">
            Viaja cómodo y seguro
            <br />a tu destino sin hacer{" "}
            <span className="text-[#F97316]">filas</span>
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8 max-w-md">
            Compra tus boletos interurbanos en línea, elige tu asiento favorito
            de antemano y viaja en la mejor flota de la región.
          </p>
          <button
            onClick={goLogin}
            className="inline-flex items-center gap-2.5 bg-[#F97316] hover:bg-orange-600 text-white font-black px-8 py-4 rounded-full transition-colors shadow-sm"
          >
            Comprar Boleto
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-12 mt-12">
            <div>
              <p className="text-5xl font-black text-gray-950 leading-none">0</p>
              <p className="text-sm text-gray-400 mt-1.5">Pasajeros actuales</p>
            </div>
            <div>
              <p className="text-5xl font-black text-gray-950 leading-none">30m</p>
              <p className="text-sm text-gray-400 mt-1.5">Salidas puntuales</p>
            </div>
          </div>
        </div>
        <BrowserCard />
      </div>

      <div className="bg-gray-100 py-24">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-gray-950 leading-tight">
              Por qué elegir viajar con
              <br />
              <span className="text-[#F97316]">nosotros</span>
            </h2>
            <p className="text-gray-500 mt-4 text-sm">La mejor experiencia de viaje a tu alcance.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-8">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mb-5">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-gray-950 text-lg mb-2">Compra Anticipada</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Olvídate de las filas en la terminal. Compra o reserva tu boleto
                desde tu celular de manera rápida y segura.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8">
              <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center mb-5">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-gray-950 text-lg mb-2">Elige tu Asiento</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Revisa el mapa del autobús en tiempo real y escoge tu lugar favorito.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mb-5">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-gray-950 text-lg mb-2">Rastreo en Vivo</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Conoce la ubicación exacta de tu unidad y los puntos de abordaje
                sin incertidumbre.
              </p>
            </div>
            <div className="bg-gray-950 rounded-2xl p-8">
              <div className="w-12 h-12 bg-gray-700 rounded-2xl flex items-center justify-center mb-5">
                <Shield className="w-6 h-6 text-gray-300" />
              </div>
              <h3 className="font-black text-white text-lg mb-2">Puntualidad y Confort</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Nuestra moderna flota garantiza salidas a tiempo, viajes seguros
                y la máxima comodidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
