"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, User, Mail, Lock, Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react";
import { DarkPanel } from "@/components/ui/DarkPanel";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = confirmPassword !== "" && password === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && password !== confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    // TODO: Implement real registration
    router.push("/home");
  };

  return (
    <div className="h-screen grid grid-cols-2">
      <DarkPanel
        title={<>Únete a<br />nosotros</>}
        subtitle="Crea tu cuenta en segundos y empieza a viajar cómodo. Compra boletos, elige tu asiento y rastrea tu unidad en tiempo real."
      />
      <div className="bg-white h-screen overflow-auto relative flex items-center justify-center py-10">
        <button
          onClick={() => router.push("/")}
          className="absolute top-6 left-6 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Volver al inicio
        </button>
        <div className="w-full max-w-[340px] px-4">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-[#F97316] rounded-2xl flex items-center justify-center shadow-sm">
              <UserPlus className="text-white w-7 h-7" />
            </div>
          </div>
          <h2 className="text-center text-2xl font-black text-gray-950 mb-1">Crear Cuenta</h2>
          <p className="text-center text-gray-500 text-sm mb-7">Completa tus datos para registrarte</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="María González Pérez"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                  required
                />
              </div>
            </div>
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Repite tu contraseña"
                  className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    passwordsMismatch
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-400"
                      : passwordsMatch
                      ? "border-green-400 focus:ring-green-500/20 focus:border-green-500"
                      : "border-gray-200 focus:ring-orange-500/20 focus:border-[#F97316]"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordsMatch && (
                <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Las contraseñas coinciden
                </p>
              )}
              {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-black py-4 rounded-full transition-all shadow-sm flex items-center justify-center gap-2 mt-1"
            >
              Registrarse
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-[#F97316] font-semibold hover:text-orange-600 transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
