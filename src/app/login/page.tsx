"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiBus, mdiEmailOutline, mdiLockOutline, mdiArrowRight, mdiArrowLeft } from "@mdi/js";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const goBack = () => router.push("/");
  const goForgot = () => router.push("/forgot");
  const goSignup = () => router.push("/signup");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Lado izquierdo oscuro */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-16 flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 text-white max-w-lg">
          <h2 className="text-5xl font-black leading-[1.1] mb-6">
            Tu viaje comienza
            <br />
            aquí
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Inicia sesión para comprar tus boletos, elegir tus asientos y llevar
            un registro de todos tus viajes.
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
              <Icon path={mdiBus} size={1.5} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Iniciar Sesión</h2>
            <p className="text-gray-500">
              Ingresa tus credenciales para continuar
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
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
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-1">
              <button 
                type="button" 
                onClick={goForgot}
                className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-4 group"
            >
              Entrar
              <Icon path={mdiArrowRight} size={0.9} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>
          
          <div className="mt-8 text-center text-gray-500 font-medium">
            ¿No tienes cuenta?{' '}
            <button 
              onClick={goSignup}
              className="text-primary hover:text-primary-dark font-bold transition-colors"
            >
              Regístrate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
