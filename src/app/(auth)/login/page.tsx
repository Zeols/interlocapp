"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@mdi/react";
import {
  mdiEmailOutline,
  mdiLockOutline,
  mdiArrowLeft,
  mdiAlertCircleOutline,
  mdiLoading,
  mdiClose,
  mdiCheckCircleOutline,
} from "@mdi/js";
import { FingerprintPattern } from "lucide-react";
import { Logo } from "@/frontend/components/ui/Logo";
import {
  loginAction,
  loginWithBiometricsAction,
} from "@/backend/actions/auth";
import {
  getStoredBiometricDevice,
  verifyBiometricCredential,
  isBiometricsAvailable,
  StoredBiometricDevice,
} from "@/frontend/lib/biometrics";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estados de autenticación biométrica
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [savedDevice, setSavedDevice] = useState<StoredBiometricDevice | null>(null);
  const [showBiometricInfoModal, setShowBiometricInfoModal] = useState(false);

  // Cargar credencial biométrica guardada localmente si existe
  useEffect(() => {
    const dev = getStoredBiometricDevice();
    setSavedDevice(dev);
  }, []);

  // Mostrar mensaje de cooperativa pendiente solo temporalmente y limpiar query param
  useEffect(() => {
    if (searchParams.get("pending") === "true") {
      setShowPending(true);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("pending");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
      const timer = setTimeout(() => {
        setShowPending(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Auto-descartar mensaje de error tras 6 segundos
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPending(false);
    setErrorMessage(null);

    startTransition(async () => {
      const response = await loginAction({
        identificador,
        password,
      });

      if (!response.success) {
        setErrorMessage(response.error || "No se pudo iniciar sesión.");
        return;
      }

      const targetUrl = redirectParam || response.data?.redirectUrl || "/home";
      router.push(targetUrl);
      router.refresh();
    });
  };

  // Inicio de sesión con Huella Digital / Biometría
  const handleBiometricLogin = async () => {
    setErrorMessage(null);

    const bioStatus = await isBiometricsAvailable();
    if (!bioStatus.supported) {
      setErrorMessage("Tu navegador o sistema no soporta autenticación biométrica WebAuthn.");
      return;
    }

    const currentDevice = getStoredBiometricDevice();
    if (!currentDevice) {
      setShowBiometricInfoModal(true);
      return;
    }

    setIsBiometricLoading(true);
    try {
      // Solicitar autenticación biométrica nativa (Touch ID / Face ID / Windows Hello / Sensor móvil)
      const verifyResult = await verifyBiometricCredential(currentDevice.credentialId);
      if (!verifyResult.success) {
        setErrorMessage(verifyResult.error || "Error al verificar la huella digital.");
        setIsBiometricLoading(false);
        return;
      }

      // Validar con el servidor el token firmado del dispositivo
      const response = await loginWithBiometricsAction({
        credentialId: currentDevice.credentialId,
        deviceToken: currentDevice.deviceToken,
      });

      if (!response.success) {
        setErrorMessage(response.error || "No se pudo validar la sesión biométrica.");
        setIsBiometricLoading(false);
        return;
      }

      setSuccessMessage(`¡Bienvenido de vuelta, ${response.data?.user.nombre || "usuario"}!`);
      const targetUrl = redirectParam || response.data?.redirectUrl || "/home";
      setTimeout(() => {
        router.push(targetUrl);
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Error al autenticar con huella digital.");
      setIsBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Lado izquierdo oscuro con Manrope */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-12 lg:p-14 flex-col justify-between relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer z-10">
          <Logo size={0.9} variant="onDark" />
          <span className="font-extrabold text-white text-xl tracking-tight">InterlocApp</span>
        </Link>

        <div className="relative z-10 text-white max-w-md my-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-4xl font-extrabold leading-tight tracking-tight mb-4">
            Tu viaje comienza
            <br />
            aquí
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Inicia sesión para comprar tus boletos, elegir tus asientos favoritos y llevar un registro puntual de todos tus viajes con la mayor comodidad y seguridad.
          </p>
        </div>

        <p className="text-xs text-gray-500 z-10">
          © {new Date().getFullYear()} InterlocApp. Transporte interurbano seguro.
        </p>
      </div>

      {/* Formulario de Login */}
      <div className="flex-1 bg-white relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <Link
          href="/"
          className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Icon path={mdiArrowLeft} size={0.7} /> Volver al inicio
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md mx-auto pt-6 sm:pt-0"
        >
          <div className="mb-6">
            <div className="mb-3.5 lg:hidden">
              <Logo size={0.9} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-1.5">
              Iniciar Sesión
            </h1>
            <p className="text-sm text-gray-500">
              Ingresa tus credenciales o accede con tu biometría
            </p>
          </div>

          <AnimatePresence>
            {showPending && (
              <motion.div
                key="pending-alert"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-5"
              >
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-bold">¡Solicitud de Cooperativa Registrada!</p>
                      <p className="mt-0.5 text-emerald-700">Tu cooperativa y credenciales han sido recibidas y están en proceso de verificación por la administración central. Te notificaremos por correo en cuanto sea activada.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPending(false)}
                    className="text-emerald-500 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                    title="Cerrar notificación"
                  >
                    <Icon path={mdiClose} size={0.65} />
                  </button>
                </div>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                key="error-alert"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-4"
              >
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                    title="Cerrar mensaje"
                  >
                    <Icon path={mdiClose} size={0.65} />
                  </button>
                </div>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                key="success-alert"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-4"
              >
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
                  <Icon path={mdiCheckCircleOutline} size={0.8} className="shrink-0 text-emerald-600" />
                  <span className="font-semibold">{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Acceso Rápido con Huella Digital / Biometría */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={isPending || isBiometricLoading}
              className="w-full bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/90 text-emerald-950 py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl flex items-center gap-3 transition-all shadow-2xs hover:border-emerald-300 disabled:opacity-60 cursor-pointer text-left active:scale-[0.99]"
              title={savedDevice ? `Ingresar con biometría vinculada a ${savedDevice.userEmail || savedDevice.deviceName}` : "Acceder con biometría"}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/80 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
                {isBiometricLoading ? (
                  <Icon path={mdiLoading} size={0.75} className="animate-spin text-emerald-700" />
                ) : (
                  <FingerprintPattern className="w-5 h-5 text-emerald-700" />
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-xs sm:text-sm text-emerald-950 leading-tight">
                  Ingresar con Biometría (Huella / Face ID)
                </span>
                <span className="text-[11px] font-medium text-emerald-700/90 leading-tight mt-0.5 truncate">
                  {savedDevice
                    ? (savedDevice.userName
                        ? `${savedDevice.userName} • ${savedDevice.userEmail}`
                        : savedDevice.userEmail || "Dispositivo vinculado")
                    : "Acceso instantáneo con sensor biométrico"}
                </span>
              </div>
            </button>
          </div>

          {/* Separador elegante */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400 font-bold tracking-wider uppercase">
                o usa tu contraseña
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Correo o Usuario
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiEmailOutline} size={0.75} />
                </div>
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => {
                    setIdentificador(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon path={mdiLockOutline} size={0.75} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex justify-end pt-0.5">
              <Link
                href="/forgot"
                className="text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer shadow-sm shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Icon path={mdiLoading} size={0.8} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs sm:text-sm text-gray-500 font-medium">
            ¿No tienes cuenta?{" "}
            <Link
              href="/signup"
              className="text-primary hover:text-primary-dark font-bold transition-colors cursor-pointer"
            >
              Regístrate
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Modal Informativo de Huella Digital */}
      <AnimatePresence>
        {showBiometricInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                <FingerprintPattern className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-extrabold text-gray-900 text-center mb-2">
                Huella Digital
              </h3>
              <p className="text-xs text-gray-600 text-center leading-relaxed mb-5">
                Para ingresar con huella o Face ID en este dispositivo, primero inicia sesión con tu usuario y contraseña. Al entrar, la app te ofrecerá activarla con un solo toque.
              </p>

              <button
                type="button"
                onClick={() => setShowBiometricInfoModal(false)}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

