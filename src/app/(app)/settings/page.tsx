"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiBellOutline,
  mdiEarth,
  mdiCreditCardOutline,
  mdiCheckCircleOutline,
  mdiPlus,
  mdiDeleteOutline,
  mdiShieldCheckOutline,
  mdiLoading,
  mdiAlertCircleOutline,
  mdiTranslate,
  mdiCurrencyUsd,
  mdiCheck,
  mdiClose,
  mdiCreditCardCheckOutline,
} from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency, CurrencyType } from "@/frontend/context/CurrencyContext";
import { changeAppLanguage } from "@/frontend/components/ui/GoogleTranslateScript";
import {
  getMetodosPagoUsuarioAction,
  createMetodoPagoAction,
  setDefaultMetodoPagoAction,
  deleteMetodoPagoAction,
} from "@/backend/actions/metodos-pago";
import { TipoMetodoPago } from "@prisma/client";

interface MetodoPagoUI {
  idMetodoPago: number;
  tipo: TipoMetodoPago;
  titular: string;
  marca: string;
  ultimos4: string;
  mesExpiracion: number;
  anioExpiracion: number;
  esPredeterminado: boolean;
  createdAt: Date;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"notifications" | "region" | "payments">("notifications");

  // --- 1. NOTIFICACIONES ---
  const [emailTickets, setEmailTickets] = useState(true);
  const [promos, setPromos] = useState(false);
  const [boardingAlerts, setBoardingAlerts] = useState(true);
  const [notifSaved, setNotifSaved] = useState(false);

  // --- 2. REGIÓN, IDIOMA Y MONEDA ---
  const { currency, setCurrency, exchangeRate, formatPrice } = useCurrency();
  const [currentLanguage, setCurrentLanguage] = useState("es");
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [regionSaved, setRegionSaved] = useState(false);

  // --- 3. MÉTODOS DE PAGO (BASE DE DATOS) ---
  const [paymentMethods, setPaymentMethods] = useState<MetodoPagoUI[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Modal para agregar método de pago
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [newTitular, setNewTitular] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newMonth, setNewMonth] = useState("12");
  const [newYear, setNewYear] = useState("2028");
  const [newCvv, setNewCvv] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal para confirmar eliminación
  const [methodToDelete, setMethodToDelete] = useState<MetodoPagoUI | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Cargar preferencias iniciales y métodos de pago
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedNotifs = localStorage.getItem("interlocapp_notifications");
      if (savedNotifs) {
        try {
          const parsed = JSON.parse(savedNotifs);
          if (parsed.emailTickets !== undefined) setEmailTickets(parsed.emailTickets);
          if (parsed.promos !== undefined) setPromos(parsed.promos);
          if (parsed.boardingAlerts !== undefined) setBoardingAlerts(parsed.boardingAlerts);
        } catch {
          // ignore
        }
      }

