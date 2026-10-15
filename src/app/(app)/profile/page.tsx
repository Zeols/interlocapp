"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiAccountOutline,
  mdiKeyOutline,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiLoading,
} from "@mdi/js";
import {
  getUserProfileAction,
  updateUserProfileAction,
  changePasswordAction,
} from "@/backend/actions/usuarios";

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
  const [rolNombre, setRolNombre] = useState("");

  // Datos de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        setNombre(res.data.nombre ?? "");
        setApellido(res.data.apellido ?? "");
        setCorreo(res.data.correo ?? "");
        setTelefono(res.data.telefono ?? "");
        setDireccion(res.data.direccion ?? "");
        setRolNombre(res.data.rolNombre ?? "PASAJERO");
      }
      setLoading(false);
    });
  }, []);

  const handleSavePersonal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPersonalFeedback(null);
    setSavingPersonal(true);

    const res = await updateUserProfileAction({
      nombre,
      apellido,
      telefono,
      direccion,
    });

    setSavingPersonal(false);
    if (res.success) {
      setPersonalFeedback({
        type: "success",
        message: "Datos personales actualizados correctamente.",
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 w-full">
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
            Perfil de Usuario
          </h1>
          {rolNombre && (
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {rolNombre}
            </span>
          )}
        </div>
        <p className="text-sm sm:text-base text-gray-500 mt-1.5">
          Gestiona tu información personal y opciones de seguridad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
        {/* Pestañas de Navegación */}
        <div className="md:col-span-1">
          <nav className="flex flex-row md:flex-col gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer text-xs sm:text-sm font-bold transition-all ${
                activeTab === "personal"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon path={mdiAccountOutline} size={0.8} />
              Datos Personales
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer text-xs sm:text-sm font-bold transition-all ${
                activeTab === "password"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon path={mdiKeyOutline} size={0.8} />
              Contraseña
            </button>
          </nav>
        </div>

        {/* Panel de Formulario */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-xs">
              <Icon
                path={mdiLoading}
                size={1.5}
                className="animate-spin text-primary mx-auto mb-3"
              />
              <p className="text-sm font-bold text-gray-600">
                Cargando información del perfil...
              </p>
            </div>
          ) : activeTab === "personal" ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                  Datos Personales
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Actualiza tu información para la emisión de tus boletos de viaje.
                </p>
              </div>

              <form onSubmit={handleSavePersonal} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-nombre"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                    >
                      Nombre
                    </label>
                    <input
                      id="profile-nombre"
                      name="nombre"
                      type="text"
                      autoComplete="given-name"
                      value={nombre ?? ""}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-apellido"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                    >
                      Apellido
                    </label>
                    <input
                      id="profile-apellido"
                      name="apellido"
                      type="text"
                      autoComplete="family-name"
                      value={apellido ?? ""}
                      onChange={(e) => setApellido(e.target.value)}
                      className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-correo"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Correo Electrónico (Solo lectura)
                  </label>
                  <input
                    id="profile-correo"
                    name="correo"
                    type="email"
                    autoComplete="email"
                    value={correo ?? ""}
                    readOnly
                    className="w-full bg-gray-100/70 border border-gray-200/80 text-gray-500 text-sm sm:text-base rounded-2xl py-3 px-4 cursor-not-allowed select-none font-medium"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    El correo electrónico está vinculado a tu cuenta para seguridad y envío de boletos.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="profile-telefono"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Teléfono de Contacto
                  </label>
                  <input
                    id="profile-telefono"
                    name="telefono"
                    type="tel"
                    autoComplete="tel"
                    value={telefono ?? ""}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+505 8888 8888"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                  />
                </div>

                {personalFeedback && (
                  <div
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-xs sm:text-sm font-semibold border ${
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
                      size={0.8}
                      className={
                        personalFeedback.type === "success"
                          ? "text-emerald-600 shrink-0"
                          : "text-red-600 shrink-0"
                      }
                    />
                    <span>{personalFeedback.message}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPersonal}
                    className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center gap-2"
                  >
                    {savingPersonal && (
                      <Icon path={mdiLoading} size={0.7} className="animate-spin text-white" />
                    )}
                    <span>{savingPersonal ? "Guardando..." : "Guardar Cambios"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                  Cambiar Contraseña
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Mantén tu cuenta protegida usando una contraseña de al menos 8 caracteres.
                </p>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4 sm:space-y-5">
                <div>
                  <label
                    htmlFor="current-password"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Contraseña Actual
                  </label>
                  <input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword ?? ""}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Nueva Contraseña
                  </label>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword ?? ""}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword ?? ""}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full bg-gray-50/80 border border-gray-200/80 text-gray-900 text-sm sm:text-base rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all"
                    required
                  />
                </div>

                {passwordFeedback && (
                  <div
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-xs sm:text-sm font-semibold border ${
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
                      size={0.8}
                      className={
                        passwordFeedback.type === "success"
                          ? "text-emerald-600 shrink-0"
                          : "text-red-600 shrink-0"
                      }
                    />
                    <span>{passwordFeedback.message}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center gap-2"
                  >
                    {savingPassword && (
                      <Icon path={mdiLoading} size={0.7} className="animate-spin text-white" />
                    )}
                    <span>{savingPassword ? "Actualizando..." : "Actualizar Contraseña"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
