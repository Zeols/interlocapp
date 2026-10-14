"use client";

import React, { useState } from "react";
import Icon from "@mdi/react";
import { mdiBellOutline, mdiEarth, mdiCreditCardOutline, mdiCheckCircleOutline } from "@mdi/js";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"notifications" | "region" | "payments">("notifications");
  const [emailTickets, setEmailTickets] = useState(true);
  const [promos, setPromos] = useState(false);
  const [currency, setCurrency] = useState("NIO");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 w-full">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">Ajustes</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1.5">Configura tus preferencias y experiencia en la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
        {/* Navigation Tabs */}
        <div className="md:col-span-1">
          <nav className="flex flex-row md:flex-col gap-2">
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer text-xs sm:text-sm font-bold transition-all ${
                activeTab === "notifications"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon path={mdiBellOutline} size={0.8} />
              Notificaciones
            </button>
            <button
              onClick={() => setActiveTab("region")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer text-xs sm:text-sm font-bold transition-all ${
                activeTab === "region"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon path={mdiEarth} size={0.8} />
              Región e Idioma
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer text-xs sm:text-sm font-bold transition-all ${
                activeTab === "payments"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon path={mdiCreditCardOutline} size={0.8} />
              Métodos de Pago
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2">
          {activeTab === "notifications" && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Notificaciones</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Elige qué avisos quieres recibir en tu correo electrónico.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">Boletos Comprados</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Recibe tus boletos digitales y comprobantes inmediatamente.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailTickets(!emailTickets)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${emailTickets ? 'bg-primary' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={emailTickets}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                        emailTickets ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px w-full bg-gray-100" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">Promociones y Descuentos</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Entérate de tarifas especiales en rutas interurbanas seleccionadas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromos(!promos)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${promos ? 'bg-primary' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={promos}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                        promos ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {saved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs sm:text-sm font-semibold mt-6">
                  <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-500 shrink-0" />
                  Preferencias guardadas exitosamente.
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}

          {activeTab === "region" && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Región e Idioma</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Ajusta la moneda y formato de visualización de precios.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Moneda de Facturación
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="NIO">Córdoba Nicaragüense (C$ - NIO)</option>
                    <option value="USD">Dólar Estadounidense ($ - USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Idioma
                  </label>
                  <select
                    defaultValue="es"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="es">Español (Latinoamérica)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              {saved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs sm:text-sm font-semibold mt-6">
                  <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-500 shrink-0" />
                  Configuración regional actualizada.
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Métodos de Pago</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Opciones registradas para compra rápida en terminales y web.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50/80 border border-gray-100 rounded-2xl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-xs">
                      <Icon path={mdiCreditCardOutline} size={0.8} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Billetera Digital / Tarjeta Local</p>
                      <p className="text-xs text-gray-400">Terminación en •••• 4242</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Activa
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-xs"
                >
                  Agregar Nuevo Método
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
