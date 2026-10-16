"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@mdi/react";
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

  // Subida de imagen
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingImage, setProcessingImage] = useState(false);

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

  // Manejar selección de foto
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);
    try {
      const processed = await processAvatarImage(file);
      setFoto(processed);
      setFeedback({ type: "success", text: "Foto cargada. Recuerda guardar los cambios." });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error al procesar la imagen." });
    } finally {
      setProcessingImage(false);
    }
  };

  const handleRemovePhoto = () => {
    setFoto(null);
    setFeedback({ type: "success", text: "Foto removida. Recuerda guardar los cambios." });
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
          {/* Avatar con botón de cambio */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-2xl shadow-2xs">
              {foto ? (
                <img src={foto} alt={nombre} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingImage}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer border-2 border-white"
              title="Cambiar foto de perfil"
            >
              <Icon path={mdiCameraOutline} size={0.65} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
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
    </div>
  );
}
