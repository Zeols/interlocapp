"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  mdiTicketConfirmationOutline,
} from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FingerprintPattern } from "lucide-react";
import {
  getUserProfileAction,
  updateUserProfileAction,
  changePasswordAction,
} from "@/backend/actions/usuarios";
import { registerBiometricDeviceAction, getCurrentUserAction } from "@/backend/actions/auth";
import { processAvatarImage } from "@/frontend/lib/image-utils";
import {
  isBiometricsAvailable,
  getStoredBiometricDevice,
  saveBiometricDevice,
  removeStoredBiometricDevice,
  createBiometricCredential,
  verifyBiometricCredential,
  getFriendlyDeviceName,
  StoredBiometricDevice,
} from "@/frontend/lib/biometrics";

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"personal" | "password" | "biometria">("personal");
  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [storedDevice, setStoredDevice] = useState<StoredBiometricDevice | null>(null);
  const [bioSupported, setBioSupported] = useState<boolean>(true);

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
  const [showPhotoActionsModal, setShowPhotoActionsModal] = useState(false);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [savingNewPhoto, setSavingNewPhoto] = useState(false);
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

    // Detectar soporte y credencial biométrica en este dispositivo
    isBiometricsAvailable().then((res) => {
      setBioSupported(res.supported);
    });
    setStoredDevice(getStoredBiometricDevice());
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
  const handleTabClick = (targetTab: "personal" | "password" | "biometria") => {
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

  // Acciones de Huella Digital / Face ID
  const handleRegisterBiometric = async () => {
    setBiometricFeedback(null);
    setBiometricLoading(true);

    try {
      const friendlyName = getFriendlyDeviceName();
      const userFull = `${nombre} ${apellido}`.trim() || correo;
      
      const resCred = await createBiometricCredential(correo, userFull);
      if (!resCred.success || !resCred.credentialId) {
        setBiometricFeedback({
          type: "error",
          message: resCred.error || "No se pudo registrar la huella digital en este dispositivo.",
        });
        setBiometricLoading(false);
        return;
      }

      const resToken = await registerBiometricDeviceAction({
        credentialId: resCred.credentialId,
        deviceName: friendlyName,
      });

      if (!resToken.success || !resToken.data?.deviceToken) {
        setBiometricFeedback({
          type: "error",
          message: resToken.error || "No se pudo emitir la llave biométrica de seguridad.",
        });
        setBiometricLoading(false);
        return;
      }

      const newDevice: StoredBiometricDevice = {
        credentialId: resCred.credentialId,
        deviceToken: resToken.data.deviceToken,
        deviceName: friendlyName,
        userEmail: correo,
        userName: userFull,
        registeredAt: new Date().toISOString(),
      };

      saveBiometricDevice(newDevice);
      setStoredDevice(newDevice);
      setBiometricFeedback({
        type: "success",
        message: "¡Huella digital vinculada exitosamente a este dispositivo!",
      });
    } catch (err: unknown) {
      const error = err as Error;
      setBiometricFeedback({
        type: "error",
        message: error.message || "Error al vincular huella digital.",
      });
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleTestBiometric = async () => {
    if (!storedDevice) return;
    setBiometricFeedback(null);
    setBiometricLoading(true);

    try {
      const res = await verifyBiometricCredential(storedDevice.credentialId);
      if (res.success) {
        setBiometricFeedback({
          type: "success",
          message: "Huella verificada correctamente. El sensor biométrico se encuentra operativo.",
        });
      } else {
        setBiometricFeedback({
          type: "error",
          message: res.error || "No se reconoció la huella digital.",
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setBiometricFeedback({
        type: "error",
        message: error.message || "Error al verificar huella digital.",
      });
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleRemoveBiometric = () => {
    removeStoredBiometricDevice();
    setStoredDevice(null);
    setBiometricFeedback({
      type: "success",
      message: "Se ha desvinculado la huella digital de este dispositivo.",
    });
  };

  const triggerPhotoPicker = () => {
    if (processingImage || savingNewPhoto) return;
    if (fileInputRef.current) {
      // Limpiar previamente para garantizar que el evento onChange siempre dispare incluso al seleccionar el mismo archivo
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setPersonalFeedback(null);
      setProcessingImage(true);
      const webpDataUrl = await processAvatarImage(file, {
        targetSize: 256,
        quality: 0.85,
        maxInputBytes: 15 * 1024 * 1024,
      });
      // Abrir modal de "¿Quieres cambiar tu foto?" con la vista previa antes de guardar
      setNewPhotoPreview(webpDataUrl);
    } catch (err: any) {
      setPersonalFeedback({
        type: "error",
        message: err.message || "No se pudo procesar la imagen seleccionada.",
      });
    } finally {
      setProcessingImage(false);
    }
  };

  const confirmSaveNewPhoto = async () => {
    if (!newPhotoPreview) return;
    try {
      setSavingNewPhoto(true);
      setPersonalFeedback(null);
      const res = await updateUserProfileAction({
        nombre: nombre?.trim() || "Usuario",
        apellido: apellido?.trim() || "",
        telefono: telefono?.trim() || "",
        direccion: direccion?.trim() || "",
        foto: newPhotoPreview,
      });

      if (res.success) {
        setFoto(newPhotoPreview);
        setFotoError(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profile-updated", {
              detail: { foto: newPhotoPreview },
            })
          );
        }
        router.refresh();

        setPersonalFeedback({
          type: "success",
          message: "Foto de perfil actualizada exitosamente.",
        });
        setTimeout(() => setPersonalFeedback(null), 4000);
        setNewPhotoPreview(null);
      } else {
        setPersonalFeedback({
          type: "error",
          message: res.error || "No se pudo guardar la nueva foto en el servidor.",
        });
      }
    } catch {
      setPersonalFeedback({
        type: "error",
        message: "Ocurrió un error al guardar la foto de perfil.",
      });
    } finally {
      setSavingNewPhoto(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
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
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("profile-updated", {
                detail: { foto: null },
              })
            );
          }
          router.refresh();

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

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: {
              foto,
              name: `${nombre} ${apellido}`.trim(),
            },
          })
        );
      }
      router.refresh();

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
          {/* Banner superior ejecutivo en tono slate oscuro */}
          <div className="h-28 sm:h-32 bg-slate-900 border-b border-slate-800 relative px-6 flex items-end">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-white border border-white/15">
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
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="avatar-file-upload"
                  aria-hidden="true"
                />

                {/* Contenedor circular principal táctil */}
                <button
                  type="button"
                  onClick={() => setShowPhotoActionsModal(true)}
                  disabled={processingImage}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white ring-4 shadow-md border-2 shrink-0 flex items-center justify-center relative cursor-pointer transition-all duration-200 select-none touch-manipulation disabled:opacity-80 active:scale-95 ${
                    isDragOver
                      ? "ring-primary border-primary scale-105"
                      : "ring-white border-gray-100 group-hover:ring-primary/20"
                  }`}
                  title="Toca para gestionar tu foto de perfil"
                  aria-label="Gestionar foto de perfil"
                >
                  {foto && foto.trim() !== "" && !fotoError ? (
                    <img
                      key={foto}
                      src={foto}
                      alt={fullName}
                      draggable={false}
                      onError={() => setFotoError(true)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-black text-3xl sm:text-4xl select-none pointer-events-none">
                      {displayChar}
                    </div>
                  )}

                  {/* Overlay interactivo en hover */}
                  {!processingImage && (
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white select-none pointer-events-none">
                      <Icon path={mdiCameraOutline} size={0.9} />
                      <span className="text-[10px] font-bold mt-0.5">Editar</span>
                    </div>
                  )}

                  {/* Estado de carga */}
                  {processingImage && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 pointer-events-none">
                      <Icon path={mdiLoading} size={1} className="animate-spin text-primary" />
                      <span className="text-[9px] font-bold mt-1">Cargando...</span>
                    </div>
                  )}
                </button>

                {/* Botón flotante: Cambiar fotografía (Cámara) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPhotoActionsModal(true);
                  }}
                  disabled={processingImage}
                  className={`absolute -bottom-1 -right-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-md border-2 border-white flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer z-10 touch-manipulation disabled:opacity-70`}
                  title="Gestionar foto de perfil"
                  aria-label="Gestionar foto de perfil"
                >
                  <Icon path={mdiCameraOutline} size={0.7} />
                </button>

                {/* Botón flotante: Eliminar foto (abre modal de confirmación) */}
                {foto && foto.trim() !== "" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeletePhotoModal(true);
                    }}
                    disabled={processingImage}
                    className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white hover:bg-red-50 text-red-600 shadow-md border border-red-200 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer z-20 touch-manipulation"
                    title="Quitar foto de perfil"
                    aria-label="Quitar foto de perfil"
                  >
                    <Icon path={mdiDeleteOutline} size={0.65} />
                  </button>
                )}
              </div>

              {/* Botón de acceso rápido a boletos */}
              <div className="flex items-center gap-2">
                <Link
                  href="/tickets"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Icon path={mdiTicketConfirmationOutline} size={0.65} />
                  <span>Mis Boletos QR</span>
                </Link>
                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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

          {/* PESTAÑAS HORIZONTALES (Segmented Control) con botón de acción en PC */}
          <div className="border-t border-gray-100 bg-slate-50/70 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto py-0.5">
              <button
                type="button"
                onClick={(e) => {
                  handleTabClick("personal");
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === "personal"
                    ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Icon path={mdiAccountOutline} size={0.75} className={`shrink-0 ${activeTab === "personal" ? "text-slate-900" : "text-slate-400"}`} />
                <span>Datos Personales</span>
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Cambios sin guardar" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  handleTabClick("password");
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === "password"
                    ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Icon path={mdiKeyOutline} size={0.75} className={`shrink-0 ${activeTab === "password" ? "text-slate-900" : "text-slate-400"}`} />
                <span>Contraseña</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  handleTabClick("biometria");
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === "biometria"
                    ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <FingerprintPattern className={`w-4 h-4 shrink-0 ${activeTab === "biometria" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Datos Biométricos</span>
                {storedDevice && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Huella activa en este dispositivo" />
                )}
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
                      ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95"
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

        {/* NOTIFICACIÓN PROMINENTE DE ESTADO Y ERRORES (Alta visibilidad inmediata en móvil) */}
        {personalFeedback && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 border shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
              personalFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-200/50"
                : "bg-red-50 text-red-900 border-red-300 ring-2 ring-red-200/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                path={
                  personalFeedback.type === "success"
                    ? mdiCheckCircleOutline
                    : mdiAlertCircleOutline
                }
                size={0.85}
                className={personalFeedback.type === "success" ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"}
              />
              <span className="font-bold">{personalFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setPersonalFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Cerrar notificación"
            >
              <Icon path={mdiClose} size={0.65} />
            </button>
          </div>
        )}

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
                      Teléfono Móvil (8 dígitos)
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
                        maxLength={8}
                        value={telefono ?? ""}
                        onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        placeholder="Ej: 88888888"
                        className="w-full bg-gray-50/80 border border-gray-200/90 text-gray-900 text-sm font-semibold rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 focus:bg-white transition-all"
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
                  className={`text-white font-bold text-sm px-7 py-3 rounded-xl transition-all shadow-xs flex items-center gap-2 ${
                    hasUnsavedChanges
                      ? "bg-slate-900 hover:bg-slate-800 cursor-pointer active:scale-95"
                      : "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed opacity-75"
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
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-7 py-3 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 flex items-center gap-2"
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

        {/* PESTAÑA 3: HUELLA DIGITAL Y BIOMETRÍA */}
        {activeTab === "biometria" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2.5">
                  <FingerprintPattern className="w-5 h-5 text-emerald-600" />
                  Huella Digital y Passkeys
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Accede a InterlocApp instantáneamente utilizando el sensor de huella, Face ID o Windows Hello de tu dispositivo.
                </p>
              </div>

              {storedDevice && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Vinculado
                </span>
              )}
            </div>

            {biometricFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 border mb-6 transition-all animate-in fade-in ${
                  biometricFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <Icon
                  path={
                    biometricFeedback.type === "success"
                      ? mdiCheckCircleOutline
                      : mdiAlertCircleOutline
                  }
                  size={0.85}
                  className={biometricFeedback.type === "success" ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"}
                />
                <span>{biometricFeedback.message}</span>
              </div>
            )}

            {!bioSupported ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
                <p className="font-bold">Navegador no compatible</p>
                <p className="mt-1 text-amber-700">Tu navegador actual no tiene habilitada la API WebAuthn para sensores biométricos. Te recomendamos usar Google Chrome, Safari o Microsoft Edge actualizados.</p>
              </div>
            ) : storedDevice ? (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                      <FingerprintPattern className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {storedDevice.deviceName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Registrado el {new Date(storedDevice.registeredAt).toLocaleDateString()} a las {new Date(storedDevice.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestBiometric}
                      disabled={biometricLoading}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
                    >
                      {biometricLoading ? (
                        <Icon path={mdiLoading} size={0.65} className="animate-spin text-gray-600" />
                      ) : (
                        <Icon path={mdiShieldCheckOutline} size={0.65} className="text-emerald-600" />
                      )}
                      <span>Probar Huella</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveBiometric}
                      disabled={biometricLoading}
                      className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
                    >
                      <Icon path={mdiDeleteOutline} size={0.65} />
                      <span>Desvincular</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Con este dispositivo vinculado, puedes pulsar <strong>"Con Huella"</strong> en la pantalla de inicio de sesión para entrar al sistema sin necesidad de introducir tu contraseña.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-gray-200 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <FingerprintPattern className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  No hay huella digital registrada en este equipo
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mb-5 leading-relaxed">
                  Registra el sensor biométrico (Touch ID, Face ID o Windows Hello) de este dispositivo para acceder con un solo toque la próxima vez.
                </p>

                <button
                  type="button"
                  onClick={handleRegisterBiometric}
                  disabled={biometricLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {biometricLoading ? (
                    <>
                      <Icon path={mdiLoading} size={0.7} className="animate-spin text-white" />
                      <span>Esperando sensor biométrico...</span>
                    </>
                  ) : (
                    <>
                      <FingerprintPattern className="w-4 h-4 text-emerald-400" />
                      <span>Vincular Huella de este Dispositivo</span>
                    </>
                  )}
                </button>
              </div>
            )}
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
                className="px-4 sm:px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
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

      {/* MODAL 1: MENÚ DE ACCIONES DE FOTO AL TOCAR EL AVATAR */}
      <AnimatePresence>
        {showPhotoActionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhotoActionsModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", duration: 0.28 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center z-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setShowPhotoActionsModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>

              {/* Foto actual en miniatura elegante */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-primary/20 border-2 border-white shadow-md bg-primary/10 flex items-center justify-center text-primary font-black text-2xl sm:text-3xl">
                {foto && !fotoError ? (
                  <img src={foto} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  displayChar
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight mb-1">
                Foto de perfil
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                {foto ? "¿Qué deseas hacer con tu foto de perfil actual?" : "Elige una foto de tu galería o cámara para personalizar tu cuenta."}
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhotoActionsModal(false);
                    triggerPhotoPicker();
                  }}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icon path={mdiCameraOutline} size={0.7} />
                  <span>{foto ? "Cambiar por otra foto" : "Subir foto"}</span>
                </button>

                {foto && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhotoActionsModal(false);
                      setShowDeletePhotoModal(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon path={mdiDeleteOutline} size={0.65} />
                    <span>Quitar foto actual</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPhotoActionsModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CONFIRMACIÓN Y VISTA PREVIA: "¿QUIERES CAMBIAR LA FOTO?" */}
      <AnimatePresence>
        {newPhotoPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!savingNewPhoto) setNewPhotoPreview(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-center z-10 overflow-hidden"
            >
              {!savingNewPhoto && (
                <button
                  type="button"
                  onClick={() => setNewPhotoPreview(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <Icon path={mdiClose} size={0.7} />
                </button>
              )}

              {/* Vista previa destacada de la NUEVA foto seleccionada */}
              <div className="relative mx-auto mb-4 w-28 h-28 sm:w-32 sm:h-32">
                <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-emerald-500/30 border-3 border-white shadow-xl bg-gray-100">
                  <img
                    src={newPhotoPreview}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                  <Icon path={mdiCheck} size={0.65} />
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                Vista previa
              </span>

              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight mb-1.5">
                ¿Quieres cambiar tu foto?
              </h3>

              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-6">
                Así se verá tu nueva foto de perfil en tus boletos, reservas y menús de InterlocApp.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewPhotoPreview(null)}
                  disabled={savingNewPhoto}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmSaveNewPhoto}
                  disabled={savingNewPhoto}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingNewPhoto ? (
                    <>
                      <Icon path={mdiLoading} size={0.65} className="animate-spin text-white" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Sí, cambiar</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
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
