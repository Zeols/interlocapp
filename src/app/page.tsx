"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import ShimmerButton from "@/components/magicui/shimmer-button";
import { GridPattern } from "@/components/magicui/grid-pattern";

export default function LandingPage() {
  const router = useRouter();

  const goLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full relative z-20">
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
            <Icon path={mdiBus} size={1} />
          </div>
          <span className="font-bold text-gray-900 text-xl tracking-tight transition-colors group-hover:text-primary">InterlocApp</span>
        </Link>
        <button
          onClick={goLogin}
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2 text-sm md:text-base md:px-6 md:py-2.5 rounded-full whitespace-nowrap transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
        >
          Iniciar Sesión
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-8 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
        <GridPattern
          width={40}
          height={40}
          x={-1}
          y={-1}
          className="absolute inset-0 h-full w-full opacity-50 [mask-image:linear-gradient(to_bottom,white,transparent_80%)] -z-10"
        />
        
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight mb-6">
            Viaja cómodo y seguro sin hacer filas
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-md leading-relaxed">
            Compra tus boletos interurbanos en línea, elige tu asiento favorito de antemano y viaja en la mejor flota de la región.
          </p>
          
          <div className="mt-8 flex gap-4" onClick={goLogin}>
            <ShimmerButton className="shadow-2xl">
              <span className="flex items-center gap-2 whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                Comenzar ahora
                <Icon path={mdiArrowRight} size={0.8} />
              </span>
            </ShimmerButton>
          </div>

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

        <div className="hidden lg:block w-full relative">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
          <BrowserCard />
        </div>
      </main>

      {/* Wave Divider */}
      <div className="w-full overflow-hidden leading-[0] bg-white">
        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-[calc(100%+1.3px)] h-[60px] md:h-[120px]"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            className="fill-gray-50"
          ></path>
        </svg>
      </div>

      {/* Features Section */}
      <section className="bg-white py-24 relative z-10 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="mb-16 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight max-w-2xl">
              Viajar ya no tiene que ser complicado.
            </h2>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl leading-relaxed">
              Rediseñamos la experiencia de viajar en autobús. Desde la compra hasta la llegada, todo el control está en tu celular.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Principal: Compra Anticipada */}
            <div className="md:col-span-7 bg-gray-50/80 rounded-2xl p-8 md:p-10 flex flex-col justify-between items-start border border-gray-100 transition-colors hover:bg-gray-50">
              <div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-900 shadow-sm border border-gray-200 mb-6">
                  <Icon path={mdiTicketConfirmationOutline} size={1} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 tracking-tight">Compra anticipada</h3>
                <p className="text-gray-600 text-base leading-relaxed max-w-md">
                  Olvídate de las filas en la terminal. Compra, reserva y administra tus boletos directamente desde tu dispositivo, con múltiples métodos de pago seguros.
                </p>
              </div>
              <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-gray-900 font-semibold text-sm hover:text-primary transition-colors group">
                Comprar ahora <Icon path={mdiArrowRight} size={0.7} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Secundario: Elige tu Asiento */}
            <div className="md:col-span-5 bg-gray-900 text-white rounded-2xl p-8 md:p-10 flex flex-col justify-between items-start">
              <div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white mb-6">
                  <Icon path={mdiViewGridOutline} size={1} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">Elige tu asiento</h3>
                <p className="text-gray-400 text-base leading-relaxed">
                  Revisa el mapa del autobús en tiempo real y escoge tu lugar favorito con total libertad antes de abordar.
                </p>
              </div>
              <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-white font-semibold text-sm hover:text-gray-300 transition-colors group">
                Ver mapa de unidades <Icon path={mdiArrowRight} size={0.7} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Rastreo */}
            <div className="md:col-span-5 bg-blue-50/50 rounded-2xl p-8 md:p-10 flex flex-col justify-between items-start border border-blue-100/50 transition-colors hover:bg-blue-50">
              <div>
                <div className="w-10 h-10 bg-blue-100/80 text-blue-700 rounded-xl flex items-center justify-center mb-6">
                  <Icon path={mdiNavigationVariantOutline} size={1} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 tracking-tight">Rastreo en vivo</h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  Conoce la ubicación exacta de tu unidad en el mapa y los tiempos de llegada a los puntos de abordaje. Sin esperas a ciegas.
                </p>
              </div>
            </div>

            {/* Puntualidad */}
            <div className="md:col-span-7 bg-gray-50/80 rounded-2xl p-8 md:p-10 flex flex-col justify-between items-start border border-gray-100 transition-colors hover:bg-gray-50">
              <div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-900 shadow-sm border border-gray-200 mb-6">
                  <Icon path={mdiShieldCheckOutline} size={1} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 tracking-tight">Puntualidad y confort</h3>
                <p className="text-gray-600 text-base leading-relaxed max-w-md">
                  Nuestra moderna flota es monitoreada 24/7 para garantizar salidas a tiempo, velocidad controlada, viajes seguros y la máxima comodidad a bordo de nuestras unidades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-10 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <Icon path={mdiBus} size={0.8} className="text-gray-400" />
            <span>InterlocApp</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">
            © 2026 Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
