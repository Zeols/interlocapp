"use client";

import React, { useState } from "react";
import Icon from "@mdi/react";
import { mdiAccountOutline, mdiKeyOutline, mdiCheckCircleOutline } from "@mdi/js";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"personal" | "password">("personal");
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("User");
  const [email, setEmail] = useState("user@ejemplo.com");
  const [phone, setPhone] = useState("+505 8888 8888");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 w-full">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">Perfil</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1.5">Gestiona tu información personal y opciones de seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
        {/* Navigation Tabs */}
        <div className="md:col-span-1">
          <nav className="flex flex-row md:flex-col gap-2">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer text-xs sm:text-sm font-bold transition-all ${
                activeTab === "personal"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon path={mdiAccountOutline} size={0.8} />
              Datos Personales
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer text-xs sm:text-sm font-bold transition-all ${
                activeTab === "password"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon path={mdiKeyOutline} size={0.8} />
              Contraseña
            </button>
          </nav>
        </div>

        {/* Form Panel */}
        <div className="md:col-span-2">
          {activeTab === "personal" ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Datos Personales</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Actualiza tu información básica para tus próximos boletos.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+505 8888 8888"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                  />
                </div>

                {saved && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs sm:text-sm font-semibold">
                    <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-500 shrink-0" />
                    Tus cambios han sido guardados correctamente.
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Cambiar Contraseña</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Mantén tu cuenta protegida usando una contraseña segura.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                </div>

                {saved && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs sm:text-sm font-semibold">
                    <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-500 shrink-0" />
                    Contraseña actualizada exitosamente.
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Actualizar Contraseña
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
