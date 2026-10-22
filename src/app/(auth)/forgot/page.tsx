"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@mdi/react";
import {
  mdiEmailOutline,
  mdiArrowLeft,
  mdiCheckCircleOutline,
  mdiLockOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiAlertCircleOutline,
  mdiLoading,
  mdiShieldKeyOutline,
  mdiRefresh,
  mdiClose,
} from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/frontend/components/ui/Logo";
import {
  requestPasswordResetCodeAction,
  verifyPasswordResetCodeAction,
  resetPasswordWithCodeAction,
} from "@/backend/actions/auth";

export default function ForgotPage() {
  const router = useRouter();

  // Estados del flujo
  const [step, setStep] = useState<"email" | "code" | "new-password" | "success">("email");

  // Campos
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reenvío y cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Estados de carga y error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const passwordsMatch = confirmPassword !== "" && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  // Auto-descartar error tras 6 segundos
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Auto-descartar reenvío exitoso tras 5 segundos
  useEffect(() => {
    if (!resendSuccess) return;
    const timer = setTimeout(() => {
      setResendSuccess(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [resendSuccess]);

  // Temporizador para reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const goBackToLogin = () => router.push("/login");

  // Paso 1: Solicitar código
  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Por favor ingresa tu correo electrónico.");
      return;
    }

    startTransition(async () => {
      const response = await requestPasswordResetCodeAction({ email: cleanEmail });
      if (!response.success) {
        setErrorMessage(response.error || "No se pudo procesar la solicitud.");
        return;
      }

      setStep("code");
      setResendCooldown(45);
      setCode("");
    });
  };

  // Paso 2: Validar código
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = code.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6) {
      setErrorMessage("Por favor ingresa los 6 dígitos del código de recuperación.");
      return;
    }

    startTransition(async () => {
      const response = await verifyPasswordResetCodeAction({
        email: email.trim().toLowerCase(),
        codigo: cleanCode,
      });

      if (!response.success) {
        setErrorMessage(response.error || "El código ingresado es incorrecto o expiró.");
        return;
      }

      setStep("new-password");
    });
  };

  // Reenviar código
  const handleResend = () => {
    if (resendCooldown > 0 || isPending) return;
    setErrorMessage(null);
    setResendSuccess(false);

    startTransition(async () => {
      const response = await requestPasswordResetCodeAction({
        email: email.trim().toLowerCase(),
      });

      if (!response.success) {
        setErrorMessage(response.error || "No se pudo reenviar el código.");
        return;
      }

      setResendCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    });
  };

  // Paso 3: Establecer nueva contraseña
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const response = await resetPasswordWithCodeAction({
        email: email.trim().toLowerCase(),
        codigo: code.trim(),
        password: newPassword,
        confirmPassword,
      });

      if (!response.success) {
        setErrorMessage(response.error || "No se pudo actualizar la contraseña.");
        return;
      }

      setStep("success");
    });
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Lado izquierdo oscuro */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 p-16 flex-col justify-between relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer z-10">
          <Logo size={1} variant="onDark" />
          <span className="font-extrabold text-white text-xl tracking-tight">InterlocApp</span>
        </Link>

        <div className="relative z-10 text-white max-w-lg my-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-[1.12] tracking-tight mb-6">
            Recupera tu
            <br />
            acceso
          </h2>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
            Te enviaremos un código de seguridad de 6 dígitos a tu correo electrónico para que restablezcas tu contraseña de forma ágil y segura.
          </p>
        </div>

        <p className="text-xs text-gray-500 z-10">
          © {new Date().getFullYear()} InterlocApp. Transporte interurbano seguro.
        </p>
      </div>

      {/* Lado derecho interactivo */}
      <div className="flex-1 bg-white relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <button
          onClick={goBackToLogin}
          className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Icon path={mdiArrowLeft} size={0.7} /> Volver a inicio de sesión
        </button>

        <div className="w-full max-w-md mx-auto pt-8 sm:pt-0">
          <AnimatePresence mode="wait">
            {/* PASO 1: Ingreso de correo */}
            {step === "email" && (
              <motion.div
                key="step-email"
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
                    Recuperar Contraseña
                  </h1>
                  <p className="text-sm text-gray-500">
                    Ingresa tu correo para recibir un código de verificación
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
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
                        placeholder="ejemplo@correo.com"
                        className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-lg py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                        required
                        disabled={isPending}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer shadow-xs hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Icon path={mdiLoading} size={0.9} className="animate-spin" />
                        <span>Enviando código...</span>
                      </>
                    ) : (
                      <span>Enviar código de recuperación</span>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center text-xs sm:text-sm text-gray-500 font-medium">
                  ¿Recordaste tu contraseña?{" "}
                  <Link
                    href="/login"
                    className="text-primary hover:text-primary-dark font-bold transition-colors cursor-pointer"
                  >
                    Iniciar Sesión
                  </Link>
                </div>
              </motion.div>
            )}

            {/* PASO 2: Ingreso de código */}
            {step === "code" && (
              <motion.div
                key="step-code"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-4 border border-sky-100">
                    <Icon path={mdiShieldKeyOutline} size={1.2} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    Ingresa el código
                  </h1>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Hemos enviado un código único a{" "}
                    <strong className="text-gray-900 font-bold">{email}</strong>.
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {resendSuccess && (
                  <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-2.5">
                    <Icon path={mdiCheckCircleOutline} size={0.8} className="shrink-0 text-emerald-500" />
                    <span>¡Código reenviado con éxito! Revisa tu bandeja.</span>
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
                      className="w-full text-center tracking-[0.45em] font-mono font-black text-2xl sm:text-3xl py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-300"
                      autoFocus
                      required
                      disabled={isPending}
                    />
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                      Válido durante 15 minutos
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || code.length !== 6}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer shadow-xs hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Icon path={mdiLoading} size={0.9} className="animate-spin" />
                        <span>Validando código...</span>
                      </>
                    ) : (
                      <span>Validar código</span>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-500">¿No recibiste el código?</span>
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
                      setStep("email");
                      setErrorMessage(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-800 text-center py-1 cursor-pointer font-medium"
                  >
                    ← Cambiar de correo electrónico
                  </button>
                </div>
              </motion.div>
            )}

            {/* PASO 3: Nueva contraseña */}
            {step === "new-password" && (
              <motion.div
                key="step-password"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    Crea tu nueva contraseña
                  </h1>
                  <p className="text-sm text-gray-500">
                    Ingresa una contraseña segura de al menos 6 caracteres
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiLockOutline} size={0.8} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm rounded-lg py-2.5 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                        required
                        disabled={isPending}
                        autoFocus
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
                      Confirmar Nueva Contraseña
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
                        className={`w-full bg-gray-50/80 border text-gray-900 text-sm rounded-lg py-2.5 pl-11 pr-11 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
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
                    disabled={isPending || !passwordsMatch || newPassword.length < 6}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-6 cursor-pointer shadow-xs hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Icon path={mdiLoading} size={0.9} className="animate-spin" />
                        <span>Guardando nueva contraseña...</span>
                      </>
                    ) : (
                      <span>Restablecer Contraseña</span>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* PASO 4: Confirmación exitosa */}
            {step === "success" && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-6 bg-gray-50/80 rounded-xl border border-gray-100 p-8"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-5 border border-emerald-100 shadow-xs">
                  <Icon path={mdiCheckCircleOutline} size={1.4} />
                </div>
                <h3 className="font-extrabold text-gray-900 text-xl mb-2">¡Contraseña actualizada!</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-sm mx-auto">
                  Tu contraseña ha sido restablecida exitosamente. Ahora puedes ingresar a InterlocApp con tus nuevas credenciales.
                </p>
                <button
                  onClick={goBackToLogin}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm py-2.5 rounded-lg transition-all shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  Ir a Iniciar Sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
