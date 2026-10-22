"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@mdi/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  mdiAccount,
  mdiKeyOutline,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiCameraOutline,
  mdiDeleteOutline,
  mdiEmailOutline,
  mdiPhone,
  mdiMapMarkerPath,
  mdiShieldCheckOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiClose,
  mdiDomain,
  mdiCheck,
  mdiLoading,
} from "@mdi/js";
import {
  getUserProfileAction,
  updateUserProfileAction,
  changePasswordAction,
} from "@/backend/actions/usuarios";
import { processAvatarImage } from "@/frontend/lib/image-utils";

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<"datos" | "password">("datos");
  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Datos del perfil
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [usuario, setUsuario] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [rolNombre, setRolNombre] = useState("ADMIN_COOP");

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Subida de imagen y modales de gestión
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [showPhotoActionsModal, setShowPhotoActionsModal] = useState(false);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [savingNewPhoto, setSavingNewPhoto] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);

  // Feedback con auto-descarte tras 6 segundos
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const res = await getUserProfileAction();
        if (res.success && res.data) {
          setNombre(res.data.nombre || "");
          setApellido(res.data.apellido || "");
          setUsuario(res.data.usuario || "");
          setCorreo(res.data.correo || "");
          setTelefono(res.data.telefono || "");
          setDireccion(res.data.direccion || "");
          setFoto(res.data.foto || null);
          setRolNombre(res.data.rolNombre || "ADMIN_COOP");
        }
      } catch (err) {
        console.error("Error al cargar perfil administrativo:", err);
        setFeedback({ type: "error", text: "Error de conexión al cargar datos del perfil." });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Manejar selección de foto con botón táctil directo
  const triggerPhotoPicker = () => {
    if (processingImage || savingNewPhoto) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);
    setFeedback(null);
    try {
      const processed = await processAvatarImage(file);
      // Abrir modal de vista previa antes de guardar
      setNewPhotoPreview(processed);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error al procesar la imagen." });
    } finally {
      setProcessingImage(false);
    }
  };

  const confirmSaveNewPhoto = async () => {
    if (!newPhotoPreview) return;
    try {
      setSavingNewPhoto(true);
      setFeedback(null);
      const res = await updateUserProfileAction({
        nombre: nombre.trim() || "Administrador",
        apellido: apellido.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        foto: newPhotoPreview,
      });

      if (res.success) {
        setFoto(newPhotoPreview);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profile-updated", {
              detail: { foto: newPhotoPreview },
            })
          );
        }
        setFeedback({ type: "success", text: "Foto de perfil actualizada exitosamente." });
        setNewPhotoPreview(null);
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo guardar la foto en el servidor." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error al comunicarse con el servidor al guardar la foto." });
    } finally {
      setSavingNewPhoto(false);
    }
  };

  const confirmDeletePhoto = async () => {
    try {
      setProcessingImage(true);
      setFeedback(null);
      const res = await updateUserProfileAction({
        nombre: nombre.trim() || "Administrador",
        apellido: apellido.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        foto: "",
      });

      if (res.success) {
        setFoto(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profile-updated", {
              detail: { foto: null },
            })
          );
        }
        setFeedback({ type: "success", text: "Foto de perfil eliminada." });
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo eliminar la foto." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error al eliminar la foto de perfil." });
    } finally {
      setProcessingImage(false);
      setShowDeletePhotoModal(false);
    }
  };

  const handleRemovePhoto = () => {
    setShowDeletePhotoModal(true);
  };

  // Guardar datos personales
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFeedback({ type: "error", text: "El nombre es obligatorio." });
      return;
    }

    setSavingPersonal(true);
    try {
      const res = await updateUserProfileAction({
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        foto: foto,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Datos del perfil actualizados correctamente." });
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo actualizar el perfil." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error al comunicarse con el servidor." });
    } finally {
      setSavingPersonal(false);
    }
  };

  // Guardar nueva contraseña
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({ type: "error", text: "Todos los campos de contraseña son requeridos." });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({ type: "error", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Contraseña actualizada con éxito." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setFeedback({ type: "error", text: res.error || "Error al cambiar la contraseña." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de servidor al cambiar la contraseña." });
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = `${nombre.charAt(0) || "A"}${apellido.charAt(0) || ""}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm font-medium animate-fadeIn ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon
              path={feedback.type === "success" ? mdiCheckCircle : mdiAlertCircle}
              size={0.8}
              className={feedback.type === "success" ? "text-emerald-600" : "text-red-600"}
            />
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <Icon path={mdiClose} size={0.65} />
          </button>
        </div>
      )}

      {/* Cabecera del Perfil */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar con botón de cambio interactivo */}
          <div className="relative group shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              id="admin-avatar-upload"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setShowPhotoActionsModal(true)}
              disabled={processingImage}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-2xl shadow-2xs cursor-pointer select-none touch-manipulation disabled:opacity-80 active:scale-95 block ${
                processingImage ? "pointer-events-none opacity-80" : ""
              }`}
              title="Toca para gestionar foto de perfil"
              aria-label="Gestionar foto de perfil"
            >
              {foto ? (
                <img src={foto} alt={nombre} draggable={false} className="w-full h-full object-cover pointer-events-none select-none" />
              ) : (
                <span className="flex items-center justify-center w-full h-full pointer-events-none select-none">{initials}</span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPhotoActionsModal(true);
              }}
              disabled={processingImage}
              className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-90 shadow-2xs cursor-pointer border-2 border-white touch-manipulation disabled:opacity-70`}
              title="Gestionar foto de perfil"
              aria-label="Gestionar foto de perfil"
            >
              <Icon path={mdiCameraOutline} size={0.7} />
            </button>
          </div>

          {/* Información principal */}
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {nombre ? `${nombre} ${apellido}` : "Cargando..."}
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {rolNombre}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span>@{usuario || "admin"}</span>
              <span>•</span>
              <span>{correo}</span>
            </p>
            {foto && (
              <button
                onClick={handleRemovePhoto}
                className="mt-3 text-xs text-red-600 hover:text-red-700 flex items-center justify-center sm:justify-start gap-1 cursor-pointer"
              >
                <Icon path={mdiDeleteOutline} size={0.6} />
                <span>Quitar foto de perfil</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selector de Pestañas estilo Segmented Control */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-fit border border-slate-200/60">
        <button
          onClick={() => setActiveTab("datos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "datos"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Icon path={mdiAccount} size={0.7} />
          <span>Información Personal</span>
        </button>

        <button
          onClick={() => setActiveTab("password")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "password"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Icon path={mdiKeyOutline} size={0.7} />
          <span>Seguridad y Contraseña</span>
        </button>
      </div>

      {/* FORMULARIO: INFORMACIÓN PERSONAL */}
      {activeTab === "datos" && (
        <form
          onSubmit={handleSavePersonal}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de Usuario</label>
              <input
                type="text"
                disabled
                value={usuario}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                El nombre de usuario institucional no puede modificarse directamente.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                disabled
                value={correo}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Vinculado a la cuenta administrativa verificada.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono Celular (8 dígitos numéricos)
              </label>
              <div className="relative">
                <Icon
                  path={mdiPhone}
                  size={0.65}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="tel"
                  maxLength={8}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Ej: 88888888"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección</label>
              <div className="relative">
                <Icon
                  path={mdiMapMarkerPath}
                  size={0.65}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ciudad o terminal"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingPersonal}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              {savingPersonal ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      )}

      {/* FORMULARIO: CAMBIO DE CONTRASEÑA */}
      {activeTab === "password" && (
        <form
          onSubmit={handleSavePassword}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 space-y-4 max-w-xl"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña Actual *</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className="w-full pr-10 pl-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon path={showCurrentPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.7} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nueva Contraseña *</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pr-10 pl-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon path={showNewPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.7} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Nueva Contraseña *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full pr-10 pl-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon path={showConfirmPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.7} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {savingPassword ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </div>
        </form>
      )}

      {/* MODAL 1: MENÚ DE ACCIONES AL TOCAR EL AVATAR */}
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
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center z-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setShowPhotoActionsModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>

              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-primary/20 border-2 border-white shadow-md bg-slate-100 flex items-center justify-center text-slate-800 font-bold text-2xl sm:text-3xl">
                {foto ? (
                  <img src={foto} alt={nombre} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-1">
                Foto de perfil
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                {foto ? "¿Qué deseas hacer con tu foto de perfil actual?" : "Sube una fotografía para personalizar tu panel administrativo."}
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
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
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
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-center z-10 overflow-hidden"
            >
              {!savingNewPhoto && (
                <button
                  type="button"
                  onClick={() => setNewPhotoPreview(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <Icon path={mdiClose} size={0.7} />
                </button>
              )}

              <div className="relative mx-auto mb-4 w-28 h-28 sm:w-32 sm:h-32">
                <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-emerald-500/30 border-3 border-white shadow-xl bg-slate-100">
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

              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-1.5">
                ¿Quieres cambiar tu foto?
              </h3>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                Así se verá tu nueva foto de perfil en el panel y encabezados de InterlocApp.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewPhotoPreview(null)}
                  disabled={savingNewPhoto}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer disabled:opacity-50"
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

      {/* MODAL 3: CONFIRMACIÓN PARA QUITAR FOTO */}
      <AnimatePresence>
        {showDeletePhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeletePhotoModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-xl p-6 shadow-2xl border border-slate-200 text-center z-10"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto mb-4">
                <Icon path={mdiDeleteOutline} size={1} />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-2">
                ¿Quitar foto de perfil?
              </h3>
              
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Tu foto actual será eliminada de tu cuenta y volverás a ver tus iniciales predeterminadas.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeletePhotoModal(false)}
                  disabled={processingImage}
                  className="w-full py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePhoto}
                  disabled={processingImage}
                  className="w-full py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {processingImage ? "Quitando..." : "Sí, quitar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
