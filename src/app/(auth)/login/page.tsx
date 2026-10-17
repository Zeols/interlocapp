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
  mdiInformationOutline,
} from "@mdi/js";
import { FingerprintPattern } from "lucide-react";
import { Logo } from "@/frontend/components/ui/Logo";
import {
  loginAction,
  loginWithGoogleAction,
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

  // Estados de autenticación biométrica y Google
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [savedDevice, setSavedDevice] = useState<StoredBiometricDevice | null>(null);
  const [showBiometricInfoModal, setShowBiometricInfoModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleNameInput, setGoogleNameInput] = useState("");

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

  // Inicio de sesión con cuenta de Google
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput.trim()) return;

    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const response = await loginWithGoogleAction({
        email: googleEmailInput.trim(),
        name: googleNameInput.trim() || googleEmailInput.split("@")[0],
      });

      if (!response.success) {
        setErrorMessage(response.error || "No se pudo iniciar sesión con Google.");
        setIsGoogleLoading(false);
        return;
      }

      setShowGoogleModal(false);
      const targetUrl = redirectParam || response.data?.redirectUrl || "/home";
      router.push(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Error al autenticar con Google.");
      setIsGoogleLoading(false);
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

          {/* Acceso Rápido con Google y Huella Digital */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setShowGoogleModal(true);
              }}
              disabled={isPending || isGoogleLoading || isBiometricLoading}
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold text-xs sm:text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs hover:border-gray-300 disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Con Google</span>
            </button>

            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={isPending || isGoogleLoading || isBiometricLoading}
              className="w-full bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 text-emerald-800 font-semibold text-xs sm:text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs hover:border-emerald-300 disabled:opacity-60 cursor-pointer"
              title={savedDevice ? `Vincular con ${savedDevice.deviceName}` : "Acceder con huella o biometría"}
            >
              {isBiometricLoading ? (
                <Icon path={mdiLoading} size={0.7} className="animate-spin text-emerald-700" />
              ) : (
                <FingerprintPattern className="w-4 h-4 text-emerald-700" />
              )}
              <span>Con Huella</span>
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
                Huella Digital / Biometría
              </h3>
              <p className="text-xs text-gray-600 text-center leading-relaxed mb-5">
                Para ingresar con huella o Face ID, primero inicia sesión con tu usuario/contraseña o tu cuenta de Google. Una vez dentro, podrás activarla en tu perfil para este dispositivo.
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

      {/* Modal de Acceso con Google */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 relative"
            >
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Continuar con Google
                  </h3>
                  <p className="text-xs text-gray-500">
                    Acceso rápido y seguro
                  </p>
                </div>
              </div>

              <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Correo de Google
                  </label>
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="tu-correo@gmail.com"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={googleNameInput}
                    onChange={(e) => setGoogleNameInput(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGoogleLoading || !googleEmailInput.trim()}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all mt-3 cursor-pointer disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <>
                      <Icon path={mdiLoading} size={0.65} className="animate-spin" />
                      <span>Accediendo...</span>
                    </>
                  ) : (
                    <span>Continuar</span>
                  )}
                </button>
              </form>
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

