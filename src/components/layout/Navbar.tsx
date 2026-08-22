"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiBus, mdiArrowLeft } from "@mdi/js";
import { UserChip } from "@/components/ui/UserChip";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // We only want this specific unified Navbar on authenticated/app routes, 
  // or maybe on all routes. The user requested:
  // "Que se mantenga esa versión del nav y sólo sea un cambio de la parte de abajo de la pantalla cuando cambia a comprar boleto"
  // So the Navbar is present in /home, /trips, /compra.
  // In /trips and /home, it shows "Inicio" and "Ver viajes" links and the brand.
  // In /compra, it shows the Back Button.

  const showBackButton = pathname === "/compra";

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
      {/* Left side: Brand or Back Button */}
      {showBackButton ? (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-3 bg-transparent border-none cursor-pointer group"
        >
          <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 transition-colors group-hover:bg-primary group-hover:text-white">
            <Icon path={mdiArrowLeft} size={0.8} />
          </div>
          <span className="font-bold text-gray-900 text-lg">Turkitin</span>
        </button>
      ) : (
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white">
              <Icon path={mdiBus} size={0.8} />
            </div>
            <span className="font-bold text-gray-900 text-lg">InterlocApp</span>
          </div>
          {/* Main Links (only shown when not showing back button) */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/home"
              className={`text-sm font-bold pb-1 border-b-2 transition-colors ${pathname === "/home" ? "border-primary text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`}
            >
              Inicio
            </Link>
            <Link
              href="/trips"
              className={`text-sm font-bold pb-1 border-b-2 transition-colors ${pathname === "/trips" ? "border-primary text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`}
            >
              Ver viajes
            </Link>
          </div>
        </div>
      )}

      {/* Right side: User Profile */}
      <div className="flex items-center">
        <UserChip name="Enrique Pomares" email="enrique@gmail.com" />
      </div>
    </nav>
  );
}