      // Detectar idioma activo en cookies
      const match = document.cookie.match(/googtrans=\/es\/([a-z]{2})/i);
      if (match && match[1]) {
        setCurrentLanguage(match[1]);
      } else {
        setCurrentLanguage("es");
      }
    }

    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setLoadingPayments(true);
    const res = await getMetodosPagoUsuarioAction();
    if (res.success && res.data) {
      setPaymentMethods(res.data as MetodoPagoUI[]);
    } else if (res.error) {
      setPaymentError(res.error);
    }
    setLoadingPayments(false);
  };

  // Guardar notificaciones
  const handleSaveNotifications = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "interlocapp_notifications",
        JSON.stringify({ emailTickets, promos, boardingAlerts })
      );
    }
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3500);
  };

  // Manejar cambio de idioma mediante Google Translate
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    setChangingLanguage(true);
    setRegionSaved(true);
    setTimeout(() => {
      changeAppLanguage(lang);
      setChangingLanguage(false);
    }, 400);
    setTimeout(() => setRegionSaved(false), 4000);
  };

  // Manejar cambio de moneda
  const handleCurrencyChange = (newCurr: CurrencyType) => {
    setCurrency(newCurr);
    setRegionSaved(true);
    setTimeout(() => setRegionSaved(false), 4000);
  };

  // Formateador visual del número de tarjeta
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = rawVal.replace(/(\d{4})(?=\d)/g, "$1 ");
    setNewCardNumber(formatted);
  };

  // Detección automática de marca
  const detectedBrand = React.useMemo(() => {
    const cleanNum = newCardNumber.replace(/\s+/g, "");
    if (cleanNum.startsWith("4")) return "VISA";
    if (/^(5[1-5]|2[2-7])/.test(cleanNum)) return "MASTERCARD";
    if (/^3[47]/.test(cleanNum)) return "AMEX";
    return "TARJETA";
  }, [newCardNumber]);

  // Manejar creación de método de pago
  const handleCreatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanCard = newCardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15) {
      setModalError("Por favor ingresa un número de tarjeta válido (15 o 16 dígitos).");
      return;
    }
    if (!newTitular.trim()) {
      setModalError("El nombre del titular es requerido.");
      return;
    }
    if (newCvv.length < 3) {
      setModalError("Ingresa un código CVV válido.");
      return;
    }

    setSavingPayment(true);
    const res = await createMetodoPagoAction({
      tipo: "TARJETA_CREDITO",
      titular: newTitular.trim().toUpperCase(),
      numeroTarjeta: cleanCard,
      marca: detectedBrand,
      mesExpiracion: parseInt(newMonth, 10),
      anioExpiracion: parseInt(newYear, 10),
      esPredeterminado: newIsDefault,
    });
    setSavingPayment(false);

    if (res.success) {
      setShowAddModal(false);
      setNewTitular("");
      setNewCardNumber("");
      setNewCvv("");
      setNewIsDefault(false);
      setPaymentSuccess("Método de pago registrado exitosamente en tu cuenta.");
      setTimeout(() => setPaymentSuccess(null), 4000);
      loadPaymentMethods();
    } else {
      setModalError(res.error || "No se pudo guardar la tarjeta.");
    }
  };

  // Marcar como predeterminado
  const handleSetDefault = async (idMetodoPago: number) => {
    const res = await setDefaultMetodoPagoAction(idMetodoPago);
    if (res.success) {
      setPaymentSuccess("Método establecido como predeterminado para compras.");
      setTimeout(() => setPaymentSuccess(null), 4000);
      loadPaymentMethods();
    } else {
      setPaymentError(res.error || "No se pudo actualizar el método.");
    }
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!methodToDelete) return;
    setDeletingId(methodToDelete.idMetodoPago);
    const res = await deleteMetodoPagoAction(methodToDelete.idMetodoPago);
    setDeletingId(null);
    setMethodToDelete(null);

    if (res.success) {
      setPaymentSuccess("Método de pago eliminado exitosamente.");
      setTimeout(() => setPaymentSuccess(null), 4000);
      loadPaymentMethods();
    } else {
      setPaymentError(res.error || "No se pudo eliminar el método de pago.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Ajustes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configura tus preferencias regionales, traducción oficial y métodos de pago.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Navigation Tabs */}
        <div className="md:col-span-1 min-w-0">
          <nav className="flex flex-row md:flex-col gap-1.5 bg-slate-100/70 p-1.5 rounded-xl border border-slate-200/70 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={(e) => {
                setActiveTab("notifications");
                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg cursor-pointer text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap md:w-full md:justify-start ${
                activeTab === "notifications"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon path={mdiBellOutline} size={0.75} className="shrink-0" />
              <span>Notificaciones</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                setActiveTab("region");
                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg cursor-pointer text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap md:w-full md:justify-start ${
                activeTab === "region"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon path={mdiEarth} size={0.75} className="shrink-0" />
              <span>Región e Idioma</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                setActiveTab("payments");
                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg cursor-pointer text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap md:w-full md:justify-start ${
                activeTab === "payments"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon path={mdiCreditCardOutline} size={0.75} className="shrink-0" />
              <span>Métodos de Pago</span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2">
          {/* ======================================================== */}
          {/* TAB 1: NOTIFICACIONES */}
          {/* ======================================================== */}
          {activeTab === "notifications" && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-7 shadow-2xs">
              <div className="mb-5 pb-4 border-b border-slate-100">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Notificaciones
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Elige qué avisos quieres recibir en tu correo electrónico institucional.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-slate-900">Boletos Comprados</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Recibe tus boletos digitales y comprobantes inmediatamente con código QR.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailTickets(!emailTickets)}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      emailTickets ? "bg-primary" : "bg-slate-200"
                    }`}
                    role="switch"
                    aria-checked={emailTickets}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-2xs ${
                        emailTickets ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-slate-900">Avisos de Abordaje y Retrasos</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Alertas en tiempo real si tu autobús está en andén o presenta demoras en carretera.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBoardingAlerts(!boardingAlerts)}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      boardingAlerts ? "bg-primary" : "bg-slate-200"
                    }`}
                    role="switch"
                    aria-checked={boardingAlerts}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-2xs ${
                        boardingAlerts ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-slate-900">Promociones y Descuentos</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Entérate de tarifas especiales en rutas interurbanas seleccionadas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromos(!promos)}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      promos ? "bg-primary" : "bg-slate-200"
                    }`}
                    role="switch"
                    aria-checked={promos}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-2xs ${
                        promos ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {notifSaved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium mt-5">
                  <Icon path={mdiCheckCircleOutline} size={0.7} className="text-emerald-600 shrink-0" />
                  <span>Preferencias de notificaciones guardadas exitosamente.</span>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveNotifications}
                  className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REGIÓN E IDIOMA (ARMONIZADO - CERO COLOR SLOP) */}
          {/* ======================================================== */}
          {activeTab === "region" && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-7 shadow-2xs">
              <div className="mb-5 pb-4 border-b border-slate-100">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Región e Idioma
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajusta la moneda de facturación y traduce toda la aplicación en tiempo real con Google Translate.
                </p>
              </div>

              <div className="space-y-6">
                {/* 1. SELECCIÓN DE MONEDA (CONVERSIÓN EN VIVO) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Moneda de Visualización y Facturación
                    </label>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      Tasa Oficial BCN: 1 USD = {exchangeRate} C$
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleCurrencyChange("NIO")}
                      className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        currency === "NIO"
                          ? "bg-white border-primary ring-1 ring-primary/40 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-slate-900">Córdoba Nicaragüense (C$)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Moneda nacional estándar (NIO)</p>
                      </div>
                      {currency === "NIO" && (
                        <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                          <Icon path={mdiCheck} size={0.6} />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCurrencyChange("USD")}
                      className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        currency === "USD"
                          ? "bg-white border-primary ring-1 ring-primary/40 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-slate-900">Dólar Estadounidense ($)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Conversión internacional (USD)</p>
                      </div>
                      {currency === "USD" && (
                        <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                          <Icon path={mdiCheck} size={0.6} />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Tarjeta de demostración interactiva de conversión (Sobria y elegante) */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <Icon path={mdiCurrencyUsd} size={0.75} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Ejemplo en tiempo real (Ruta Managua - León):</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                          {formatPrice(85)}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            ({currency === "USD" ? "convertido de C$ 85.00" : "equivalente a $ 2.32 USD"})
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md shrink-0 shadow-2xs">
                      Conversión activa en toda la app
                    </span>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                {/* 2. SELECCIÓN DE IDIOMA (GOOGLE TRANSLATE) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Idioma de la Plataforma
                    </label>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      <Icon path={mdiTranslate} size={0.5} className="text-slate-500" />
                      Google Translate
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Selecciona tu idioma preferido. La plataforma se traducirá automáticamente en tiempo real usando el motor de Google.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {[
                      { code: "es", label: "Español", flag: "🇳🇮", sub: "Latinoamérica" },
                      { code: "en", label: "English", flag: "🇺🇸", sub: "United States" },
                      { code: "fr", label: "Français", flag: "🇫🇷", sub: "France" },
                      { code: "de", label: "Deutsch", flag: "🇩🇪", sub: "Deutschland" },
                      { code: "pt", label: "Português", flag: "🇧🇷", sub: "Brasil" },
                      { code: "it", label: "Italiano", flag: "🇮🇹", sub: "Italia" },
                    ].map((item) => {
                      const isSelected = currentLanguage === item.code;
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleLanguageChange(item.code)}
                          disabled={changingLanguage}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900 shadow-2xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl select-none shrink-0">{item.flag}</span>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-slate-900">
                                {item.label}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {item.sub}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                              <Icon path={mdiCheck} size={0.45} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {regionSaved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium mt-6">
                  <Icon path={mdiCheckCircleOutline} size={0.7} className="text-emerald-600 shrink-0" />
                  <span>Ajustes regionales actualizados correctamente.</span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MÉTODOS DE PAGO (BASE DE DATOS REAL CON SERVER ACTIONS) */}
          {/* ======================================================== */}
          {activeTab === "payments" && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-7 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Métodos de Pago
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tarjetas y billeteras guardadas en tu perfil para compra rápida en ventanilla y web.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setShowAddModal(true);
                  }}
                  className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <Icon path={mdiPlus} size={0.65} />
                  <span>Agregar Tarjeta</span>
                </button>
              </div>

              {/* Mensajes de feedback */}
              {paymentSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium mb-4">
                  <Icon path={mdiCheckCircleOutline} size={0.7} className="text-emerald-600 shrink-0" />
                  <span>{paymentSuccess}</span>
                </div>
              )}
              {paymentError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-medium mb-4">
                  <Icon path={mdiAlertCircleOutline} size={0.7} className="text-red-600 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Estado de carga */}
              {loadingPayments ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                  <Icon path={mdiLoading} size={1.2} className="animate-spin text-primary" />
                  <p className="text-xs font-medium">Consultando métodos en la base de datos...</p>
                </div>
              ) : paymentMethods.length === 0 ? (
                /* Estado vacío */
                <div className="py-12 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-3 shadow-2xs">
                    <Icon path={mdiCreditCardOutline} size={1.2} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">No tienes métodos de pago registrados</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    Agrega tu tarjeta de débito o crédito para comprar tus boletos rápidamente.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Icon path={mdiPlus} size={0.65} />
                    <span>Registrar Tarjeta Ahora</span>
                  </button>
                </div>
              ) : (
                /* Lista de métodos de pago */
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.idMetodoPago}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        pm.esPredeterminado
                          ? "bg-white border-primary/40 ring-1 ring-primary/20 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 text-slate-800 font-bold text-xs shrink-0">
                          {pm.marca === "VISA" && <span className="text-blue-700 font-extrabold text-xs">VISA</span>}
                          {pm.marca === "MASTERCARD" && <span className="text-red-600 font-extrabold text-xs">MC</span>}
                          {pm.marca === "AMEX" && <span className="text-cyan-700 font-extrabold text-xs">AMEX</span>}
                          {pm.marca !== "VISA" && pm.marca !== "MASTERCARD" && pm.marca !== "AMEX" && (
                            <Icon path={mdiCreditCardOutline} size={0.8} className="text-slate-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs sm:text-sm text-slate-900">
                              {pm.marca} •••• {pm.ultimos4}
                            </p>
                            {pm.esPredeterminado && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200 flex items-center gap-1">
                                <Icon path={mdiCreditCardCheckOutline} size={0.4} />
                                Predeterminada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {pm.titular} · Expira {String(pm.mesExpiracion).padStart(2, "0")}/{String(pm.anioExpiracion).slice(-2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!pm.esPredeterminado && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(pm.idMetodoPago)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Hacer predeterminada
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setMethodToDelete(pm)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Eliminar tarjeta"
                        >
                          <Icon path={mdiDeleteOutline} size={0.7} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-normal">
                <Icon path={mdiShieldCheckOutline} size={0.65} className="text-slate-600 shrink-0" />
                <span>
                  Los datos de tus tarjetas están protegidos. Cumplimiento de estándares de seguridad PCI-DSS.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: AGREGAR NUEVO MÉTODO DE PAGO */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-xl p-6 shadow-xl z-10 border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-5">
                <div>
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">
                    Registrar Tarjeta de Pago
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Guarda tu tarjeta para compras instantáneas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Icon path={mdiClose} size={0.65} />
                </button>
              </div>

              {/* MAQUETA VISUAL INTERACTIVA DE TARJETA EN TIEMPO REAL */}
              <div className="w-full bg-slate-900 text-white rounded-xl p-5 mb-5 shadow-xs relative overflow-hidden border border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-8 h-5 bg-amber-400/80 rounded-xs shadow-2xs flex items-center justify-center">
                    <div className="w-5 h-3 border border-amber-600/50 rounded-xs" />
                  </div>
                  <span className="font-bold text-xs tracking-wider uppercase bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {detectedBrand}
                  </span>
                </div>

                <p className="font-mono text-base font-bold tracking-widest text-slate-100 mb-4 select-none">
                  {newCardNumber || "•••• •••• •••• ••••"}
                </p>

                <div className="flex items-end justify-between text-xs uppercase tracking-wider">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans">Titular</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[180px] block">
                      {newTitular || "NOMBRE APELLIDO"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block font-sans">Expira</span>
                    <span className="font-semibold text-slate-200">
                      {newMonth.padStart(2, "0")}/{newYear.slice(-2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mensaje de error dentro del modal */}
              {modalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-medium mb-4">
                  <Icon path={mdiAlertCircleOutline} size={0.7} className="text-red-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleCreatePaymentMethod} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    value={newTitular}
                    onChange={(e) => setNewTitular(e.target.value)}
                    placeholder="Tal como figura en la tarjeta"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg py-2 px-3 focus:outline-none focus:border-primary focus:bg-white transition-all uppercase placeholder:normal-case"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Número de Tarjeta
                  </label>
                  <input
                    type="text"
                    value={newCardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4000 1234 5678 9010"
                    maxLength={19}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono rounded-lg py-2 px-3 focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Mes
                    </label>
                    <select
                      value={newMonth}
                      onChange={(e) => setNewMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg py-2 px-2 focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Año
                    </label>
                    <select
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg py-2 px-2 focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i)).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newCvv}
                      onChange={(e) => setNewCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono text-center rounded-lg py-2 px-2 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 select-none">
                      Establecer como método de pago predeterminado
                    </span>
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    {savingPayment ? (
                      <>
                        <Icon path={mdiLoading} size={0.6} className="animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Guardar Tarjeta"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE MÉTODO */}
      {/* ======================================================== */}
      <AnimatePresence>
        {methodToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMethodToDelete(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-sm bg-white rounded-xl p-5 shadow-xl z-10 border border-slate-200 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-100">
                <Icon path={mdiDeleteOutline} size={0.8} />
              </div>
              <h3 className="font-bold text-base text-slate-900">¿Eliminar método de pago?</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Se eliminará la tarjeta terminada en <strong>•••• {methodToDelete.ultimos4}</strong> vinculada a tu cuenta.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMethodToDelete(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingId !== null}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                >
                  {deletingId !== null ? (
                    <Icon path={mdiLoading} size={0.6} className="animate-spin" />
                  ) : (
                    "Sí, eliminar"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
