"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@mdi/react";
import { mdiEmailOutline, mdiLockOutline, mdiArrowLeft } from "@mdi/js";
import { Logo } from "@/frontend/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const goForgot = () => router.push("/forgot");
  const goSignup = () => router.push("/signup");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Lado izquierdo oscuro con Manrope */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-16 flex-col justify-between relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer z-10">
          <Logo size={1} />
          <span className="font-extrabold text-white text-xl tracking-tight">InterlocApp</span>
        </Link>

        <div className="relative z-10 text-white max-w-lg my-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-[1.12] tracking-tight mb-6">
            Tu viaje comienza
            <br />
            aquí
          </h2>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
            Inicia sesión para comprar tus boletos, elegir tus asientos favoritos y llevar un registro puntual de todos tus viajes.
          </p>
        </div>

        <p className="text-xs text-gray-500 z-10">
          © {new Date().getFullYear()} InterlocApp. Transporte interurbano seguro.
        </p>
      </div>

      {/* Formulario unificado */}
      <div className="flex-1 bg-white relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <Link
          href="/"
          className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Icon path={mdiArrowLeft} size={0.7} /> Volver al inicio
        </Link>

        <div className="w-full max-w-md mx-auto pt-8 sm:pt-0">
          <div className="mb-8">
            <div className="mb-4 lg:hidden">
              <Logo size={1} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-sm text-gray-500">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiEmailOutline} size={0.8} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiLockOutline} size={0.8} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={goForgot}
                className="text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-3.5 rounded-2xl flex items-center justify-center transition-all mt-4 cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
            >
              Entrar
            </button>
          </form>

          <div className="mt-8 text-center text-xs sm:text-sm text-gray-500 font-medium">
            ¿No tienes cuenta?{" "}
            <button
              onClick={goSignup}
              className="text-primary hover:text-primary-dark font-bold transition-colors cursor-pointer"
            >
              Regístrate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
