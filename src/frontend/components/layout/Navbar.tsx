"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiArrowLeft, mdiMenu, mdiClose, mdiTicketConfirmationOutline, mdiBus } from "@mdi/js";
import { UserChip } from "@/frontend/components/ui/UserChip";
import { Logo } from "@/frontend/components/ui/Logo";
import { getUserProfileAction } from "@/backend/actions/usuarios";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatarUrl?: string | null;
    rolNombre?: string;
    idCooperativa?: number | null;
  }>({
    name: "Pasajero",
    email: "pasajero@correo.com",
    avatarUrl: null,
  });

  const showBackButton = pathname === "/compra";

  const loadProfile = () => {
    getUserProfileAction().then((res) => {
      if (res.success && res.data) {
        setUser({
          name: res.data.nombreCompleto || res.data.nombre || res.data.usuario || "Pasajero",
          email: res.data.correo,
          avatarUrl: res.data.foto,
          rolNombre: res.data.rolNombre,
          idCooperativa: res.data.idCooperativa,
        });
      }
    });
  };

  useEffect(() => {
    loadProfile();

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{
        foto?: string | null;
        name?: string;
        email?: string;
      }>;
      if (customEvent.detail) {
        setUser((prev) => ({
          ...prev,
          ...(customEvent.detail.foto !== undefined ? { avatarUrl: customEvent.detail.foto } : {}),
          ...(customEvent.detail.name ? { name: customEvent.detail.name } : {}),
        }));
      }
      loadProfile();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const navLinks = [
    { label: "Inicio", href: "/home" },
    { label: "Ver viajes", href: "/trips" },
    { label: "Mis boletos", href: "/tickets" },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 max-w-6xl mx-auto w-full">
        {/* Lado izquierdo: Botón Atrás (si aplica) + Logo + Pastillas de navegación */}
        <div className="flex items-center gap-3 sm:gap-6">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="w-8.5 h-8.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 transition-colors cursor-pointer mr-0.5"
              aria-label="Volver atrás"
            >
              <Icon path={mdiArrowLeft} size={0.75} />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 cursor-pointer group" title="Ir al inicio">
            <Logo size={0.88} />
            <span className="font-extrabold text-gray-900 text-lg sm:text-xl tracking-tight transition-colors group-hover:text-primary">
              InterlocApp
            </span>
          </Link>

          {/* Enlaces en pastillas limpias unificadas (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
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

        {/* Lado derecho: Perfil de usuario dinámico + Acceso rápido + Menú Móvil */}
        <div className="flex items-center gap-2">
          {(() => {
            const isCoopUser = Boolean(
              user.idCooperativa ||
              (user.rolNombre && ["SUPER_ADMIN", "ADMIN_COOP", "CHOFER", "AYUDANTE", "TAQUILLERO"].includes(user.rolNombre))
            );
            return (
              <>
                <Link
                  href={isCoopUser ? "/dashboard" : "/tickets"}
                  className="flex items-center justify-center w-8.5 h-8.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-xs transition-colors cursor-pointer"
                  title={isCoopUser ? "Panel de Cooperativa" : "Mis Boletos"}
                  aria-label={isCoopUser ? "Panel de Cooperativa" : "Mis Boletos"}
                >
                  <Icon path={isCoopUser ? mdiBus : mdiTicketConfirmationOutline} size={0.7} />
                </Link>

                <UserChip
                  name={user.name}
                  email={user.email}
                  avatarUrl={user.avatarUrl}
                  isCoopUser={isCoopUser}
                />
              </>
            );
          })()}

          {/* Botón hamburguesa móvil */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center w-8.5 h-8.5 rounded-full bg-gray-50 border border-gray-200/80 text-gray-700 hover:bg-gray-100 sm:hidden cursor-pointer"
            aria-label="Menú de navegación"
          >
            <Icon path={mobileMenuOpen ? mdiClose : mdiMenu} size={0.75} />
          </button>
        </div>
      </nav>

      {/* Menú desplegable en dispositivos móviles */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-3 py-2 space-y-0.5 shadow-md animate-in fade-in slide-in-from-top-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
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
