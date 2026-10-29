"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiAccountMultiple,
  mdiPlus,
  mdiMagnify,
  mdiFilterVariant,
  mdiRefresh,
  mdiShieldAccount,
  mdiDomain,
  mdiEmailOutline,
  mdiPhoneOutline,
  mdiClose,
  mdiLoading,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiBus,
  mdiDeleteOutline,
  mdiSwapHorizontal,
  mdiKeyVariant,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiLockReset,
} from "@mdi/js";
import {
  getUsuariosAdminAction,
  createUsuarioByAdminAction,
  getRoles,
  deleteUsuarioAction,
  reasignarCooperativaUsuarioAction,
  adminCambiarPasswordUsuarioAction,
} from "@/backend/actions/usuarios";
import { formatManaguaDate } from "@/lib/date-time";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { useTenant } from "@/frontend/context/TenantContext";

interface UsuarioItem {
  idUsuario: number;
  idCooperativa: number | null;
  cooperativaNombre: string;
  idRol: number;
  rolNombre: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  usuario: string;
  correo: string;
  telefono: string | null;
  estado: string;
  createdAt: string;
}

export default function UsuariosPage() {
  const { isSuperAdmin, selectedCoopId, cooperativas } = useTenant();
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [roles, setRoles] = useState<Array<{ idRol: number; nombre: string; descripcion?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("ALL");
  const [filtroCoop, setFiltroCoop] = useState<string>("ALL");

  // Estado del Modal de Creación
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados para Eliminación de Usuario
  const [currentUser, setCurrentUser] = useState<{ idUsuario: number; rolNombre: string } | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<UsuarioItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Estados para Reasignación de Cooperativa (exclusivo Super Admin)
  const [reasignarModalUser, setReasignarModalUser] = useState<UsuarioItem | null>(null);
  const [reasignarNuevaCoop, setReasignarNuevaCoop] = useState<string>("");
  const [reasignando, setReasignando] = useState(false);

  // Estados para Modificar Contraseña (Super Admin / Admin)
  const [passwordModalUser, setPasswordModalUser] = useState<UsuarioItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Cargar usuario en sesión activa
  useEffect(() => {
    async function loadCurrent() {
      try {
        const u = await getCurrentUserAction();
        if (u) {
          setCurrentUser({ idUsuario: u.idUsuario, rolNombre: u.rolNombre });
        }
      } catch (err) {
        console.error("Error al cargar usuario actual:", err);
      }
    }
    loadCurrent();
  }, []);

  // Campos del formulario nuevo usuario
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [idRol, setIdRol] = useState<number>(0);
  const [idCooperativa, setIdCooperativa] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const coopIdNumber = filtroCoop === "ALL" 
        ? (selectedCoopId === "ALL" ? undefined : Number(selectedCoopId)) 
        : Number(filtroCoop);

      const rolIdNumber = filtroRol === "ALL" ? undefined : Number(filtroRol);

      const [resUsers, resRoles] = await Promise.all([
        getUsuariosAdminAction({
          idCooperativa: coopIdNumber,
          idRol: rolIdNumber,
          busqueda: searchQuery.trim() || undefined,
        }),
        getRoles(),
      ]);

      if (resUsers.success && resUsers.data) {
        setUsuarios(resUsers.data as UsuarioItem[]);
      }
      if (resRoles.success && resRoles.data) {
        setRoles(resRoles.data);
        if (idRol === 0 && resRoles.data.length > 0) {
          const defaultRol = resRoles.data.find((r) => r.nombre === "PASAJERO") || resRoles.data[0];
          setIdRol(defaultRol.idRol);
        }
      }
    } catch (err) {
      console.error("Error al cargar directorio de usuarios:", err);
      setFeedback({ type: "error", text: "Error de conexión al cargar la lista de usuarios." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCoopId, filtroRol, filtroCoop]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Manejador para eliminar usuario definitivamente
  const handleDeleteUsuario = async () => {
    if (!deleteModalUser) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const res = await deleteUsuarioAction(deleteModalUser.idUsuario);
      if (res.success) {
        setFeedback({
          type: "success",
          text: `El usuario "${deleteModalUser.nombreCompleto}" (@${deleteModalUser.usuario}) fue eliminado correctamente.`,
        });
        setDeleteModalUser(null);
        await fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo eliminar el usuario." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de conexión al eliminar usuario." });
    } finally {
      setDeleting(false);
    }
  };

  // Manejador para Reasignación de Cooperativa
  const handleOpenReasignar = (user: UsuarioItem) => {
    setReasignarModalUser(user);
    setReasignarNuevaCoop(user.idCooperativa ? String(user.idCooperativa) : "");
  };

  const handleReasignarCooperativa = async () => {
    if (!reasignarModalUser) return;
    setReasignando(true);
    try {
      const res = await reasignarCooperativaUsuarioAction(
        reasignarModalUser.idUsuario,
        reasignarNuevaCoop ? Number(reasignarNuevaCoop) : null
      );
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Cooperativa de @${reasignarModalUser.usuario} actualizada a "${res.data?.cooperativaNombre || 'Sin asignar'}".`,
        });
        setReasignarModalUser(null);
        await fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo reasignar la cooperativa." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error al reasignar cooperativa." });
    } finally {
      setReasignando(false);
    }
  };

  // Manejador para Cambio de Contraseña
  const handleOpenPasswordModal = (user: UsuarioItem) => {
    setPasswordModalUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setPasswordError(null);
  };

  const generarPasswordSegura = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "Ruta";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNewPassword(true);
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (newPassword.trim().length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden. Verifícalas.");
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);

    try {
      const res = await adminCambiarPasswordUsuarioAction(
        passwordModalUser.idUsuario,
        newPassword.trim()
      );

      if (res.success) {
        setFeedback({
          type: "success",
          text: `Contraseña de @${passwordModalUser.usuario} (${passwordModalUser.nombreCompleto}) actualizada exitosamente.`,
        });
        setPasswordModalUser(null);
      } else {
        setPasswordError(res.error || "No se pudo actualizar la contraseña.");
      }
    } catch (err: any) {
      setPasswordError(err.message || "Error al cambiar contraseña.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Apertura y reset de formulario de nuevo usuario
  const handleOpenModal = () => {
    setNombre("");
    setApellido("");
    setCorreo("");
    setTelefono("");
    setUsuario("");
    setPassword("");
    setIdCooperativa(selectedCoopId !== "ALL" ? selectedCoopId : "");
    setShowModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !usuario.trim() || !correo.trim() || !idRol) {
      setFeedback({ type: "error", text: "Por favor completa todos los campos requeridos." });
      return;
    }

    setSaving(true);
    try {
      const res = await createUsuarioByAdminAction({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        usuario: usuario.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim() || undefined,
        idRol: Number(idRol),
        idCooperativa: idCooperativa ? Number(idCooperativa) : undefined,
        password: password.trim() || undefined,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: `Usuario @${usuario} registrado exitosamente con rol ${roles.find((r) => r.idRol === Number(idRol))?.nombre || ""}.`,
        });
        setShowModal(false);
        await fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo registrar el usuario." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de conexión al guardar usuario." });
    } finally {
      setSaving(false);
    }
  };

  const rolesDisponiblesForm = isSuperAdmin
    ? roles
    : roles.filter((r) => ["CHOFER", "AYUDANTE", "TAQUILLERO", "ADMIN_COOP"].includes(r.nombre));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alerta de Feedback Global */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon
              path={feedback.type === "success" ? mdiCheckCircleOutline : mdiAlertCircleOutline}
              size={0.75}
              className={feedback.type === "success" ? "text-emerald-600 shrink-0" : "text-rose-600 shrink-0"}
            />
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <Icon path={mdiClose} size={0.65} />
          </button>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiAccountMultiple} size={0.8} className="text-slate-800" />
            Gestión de Usuarios y Accesos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isSuperAdmin
              ? "Administración global de cuentas: Super Admin, Admins de Cooperativa, Personal y Pasajeros."
              : "Directorio de usuarios y colaboradores asignados a tu cooperativa."}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Icon path={mdiPlus} size={0.65} />
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Icon
            path={mdiMagnify}
            size={0.7}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o usuario..."
            className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 flex-wrap sm:flex-nowrap">
          {/* Filtro por Rol */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shrink-0">
            <Icon path={mdiShieldAccount} size={0.6} className="text-slate-400" />
            <span className="text-slate-500 font-medium">Rol:</span>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Roles</option>
              {roles.map((r) => (
                <option key={r.idRol} value={r.idRol.toString()}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Cooperativa (Solo visible para Super Admin) */}
          {isSuperAdmin && cooperativas.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shrink-0">
              <Icon path={mdiDomain} size={0.6} className="text-slate-400" />
              <span className="text-slate-500 font-medium">Cooperativa:</span>
              <select
                value={filtroCoop}
                onChange={(e) => setFiltroCoop(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="ALL">Todas las Cooperativas</option>
                {cooperativas.map((c) => (
                  <option key={c.idCooperativa} value={c.idCooperativa.toString()}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            title="Recargar usuarios"
          >
            <Icon path={mdiRefresh} size={0.65} className={loading ? "animate-spin text-slate-900" : ""} />
          </button>
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-44 bg-slate-200 animate-pulse rounded" />
                    <div className="h-3 w-28 bg-slate-100 animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-6 w-24 bg-slate-200 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="py-16 text-center p-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Icon path={mdiAccountMultiple} size={1} />
            </div>
            <p className="font-bold text-sm text-slate-800">No se encontraron usuarios</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Prueba cambiando los filtros o utiliza el botón para registrar una nueva cuenta de usuario.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Usuario / Nombre</th>
                  <th className="py-3 px-4">Rol del Sistema</th>
                  <th className="py-3 px-4">Cooperativa Asignada</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Registro</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {usuarios.map((u) => {
                  const isBusRole = ["CHOFER", "AYUDANTE", "TAQUILLERO", "CHEQUEADOR"].includes(u.rolNombre);
                  return (
                    <tr key={u.idUsuario} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs">
                              {u.nombre.charAt(0).toUpperCase()}
                            </div>
                            {isBusRole && (
                              <span
                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 text-white rounded-full flex items-center justify-center border border-white shadow-2xs"
                                title={`Rol operativo: ${u.rolNombre}`}
                              >
                                <Icon path={mdiBus} size={0.3} />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{u.nombreCompleto}</p>
                            <p className="text-[11px] text-slate-400 font-mono">@{u.usuario}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            u.rolNombre === "SUPER_ADMIN"
                              ? "bg-slate-900 text-white border border-slate-900"
                              : u.rolNombre === "ADMIN_COOP"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : u.rolNombre === "CHEQUEADOR"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : isBusRole
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isBusRole && <Icon path={mdiBus} size={0.5} />}
                          {u.rolNombre}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        {u.idCooperativa ? (
                          <span className="flex items-center gap-1">
                            <Icon path={mdiDomain} size={0.55} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{u.cooperativaNombre}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Global / Sin asignar</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <p className="flex items-center gap-1 truncate max-w-[180px]">
                          <Icon path={mdiEmailOutline} size={0.55} className="text-slate-400 shrink-0" />
                          <span>{u.correo}</span>
                        </p>
                        {u.telefono && (
                          <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Icon path={mdiPhoneOutline} size={0.5} className="text-slate-400 shrink-0" />
                            <span>{u.telefono}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.estado === "ACTIVO"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {u.estado}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-slate-400 text-[11px] font-mono">
                        {formatManaguaDate(u.createdAt, "short")}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Botón Cambiar Contraseña (Super Admin y Admin) */}
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all cursor-pointer inline-flex items-center justify-center"
                            title={`Modificar contraseña de ${u.nombreCompleto}`}
                            aria-label="Modificar contraseña"
                          >
                            <Icon path={mdiKeyVariant} size={0.65} />
                          </button>

                          {/* Botón Reasignar Cooperativa (Exclusivo Super Admin) */}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenReasignar(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer inline-flex items-center justify-center"
                              title={`Reasignar cooperativa de ${u.nombreCompleto}`}
                              aria-label="Reasignar cooperativa"
                            >
                              <Icon path={mdiSwapHorizontal} size={0.65} />
                            </button>
                          )}

                          {/* Botón Eliminar */}
                          {currentUser?.idUsuario === u.idUsuario ? (
                            <span className="text-[10px] text-slate-400 font-medium italic px-1">Tú</span>
                          ) : (!isSuperAdmin && u.rolNombre === "SUPER_ADMIN") ? null : (
                            <button
                              type="button"
                              onClick={() => setDeleteModalUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer inline-flex items-center justify-center"
                              title={`Eliminar usuario @${u.usuario}`}
                              aria-label="Eliminar usuario"
                            >
                              <Icon path={mdiDeleteOutline} size={0.65} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: CAMBIAR CONTRASEÑA (SUPER ADMIN / ADMIN) */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                  <Icon path={mdiKeyVariant} size={0.7} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Modificar Contraseña</h3>
                  <p className="text-xs text-slate-500">
                    Restablecimiento directo de credenciales de acceso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <form onSubmit={handleCambiarPassword} className="p-5 space-y-4 text-xs">
              {/* Ficha estructurada Clave-Valor (Ley de Miller: chunking de información) */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider text-slate-600">
                  Ficha de la Cuenta a Modificar
                </div>
                <div className="divide-y divide-slate-200/70">
                  <div className="flex items-center justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Nombre Completo:</span>
                    <span className="font-bold text-slate-900">{passwordModalUser.nombreCompleto}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Usuario / Handle:</span>
                    <span className="font-mono font-semibold text-slate-800">@{passwordModalUser.usuario}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Correo Electrónico:</span>
                    <span className="text-slate-700">{passwordModalUser.correo}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Rol en Sistema:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 font-bold text-[10px] text-slate-800">
                      {passwordModalUser.rolNombre}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Cooperativa:</span>
                    <span className="font-semibold text-slate-800">{passwordModalUser.cooperativaNombre}</span>
                  </div>
                </div>
              </div>

              {passwordError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-semibold flex items-center gap-2">
                  <Icon path={mdiAlertCircleOutline} size={0.6} />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Input Nueva Contraseña */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                    Nueva Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={generarPasswordSegura}
                    className="text-[11px] text-slate-700 hover:text-slate-900 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Generar segura
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? "Ocultar" : "Mostrar"}
                  >
                    <Icon path={showNewPassword ? mdiEyeOffOutline : mdiEyeOutline} size={0.65} />
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                El usuario podrá ingresar inmediatamente con esta nueva contraseña desde cualquier dispositivo.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  disabled={changingPassword}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {changingPassword ? (
                    <>
                      <Icon path={mdiLoading} size={0.6} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    "Establecer Contraseña"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR NUEVO USUARIO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Registrar Nuevo Usuario
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Completa los datos oficiales para emitir las credenciales de acceso
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Carlos"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej: Alvarado"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre de Usuario (@) *
                  </label>
                  <input
                    type="text"
                    required
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="Ej: calvarado"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Teléfono con código de país unificado (Ley de Parkinson: autocompletado y formato asistido) */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono Celular
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 overflow-hidden focus-within:border-slate-900 focus-within:bg-white transition-colors">
                    <div className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-100 border-r border-slate-200 text-slate-700 text-xs font-bold shrink-0 select-none">
                      <span>🇳🇮</span>
                      <span>+505</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={8}
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="8888 8888"
                      className="w-full bg-transparent px-3 py-2 text-slate-900 focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Rol Operativo *
                  </label>
                  <select
                    value={idRol}
                    onChange={(e) => setIdRol(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white cursor-pointer"
                  >
                    {rolesDisponiblesForm.map((r) => (
                      <option key={r.idRol} value={r.idRol}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Asignación de Cooperativa */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cooperativa de Transporte
                </label>
                {isSuperAdmin ? (
                  <select
                    value={idCooperativa}
                    onChange={(e) => setIdCooperativa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white cursor-pointer"
                  >
                    <option value="">Sin cooperativa asignada (Acceso Global / Pasajero)</option>
                    {cooperativas.map((c) => (
                      <option key={c.idCooperativa} value={c.idCooperativa}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center gap-1.5">
                    <Icon path={mdiDomain} size={0.55} className="text-slate-500" />
                    <span>Tu Cooperativa Asignada</span>
                  </div>
                )}
              </div>

              {/* Contraseña Inicial con generación automática (Ley de Parkinson) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                    Contraseña Inicial (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
                      let pass = "Ruta";
                      for (let i = 0; i < 6; i++) {
                        pass += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setPassword(pass);
                    }}
                    className="text-[11px] text-slate-700 hover:text-slate-900 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Generar segura
                  </button>
                </div>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Por defecto: RutaCorp2026! o presiona Generar segura"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Icon path={mdiLoading} size={0.6} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    "Registrar Usuario"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAR ELIMINACIÓN DE USUARIO */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Icon path={mdiDeleteOutline} size={0.8} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">¿Eliminar Usuario?</h3>
                <p className="text-xs text-slate-500">
                  Esta acción eliminará de forma permanente el acceso de este usuario.
                </p>
              </div>
            </div>

            {/* Ficha estructurada Clave-Valor (Ley de Miller: chunking de información) */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider text-slate-600">
                Detalles del Usuario
              </div>
              <div className="divide-y divide-slate-200/70">
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Nombre:</span>
                  <span className="font-bold text-slate-900">{deleteModalUser.nombreCompleto}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Usuario (@):</span>
                  <span className="font-mono font-semibold text-slate-800">@{deleteModalUser.usuario}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Correo:</span>
                  <span className="text-slate-700">{deleteModalUser.correo}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Rol:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 font-bold text-[10px] text-slate-800">
                    {deleteModalUser.rolNombre}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Cooperativa:</span>
                  <span className="font-semibold text-slate-800">{deleteModalUser.cooperativaNombre}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={deleting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteUsuario}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <Icon path={mdiLoading} size={0.6} className="animate-spin" />}
                <span>{deleting ? "Eliminando..." : "Eliminar Cuenta"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REASIGNAR COOPERATIVA (SUPER_ADMIN) */}
      {reasignarModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
                <Icon path={mdiSwapHorizontal} size={0.8} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reasignar Cooperativa</h3>
                <p className="text-xs text-slate-500">
                  Transfiere a este usuario a otra entidad de transporte.
                </p>
              </div>
            </div>

            {/* Ficha estructurada Clave-Valor (Ley de Miller: chunking de información) */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider text-slate-600">
                Datos del Colaborador
              </div>
              <div className="divide-y divide-slate-200/70">
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Nombre Completo:</span>
                  <span className="font-bold text-slate-900">{reasignarModalUser.nombreCompleto}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Usuario (@):</span>
                  <span className="font-mono font-semibold text-slate-800">@{reasignarModalUser.usuario}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Rol Operativo:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 font-bold text-[10px] text-slate-800">
                    {reasignarModalUser.rolNombre}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Cooperativa Actual:</span>
                  <span className="font-bold text-slate-800">{reasignarModalUser.cooperativaNombre}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <Icon path={mdiDomain} size={0.55} className="text-slate-400" />
                Nueva Cooperativa Asignada:
              </label>
              <select
                value={reasignarNuevaCoop}
                onChange={(e) => setReasignarNuevaCoop(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
              >
                <option value="">Sin cooperativa asignada (Acceso Global / Independiente)</option>
                {cooperativas.map((c) => (
                  <option key={c.idCooperativa} value={c.idCooperativa.toString()}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReasignarModalUser(null)}
                disabled={reasignando}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reasignando}
                onClick={handleReasignarCooperativa}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {reasignando && <Icon path={mdiLoading} size={0.6} className="animate-spin" />}
                <span>{reasignando ? "Reasignando..." : "Confirmar Cambio"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
