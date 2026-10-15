"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@mdi/react";
import {
  mdiAccountOutline,
  mdiEmailOutline,
  mdiPhoneOutline,
  mdiLockOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiArrowLeft,
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiLoading,
  mdiShieldCheckOutline,
  mdiRefresh,
} from "@mdi/js";
import { Logo } from "@/frontend/components/ui/Logo";
import {
  requestSignupCodeAction,
  verifySignupCodeAction,
  resendSignupCodeAction,
} from "@/backend/actions/auth";

export default function SignUpPage() {
  const router = useRouter();

  // Estados del flujo
  const [step, setStep] = useState<"form" | "verify">("form");

  // Campos de formulario
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Código de verificación
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Estados de carga y error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const passwordsMatch = confirmPassword !== "" && password === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && password !== confirmPassword;

  // Temporizador para reenvío de código
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Paso 1: Enviar solicitud y generar código
  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contraseña debe contener al menos 6 caracteres.");
      return;
    }

    const nameParts = fullName.trim().split(" ");
    const nombre = nameParts[0] || "Pasajero";
    const apellido = nameParts.slice(1).join(" ") || "Registrado";

    startTransition(async () => {
      const response = await requestSignupCodeAction({
        nombre,
        apellido,
        correo: email.trim().toLowerCase(),
        telefono: telefono.trim() || undefined,
        password,
        confirmPassword,
      });

      if (!response.success) {
        setErrorMessage(response.error || "No se pudo procesar el registro.");
        return;
      }

      setStep("verify");
      setResendCooldown(45);
      setCode("");
    });
  };

  // Paso 2: Validar código y completar registro
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = code.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6) {
      setErrorMessage("Por favor ingresa los 6 dígitos del código de verificación.");
      return;
    }

    startTransition(async () => {
      const response = await verifySignupCodeAction({
        correo: email.trim().toLowerCase(),
        codigo: cleanCode,
      });

      if (!response.success) {
        setErrorMessage(response.error || "El código ingresado es incorrecto o expiró.");
        return;
      }

      router.push(response.data?.redirectUrl || "/home");
      router.refresh();
    });
  };

  // Reenviar código
  const handleResend = () => {
    if (resendCooldown > 0 || isPending) return;
    setErrorMessage(null);
    setResendSuccess(false);

    startTransition(async () => {
      const response = await resendSignupCodeAction(email.trim().toLowerCase());
      if (!response.success) {
        setErrorMessage(response.error || "No se pudo reenviar el código.");
        return;
      }

      setResendCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    });
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Lado izquierdo con identidad visual InterlocApp */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-16 flex-col justify-between relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer z-10">
          <Logo size={1} variant="onDark" />
          <span className="font-extrabold text-white text-xl tracking-tight">InterlocApp</span>
        </Link>

        <div className="relative z-10 text-white max-w-lg my-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-[1.12] tracking-tight mb-6">
            Únete a
            <br />
            nosotros
          </h2>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
            Crea tu cuenta verificada en segundos y viaja con tranquilidad. Compra boletos, elige tus asientos y recibe notificaciones oficiales directo en tu correo.
          </p>
        </div>

        <p className="text-xs text-gray-500 z-10">
          © {new Date().getFullYear()} InterlocApp. Transporte interurbano seguro.
        </p>
      </div>

      {/* Lado derecho: Formulario interactivo por pasos */}
      <div className="flex-1 bg-white relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <Link
          href="/"
          className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Icon path={mdiArrowLeft} size={0.7} /> Volver al inicio
        </Link>

        <div className="w-full max-w-md mx-auto pt-8 sm:pt-0">
          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div
                key="step-form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <div className="mb-4 lg:hidden">
                    <Logo size={1} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    Crear Cuenta
                  </h1>
                  <p className="text-sm text-gray-500">
                    Ingresa tus datos para recibir tu código de activación
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiAccountOutline} size={0.8} />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nombre y apellido"
                        className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                        required
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiEmailOutline} size={0.8} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                        required
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Teléfono móvil (opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiPhoneOutline} size={0.8} />
                      </div>
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="8888 8888"
                        className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiLockOutline} size={0.8} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-2xl py-3 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                        required
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      >
                        <Icon path={showPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.8} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiLockOutline} size={0.8} />
                      </div>
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-gray-50/80 border text-gray-900 text-sm rounded-2xl py-3 pl-11 pr-11 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                          passwordsMismatch
                            ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                            : passwordsMatch
                            ? "border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-500"
                            : "border-gray-200/80 focus:ring-primary/10 focus:border-primary focus:bg-white"
                        }`}
                        required
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      >
                        <Icon path={showConfirm ? mdiEyeOffOutline : mdiEyeOutline} size={0.8} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all mt-6 cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Icon path={mdiLoading} size={0.9} className="animate-spin" />
                        <span>Enviando código...</span>
                      </>
                    ) : (
                      <span>Continuar y verificar correo</span>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center text-xs sm:text-sm text-gray-500 font-medium">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    href="/login"
                    className="text-primary hover:text-primary-dark font-bold transition-colors cursor-pointer"
                  >
                    Inicia Sesión
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step-verify"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4 border border-sky-100">
                    <Icon path={mdiShieldCheckOutline} size={1.2} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    Verifica tu correo
                  </h1>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Hemos enviado un código de 6 dígitos a{" "}
                    <strong className="text-gray-900 font-bold">{email}</strong>. Ingresa el código para activar tu cuenta.
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {resendSuccess && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-2.5">
                    <Icon path={mdiCheckCircleOutline} size={0.8} className="shrink-0 text-emerald-500" />
                    <span>¡Nuevo código de verificación enviado a tu correo!</span>
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
                      Código de 6 dígitos
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6))}
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.45em] font-mono font-black text-2xl sm:text-3xl py-3.5 bg-gray-50/90 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-300"
                      autoFocus
                      required
                      disabled={isPending}
                    />
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                      El código es válido durante 15 minutos
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || code.length !== 6}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Icon path={mdiLoading} size={0.9} className="animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <span>Verificar y Activar Cuenta</span>
                    )}
                  </button>
                </form>

                {/* Acciones secundarias: Reenviar y Regresar */}
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-500">¿No te llegó el código?</span>
                    {resendCooldown > 0 ? (
                      <span className="text-gray-400 font-semibold">
                        Reenviar en {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary-dark font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Icon path={mdiRefresh} size={0.7} />
                        Reenviar código
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setErrorMessage(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-800 text-center py-1 cursor-pointer font-medium"
                  >
                    ← Modificar correo o datos de registro
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
