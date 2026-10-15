"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiBus } from "@mdi/js";

interface RouteSlide {
  id: string;
  name: string;
  origin: string;
  destination: string;
  department: string;
  description: string;
  image: string;
  fallbackBg: string;
}

const slides: RouteSlide[] = [
  {
    id: "leon",
    name: "León",
    origin: "Managua",
    destination: "León",
    department: "Occidente",
    description: "Salidas directas frecuentes hacia la ciudad universitaria, terminal central y conexiones a poneloya.",
    image: "/routes/leon.jpg",
    fallbackBg: "#1e293b",
  },
  {
    id: "granada",
    name: "Granada",
    origin: "Managua",
    destination: "Granada",
    department: "Oriente",
    description: "Ruta directa desde la capital hacia la gran sultana colonial, el malecón y las isletas.",
    image: "/routes/granada.jpg",
    fallbackBg: "#0f766e",
  },
  {
    id: "esteli",
    name: "Estelí",
    origin: "Managua",
    destination: "Estelí",
    department: "Norte",
    description: "Viajes interurbanos hacia el diamante de las segovias, clima fresco y corredor norte.",
    image: "/routes/esteli.jpg",
    fallbackBg: "#334155",
  },
];

export function RoutesSlider() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const activeSlide = slides[current];

  const handleBook = () => {
    router.push("/login");
  };

  return (
    <div className="relative w-full min-h-[calc(100dvh-4rem)] bg-gray-950 overflow-hidden select-none">
      {/* Fondo / Imagen de la diapositiva activa que ocupa todo el ancho */}
      <div className="absolute inset-0 w-full h-full">
        {slides.map((slide, index) => {
          const isActive = index === current;
          const isFailed = Boolean(failedImages[slide.id]);

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
              }`}
              style={{ backgroundColor: slide.fallbackBg }}
            >
              {/* Imagen a pantalla completa */}
              {!isFailed && (
                <img
                  src={slide.image}
                  alt={`${slide.origin} a ${slide.destination}`}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setFailedImages((prev) => ({ ...prev, [slide.id]: true }));
                  }}
                  ref={(el) => {
                    if (el && el.complete && el.naturalWidth === 0) {
                      setFailedImages((prev) => ({ ...prev, [slide.id]: true }));
                    }
                  }}
                />
              )}

              {/* Overlay oscuro para contraste sobre la fotografía */}
              {!isFailed && <div className="absolute inset-0 bg-black/45" />}

              {/* Contenedor de apoyo únicamente si aún no hay foto cargada o falló */}
              {isFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white/40">
                  <Icon path={mdiBus} size={3} className="text-white/20 mb-3" />
                  <span className="text-xs uppercase tracking-widest text-white/50">
                    Agrega tu foto en {slide.image}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contenido centrado dentro de la pantalla completa */}
      <div className="relative z-20 h-full max-w-6xl mx-auto px-10 sm:px-14 md:px-16 flex flex-col justify-between py-10 md:py-14">
        {/* Espaciador superior limpio sin contador */}
        <div className="h-4" />

        {/* Bloque central de información de la ruta */}
        <div className="max-w-xl">
          <p className="text-xs sm:text-sm text-white/80 mb-2.5 font-medium">{activeSlide.department}</p>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3.5">
            {activeSlide.origin}{" "}
            <span className="text-primary font-normal">→</span>{" "}
            {activeSlide.destination}
          </h2>

          <p className="text-sm sm:text-base text-gray-200 mb-7 leading-relaxed max-w-lg">
            {activeSlide.description}
          </p>

          <button
            onClick={handleBook}
            className="text-white font-semibold text-sm sm:text-base underline underline-offset-6 decoration-2 decoration-primary hover:decoration-white transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            Ver salidas disponibles
          </button>
        </div>

        {/* Barra inferior: salto directo a cada destino */}
        <div className="flex items-center gap-6 border-t border-white/15">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrent(idx)}
              aria-current={idx === current}
              className={`pt-3 -mt-px border-t-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${idx === current
                  ? "border-primary text-white"
                  : "border-transparent text-white/60 hover:text-white"
                }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Flechas de navegación minimalistas: solo < y > */}
      <button
        onClick={prevSlide}
        aria-label="Ruta anterior"
        className="absolute left-1 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 z-30 p-2 text-white/75 hover:text-white transition-all duration-200 cursor-pointer select-none text-2xl sm:text-3xl font-light hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
      >
        &lt;
      </button>

      <button
        onClick={nextSlide}
        aria-label="Ruta siguiente"
        className="absolute right-1 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 z-30 p-2 text-white/75 hover:text-white transition-all duration-200 cursor-pointer select-none text-2xl sm:text-3xl font-light hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
      >
        &gt;
      </button>
    </div>
  );
}
