"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiArrowRight,
  mdiTicketConfirmationOutline,
  mdiViewGridOutline,
  mdiNavigationVariantOutline,
  mdiShieldCheckOutline,
} from "@mdi/js";
import { BrowserCard } from "@/components/ui/BrowserCard";

export default function LandingPage() {
  const router = useRouter();

  const goLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-md">
            <Icon path={mdiBus} size={1} />
          </div>
          <span className="font-bold text-gray-900 text-xl tracking-tight">InterlocApp</span>
        </div>
        <button
          onClick={goLogin}
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2 text-sm md:text-base md:px-6 md:py-2.5 rounded-full whitespace-nowrap transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
        >
          Iniciar Sesión
        </button>
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-8 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Hero Left */}
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] tracking-tight mb-6">
            Viaja cómodo y seguro a tu destino sin hacer filas
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-md">
            Compra tus boletos interurbanos en línea, elige tu asiento favorito de antemano y viaja en la mejor flota de la región.
          </p>
          <button
            onClick={goLogin}
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary-dark text-white font-bold text-lg px-8 py-4 rounded-full transition-all duration-300 group hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-primary/30 hover:shadow-primary/40"
          >
            Comenzar ahora
            <Icon path={mdiArrowRight} size={1} className="transition-transform group-hover:translate-x-1" />
          </button>

          <div className="flex items-center gap-12 mt-16">
            <div>
              <p className="text-3xl font-black text-gray-900">0</p>
              <p className="text-sm font-medium text-gray-500 mt-1">Pasajeros actuales</p>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900">30m</p>
              <p className="text-sm font-medium text-gray-500 mt-1">Salidas puntuales</p>
            </div>
          </div>
        </div>

        {/* Hero Right */}
        <div className="hidden lg:block w-full">
          <BrowserCard />
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-white py-24">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
            Por qué elegir viajar con nosotros
          </h2>
          <p className="text-lg text-gray-500 mb-16">
            La mejor experiencia de viaje a tu alcance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                <Icon path={mdiTicketConfirmationOutline} size={1.2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Compra Anticipada</h3>
              <p className="text-gray-500 leading-relaxed">
                Olvídate de las filas en la terminal. Compra o reserva tu boleto desde tu celular de manera rápida y segura.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
                <Icon path={mdiViewGridOutline} size={1.2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Elige tu Asiento</h3>
              <p className="text-gray-500 leading-relaxed">
                Revisa el mapa del autobús en tiempo real y escoge tu lugar favorito.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                <Icon path={mdiNavigationVariantOutline} size={1.2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Rastreo en Vivo</h3>
              <p className="text-gray-500 leading-relaxed">
                Conoce la ubicación exacta de tu unidad y los puntos de abordaje sin incertidumbre.
              </p>
            </div>

            {/* Changed the dark card to a light/flat card per user request "elimina degradados y vestigios de IA" */}
            <div className="bg-gray-900 rounded-3xl p-8 text-white">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Icon path={mdiShieldCheckOutline} size={1.2} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Puntualidad y Confort</h3>
              <p className="text-gray-400 leading-relaxed">
                Nuestra moderna flota garantiza salidas a tiempo, viajes seguros y la máxima comodidad.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
