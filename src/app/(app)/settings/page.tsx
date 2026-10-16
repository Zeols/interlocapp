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
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setNewCardNumber(parts ? parts.join(" ") : raw);
  };

  // Detectar marca en tiempo real para visualización en tarjeta virtual
  const detectBrandFromInput = (val: string): "VISA" | "MASTERCARD" | "AMEX" | "LOCAL" => {
    const clean = val.replace(/\D/g, "");
    if (/^4/.test(clean)) return "VISA";
    if (/^(5[1-5]|2[2-7])/.test(clean)) return "MASTERCARD";
    if (/^3[47]/.test(clean)) return "AMEX";
    return "LOCAL";
  };

  const detectedBrand = detectBrandFromInput(newCardNumber);

  // Agregar método de pago en DB
  const handleCreatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const rawNumber = newCardNumber.replace(/\D/g, "");
    if (rawNumber.length < 13 || rawNumber.length > 16) {
      setModalError("Ingresa un número de tarjeta válido (13 a 16 dígitos).");
      return;
    }

    if (!newTitular.trim() || newTitular.trim().length < 3) {
      setModalError("El nombre del titular debe contener al menos 3 caracteres.");
      return;
    }

    if (!newCvv || newCvv.length < 3) {
      setModalError("Ingresa un código de seguridad CVV válido de 3 o 4 dígitos.");
      return;
    }

    setSavingPayment(true);
    const res = await createMetodoPagoAction({
      titular: newTitular,
      numeroTarjeta: rawNumber,
      mesExpiracion: parseInt(newMonth, 10),
      anioExpiracion: parseInt(newYear, 10),
      marca: detectedBrand,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 w-full">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
          Ajustes
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1.5">
          Configura tus preferencias regionales, idioma con traducción oficial y métodos de pago conectados a la base de datos.
        </p>
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
          {/* ======================================================== */}
          {/* TAB 1: NOTIFICACIONES */}
          {/* ======================================================== */}
          {activeTab === "notifications" && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                  Notificaciones
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Elige qué avisos quieres recibir en tu correo electrónico.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">Boletos Comprados</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Recibe tus boletos digitales y comprobantes inmediatamente con código QR.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailTickets(!emailTickets)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      emailTickets ? "bg-primary" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={emailTickets}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                        emailTickets ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px w-full bg-gray-100" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">Avisos de Abordaje y Retrasos</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Alertas en tiempo real si tu autobús está en andén o presenta demoras en carretera.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBoardingAlerts(!boardingAlerts)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      boardingAlerts ? "bg-primary" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={boardingAlerts}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                        boardingAlerts ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px w-full bg-gray-100" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">Promociones y Descuentos</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Entérate de tarifas especiales en rutas interurbanas seleccionadas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromos(!promos)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      promos ? "bg-primary" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={promos}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                        promos ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {notifSaved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs sm:text-sm font-semibold mt-6">
                  <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-500 shrink-0" />
                  Preferencias de notificaciones guardadas exitosamente.
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSaveNotifications}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REGIÓN E IDIOMA (CONVERSIÓN EN TIEMPO REAL & TRANSLATE) */}
          {/* ======================================================== */}
          {activeTab === "region" && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                  Región e Idioma
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Ajusta la moneda de facturación y traduce toda la aplicación en tiempo real con Google Translate.
                </p>
              </div>

              <div className="space-y-6">
                {/* 1. SELECCIÓN DE MONEDA (CONVERSIÓN EN VIVO) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Moneda de Visualización y Facturación
                    </label>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                      Tasa Oficial BCN: 1 USD = {exchangeRate} C$
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleCurrencyChange("NIO")}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        currency === "NIO"
                          ? "bg-primary/5 border-primary shadow-xs ring-2 ring-primary/10"
                          : "bg-gray-50/80 border-gray-200/80 hover:bg-white hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-sm text-gray-900">Córdoba Nicaragüense (C$)</p>
                        <p className="text-xs text-gray-500 mt-0.5">Moneda nacional estándar (NIO)</p>
                      </div>
                      {currency === "NIO" && (
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                          <Icon path={mdiCheck} size={0.65} />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCurrencyChange("USD")}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        currency === "USD"
                          ? "bg-primary/5 border-primary shadow-xs ring-2 ring-primary/10"
                          : "bg-gray-50/80 border-gray-200/80 hover:bg-white hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-sm text-gray-900">Dólar Estadounidense ($)</p>
                        <p className="text-xs text-gray-500 mt-0.5">Conversión internacional (USD)</p>
                      </div>
                      {currency === "USD" && (
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                          <Icon path={mdiCheck} size={0.65} />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Tarjeta de demostración interactiva de conversión */}
                  <div className="bg-linear-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary shrink-0">
                        <Icon path={mdiCurrencyUsd} size={0.9} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-300 font-medium">Ejemplo en tiempo real (Ruta Managua - León):</p>
                        <p className="text-base sm:text-lg font-black text-white mt-0.5">
                          {formatPrice(85)} <span className="text-xs font-normal text-gray-400">({currency === "USD" ? "convertido de C$ 85.00" : "equivalente a $ 2.32 USD"})</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      Conversión activa en toda la app
                    </span>
                  </div>
                </div>

                <div className="h-px w-full bg-gray-100" />

                {/* 2. SELECCIÓN DE IDIOMA (GOOGLE TRANSLATE) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Idioma de la Plataforma
                    </label>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      <Icon path={mdiTranslate} size={0.5} />
                      Google Translate
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
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
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                              : "bg-gray-50/80 border-gray-200/80 hover:bg-white hover:border-gray-300 text-gray-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl select-none">{item.flag}</span>
                            <div>
                              <p className={`font-bold text-xs sm:text-sm ${isSelected ? "text-white" : "text-gray-900"}`}>
                                {item.label}
                              </p>
                              <p className={`text-[10px] ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                                {item.sub}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
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
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs sm:text-sm font-semibold mt-6">
                  <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-500 shrink-0" />
                  Ajustes regionales actualizados correctamente.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MÉTODOS DE PAGO (BASE DE DATOS REAL CON SERVER ACTIONS) */}
          {/* ======================================================== */}
          {activeTab === "payments" && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                    Métodos de Pago
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Tarjetas y billeteras guardadas en tu perfil para compra rápida en ventanilla y web.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setShowAddModal(true);
                  }}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2 shrink-0 self-start sm:self-auto hover:scale-102 active:scale-98"
                >
                  <Icon path={mdiPlus} size={0.7} />
                  Agregar Tarjeta
                </button>
              </div>

              {/* Mensajes de feedback */}
              {paymentSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs sm:text-sm font-semibold mb-4">
                  <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-500 shrink-0" />
                  {paymentSuccess}
                </div>
              )}
              {paymentError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 border border-red-100 rounded-2xl text-xs sm:text-sm font-semibold mb-4">
                  <Icon path={mdiAlertCircleOutline} size={0.8} className="text-red-500 shrink-0" />
                  {paymentError}
                </div>
              )}

              {/* Estado de carga */}
              {loadingPayments ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <Icon path={mdiLoading} size={1.5} className="animate-spin text-primary" />
                  <p className="text-xs font-semibold">Consultando métodos en la base de datos...</p>
                </div>
              ) : paymentMethods.length === 0 ? (
                /* Estado vacío */
                <div className="py-12 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 flex items-center justify-center mb-4">
                    <Icon path={mdiCreditCardOutline} size={1.8} />
                  </div>
                  <h3 className="font-extrabold text-base text-gray-900">No tienes métodos de pago registrados</h3>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-sm mt-1 mb-5">
                    Agrega tu tarjeta de débito, crédito o billetera móvil para comprar boletos con 1 solo clic.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
                  >
                    <Icon path={mdiPlus} size={0.7} />
                    Registrar Tarjeta Ahora
                  </button>
                </div>
              ) : (
                /* Lista de métodos de pago */
                <div className="space-y-3.5">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.idMetodoPago}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        pm.esPredeterminado
                          ? "bg-primary/5 border-primary/40 shadow-xs"
                          : "bg-gray-50/80 border-gray-200/80 hover:bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-xs border border-gray-100 text-gray-900 font-black text-xs shrink-0">
                          {pm.marca === "VISA" && <span className="text-blue-600 font-extrabold text-sm">VISA</span>}
                          {pm.marca === "MASTERCARD" && <span className="text-red-500 font-extrabold text-xs">MC</span>}
                          {pm.marca === "AMEX" && <span className="text-cyan-600 font-extrabold text-xs">AMEX</span>}
                          {pm.marca !== "VISA" && pm.marca !== "MASTERCARD" && pm.marca !== "AMEX" && (
                            <Icon path={mdiCreditCardOutline} size={1} className="text-primary" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-sm text-gray-900">
                              {pm.marca} •••• {pm.ultimos4}
                            </p>
                            {pm.esPredeterminado && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <Icon path={mdiCreditCardCheckOutline} size={0.45} />
                                Predeterminada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {pm.titular} · Expira {String(pm.mesExpiracion).padStart(2, "0")}/{String(pm.anioExpiracion).slice(-2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!pm.esPredeterminado && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(pm.idMetodoPago)}
                            className="text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Hacer predeterminada
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setMethodToDelete(pm)}
                          className="w-8 h-8 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Eliminar tarjeta"
                        >
                          <Icon path={mdiDeleteOutline} size={0.7} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 font-medium">
                <Icon path={mdiShieldCheckOutline} size={0.7} className="text-emerald-500 shrink-0" />
                <span>
                  Los datos de tus tarjetas están protegidos. Cumplimiento de estándares PCI-DSS en servidores encriptados.
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
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-gray-100 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-gray-900 tracking-tight">
                    Registrar Tarjeta de Pago
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Guarda tu tarjeta en la base de datos para compras instantáneas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Icon path={mdiClose} size={0.7} />
                </button>
              </div>

              {/* MAQUETA VISUAL INTERACTIVA DE TARJETA EN TIEMPO REAL */}
              <div className="w-full bg-linear-to-tr from-gray-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 mb-6 shadow-xl relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8">
                  <div className="w-10 h-7 bg-amber-400/80 rounded-md shadow-xs flex items-center justify-center border border-amber-300">
                    <div className="w-6 h-4 border border-amber-600/50 rounded-xs" />
                  </div>
                  <span className="font-black text-sm tracking-wider uppercase bg-white/10 px-2.5 py-0.5 rounded-md border border-white/20">
                    {detectedBrand}
                  </span>
                </div>

                <p className="font-mono text-lg sm:text-xl font-bold tracking-widest text-gray-100 mb-4 select-none">
                  {newCardNumber || "•••• •••• •••• ••••"}
                </p>

                <div className="flex items-end justify-between text-xs uppercase tracking-wider">
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans">Titular</span>
                    <span className="font-bold text-gray-200 truncate max-w-[200px] block">
                      {newTitular || "NOMBRE APELLIDO"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 block font-sans">Expira</span>
                    <span className="font-bold text-gray-200">
                      {newMonth.padStart(2, "0")}/{newYear.slice(-2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mensaje de error dentro del modal */}
              {modalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold mb-4">
                  <Icon path={mdiAlertCircleOutline} size={0.7} className="text-red-500 shrink-0" />
                  {modalError}
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleCreatePaymentMethod} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    value={newTitular}
                    onChange={(e) => setNewTitular(e.target.value)}
                    placeholder="Tal como figura en la tarjeta"
                    required
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all uppercase placeholder:normal-case"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Número de Tarjeta
                  </label>
                  <input
                    type="text"
                    value={newCardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4000 1234 5678 9010"
                    maxLength={19}
                    required
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm font-mono rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Mes
                    </label>
                    <select
                      value={newMonth}
                      onChange={(e) => setNewMonth(e.target.value)}
                      className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-xl py-2.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Año
                    </label>
                    <select
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-xl py-2.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i)).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      CVV
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newCvv}
                      onChange={(e) => setNewCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      required
                      className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm font-mono text-center rounded-xl py-2.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="w-4 h-4 text-primary rounded-md border-gray-300 focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 select-none">
                      Establecer como método de pago predeterminado
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
                  >
                    {savingPayment ? (
                      <>
                        <Icon path={mdiLoading} size={0.7} className="animate-spin" />
                        Guardando en BD...
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
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-gray-100 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Icon path={mdiDeleteOutline} size={1} />
              </div>
              <h3 className="font-extrabold text-lg text-gray-900">¿Eliminar método de pago?</h3>
              <p className="text-xs text-gray-500 mt-1 mb-6">
                Se eliminará la tarjeta terminada en <strong>•••• {methodToDelete.ultimos4}</strong> vinculada a tu cuenta.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethodToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingId !== null}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
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
