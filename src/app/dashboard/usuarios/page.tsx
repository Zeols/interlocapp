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
  mdiTicketConfirmationOutline,
  mdiDeleteOutline,
  mdiSwapHorizontal,
} from "@mdi/js";
import {
  getUsuariosAdminAction,
  createUsuarioByAdminAction,
  getRoles,
  deleteUsuarioAction,
  reasignarCooperativaUsuarioAction,
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

  // Campos del formulario
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
        if (res.error) {
          setFeedback({ type: "success", text: res.error });
        } else {
          setFeedback({
            type: "success",
            text: `El usuario "${deleteModalUser.nombreCompleto}" (@${deleteModalUser.usuario}) fue eliminado correctamente.`,
          });
        }
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

  // Estados para Reasignación de Cooperativa (exclusivo Super Admin)
  const [reasignarModalUser, setReasignarModalUser] = useState<UsuarioItem | null>(null);
  const [reasignarNuevaCoop, setReasignarNuevaCoop] = useState<string>("");
  const [reasignando, setReasignando] = useState(false);

  const handleOpenReasignar = (user: UsuarioItem) => {
    setReasignarModalUser(user);
    setReasignarNuevaCoop(user.idCooperativa ? String(user.idCooperativa) : "");
  };

  const handleReasignarCooperativa = async () => {
    if (!reasignarModalUser) return;
    setReasignando(true);
    setFeedback(null);
    try {
      const nuevaCoopId = reasignarNuevaCoop ? Number(reasignarNuevaCoop) : null;
      const res = await reasignarCooperativaUsuarioAction(reasignarModalUser.idUsuario, nuevaCoopId);
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Cooperativa reasignada exitosamente para ${reasignarModalUser.nombreCompleto}.`,
        });
        setReasignarModalUser(null);
        await fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo reasignar la cooperativa." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de servidor al reasignar cooperativa." });
    } finally {
      setReasignando(false);
    }
  };

  const handleOpenModal = () => {
    setNombre("");
    setApellido("");
    setCorreo("");
    setTelefono("");
    setUsuario("");
    setPassword("");
    setIdCooperativa(selectedCoopId !== "ALL" ? selectedCoopId : "");
    if (roles.length > 0) {
      const defaultRol = isSuperAdmin 
        ? roles.find((r) => r.nombre === "PASAJERO") || roles[0]
        : roles.find((r) => r.nombre === "CHOFER") || roles[0];
      setIdRol(defaultRol.idRol);
    }
    setFeedback(null);
    setShowModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await createUsuarioByAdminAction({
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        correo: correo.trim(),
        telefono: telefono.trim() || undefined,
        usuario: usuario.trim() || undefined,
        password: password.trim() || undefined,
        idRol,
        idCooperativa: idCooperativa ? Number(idCooperativa) : null,
      });

      if (res.success) {
        setFeedback({ type: "success", text: `Usuario "${res.data?.nombre}" registrado exitosamente.` });
        setShowModal(false);
        fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo registrar el usuario." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de servidor al guardar el usuario." });
    } finally {
      setSaving(false);
    }
  };

  // Filtrar roles permitidos según permisos
  const rolesDisponiblesForm = isSuperAdmin
    ? roles
    : roles.filter((r) => ["CHOFER", "AYUDANTE", "TAQUILLERO", "ADMIN_COOP"].includes(r.nombre));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alerta de Feedback Global */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between gap-3 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon
              path={feedback.type === "success" ? mdiCheckCircleOutline : mdiAlertCircleOutline}
              size={0.8}
              className={feedback.type === "success" ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"}
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiAccountMultiple} size={0.85} className="text-primary" />
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <Icon path={mdiPlus} size={0.7} />
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Icon
            path={mdiMagnify}
            size={0.75}
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

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Filtro por Rol */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shrink-0">
            <Icon path={mdiShieldAccount} size={0.65} className="text-slate-400" />
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
              <Icon path={mdiDomain} size={0.65} className="text-slate-400" />
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
            <Icon path={mdiRefresh} size={0.7} className={loading ? "animate-spin text-slate-900" : ""} />
          </button>
        </div>
      </div>

      {/* TABLA DE USUARIOS CON SKELETON */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
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
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
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

                      <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                        {formatManaguaDate(u.createdAt, "short")}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenReasignar(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer inline-flex items-center justify-center"
                              title={`Reasignar cooperativa de ${u.nombreCompleto}`}
                              aria-label="Reasignar cooperativa"
                            >
                              <Icon path={mdiSwapHorizontal} size={0.7} />
                            </button>
                          )}

                          {currentUser?.idUsuario === u.idUsuario ? (
                            <span className="text-[10px] text-slate-400 font-medium italic px-1">Tú</span>
                          ) : (!isSuperAdmin && u.rolNombre === "SUPER_ADMIN") ? null : (
                            <button
                              type="button"
                              onClick={() => setDeleteModalUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer inline-flex items-center justify-center"
                              title={`Eliminar usuario @${u.usuario}`}
                              aria-label="Eliminar usuario"
                            >
                              <Icon path={mdiDeleteOutline} size={0.7} />
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

      {/* MODAL PARA CREAR NUEVO USUARIO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
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
                <Icon path={mdiClose} size={0.8} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Carlos"
                    className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej: Morales (opcional)"
                    className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    maxLength={8}
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="8 dígitos (opcional)"
                    className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Autogenerado si está vacío"
                    className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rol a Asignar *</label>
                  <select
                    value={idRol}
                    onChange={(e) => setIdRol(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-slate-400 cursor-pointer"
                  >
                    {rolesDisponiblesForm.map((r) => (
                      <option key={r.idRol} value={r.idRol}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cooperativa {isSuperAdmin ? "(Opcional si es Super/Pasajero)" : "(Fijada a tu cooperativa)"}
                  </label>
                  {isSuperAdmin ? (
                    <select
                      value={idCooperativa}
                      onChange={(e) => setIdCooperativa(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-slate-400 cursor-pointer"
                    >
                      <option value="">Sin Cooperativa (Global / Pasajero)</option>
                      {cooperativas.map((c) => (
                        <option key={c.idCooperativa} value={c.idCooperativa.toString()}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={cooperativas.find((c) => c.idCooperativa.toString() === selectedCoopId)?.nombre || "Tu Cooperativa"}
                      className="w-full bg-slate-100 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-600 font-medium cursor-not-allowed"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña Inicial (Opcional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Por defecto: RutaCorp2026!"
                  className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Icon path={mdiLoading} size={0.65} className="animate-spin" />}
                  <span>{saving ? "Registrando..." : "Crear Usuario"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR USUARIO */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <Icon path={mdiDeleteOutline} size={1} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">¿Eliminar Usuario?</h3>
                <p className="text-xs text-slate-500">
                  Esta acción eliminará de forma permanente el acceso de este usuario.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5">
              <p className="font-bold text-slate-900 text-sm">{deleteModalUser.nombreCompleto}</p>
              <p className="font-mono text-slate-500 text-[11px]">@{deleteModalUser.usuario} • {deleteModalUser.correo}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 font-semibold">{deleteModalUser.rolNombre}</span>
                <span>•</span>
                <span>{deleteModalUser.cooperativaNombre}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteUsuario}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <Icon path={mdiLoading} size={0.65} className="animate-spin" />}
                <span>{deleting ? "Eliminando..." : "Eliminar Cuenta"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMACIÓN PARA REASIGNAR COOPERATIVA (SUPER_ADMIN) */}
      {reasignarModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
                <Icon path={mdiSwapHorizontal} size={1} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reasignar Cooperativa</h3>
                <p className="text-xs text-slate-500">
                  Transfiere a este usuario a otra entidad de transporte.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
              <p className="font-bold text-slate-900 text-sm">{reasignarModalUser.nombreCompleto}</p>
              <p className="font-mono text-slate-500 text-[11px]">@{reasignarModalUser.usuario} • {reasignarModalUser.correo}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 font-semibold">{reasignarModalUser.rolNombre}</span>
                <span>•</span>
                <span className="text-slate-500">Actual: <strong className="text-slate-800">{reasignarModalUser.cooperativaNombre}</strong></span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Icon path={mdiDomain} size={0.6} className="text-slate-400" />
                Nueva Cooperativa Asignada:
              </label>
              <select
                value={reasignarNuevaCoop}
                onChange={(e) => setReasignarNuevaCoop(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400"
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reasignando}
                onClick={handleReasignarCooperativa}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {reasignando && <Icon path={mdiLoading} size={0.65} className="animate-spin" />}
                <span>{reasignando ? "Reasignando..." : "Confirmar Cambio"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
