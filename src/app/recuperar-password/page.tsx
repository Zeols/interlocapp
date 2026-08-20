"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { DarkPanel } from "@/components/ui/DarkPanel";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="h-screen grid grid-cols-2">
      <DarkPanel
        title={<>Recupera tu<br />acceso</>}
        subtitle="Te enviaremos un enlace a tu correo para que puedas restablecer tu contraseña de forma segura."
      />
      <div className="bg-white h-screen overflow-auto relative flex items-center justify-center">
        <button
          onClick={() => router.push("/")}
          className="absolute top-6 left-6 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Volver al inicio
        </button>
        <div className="w-full max-w-[340px] px-4">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-[#F97316] rounded-2xl flex items-center justify-center shadow-sm">
              <Lock className="text-white w-7 h-7" />
            </div>
          </div>
          <h2 className="text-center text-2xl font-black text-gray-950 mb-1">Recuperar Contraseña</h2>
          <p className="text-center text-gray-500 text-sm mb-8">Ingresa tu correo para recibir un enlace</p>
          {sent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <p className="font-bold text-gray-950 mb-1">¡Enlace enviado!</p>
              <p className="text-sm text-gray-500 mb-6">Revisa tu bandeja de entrada.</p>
              <button
                onClick={() => router.push("/login")}
                className="text-sm text-[#F97316] font-medium hover:text-orange-600 transition-colors"
              >
                ← Volver al inicio
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@cooperativa.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-black py-4 rounded-full transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
              >
                Enviar enlace
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Volver al inicio
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
