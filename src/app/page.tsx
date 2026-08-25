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
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import Marquee from "@/components/magicui/marquee";

const features = [
  {
    IconPath: mdiTicketConfirmationOutline,
    name: "Compra Anticipada",
    description: "Olvídate de las filas en la terminal. Compra o reserva tu boleto desde tu celular de manera rápida y segura.",
    href: "/login",
    cta: "Comprar ahora",
    background: <div className="absolute right-0 top-0 origin-top rounded-bl-full bg-primary/10 w-32 h-32 transition-all duration-300 ease-out group-hover:scale-[1.2]"></div>,
    className: "lg:col-span-1 bg-gray-50",
    iconClassName: "bg-primary/10 text-primary",
    textClassName: "text-gray-900",
    descriptionClassName: "text-gray-500",
  },
  {
    IconPath: mdiViewGridOutline,
    name: "Elige tu Asiento",
    description: "Revisa el mapa del autobús en tiempo real y escoge tu lugar favorito con total libertad.",
    href: "/login",
    cta: "Ver mapa",
    background: <div className="absolute -right-4 -top-4 w-40 h-40 bg-rose-50 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>,
    className: "lg:col-span-2 bg-gray-50",
    iconClassName: "bg-rose-50 text-rose-500",
    textClassName: "text-gray-900",
    descriptionClassName: "text-gray-500",
  },
  {
    IconPath: mdiNavigationVariantOutline,
    name: "Rastreo en Vivo",
    description: "Conoce la ubicación exacta de tu unidad y los puntos de abordaje sin incertidumbre.",
    href: "/login",
    cta: "Rastrear",
    background: <div className="absolute left-0 bottom-0 origin-bottom rounded-tr-[100px] bg-blue-50 w-full h-32 opacity-40 group-hover:opacity-70 transition-opacity"></div>,
    className: "lg:col-span-2 bg-gray-50",
    iconClassName: "bg-blue-50 text-blue-500",
    textClassName: "text-gray-900",
    descriptionClassName: "text-gray-500",
  },
  {
    IconPath: mdiShieldCheckOutline,
    name: "Puntualidad y Confort",
    description: "Nuestra moderna flota garantiza salidas a tiempo, viajes seguros y la máxima comodidad.",
    href: "/login",
    cta: "Saber más",
    background: <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-100/50"></div>,
    className: "lg:col-span-1 bg-gray-900",
    iconClassName: "bg-white/10 text-white",
    textClassName: "text-white",
    descriptionClassName: "text-gray-400",
  },
];

const advantages = [
  { title: "Rastreo GPS en tiempo real" },
  { title: "Elige tu asiento VIP" },
  { title: "Viajes seguros y confortables" },
  { title: "Sin filas en la terminal" },
  { title: "Cancelaciones flexibles" },
];

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
      <section className="bg-gray-50 py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Por qué elegir viajar con nosotros
            </h2>
            <p className="text-lg md:text-xl text-gray-500">
              La mejor experiencia de viaje a tu alcance, potenciada por tecnología.
            </p>
          </div>

          <BentoGrid className="lg:grid-rows-2">
            {features.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </section>
    </div>
  );
}
