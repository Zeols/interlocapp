"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@mdi/react";
import {
  mdiAccountOutline,
  mdiKeyOutline,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiLoading,
  mdiCameraOutline,
  mdiDeleteOutline,
  mdiEmailOutline,
  mdiPhoneOutline,
  mdiMapMarkerOutline,
  mdiShieldCheckOutline,
  mdiLockOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiCheck,
  mdiClose,
} from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import {
  getUserProfileAction,
  updateUserProfileAction,
  changePasswordAction,
} from "@/backend/actions/usuarios";
import { processAvatarImage } from "@/frontend/lib/image-utils";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"personal" | "password">("personal");
  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Datos personales del usuario
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [foto, setFoto] = useState("");
  const [fotoError, setFotoError] = useState(false);
  const [rolNombre, setRolNombre] = useState("");

  // Estado inicial para detección de cambios sin guardar (dirty state)
  const [initialData, setInitialData] = useState<{
    nombre: string;
    apellido: string;
    telefono: string;
    direccion: string;
  }>({
    nombre: "",
    apellido: "",
    telefono: "",
    direccion: "",
  });

  // Modales
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Subida y procesamiento de foto
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Datos de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mensajes de estado
  const [personalFeedback, setPersonalFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    getUserProfileAction().then((res) => {
      if (res.success && res.data) {
        const loaded = {
          nombre: res.data.nombre ?? "",
          apellido: res.data.apellido ?? "",
          telefono: res.data.telefono ?? "",
          direccion: res.data.direccion ?? "",
        };
        setNombre(loaded.nombre);
        setApellido(loaded.apellido);
        setCorreo(res.data.correo ?? "");
        setTelefono(loaded.telefono);
        setDireccion(loaded.direccion);
        setFoto(res.data.foto ?? "");
        setRolNombre(res.data.rolNombre ?? "PASAJERO");
        setInitialData(loaded);
      }
      setLoading(false);
    });
  }, []);

  // Comprobar si hay cambios sin guardar en los campos personales
  const hasUnsavedChanges = Boolean(
    !loading &&
    activeTab === "personal" &&
    (
      (nombre ?? "").trim() !== (initialData.nombre ?? "").trim() ||
      (apellido ?? "").trim() !== (initialData.apellido ?? "").trim() ||
      (telefono ?? "").trim() !== (initialData.telefono ?? "").trim() ||
      (direccion ?? "").trim() !== (initialData.direccion ?? "").trim()
    )
  );

  // Prevenir que el usuario cierre la pestaña o recargue con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Descartar cambios realizados
  const handleDiscardChanges = () => {
    setNombre(initialData.nombre);
    setApellido(initialData.apellido);
    setTelefono(initialData.telefono);
    setDireccion(initialData.direccion);
    setPersonalFeedback(null);
  };

  // Cambio de pestaña con verificación de cambios sin guardar
  const handleTabClick = (targetTab: "personal" | "password") => {
    if (activeTab === targetTab) return;
    if (activeTab === "personal" && hasUnsavedChanges) {
      setPendingNavigation(() => () => {
        handleDiscardChanges();
        setActiveTab(targetTab);
      });
      setShowUnsavedModal(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setPersonalFeedback(null);
      setProcessingImage(true);
      const webpDataUrl = await processAvatarImage(file, {
        targetSize: 256,
        quality: 0.85,
        maxInputBytes: 5 * 1024 * 1024,
      });
      setFoto(webpDataUrl);
      setFotoError(false);

      // Auto-guardar la foto de inmediato en la base de datos
      if (nombre) {
        const res = await updateUserProfileAction({
          nombre,
          apellido,
          telefono,
          direccion,
          foto: webpDataUrl,
        });
        if (res.success) {
          setPersonalFeedback({
            type: "success",
            message: "Foto de perfil actualizada exitosamente.",
          });
          setTimeout(() => setPersonalFeedback(null), 4000);
        }
      }
    } catch (err: any) {
      setPersonalFeedback({
        type: "error",
        message: err.message || "No se pudo procesar la imagen seleccionada.",
      });
    } finally {
      setProcessingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Confirmar y procesar la eliminación de foto
  const confirmDeletePhoto = async () => {
    try {
      setPersonalFeedback(null);
      setProcessingImage(true);
      setFoto("");
      setFotoError(false);

      if (nombre) {
        const res = await updateUserProfileAction({
          nombre,
          apellido,
          telefono,
          direccion,
          foto: "",
        });
        if (res.success) {
          setPersonalFeedback({
            type: "success",
            message: "Foto de perfil eliminada.",
          });
          setTimeout(() => setPersonalFeedback(null), 4000);
        }
      }
    } catch {
      setPersonalFeedback({
        type: "error",
        message: "No se pudo eliminar la foto de perfil.",
      });
    } finally {
      setProcessingImage(false);
      setShowDeletePhotoModal(false);
    }
  };

  const handleSavePersonal = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    setPersonalFeedback(null);
    setSavingPersonal(true);

    const res = await updateUserProfileAction({
      nombre,
      apellido,
      telefono,
      direccion,
      foto,
    });

    setSavingPersonal(false);
    if (res.success) {
      setInitialData({
        nombre,
        apellido,
        telefono,
        direccion,
      });
      setPersonalFeedback({
        type: "success",
        message: "Tus datos personales se actualizaron correctamente.",
      });
      setTimeout(() => setPersonalFeedback(null), 4000);
    } else {
      setPersonalFeedback({
        type: "error",
        message: res.error || "No se pudieron guardar los cambios.",
      });
    }
  };

  const handleSavePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "La nueva contraseña y la confirmación no coinciden.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: "error",
        message: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    setSavingPassword(true);
    const res = await changePasswordAction({
      currentPassword,
      newPassword,
    });
    setSavingPassword(false);

    if (res.success) {
      setPasswordFeedback({
        type: "success",
        message: "Contraseña actualizada exitosamente.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordFeedback(null), 4000);
    } else {
      setPasswordFeedback({
        type: "error",
        message: res.error || "Error al actualizar la contraseña.",
      });
    }
  };

  const fullName = `${nombre || ""} ${apellido || ""}`.trim() || "Usuario";
  const displayChar = (nombre?.trim() || correo?.trim() || "?").charAt(0).toUpperCase();

  return (
    <div className="w-full min-h-screen bg-gray-50/60 pb-24">
      {/* Contenedor unificado alineado a max-w-6xl */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-8">
        
        {/* TARJETA DE IDENTIDAD HERO DEL USUARIO */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden mb-6">
          {/* Banner superior con gradiente de marca */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-gray-900 via-slate-800 to-primary/85 relative px-6 flex items-end">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-white border border-white/20">
                <Icon path={mdiShieldCheckOutline} size={0.65} className="text-emerald-400" />
                Cuenta Verificada
              </span>
            </div>
          </div>

          {/* Información del usuario y Avatar superpuesto */}
          <div className="px-6 sm:px-8 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
              {/* Avatar circular interactivo con acciones directas */}
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="avatar-file-upload"
                />

                <div
                  onClick={() => !processingImage && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white ring-4 shadow-md border-2 shrink-0 flex items-center justify-center relative cursor-pointer transition-all duration-200 ${
                    isDragOver
                      ? "ring-primary border-primary scale-105"
                      : "ring-white border-gray-100 group-hover:ring-primary/20"
                  }`}
                  title="Haz clic o arrastra una imagen para cambiar tu foto"
                >
                  {foto && foto.trim() !== "" && !fotoError ? (
                    <img
                      src={foto}
                      alt={fullName}
                      onError={() => setFotoError(true)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-black text-3xl sm:text-4xl select-none">
                      {displayChar}
                    </div>
                  )}

                  {/* Overlay interactivo en hover */}
                  {!processingImage && (
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white select-none">
                      <Icon path={mdiCameraOutline} size={0.9} />
                      <span className="text-[10px] font-bold mt-0.5">Cambiar</span>
                    </div>
                  )}

                  {/* Estado de carga */}
                  {processingImage && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                      <Icon path={mdiLoading} size={1} className="animate-spin text-primary" />
                      <span className="text-[9px] font-bold mt-1">Guardando...</span>
                    </div>
                  )}
                </div>

                {/* Botón flotante: Cambiar fotografía (Cámara) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingImage}
                  className="absolute bottom-0 right-0 w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-md border-2 border-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                  title="Cambiar fotografía"
                  aria-label="Cambiar fotografía"
                >
                  <Icon path={mdiCameraOutline} size={0.65} />
                </button>

                {/* Botón flotante: Eliminar foto (abre modal de confirmación) */}
                {foto && foto.trim() !== "" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeletePhotoModal(true);
                    }}
                    disabled={processingImage}
                    className="absolute -top-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-red-50 text-red-600 shadow-md border border-red-200 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                    title="Quitar foto de perfil"
                    aria-label="Quitar foto de perfil"
                  >
                    <Icon path={mdiDeleteOutline} size={0.6} />
                  </button>
                )}
              </div>

              {/* Botón de acceso rápido a boletos */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {rolNombre || "PASAJERO"}
                </span>
              </div>
            </div>

            {/* Nombre, correo y datos descriptivos */}
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {fullName}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-1 text-xs sm:text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Icon path={mdiEmailOutline} size={0.65} className="text-gray-400" />
                  {correo}
                </span>
                {telefono && (
                  <span className="flex items-center gap-1">
                    <Icon path={mdiPhoneOutline} size={0.65} className="text-gray-400" />
                    {telefono}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* PESTAÑAS HORIZONTALES MODERNAS (Segmented Control) con botón de acción en PC */}
          <div className="border-t border-gray-100 bg-gray-50/60 px-6 sm:px-8 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTabClick("personal")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "personal"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                }`}
              >
                <Icon path={mdiAccountOutline} size={0.75} className={activeTab === "personal" ? "text-primary" : "text-gray-400"} />
                <span>Datos Personales</span>
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Cambios sin guardar" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabClick("password")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "password"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                }`}
              >
                <Icon path={mdiKeyOutline} size={0.75} className={activeTab === "password" ? "text-primary" : "text-gray-400"} />
                <span>Seguridad y Contraseña</span>
              </button>
            </div>

            {/* BOTÓN DE GUARDAR CAMBIOS VISIBLE EN PC (Barra superior) */}
            {activeTab === "personal" && (
              <div className="hidden sm:flex items-center gap-2.5">
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    disabled={savingPersonal}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Descartar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSavePersonal()}
                  disabled={savingPersonal || !hasUnsavedChanges}
                  className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                    hasUnsavedChanges
                      ? "bg-primary hover:bg-primary-dark text-white shadow-primary/20 cursor-pointer active:scale-95"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-75"
                  }`}
                  title={hasUnsavedChanges ? "Guardar cambios realizados" : "No hay cambios pendientes"}
                >
                  {savingPersonal ? (
                    <>
                      <Icon path={mdiLoading} size={0.65} className="animate-spin text-white" />
                      <span>Guardando...</span>
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <Icon path={mdiCheck} size={0.65} />
                      <span>Guardar cambios</span>
                    </>
                  ) : (
                    <>
                      <Icon path={mdiCheckCircleOutline} size={0.65} className="text-emerald-500" />
                      <span>Al día</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CONTENIDO DE LA PESTAÑA ACTIVA */}
        {loading ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-xs">
            <Icon path={mdiLoading} size={1.4} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-600">Cargando datos del perfil...</p>
          </div>
        ) : activeTab === "personal" ? (
          <form onSubmit={handleSavePersonal} className="space-y-6">
            
            {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs">
              <div className="mb-5 pb-3 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
                  Información Básica
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nombre oficial utilizado para la emisión de tus boletos de transporte
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="profile-nombre"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Nombre
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Icon path={mdiAccountOutline} size={0.75} />
                    </div>
                    <input
                      id="profile-nombre"
                      name="nombre"
                      type="text"
                      autoComplete="given-name"
                      value={nombre ?? ""}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-apellido"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Apellido
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Icon path={mdiAccountOutline} size={0.75} />
                    </div>
                    <input
                      id="profile-apellido"
                      name="apellido"
                      type="text"
                      autoComplete="family-name"
                      value={apellido ?? ""}
                      onChange={(e) => setApellido(e.target.value)}
                      placeholder="Tu apellido"
                      className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: CANALES DE CONTACTO */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs">
              <div className="mb-5 pb-3 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
                  Canales de Contacto
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Medios utilizados para el envío de comprobantes y comunicación de ruta
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="profile-correo"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      Correo Electrónico
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <Icon path={mdiCheckCircleOutline} size={0.55} className="text-emerald-600" />
                      Verificado (Solo lectura)
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Icon path={mdiEmailOutline} size={0.75} />
                    </div>
                    <input
                      id="profile-correo"
                      name="correo"
                      type="email"
                      value={correo ?? ""}
                      readOnly
                      className="w-full bg-gray-100/80 border border-gray-200 text-gray-500 text-sm font-medium rounded-2xl py-3 pl-10 pr-4 cursor-not-allowed select-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Este correo está protegido y vinculado para el envío de tus boletos con código QR.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-telefono"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                    >
                      Teléfono Móvil
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiPhoneOutline} size={0.75} />
                      </div>
                      <input
                        id="profile-telefono"
                        name="telefono"
                        type="tel"
                        autoComplete="tel"
                        value={telefono ?? ""}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="8888 8888"
                        className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-direccion"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                    >
                      Dirección o Ciudad (Opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon path={mdiMapMarkerOutline} size={0.75} />
                      </div>
                      <input
                        id="profile-direccion"
                        name="direccion"
                        type="text"
                        value={direccion ?? ""}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Managua, Nicaragua"
                        className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MENSAJES DE ESTADO / FEEDBACK */}
            {personalFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 border transition-all animate-in fade-in ${
                  personalFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <Icon
                  path={
                    personalFeedback.type === "success"
                      ? mdiCheckCircleOutline
                      : mdiAlertCircleOutline
                  }
                  size={0.85}
                  className={personalFeedback.type === "success" ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"}
                />
                <span>{personalFeedback.message}</span>
              </div>
            )}

            {/* BARRA DE ACCIÓN INFERIOR */}
            <div className="flex items-center justify-between pt-2">
              <div>
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Tienes cambios pendientes por guardar
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    disabled={savingPersonal}
                    className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Descartar cambios
                  </button>
                )}

                <button
                  type="submit"
                  disabled={savingPersonal || !hasUnsavedChanges}
                  className={`text-white font-black text-sm px-8 py-3.5 rounded-2xl transition-all shadow-md flex items-center gap-2 ${
                    hasUnsavedChanges
                      ? "bg-primary hover:bg-primary-dark shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      : "bg-gray-300 text-gray-500 shadow-none cursor-not-allowed opacity-75"
                  }`}
                >
                  {savingPersonal ? (
                    <>
                      <Icon path={mdiLoading} size={0.75} className="animate-spin text-white" />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <>
                      <Icon path={mdiCheck} size={0.75} />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* PESTAÑA: CAMBIAR CONTRASEÑA */
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-xs">
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
                Seguridad de la Cuenta
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Actualiza tu contraseña para mantener tu cuenta y reservas protegidas
              </p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 max-w-xl">
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Contraseña Actual
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon path={mdiLockOutline} size={0.75} />
                  </div>
                  <input
                    id="current-password"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword ?? ""}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <Icon path={showCurrentPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.75} />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon path={mdiLockOutline} size={0.75} />
                  </div>
                  <input
                    id="new-password"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword ?? ""}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <Icon path={showNewPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.75} />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon path={mdiLockOutline} size={0.75} />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword ?? ""}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <Icon path={showConfirmPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.75} />
                  </button>
                </div>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 border transition-all animate-in fade-in ${
                    passwordFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  <Icon
                    path={
                      passwordFeedback.type === "success"
                        ? mdiCheckCircleOutline
                        : mdiAlertCircleOutline
                    }
                    size={0.85}
                    className={passwordFeedback.type === "success" ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"}
                  />
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-sm px-8 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center gap-2"
                >
                  {savingPassword ? (
                    <>
                      <Icon path={mdiLoading} size={0.75} className="animate-spin text-white" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <span>Actualizar Contraseña</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* BARRA FLOTANTE INFERIOR DE ACCIÓN (PC / DESKTOP STICKY DOCK) */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 35, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 text-white backdrop-blur-md px-5 sm:px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 sm:gap-6"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-gray-100">
                Tienes cambios sin guardar
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={savingPersonal}
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => handleSavePersonal()}
                disabled={savingPersonal}
                className="px-4 sm:px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {savingPersonal ? (
                  <>
                    <Icon path={mdiLoading} size={0.65} className="animate-spin text-white" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Icon path={mdiCheck} size={0.65} />
                    <span>Guardar cambios</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN: QUITAR FOTO */}
      <AnimatePresence>
        {showDeletePhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop con desenfoque */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !processingImage && setShowDeletePhotoModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Diálogo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-center z-10"
            >
              {/* Icono de advertencia */}
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto mb-4">
                <Icon path={mdiDeleteOutline} size={1.2} />
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight mb-2">
                ¿Quitar foto de perfil?
              </h3>
              
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-6">
                Tu imagen actual será eliminada de tu cuenta y pases de abordar. Tu perfil volverá a mostrar tu inicial predeterminada.
              </p>

              {/* Vista previa en miniatura de la foto actual */}
              {foto && (
                <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-6 ring-4 ring-gray-100 border border-gray-200">
                  <img src={foto} alt={fullName} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeletePhotoModal(false)}
                  disabled={processingImage}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePhoto}
                  disabled={processingImage}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow-sm shadow-red-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {processingImage ? (
                    <>
                      <Icon path={mdiLoading} size={0.7} className="animate-spin text-white" />
                      <span>Quitando...</span>
                    </>
                  ) : (
                    <span>Sí, quitar foto</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN: SALIR SIN GUARDAR */}
      <AnimatePresence>
        {showUnsavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnsavedModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Diálogo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-center z-10"
            >
              {/* Icono de advertencia */}
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto mb-4">
                <Icon path={mdiAlertCircleOutline} size={1.2} />
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight mb-2">
                ¿Deseas salir sin guardar?
              </h3>
              
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-6">
                Tienes modificaciones sin guardar en tus datos personales. Si sales ahora, se perderán los cambios realizados.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnsavedModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedModal(false);
                    if (pendingNavigation) {
                      pendingNavigation();
                      setPendingNavigation(null);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  Descartar y continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
