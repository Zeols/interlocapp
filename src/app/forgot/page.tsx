"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiLockOutline, mdiEmailOutline, mdiArrowRight, mdiArrowLeft, mdiCheckCircleOutline } from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const goBack = () => router.push("/");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Lado izquierdo oscuro */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-16 flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 text-white max-w-lg">
          <h2 className="text-5xl font-black leading-[1.1] mb-6">
            Recupera tu
            <br />
            acceso
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Te enviaremos un enlace a tu correo para que puedas restablecer tu contraseña de forma segura.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 bg-white relative flex flex-col justify-center p-8 lg:p-16">
        <button 
          onClick={goBack} 
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <Icon path={mdiArrowLeft} size={0.7} /> Volver al inicio
        </button>
        
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
              <Icon path={mdiLockOutline} size={1.5} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Recuperar Contraseña</h2>
            <p className="text-gray-500">
              Ingresa tu correo para recibir un enlace
            </p>
          </div>
          
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-6"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon path={mdiCheckCircleOutline} size={1.5} className="text-emerald-500" />
                </div>
                <p className="font-bold text-gray-900 mb-1">¡Enlace enviado!</p>
                <p className="text-sm text-gray-500 mb-6">Revisa tu bandeja de entrada.</p>
                <button
                  onClick={goBack}
                  className="text-sm font-medium text-primary hover:text-primary-dark transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Icon path={mdiArrowLeft} size={0.6} />
                  Volver al inicio
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
                  <label className="block text-sm font-bold text-gray-900 mb-2">Correo electrónico</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Icon path={mdiEmailOutline} size={0.9} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@cooperativa.com"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-6 group"
                >
                  Enviar enlace
                  <Icon path={mdiArrowRight} size={0.9} className="transition-transform group-hover:translate-x-1" />
                </button>
                
                <div className="text-center pt-1 mt-4">
                  <button 
                    type="button" 
                    onClick={goBack} 
                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <Icon path={mdiArrowLeft} size={0.6} />
                    Volver al inicio
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
