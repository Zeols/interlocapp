"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@mdi/react";
import { mdiMenu, mdiClose, mdiTicketConfirmationOutline, mdiAccountOutline } from "@mdi/js";
import { BrowserCard } from "@/frontend/components/ui/BrowserCard";
import { RoutesSlider } from "@/frontend/components/ui/RoutesSlider";
import { Logo } from "@/frontend/components/ui/Logo";
import { Footer } from "@/frontend/components/layout/Footer";
import { UserChip } from "@/frontend/components/ui/UserChip";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { getUserProfileAction } from "@/backend/actions/usuarios";

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    nombre: string;
    correo: string;
    rolNombre: string;
    avatarUrl?: string | null;
  } | null>(null);

  const loadProfile = () => {
    getUserProfileAction().then((res) => {
      if (res.success && res.data) {
        setUser({
          nombre: res.data.nombreCompleto || res.data.nombre || res.data.usuario || "Pasajero",
          correo: res.data.correo,
          rolNombre: res.data.rolNombre,
          avatarUrl: res.data.foto,
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
      }>;
      if (customEvent.detail) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                ...(customEvent.detail.foto !== undefined ? { avatarUrl: customEvent.detail.foto } : {}),
                ...(customEvent.detail.name ? { nombre: customEvent.detail.name } : {}),
              }
            : null
        );
      }
      loadProfile();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const goLogin = () => {
    router.push("/login");
  };

  const goSignup = () => {
    router.push("/signup");
  };

  const handlePrimaryAction = () => {
    if (user) {
      const destination = ["SUPER_ADMIN", "ADMIN_COOP", "TAQUILLERO"].includes(user.rolNombre)
        ? "/dashboard"
        : "/home";
      router.push(destination);
    } else {
      router.push("/login");
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash) {
      window.history.pushState(null, "", "/");
    }
  };

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
          window.history.pushState(null, "", `#${sectionId}`);
        } catch {
          // ignore
        }
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col relative overflow-x-clip">
      {/* Barra de navegación perpetua (Fixed top) unificada con el diseño de Home */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs w-full">
        <nav className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 max-w-6xl mx-auto w-full">
          {/* Bloque Izquierdo: Logo + Secciones en pastillas idénticas */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/"
              onClick={handleLogoClick}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="Ir al inicio"
            >
              <Logo size={0.88} />
              <span className="font-extrabold text-gray-900 text-lg sm:text-xl tracking-tight transition-colors group-hover:text-primary">
                InterlocApp
              </span>
            </Link>

            {/* Enlaces en pastillas limpias unificadas (Desktop) */}
            <div className="hidden md:flex items-center gap-1 text-sm font-semibold text-gray-700">
              <button
                onClick={() => scrollToSection("rutas")}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer select-none"
              >
                Rutas
              </button>
              <button
                onClick={() => scrollToSection("como-funciona")}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer select-none"
              >
                Cómo funciona
              </button>
              <button
                onClick={() => scrollToSection("beneficios")}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer select-none"
              >
                Beneficios
              </button>
            </div>
          </div>

          {/* Bloque Derecho: Perfil de Usuario o Botones de Autenticación */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={["SUPER_ADMIN", "ADMIN_COOP", "TAQUILLERO"].includes(user.rolNombre) ? "/dashboard" : "/home"}
                  className="flex items-center justify-center w-8.5 h-8.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-xs transition-colors cursor-pointer"
                  title="Ir al portal"
                  aria-label="Ir al portal"
                >
                  <Icon path={mdiTicketConfirmationOutline} size={0.7} />
                </Link>
                <UserChip name={user.nombre} email={user.correo} avatarUrl={user.avatarUrl} />
              </div>
            ) : (
              <>
                <motion.button
                  onClick={goLogin}
                  whileTap={{ scale: 0.94 }}
                  className="hidden md:inline-flex px-3.5 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Iniciar sesión
                </motion.button>
                <motion.button
                  onClick={goSignup}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.94 }}
                  className="hidden md:inline-flex bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-1.5 rounded-full text-sm transition-all duration-200 cursor-pointer shadow-xs hover:shadow-sm"
                >
                  Regístrate
                </motion.button>
              </>
            )}

            {/* Botón de Menú Hamburguesa para Móvil */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center w-8.5 h-8.5 rounded-full bg-gray-50 border border-gray-200/80 text-gray-700 hover:bg-gray-100 transition-colors md:hidden cursor-pointer"
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú de navegación"}
              aria-expanded={mobileMenuOpen}
            >
              <Icon path={mobileMenuOpen ? mdiClose : mdiMenu} size={0.75} />
            </button>
          </div>
        </nav>

        {/* Menú Desplegable Móvil para las Secciones de la Landing Page */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden border-t border-gray-100 bg-white/98 backdrop-blur-md overflow-hidden shadow-xl"
            >
              <div className="px-4 py-3 space-y-1">
                <button
                  type="button"
                  onClick={() => scrollToSection("rutas")}
                  className="w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left cursor-pointer"
                >
                  Rutas
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("como-funciona")}
                  className="w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left cursor-pointer"
                >
                  Cómo funciona
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("beneficios")}
                  className="w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left cursor-pointer"
                >
                  Beneficios
                </button>

                <div className="h-px bg-gray-100 my-2" />

                {user ? (
                  <div className="pt-1 pb-2 flex flex-col gap-2">
                    <Link
                      href={["SUPER_ADMIN", "ADMIN_COOP", "TAQUILLERO"].includes(user.rolNombre) ? "/dashboard" : "/home"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Icon path={mdiTicketConfirmationOutline} size={0.75} />
                      <span>Ir al portal</span>
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Icon path={mdiAccountOutline} size={0.75} />
                      <span>Mi Perfil</span>
                    </Link>
                  </div>
                ) : (
                  <div className="pt-1 pb-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        goLogin();
                      }}
                      className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors text-center cursor-pointer"
                    >
                      Iniciar sesión
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        goSignup();
                      }}
                      className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary-dark active:scale-[0.99] transition-all text-center shadow-sm shadow-primary/20 cursor-pointer"
                    >
                      Regístrate
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section: Ocupa la pantalla completa de forma responsiva */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-24 md:pt-28 pb-10 min-h-[calc(100dvh-4rem)] flex items-center grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 relative z-10">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.14] tracking-tight mb-4">
            Viajá cómodo sin hacer filas
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mb-8 max-w-lg leading-relaxed">
            Compra tus boletos de interlocal en línea, elegí tu asiento favorito de antemano y viajá de la mejor forma.
          </p>

          {/* Llamados a la acción minimalistas (Sin saturar) */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              onClick={handlePrimaryAction}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm shadow-primary/20 text-sm font-semibold"
            >
              {user ? "Ir a reservar" : "Comenzar reserva"}
            </motion.button>
            <motion.a
              href="#rutas"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold transition-colors cursor-pointer text-sm inline-flex items-center justify-center"
            >
              Ver rutas
            </motion.a>
          </div>

          {/* Métricas (Intactas) */}
          <div className="flex items-center gap-10 mt-10 border-t border-gray-100 pt-7">
            <div>
              <p className="text-3xl font-black text-gray-900 tracking-tight">0</p>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mt-0.5">Pasajeros actuales</p>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 tracking-tight">30m</p>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mt-0.5">Salidas puntuales</p>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta Boleto Minimalista */}
        <div className="lg:col-span-5 w-full flex justify-center mt-3 lg:mt-0">
          <BrowserCard />
        </div>
      </main>

      {/* Sección Rutas: A pantalla completa y con anclaje limpio */}
      <section id="rutas" className="w-full relative border-t border-gray-200 scroll-mt-16 min-h-[calc(100dvh-4rem)] flex flex-col justify-center">
        <RoutesSlider />
      </section>

      {/* Sección 2: Cómo funciona la app (A pantalla completa y con anclaje limpio) */}
      <section id="como-funciona" className="bg-white py-16 md:py-20 border-t border-gray-100 scroll-mt-16 min-h-[calc(100dvh-4rem)] flex flex-col justify-center">
        <div className="max-w-6xl mx-auto px-6 md:px-8 w-full">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-10">
            Cómo funciona
          </h2>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <li className="border-t-2 border-gray-900 pt-5">
              <span className="block text-3xl font-black text-primary mb-3 tabular-nums">1</span>
              <h3 className="text-base font-extrabold text-gray-900 mb-1.5 tracking-tight">Busca tu ruta</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Elige origen, destino y la fecha en la que quieres viajar.
              </p>
            </li>
            <li className="border-t-2 border-gray-900 pt-5">
              <span className="block text-3xl font-black text-primary mb-3 tabular-nums">2</span>
              <h3 className="text-base font-extrabold text-gray-900 mb-1.5 tracking-tight">Elige tu asiento</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Revisa el croquis de la unidad y aparta ventana o pasillo.
              </p>
            </li>
            <li className="border-t-2 border-gray-900 pt-5">
              <span className="block text-3xl font-black text-primary mb-3 tabular-nums">3</span>
              <h3 className="text-base font-extrabold text-gray-900 mb-1.5 tracking-tight">Aborda con tu boleto</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Muestra el boleto digital al abordar. No hace falta imprimirlo.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Sección 3: Beneficios (A pantalla completa y con anclaje limpio) */}
      <section id="beneficios" className="bg-white py-16 md:py-20 relative z-10 border-t border-gray-100 scroll-mt-16 min-h-[calc(100dvh-4rem)] flex flex-col justify-center">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="mb-10 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight max-w-2xl">
              Viajar ya no tiene que ser complicado.
            </h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-xl leading-relaxed">
              Rediseñamos la experiencia de viajar en autobús. Desde la compra hasta la llegada, todo el control está en tu celular.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
            {/* Principal: Compra Anticipada */}
            <div className="md:col-span-7 bg-gray-50 rounded-2xl p-6 md:p-8 flex flex-col justify-between items-start border border-gray-100 transition-colors hover:bg-gray-100/70">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-2.5 tracking-tight">Compra anticipada</h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-md">
                  Olvídate de las filas en la terminal. Compra, reserva y administra tus boletos directamente desde tu dispositivo, con múltiples métodos de pago seguros.
                </p>
              </div>
              <Link href={user ? "/home" : "/login"} className="mt-6 inline-flex items-center text-gray-900 font-bold text-sm hover:text-primary transition-colors">
                Comprar ahora
              </Link>
            </div>

            {/* Secundario: Elige tu Asiento */}
            <div className="md:col-span-5 bg-gray-900 text-white rounded-2xl p-6 md:p-8 flex flex-col justify-between items-start">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold mb-2.5 tracking-tight">Elige tu asiento</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Revisa el mapa del autobús en tiempo real y escoge tu lugar favorito con total libertad antes de abordar.
                </p>
              </div>
              <Link href={user ? "/trips" : "/login"} className="mt-6 inline-flex items-center text-white font-bold text-sm hover:text-gray-300 transition-colors">
                Ver mapa de unidades
              </Link>
            </div>

            {/* Puntualidad */}
            <div className="md:col-span-12 bg-gray-50 rounded-2xl p-6 md:p-8 flex flex-col justify-between items-start border border-gray-100 transition-colors hover:bg-gray-100/70">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-2.5 tracking-tight">Puntualidad y confort</h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-md">
                  Nuestra moderna flota es monitoreada 24/7 para garantizar salidas a tiempo, velocidad controlada, viajes seguros y la máxima comodidad a bordo de nuestras unidades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimalista y unificado */}
      <Footer />
    </div>
  );
}
