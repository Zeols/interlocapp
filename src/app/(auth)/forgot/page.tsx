"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@mdi/react";
import { mdiEmailOutline, mdiArrowLeft, mdiCheckCircleOutline } from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/frontend/components/ui/Logo";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const goBack = () => router.push("/login");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Lado izquierdo oscuro */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-16 flex-col justify-between relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer z-10">
          <Logo size={1} variant="onDark" />
          <span className="font-extrabold text-white text-xl tracking-tight">InterlocApp</span>
        </Link>

        <div className="relative z-10 text-white max-w-lg my-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-[1.12] tracking-tight mb-6">
            Recupera tu
            <br />
            acceso
          </h2>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
            Te enviaremos un enlace a tu correo para que puedas restablecer tu contraseña de forma segura y sin complicaciones.
          </p>
        </div>

        <p className="text-xs text-gray-500 z-10">
          © {new Date().getFullYear()} InterlocApp. Transporte interurbano seguro.
        </p>
      </div>

      {/* Formulario */}
      <div className="flex-1 bg-white relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <button
          onClick={goBack}
          className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Icon path={mdiArrowLeft} size={0.7} /> Volver a inicio de sesión
        </button>

        <div className="w-full max-w-md mx-auto pt-8 sm:pt-0">
          <div className="mb-8">
            <div className="mb-4 lg:hidden">
              <Logo size={1} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Recuperar Contraseña
            </h1>
            <p className="text-sm text-gray-500">
              Ingresa tu correo para recibir un enlace de recuperación
            </p>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-6 bg-gray-50/80 rounded-3xl border border-gray-100 p-8"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <Icon path={mdiCheckCircleOutline} size={1.3} />
                </div>
                <h3 className="font-extrabold text-gray-900 text-lg mb-1">¡Enlace enviado!</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Hemos enviado las instrucciones a <span className="font-semibold text-gray-700">{email}</span>.
                </p>
                <button
                  onClick={goBack}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm px-6 py-3 rounded-2xl transition-all shadow-xs cursor-pointer"
                >
                  Regresar a Iniciar Sesión
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSend}
                className="space-y-4"
              >
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

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-3.5 rounded-2xl flex items-center justify-center transition-all mt-4 cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Enviar enlace
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center text-xs sm:text-sm text-gray-500 font-medium">
            ¿Recordaste tu contraseña?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-dark font-bold transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
