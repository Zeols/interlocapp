"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bus, Mail, Lock, ArrowRight } from "lucide-react";
import { DarkPanel } from "@/components/ui/DarkPanel";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement real authentication
    router.push("/home");
  };

  return (
    <div className="h-screen grid grid-cols-2">
      <DarkPanel
        title={<>Tu viaje comienza<br />aquí</>}
        subtitle="Inicia sesión para comprar tus boletos, elegir tus asientos y llevar un registro de todos tus viajes."
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
              <Bus className="text-white w-7 h-7" />
            </div>
          </div>
          <h2 className="text-center text-2xl font-black text-gray-950 mb-1">Iniciar Sesión</h2>
          <p className="text-center text-gray-500 text-sm mb-8">Ingresa tus credenciales para continuar</p>
          <form onSubmit={handleLogin} className="space-y-4">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                  required
                />
              </div>
            </div>
            <div className="text-right">
              <Link
                href="/recuperar-password"
                className="text-sm text-[#F97316] hover:text-orange-600 font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <button
              type="submit"
              className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-black py-4 rounded-full transition-all shadow-sm flex items-center justify-center gap-2 mt-1"
            >
              Entrar
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              ¿No tienes cuenta?{" "}
              <Link
                href="/registro"
                className="text-[#F97316] font-semibold hover:text-orange-600 transition-colors"
              >
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
