"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { 
  mdiAccountPlus, 
  mdiAccountOutline,
  mdiEmailOutline, 
  mdiLockOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiArrowLeft
} from "@mdi/js";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const goBack = () => router.push("/");
  const goLogin = () => router.push("/login");

  const passwordsMatch = confirmPassword !== "" && password === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && password !== confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { 
      setError("Las contraseñas no coinciden"); 
      return; 
    }
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Lado izquierdo oscuro */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-16 flex-col justify-center relative overflow-hidden">
        <div className="relative z-10 text-white max-w-lg">
          <h2 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight mb-6">
            Únete a<br />
            nosotros
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            Crea tu cuenta en segundos y empieza a viajar cómodo. Compra boletos, elige tu asiento y rastrea tu unidad en tiempo real.
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
              <Icon path={mdiAccountPlus} size={1.5} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Crear Cuenta</h2>
            <p className="text-gray-500">
              Completa tus datos para registrarte
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Nombre Completo</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiAccountOutline} size={0.9} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="María González Pérez"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

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
            
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiLockOutline} size={0.9} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon path={showPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.9} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiLockOutline} size={0.9} />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Repite tu contraseña"
                  className={`w-full bg-gray-50 border text-gray-900 text-base rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 transition-all ${
                    passwordsMismatch ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 
                    passwordsMatch ? 'border-green-400 focus:ring-green-500/20 focus:border-green-500' : 
                    'border-gray-200 focus:ring-primary/20 focus:border-primary'
                  }`}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon path={showConfirm ? mdiEyeOffOutline : mdiEyeOutline} size={0.9} />
                </button>
              </div>
              {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-6"
            >
              Registrarse
            </button>
          </form>
          
          <div className="mt-8 text-center text-gray-500 font-medium">
            ¿Ya tienes cuenta?{' '}
            <button 
              onClick={goLogin}
              className="text-primary hover:text-primary-dark font-bold transition-colors"
            >
              Inicia Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
