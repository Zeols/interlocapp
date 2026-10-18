"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@mdi/react";
import {
  mdiClose,
  mdiLoading,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiShieldCheckOutline,
  mdiFlashOutline,
} from "@mdi/js";
import { FingerprintPattern } from "lucide-react";
import { getCurrentUserAction, registerBiometricDeviceAction } from "@/backend/actions/auth";
import {
  isBiometricsAvailable,
  getStoredBiometricDevice,
  saveBiometricDevice,
  createBiometricCredential,
  getFriendlyDeviceName,
  getBiometricTypeLabel,
  StoredBiometricDevice,
} from "@/frontend/lib/biometrics";
import { SessionPayload } from "@/backend/lib/session";

export function BiometricPromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<SessionPayload | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bioInfo, setBioInfo] = useState<{ label: string; shortLabel: string; isFaceId: boolean }>({
    label: "Huella Digital",
    shortLabel: "Huella",
    isFaceId: false,
  });

  useEffect(() => {
    let isMounted = true;

    if (typeof window !== "undefined") {
      setBioInfo(getBiometricTypeLabel());
    }

    const checkPromptEligibility = async () => {
      if (typeof window === "undefined") return;

      // 1. Si el usuario marcó no volver a mostrar en este dispositivo
      if (localStorage.getItem("interlocapp_biometric_prompt_dismissed") === "true") {
        return;
      }

      // 2. Si el usuario eligió posponer en esta sesión
      if (sessionStorage.getItem("interlocapp_biometric_prompt_later") === "true") {
        return;
      }

      // 3. Si el dispositivo ya cuenta con una huella registrada
      const currentDevice = getStoredBiometricDevice();
      if (currentDevice) {
        return;
      }

      // 4. Comprobar si el navegador y hardware soportan WebAuthn
      const bioStatus = await isBiometricsAvailable();
      if (!bioStatus.supported) {
        return;
      }

      // 5. Verificar sesión activa del usuario
      const user = await getCurrentUserAction();
      if (!user) {
        return;
      }

      if (isMounted) {
        setUserData(user);
        // Esperar 1.5s tras ingresar a la app para mostrar la sugerencia suavemente
        setTimeout(() => {
          if (isMounted) {
            setIsOpen(true);
          }
        }, 1500);
      }
    };

    checkPromptEligibility();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem("interlocapp_biometric_prompt_dismissed", "true");
    } else {
      sessionStorage.setItem("interlocapp_biometric_prompt_later", "true");
    }
    setIsOpen(false);
  };

  const handleActivate = async () => {
    if (!userData) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const friendlyName = getFriendlyDeviceName();
      const userFull = userData.nombre || userData.correo;

      // 1. Solicitar huella digital nativa a través de WebAuthn
      const credResult = await createBiometricCredential(userData.correo, userFull);
      if (!credResult.success || !credResult.credentialId) {
        setErrorMessage(
          credResult.error || "No se completó la verificación con el sensor biométrico."
        );
        setIsLoading(false);
        return;
      }

      // 2. Registrar la credencial en el servidor y recibir el token firmado
      const tokenResult = await registerBiometricDeviceAction({
        credentialId: credResult.credentialId,
        deviceName: friendlyName,
      });

      if (!tokenResult.success || !tokenResult.data?.deviceToken) {
        setErrorMessage(
          tokenResult.error || "No se pudo generar la llave de acceso biométrica."
        );
        setIsLoading(false);
        return;
      }

      // 3. Guardar en el almacenamiento seguro local de este navegador
      const newDevice: StoredBiometricDevice = {
        credentialId: credResult.credentialId,
        deviceToken: tokenResult.data.deviceToken,
        deviceName: friendlyName,
        userEmail: userData.correo,
        userName: userFull,
        registeredAt: new Date().toISOString(),
      };

      saveBiometricDevice(newDevice);
      setIsSuccess(true);
      setIsLoading(false);

      // Cerrar modal automáticamente tras confirmar éxito
      setTimeout(() => {
        setIsOpen(false);
      }, 1600);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Ocurrió un error al activar la huella.");
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative overflow-hidden"
          >
            {/* Botón de cerrar */}
            {!isLoading && !isSuccess && (
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Cerrar"
                aria-label="Cerrar sugerencia"
              >
                <Icon path={mdiClose} size={0.75} />
              </button>
            )}

            {isSuccess ? (
              <div className="py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-75 duration-200">
                  <Icon path={mdiCheckCircleOutline} size={1.4} />
                </div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-1.5">
                  ¡{bioInfo.isFaceId ? "Face ID activado" : "Biometría activada"}!
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
                  {bioInfo.isFaceId
                    ? "La próxima vez podrás acceder instantáneamente utilizando Face ID."
                    : "La próxima vez podrás acceder con un solo toque utilizando el sensor de este dispositivo."}
                </p>
              </div>
            ) : (
              <div>
                {/* Cabecera con icono */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <FingerprintPattern className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      Acceso rápido
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight mt-0.5 leading-snug">
                      ¿Deseas activar {bioInfo.isFaceId ? "Face ID" : "acceso biométrico"}?
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                  {bioInfo.isFaceId
                    ? "Detectamos que tu iPhone cuenta con Face ID. Actívalo para ingresar de forma instantánea a tu cuenta con un solo vistazo."
                    : "Detectamos que este dispositivo cuenta con sensor biométrico. Actívalo para ingresar de forma instantánea a tu cuenta sin tener que escribir tu contraseña cada vez."}
                </p>

                {/* Beneficios directos */}
                <div className="space-y-2 mb-4 p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 text-xs text-gray-700 font-medium">
                  <div className="flex items-center gap-2">
                    <Icon path={mdiFlashOutline} size={0.65} className="text-amber-500 shrink-0" />
                    <span>
                      {bioInfo.isFaceId
                        ? "Ingreso instantáneo con Face ID sin escribir contraseñas"
                        : "Ingreso en un solo toque sin escribir contraseñas"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon path={mdiShieldCheckOutline} size={0.65} className="text-emerald-600 shrink-0" />
                    <span>Protegido por el chip de seguridad de tu dispositivo</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 mb-4">
                    <Icon path={mdiAlertCircleOutline} size={0.7} className="shrink-0 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Checkbox: No volver a mostrar */}
                <label className="flex items-center gap-2.5 text-xs text-gray-500 hover:text-gray-700 select-none cursor-pointer mt-1 mb-5">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                  />
                  <span>No volver a mostrar en este dispositivo</span>
                </label>

                {/* Botones de acción */}
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Quizá más tarde
                  </button>

                  <button
                    type="button"
                    onClick={handleActivate}
                    disabled={isLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Icon path={mdiLoading} size={0.65} className="animate-spin text-white" />
                        <span>{bioInfo.isFaceId ? "Esperando Face ID..." : "Esperando sensor..."}</span>
                      </>
                    ) : (
                      <>
                        <FingerprintPattern className="w-4 h-4 text-emerald-400" />
                        <span>{bioInfo.isFaceId ? "Activar Face ID Ahora" : "Activar ahora"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
