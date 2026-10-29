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
  mdiBellRingOutline,
  mdiCellphoneMessage,
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

  // --- 1. NOTIFICACIONES & WEB PUSH ---
  const [emailTickets, setEmailTickets] = useState(true);
  const [promos, setPromos] = useState(false);
  const [boardingAlerts, setBoardingAlerts] = useState(true);
  const [notifSaved, setNotifSaved] = useState(false);

  // Web Push Nativo
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // --- 2. REGIÓN, IDIOMA Y MONEDA ---
  const { currency, setCurrency, exchangeRate, formatPrice } = useCurrency();
  const [currentLanguage, setCurrentLanguage] = useState("es");
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [regionSaved, setRegionSaved] = useState(false);

  // --- 3. MÉTODOS DE PAGO ---
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

  // Inicialización
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Notificaciones locales
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

      // Web Push Support & Permission
      if ("Notification" in window) {
        setPushSupported(true);
        setPushPermission(Notification.permission);
      }

      // Idioma guardado
      const savedLang = localStorage.getItem("interlocapp_lang") || "es";
      setCurrentLanguage(savedLang);
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

  // Solicitar permiso Web Push
  const handleRequestPushPermission = async () => {
    setPushError(null);
    setPushSuccess(null);

    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushError("Este navegador no cuenta con soporte para Web Push.");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);

      if (perm === "granted") {
        setPushSuccess("¡Notificaciones Push activadas en este dispositivo!");
        localStorage.setItem("interlocapp_push_enabled", "true");
        setTimeout(() => setPushSuccess(null), 4000);
      } else if (perm === "denied") {
        setPushError(
          "El navegador ha bloqueado los avisos. Habilita los permisos desde el candado en la barra de direcciones."
        );
      }
    } catch (err: any) {
      setPushError(err.message || "Error al solicitar permisos.");
    }
  };

  // Enviar Notificación de Prueba Web Push
  const handleSendTestPush = () => {
    setPushError(null);
    setPushSuccess(null);

    if (pushPermission !== "granted") {
      setPushError("Debes permitir las notificaciones antes de realizar la prueba.");
      return;
    }

    try {
      new Notification("InterlocApp · Salida Confirmada", {
        body: "Tu viaje a León está en andén y saldrá a tiempo (06:00 AM). Presenta tu boleto al abordar.",
        icon: "/favicon.ico",
      });
      setPushSuccess("Notificación de prueba enviada a tu pantalla.");
      setTimeout(() => setPushSuccess(null), 4000);
    } catch (err: any) {
      setPushError("No se pudo disparar la notificación en el sistema operativo.");
    }
  };

  // Guardar notificaciones por email
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

  // Manejar cambio de idioma
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    setChangingLanguage(true);
    setRegionSaved(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("interlocapp_lang", lang);
      document.cookie = `interlocapp_lang=${lang}; path=/; max-age=31536000`;
    }

    try {
      changeAppLanguage(lang);
    } catch (err) {
      console.warn("Fallo secundario al invocar changeAppLanguage:", err);
    }

    setTimeout(() => {
      setChangingLanguage(false);
      setTimeout(() => setRegionSaved(false), 3500);
    }, 400);
  };

  // Manejar cambio de moneda
  const handleCurrencyChange = (newCurr: CurrencyType) => {
    setCurrency(newCurr);
    setRegionSaved(true);
    setTimeout(() => setRegionSaved(false), 3500);
  };

  // Formateador visual del número de tarjeta
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setNewCardNumber(parts ? parts.join(" ") : "");
  };

  const detectedBrand = (() => {
    const clean = newCardNumber.replace(/\s+/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (/^5[1-5]/.test(clean)) return "MASTERCARD";
    if (/^3[47]/.test(clean)) return "AMEX";
    return "OTRA";
  })();

  const handleCreatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanCard = newCardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15) {
      setModalError("El número de tarjeta debe tener entre 15 y 16 dígitos.");
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 w-full min-h-screen bg-slate-50">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Ajustes del Sistema
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configuración de notificaciones Web Push, preferencias regionales y métodos de pago.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Navigation Tabs */}
        <div className="md:col-span-1 min-w-0">
          <nav className="flex flex-row md:flex-col gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg cursor-pointer text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap md:w-full md:justify-start ${
                activeTab === "notifications"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon path={mdiBellOutline} size={0.7} className="shrink-0" />
              <span>Notificaciones & Push</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("region")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg cursor-pointer text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap md:w-full md:justify-start ${
                activeTab === "region"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon path={mdiEarth} size={0.7} className="shrink-0" />
              <span>Región e Idioma</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg cursor-pointer text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap md:w-full md:justify-start ${
                activeTab === "payments"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon path={mdiCreditCardOutline} size={0.7} className="shrink-0" />
              <span>Métodos de Pago</span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2">
          {/* TAB 1: NOTIFICACIONES & WEB PUSH */}
          {activeTab === "notifications" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-6">
              {/* Web Push Section */}
              <div className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Icon path={mdiBellRingOutline} size={0.7} className="text-slate-700" />
                    Notificaciones Web Push en el Navegador
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      pushPermission === "granted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : pushPermission === "denied"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {pushPermission === "granted"
                      ? "Activas"
                      : pushPermission === "denied"
                      ? "Bloqueadas"
                      : "No configuradas"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Recibe avisos instantáneos de salidas, retrasos de ruta y alertas de despacho aunque no tengas la pestaña abierta.
                </p>

                <div className="mt-3.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">
                      Estado actual:{" "}
                      <span className="font-mono font-bold">
                        {pushPermission === "granted"
                          ? "Permisos concedidos"
                          : pushPermission === "denied"
                          ? "Permisos denegados por usuario"
                          : "Pendiente de autorización"}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {pushSupported
                        ? "Navegador compatible con la API de Notificaciones estándar."
                        : "Este navegador no cuenta con la API de Notificaciones."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {pushPermission !== "granted" ? (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        disabled={!pushSupported}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                      >
                        Activar Web Push
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendTestPush}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <Icon path={mdiCellphoneMessage} size={0.6} />
                        Enviar Notificación de Prueba
                      </button>
                    )}
                  </div>
                </div>

                {pushSuccess && (
                  <div className="mt-2.5 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <Icon path={mdiCheckCircleOutline} size={0.6} />
                    <span>{pushSuccess}</span>
                  </div>
                )}
                {pushError && (
                  <div className="mt-2.5 p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <Icon path={mdiAlertCircleOutline} size={0.6} />
                    <span>{pushError}</span>
                  </div>
                )}
              </div>

              {/* Preferencias de Avisos */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Canales y Eventos
                </h3>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-slate-900">Boletos Comprados y QR</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comprobante digital inmediato para abordar en la terminal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailTickets(!emailTickets)}
                    className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      emailTickets ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-2xs ${
                        emailTickets ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-slate-900">Avisos de Abordaje y Retrasos</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Alertas automáticas cuando la unidad entra al andén o presenta demoras en ruta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBoardingAlerts(!boardingAlerts)}
                    className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      boardingAlerts ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-2xs ${
                        boardingAlerts ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-slate-900">Avisos Operativos y Promociones</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Notificaciones de nuevas frecuencias de viaje o tarifas especiales.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromos(!promos)}
                    className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      promos ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-2xs ${
                        promos ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {notifSaved && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                  <Icon path={mdiCheckCircleOutline} size={0.65} />
                  <span>Preferencias guardadas exitosamente.</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveNotifications}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REGIÓN E IDIOMA */}
          {activeTab === "region" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Región, Moneda e Idioma
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajusta la moneda de visualización y el idioma de la plataforma.
                </p>
              </div>

              {/* Moneda */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Moneda de Facturación
                  </label>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Tasa Oficial BCN: 1 USD = {exchangeRate} C$
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange("NIO")}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currency === "NIO"
                        ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900">Córdoba Nicaragüense (C$)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Moneda nacional estándar (NIO)</p>
                    </div>
                    {currency === "NIO" && (
                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Icon path={mdiCheck} size={0.55} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCurrencyChange("USD")}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currency === "USD"
                        ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900">Dólar Estadounidense ($)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Conversión internacional (USD)</p>
                    </div>
                    {currency === "USD" && (
                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Icon path={mdiCheck} size={0.55} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="h-px w-full bg-slate-100" />

              {/* Idioma */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Idioma de la Plataforma
                  </label>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    <Icon path={mdiTranslate} size={0.5} />
                    Traducción
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { code: "es", label: "Español", sub: "Nicaragua / Centroamérica" },
                    { code: "en", label: "English", sub: "United States / International" },
                  ].map((item) => {
                    const isSelected = currentLanguage === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleLanguageChange(item.code)}
                        disabled={changingLanguage}
                        className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900">{item.label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.sub}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Icon path={mdiCheck} size={0.55} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {regionSaved && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                  <Icon path={mdiCheckCircleOutline} size={0.65} />
                  <span>Ajustes regionales actualizados correctamente.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MÉTODOS DE PAGO */}
          {activeTab === "payments" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Métodos de Pago
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tarjetas vinculadas para compra inmediata de boletos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setShowAddModal(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Icon path={mdiPlus} size={0.65} />
                  <span>Agregar Tarjeta</span>
                </button>
              </div>

              {paymentSuccess && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                  <Icon path={mdiCheckCircleOutline} size={0.65} />
                  <span>{paymentSuccess}</span>
                </div>
              )}
              {paymentError && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold">
                  <Icon path={mdiAlertCircleOutline} size={0.65} />
                  <span>{paymentError}</span>
                </div>
              )}

              {loadingPayments ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Icon path={mdiLoading} size={1} className="animate-spin text-slate-700" />
                  <p className="text-xs font-semibold">Consultando métodos registrados...</p>
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-2 shadow-2xs">
                    <Icon path={mdiCreditCardOutline} size={1} />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">No hay métodos de pago guardados</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5 mb-3">
                    Registra tu tarjeta para procesar pagos de pasajes en un solo toque.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Registrar Tarjeta
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.idMetodoPago}
                      className={`p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        pm.esPredeterminado
                          ? "bg-slate-50/60 border-slate-900 ring-1 ring-slate-900 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-slate-200 text-slate-800 font-bold text-xs shrink-0 shadow-2xs">
                          {pm.marca}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs sm:text-sm text-slate-900">
                              •••• {pm.ultimos4}
                            </p>
                            {pm.esPredeterminado && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                                Predeterminada
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {pm.titular} · Expira {String(pm.mesExpiracion).padStart(2, "0")}/{String(pm.anioExpiracion).slice(-2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!pm.esPredeterminado && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(pm.idMetodoPago)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Hacer predeterminada
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setMethodToDelete(pm)}
                          className="w-7 h-7 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Eliminar tarjeta"
                        >
                          <Icon path={mdiDeleteOutline} size={0.65} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                <Icon path={mdiShieldCheckOutline} size={0.55} className="text-slate-600 shrink-0" />
                <span>Datos protegidos con cifrado bancario y certificación PCI-DSS.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: AGREGAR TARJETA */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md bg-white rounded-xl p-6 shadow-xl z-10 border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900 tracking-tight">
                  Registrar Tarjeta de Pago
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Icon path={mdiClose} size={0.65} />
                </button>
              </div>

              {/* Maqueta de Tarjeta sobria */}
              <div className="w-full bg-slate-900 text-white rounded-xl p-4 mb-4 shadow-xs relative border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-[10px] tracking-wider uppercase bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {detectedBrand}
                  </span>
                </div>
                <p className="font-mono text-sm font-bold tracking-widest text-slate-100 mb-3 select-none">
                  {newCardNumber || "•••• •••• •••• ••••"}
                </p>
                <div className="flex items-end justify-between text-[11px] uppercase tracking-wider">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Titular</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[180px] block">
                      {newTitular || "NOMBRE APELLIDO"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block">Expira</span>
                    <span className="font-semibold text-slate-200">
                      {newMonth.padStart(2, "0")}/{newYear.slice(-2)}
                    </span>
                  </div>
                </div>
              </div>

              {modalError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold mb-3 flex items-center gap-2">
                  <Icon path={mdiAlertCircleOutline} size={0.6} />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreatePaymentMethod} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    value={newTitular}
                    onChange={(e) => setNewTitular(e.target.value)}
                    placeholder="Tal como figura en la tarjeta"
                    required
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg py-2 px-3 focus:outline-none focus:border-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Número de Tarjeta
                  </label>
                  <input
                    type="text"
                    value={newCardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4000 1234 5678 9010"
                    maxLength={19}
                    required
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono rounded-lg py-2 px-3 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Mes
                    </label>
                    <select
                      value={newMonth}
                      onChange={(e) => setNewMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg py-2 px-2 focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Año
                    </label>
                    <select
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg py-2 px-2 focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i)).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      CVV
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newCvv}
                      onChange={(e) => setNewCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      required
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono text-center rounded-lg py-2 px-2 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 cursor-pointer"
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
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    {savingPayment ? "Guardando..." : "Guardar Tarjeta"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      <AnimatePresence>
        {methodToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMethodToDelete(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-sm bg-white rounded-xl p-5 shadow-xl z-10 border border-slate-200 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-200">
                <Icon path={mdiDeleteOutline} size={0.7} />
              </div>
              <h3 className="font-bold text-sm text-slate-900">¿Eliminar método de pago?</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Se eliminará la tarjeta terminada en <strong>•••• {methodToDelete.ultimos4}</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethodToDelete(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingId !== null}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  {deletingId !== null ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
