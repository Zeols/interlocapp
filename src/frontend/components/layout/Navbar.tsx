"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiArrowLeft, mdiMenu, mdiClose } from "@mdi/js";
import { UserChip } from "@/frontend/components/ui/UserChip";
import { Logo } from "@/frontend/components/ui/Logo";
import { getCurrentUserAction } from "@/backend/actions/auth";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string }>({
    name: "Pasajero",
    email: "pasajero@correo.com",
  });

  const showBackButton = pathname === "/compra";

  useEffect(() => {
    getCurrentUserAction().then((session) => {
      if (session) {
        setUser({
          name: session.nombre || session.usuario || "Pasajero",
          email: session.correo,
        });
      }
    });
  }, []);

  const navLinks = [
    { label: "Inicio", href: "/home" },
    { label: "Ver viajes", href: "/trips" },
    { label: "Mis boletos", href: "/tickets" },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3.5 max-w-7xl mx-auto w-full">
        {/* Lado izquierdo: Botón Atrás (si aplica) + Logo + Pastillas de navegación */}
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

          {/* Enlaces en pastillas limpias unificadas (Desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Lado derecho: Perfil de usuario dinámico + Menú Móvil */}
        <div className="flex items-center gap-2">
          <UserChip name={user.name} email={user.email} />

          {/* Botón hamburguesa móvil */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 border border-gray-200/80 text-gray-700 hover:bg-gray-100 sm:hidden cursor-pointer"
            aria-label="Menú de navegación"
          >
            <Icon path={mobileMenuOpen ? mdiClose : mdiMenu} size={0.8} />
          </button>
        </div>
      </nav>

      {/* Menú desplegable en dispositivos móviles */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-lg animate-in fade-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
export default Navbar;
