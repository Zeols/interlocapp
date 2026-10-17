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
  mdiBusDoubleDecker,
  mdiDomain,
  mdiClose,
} from "@mdi/js";
import { Logo } from "@/frontend/components/ui/Logo";
import {
  requestSignupCodeAction,
  solicitarRegistroCooperativaAction,
  verifySignupCodeAction,
  resendSignupCodeAction,
} from "@/backend/actions/auth";

export default function SignUpPage() {
  const router = useRouter();

  // Tipo de cuenta
  const [accountType, setAccountType] = useState<"PASAJERO" | "COOPERATIVA">("PASAJERO");

  // Estados del flujo
  const [step, setStep] = useState<"form" | "verify">("form");

  // Campos para Pasajero y Administrador
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Campos adicionales para Cooperativa
  const [coopNombre, setCoopNombre] = useState("");
  const [coopTelefono, setCoopTelefono] = useState("");
  const [coopDireccion, setCoopDireccion] = useState("");

  // Código de verificación
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Estados de carga y error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const passwordsMatch = confirmPassword !== "" && password === confirmPassword;
  const passwordsMismatch = confirmPassword !== "" && password !== confirmPassword;

  // Auto-descartar mensaje de error tras 6 segundos
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Auto-descartar aviso de reenvío exitoso tras 5 segundos
  useEffect(() => {
    if (!resendSuccess) return;
    const timer = setTimeout(() => {
      setResendSuccess(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [resendSuccess]);

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

    const trimmedFullName = fullName.trim();
    if (!trimmedFullName || trimmedFullName.length < 2) {
      setErrorMessage("Por favor ingresa tu nombre completo.");
      return;
    }

    const nameParts = trimmedFullName.split(/\s+/);
    const nombre = nameParts[0] || (accountType === "COOPERATIVA" ? "Admin" : "Pasajero");
    const apellido = nameParts.slice(1).join(" ").trim();

    if (accountType === "COOPERATIVA" && !coopNombre.trim()) {
      setErrorMessage("El nombre de la cooperativa o empresa es obligatorio.");
      return;
    }

    startTransition(async () => {
      if (accountType === "COOPERATIVA") {
        const response = await solicitarRegistroCooperativaAction({
          cooperativaNombre: coopNombre.trim(),
          cooperativaTelefono: coopTelefono.trim() || undefined,
          cooperativaDireccion: coopDireccion.trim() || undefined,
          nombre,
          apellido,
          correo: email.trim().toLowerCase(),
          telefono: telefono.trim() || undefined,
          password,
          confirmPassword,
        });

        if (!response.success) {
          setErrorMessage(response.error || "No se pudo procesar la solicitud de la cooperativa.");
          return;
        }

        router.push(response.data?.redirectUrl || "/login?pending=true");
        return;
      }

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
                <div className="mb-5">
                  <div className="mb-3 lg:hidden">
                    <Logo size={1} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
                    Crear Cuenta
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Selecciona tu perfil e ingresa tus datos
                  </p>
                </div>

                {/* Selector de Pestañas: Pasajero vs Cooperativa */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType("PASAJERO");
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      accountType === "PASAJERO"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon path={mdiAccountOutline} size={0.75} className={accountType === "PASAJERO" ? "text-primary" : ""} />
                    Soy Pasajero
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType("COOPERATIVA");
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      accountType === "COOPERATIVA"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon path={mdiBusDoubleDecker} size={0.75} className={accountType === "COOPERATIVA" ? "text-primary" : ""} />
                    Soy Cooperativa
                  </button>
                </div>

                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      key="signup-error-step1"
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2">
                          <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                          <span>{errorMessage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setErrorMessage(null)}
                          className="text-red-400 hover:text-red-600 p-0.5 rounded cursor-pointer shrink-0"
                          title="Cerrar mensaje"
                        >
                          <Icon path={mdiClose} size={0.65} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleRequestCode} className="space-y-3.5">
                  {/* SECCIÓN DATOS DE COOPERATIVA (SI ES CUENTA COOPERATIVA) */}
                  {accountType === "COOPERATIVA" && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Icon path={mdiDomain} size={0.7} />
                        Datos de la Cooperativa / Empresa
                      </p>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Nombre Oficial de la Cooperativa *
                        </label>
                        <input
                          type="text"
                          value={coopNombre}
                          onChange={(e) => setCoopNombre(e.target.value)}
                          placeholder="Ej: COOTRANSTEL R.L., Transporte del Norte..."
                          className="w-full bg-white border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                          required
                          disabled={isPending}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Teléfono institucional
                          </label>
                          <input
                            type="tel"
                            maxLength={8}
                            value={coopTelefono}
                            onChange={(e) => setCoopTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                            placeholder="Ej: 22223344"
                            className="w-full bg-white border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Terminal / Dirección
                          </label>
                          <input
                            type="text"
                            value={coopDireccion}
                            onChange={(e) => setCoopDireccion(e.target.value)}
                            placeholder="Terminal UCA, Managua..."
                            className="w-full bg-white border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN DATOS PERSONALES DEL USUARIO / ADMIN */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {accountType === "COOPERATIVA" ? "Nombre Completo del Administrador *" : "Nombre Completo *"}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiAccountOutline} size={0.7} />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nombre y apellido"
                        className="w-full bg-gray-50/80 border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-lg py-2.5 pl-9 pr-3 focus:outline-none focus:border-slate-400 focus:bg-white transition-all disabled:opacity-60"
                        required
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {accountType === "COOPERATIVA" ? "Correo Electrónico del Administrador *" : "Correo electrónico *"}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiEmailOutline} size={0.7} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full bg-gray-50/80 border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-lg py-2.5 pl-9 pr-3 focus:outline-none focus:border-slate-400 focus:bg-white transition-all disabled:opacity-60"
                        required
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Teléfono de contacto (8 dígitos numéricos)
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiPhoneOutline} size={0.7} />
                      </div>
                      <input
                        type="tel"
                        maxLength={8}
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        placeholder="Ej: 88888888"
                        className="w-full bg-gray-50/80 border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-lg py-2.5 pl-9 pr-3 focus:outline-none focus:border-slate-400 focus:bg-white transition-all disabled:opacity-60"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Contraseña *
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Icon path={mdiLockOutline} size={0.7} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-gray-50/80 border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-lg py-2.5 pl-9 pr-9 focus:outline-none focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                          required
                          disabled={isPending}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          <Icon path={showPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.65} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Confirmar Contraseña *
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Icon path={mdiLockOutline} size={0.7} />
                        </div>
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite tu contraseña"
                          className={`w-full bg-gray-50/80 border text-gray-900 text-xs sm:text-sm rounded-lg py-2.5 pl-9 pr-9 focus:outline-none focus:bg-white transition-all disabled:opacity-60 ${
                            passwordsMismatch
                              ? "border-red-300 focus:border-red-500"
                              : passwordsMatch
                              ? "border-emerald-300 focus:border-emerald-500"
                              : "border-gray-200 focus:border-primary"
                          }`}
                          required
                          disabled={isPending}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          <Icon path={showConfirm ? mdiEyeOffOutline : mdiEyeOutline} size={0.65} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {accountType === "COOPERATIVA" && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                      <strong>Aviso de verificación:</strong> Al registrar una cooperativa, la solicitud pasará a revisión por el Super Administrador de InterlocApp. Tras ser aprobada, recibirás un correo y podrás ingresar a gestionar tu flota, rutas y colaboradores.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPending || passwordsMismatch}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-semibold text-xs sm:text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isPending ? (
                      <>
                        <Icon path={mdiLoading} size={0.8} className="animate-spin" />
                        <span>{accountType === "COOPERATIVA" ? "Registrando solicitud..." : "Enviando código..."}</span>
                      </>
                    ) : (
                      <span>
                        {accountType === "COOPERATIVA" ? "Solicitar Registro de Cooperativa" : "Crear Cuenta de Pasajero"}
                      </span>
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

                  <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
                    <Icon path={mdiAlertCircleOutline} size={0.75} className="text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">
                      ¿No lo ves en tu bandeja de entrada? <strong>Revisa tu carpeta de Spam o Correo no deseado</strong>. A veces los correos con códigos de verificación pueden filtrarse allí.
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      key="signup-error-step2"
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mb-5"
                    >
                      <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5">
                          <Icon path={mdiAlertCircleOutline} size={0.8} className="shrink-0 mt-0.5 text-red-500" />
                          <span>{errorMessage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setErrorMessage(null)}
                          className="text-red-400 hover:text-red-600 p-0.5 rounded cursor-pointer shrink-0"
                          title="Cerrar mensaje"
                        >
                          <Icon path={mdiClose} size={0.65} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {resendSuccess && (
                    <motion.div
                      key="signup-resend-success"
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mb-5"
                    >
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <Icon path={mdiCheckCircleOutline} size={0.8} className="shrink-0 text-emerald-500" />
                          <span>¡Nuevo código de verificación enviado a tu correo!</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResendSuccess(false)}
                          className="text-emerald-500 hover:text-emerald-700 p-0.5 rounded cursor-pointer shrink-0"
                          title="Cerrar mensaje"
                        >
                          <Icon path={mdiClose} size={0.65} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
