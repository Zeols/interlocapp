"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiArrowLeft } from "@mdi/js";
import { UserChip } from "@/frontend/components/ui/UserChip";
import { Logo } from "@/frontend/components/ui/Logo";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const showBackButton = pathname === "/compra";

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs sticky top-0 z-50 px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between max-w-7xl mx-auto w-full">
      {/* Lado izquierdo: Botón Atrás (si aplica) + Logo de marca que redirige al inicio de la landing page */}
      <div className="flex items-center gap-3 sm:gap-6">
        {showBackButton && (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center text-gray-600 transition-colors cursor-pointer mr-0.5"
            aria-label="Volver atrás"
          >
            <Icon path={mdiArrowLeft} size={0.8} />
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group" title="Ir al inicio">
          <Logo size={0.9} />
          <span className="font-extrabold text-gray-900 text-lg sm:text-xl tracking-tight transition-colors group-hover:text-primary">
            InterlocApp
          </span>
        </Link>

        {/* Enlaces en pastillas limpias unificadas */}
        <div className="flex items-center gap-1">
          <Link
            href="/home"
            className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
              pathname === "/home"
                ? "bg-gray-900 text-white shadow-xs"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Inicio
          </Link>
          <Link
            href="/trips"
            className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
              pathname === "/trips"
                ? "bg-gray-900 text-white shadow-xs"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Ver viajes
          </Link>
        </div>
      </div>

      {/* Lado derecho: Perfil de usuario */}
      <div className="flex items-center">
        <UserChip name="User" email="user@ejemplo.com" />
      </div>
    </nav>
  );
}
