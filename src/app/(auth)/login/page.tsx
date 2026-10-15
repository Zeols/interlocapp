"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@mdi/react";
import {
  mdiEmailOutline,
  mdiLockOutline,
  mdiArrowLeft,
  mdiAlertCircleOutline,
  mdiLoading,
} from "@mdi/js";
import { Logo } from "@/frontend/components/ui/Logo";
import { loginAction } from "@/backend/actions/auth";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const response = await loginAction({
        identificador,
        password,
      });

      if (!response.success) {
        setErrorMessage(response.error || "No se pudo iniciar sesión.");
        return;
      }

      // Redirigir a la URL de destino o a la URL por defecto según su rol
      const targetUrl = redirectParam || response.data?.redirectUrl || "/home";
      router.push(targetUrl);
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Lado izquierdo oscuro con Manrope */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-12 lg:p-14 flex-col justify-between relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer z-10">
          <Logo size={0.9} variant="onDark" />
          <span className="font-extrabold text-white text-xl tracking-tight">InterlocApp</span>
        </Link>

        <div className="relative z-10 text-white max-w-md my-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-4xl font-extrabold leading-tight tracking-tight mb-4">
            Tu viaje comienza
            <br />
            aquí
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Inicia sesión para comprar tus boletos, elegir tus asientos favoritos y llevar un registro puntual de todos tus viajes.
          </p>
        </div>

        <p className="text-xs text-gray-500 z-10">
          © {new Date().getFullYear()} InterlocApp. Transporte interurbano seguro.
        </p>
      </div>

      {/* Formulario de Login */}
      <div className="flex-1 bg-white relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <Link
          href="/"
          className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Icon path={mdiArrowLeft} size={0.7} /> Volver al inicio
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md mx-auto pt-6 sm:pt-0"
        >
          <div className="mb-7">
            <div className="mb-3.5 lg:hidden">
              <Logo size={0.9} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-1.5">
              Iniciar Sesión
            </h1>
            <p className="text-sm text-gray-500">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Correo o Usuario
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiEmailOutline} size={0.75} />
                </div>
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiLockOutline} size={0.75} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex justify-end pt-0.5">
              <Link
                href="/forgot"
                className="text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer shadow-sm shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Icon path={mdiLoading} size={0.8} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          <div className="mt-7 text-center text-xs sm:text-sm text-gray-500 font-medium">
            ¿No tienes cuenta?{" "}
            <Link
              href="/signup"
              className="text-primary hover:text-primary-dark font-bold transition-colors cursor-pointer"
            >
              Regístrate
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
