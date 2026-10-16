"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiAccountGroup,
  mdiAccount,
  mdiSteering,
  mdiPhone,
  mdiEmailOutline,
  mdiPlus,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiTrashCanOutline,
  mdiMagnify,
  mdiClose,
  mdiBus,
  mdiKeyOutline,
  mdiBadgeAccountHorizontalOutline,
} from "@mdi/js";
import {
  getPersonalOperativoAction,
  getRolesOperativosAction,
  createOperarioAction,
  updateEstadoOperarioAction,
  deleteOperarioAction,
} from "@/backend/actions/usuarios";
import { getCooperativas } from "@/backend/actions/cooperativas";

type EstadoUsuario = "ACTIVO" | "INACTIVO" | "BLOQUEADO";

interface AsignacionItem {
  idAsignacion: number;
  estado: string;
  unidad?: {
    idUnidad: number;
    numeroUnidad: string;
    placa: string;
  } | null;
}

interface OperarioItem {
  idUsuario: number;
  nombre: string;
  apellido: string;
  usuario: string;
  correo: string;
  telefono?: string | null;
  direccion?: string | null;
  foto?: string | null;
  estado: EstadoUsuario;
  rol: {
    idRol: number;
    nombre: string;
    descripcion?: string | null;
  };
  cooperativa?: {
    idCooperativa: number;
    nombre: string;
  } | null;
  asignacionesAsignadas?: AsignacionItem[];
}

interface RolItem {
  idRol: number;
  nombre: string;
  descripcion?: string | null;
}

interface CooperativaItem {
  idCooperativa: number;
  nombre: string;
}

export default function ChoferesDashboardPage() {
  const [personal, setPersonal] = useState<OperarioItem[]>([]);
  const [roles, setRoles] = useState<RolItem[]>([]);
  const [cooperativas, setCooperativas] = useState<CooperativaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolFilter, setRolFilter] = useState<string>("TODOS");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOperario, setSelectedOperario] = useState<OperarioItem | null>(null);

  // Formulario nuevo operario
  const [formNombre, setFormNombre] = useState("");
  const [formApellido, setFormApellido] = useState("");
  const [formUsuario, setFormUsuario] = useState("");
  const [formCorreo, setFormCorreo] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formIdRol, setFormIdRol] = useState<number>(0);
  const [formIdCoop, setFormIdCoop] = useState<number>(0);
  const [formPasswd, setFormPasswd] = useState("Chofer2026!");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estados de carga y feedback
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPersonal, resRoles, resCoops] = await Promise.all([
        getPersonalOperativoAction(),
        getRolesOperativosAction(),
        getCooperativas(),
      ]);

      if (resPersonal.success && resPersonal.data) {
        setPersonal(resPersonal.data as any);
      }
      if (resRoles.success && resRoles.data) {
        setRoles(resRoles.data);
        if (resRoles.data.length > 0 && formIdRol === 0) {
          const defaultChofer = resRoles.data.find((r) => r.nombre === "CHOFER") || resRoles.data[0];
          setFormIdRol(defaultChofer.idRol);
        }
      }
      if (resCoops.success && resCoops.data) {
        setCooperativas(resCoops.data as any);
        if (resCoops.data.length > 0 && formIdCoop === 0) {
          setFormIdCoop(resCoops.data[0].idCooperativa);
        }
      }
    } catch (err) {
      console.error("Error al cargar personal operativo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado reactivo
  const filteredPersonal = useMemo(() => {
    return personal.filter((p) => {
      const fullName = `${p.nombre} ${p.apellido}`.toLowerCase();
      const matchSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        p.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.telefono || "").includes(searchTerm);

      const matchRol = rolFilter === "TODOS" || p.rol.nombre === rolFilter;
      return matchSearch && matchRol;
    });
  }, [personal, searchTerm, rolFilter]);

  // Contadores
  const stats = useMemo(() => {
    const choferesCount = personal.filter((p) => p.rol.nombre === "CHOFER").length;
    const ayudantesCount = personal.filter((p) => p.rol.nombre === "AYUDANTE").length;
    const enRutaCount = personal.filter(
      (p) => p.asignacionesAsignadas && p.asignacionesAsignadas.length > 0
    ).length;

    return {
      total: personal.length,
      choferes: choferesCount,
      ayudantes: ayudantesCount,
      enRuta: enRutaCount,
    };
  }, [personal]);

  // Autogenerar usuario al tipear nombre y apellido
  const handleNombreChange = (val: string) => {
    setFormNombre(val);
    const cleanNombre = val.trim().toLowerCase().replace(/\s+/g, "");
    const cleanApellido = formApellido.trim().toLowerCase().replace(/\s+/g, "");
    if (cleanNombre || cleanApellido) {
      setFormUsuario(`${cleanNombre}.${cleanApellido}`);
      setFormCorreo(`${cleanNombre}.${cleanApellido}@cooperativa.com`);
    }
  };

  const handleApellidoChange = (val: string) => {
    setFormApellido(val);
    const cleanNombre = formNombre.trim().toLowerCase().replace(/\s+/g, "");
    const cleanApellido = val.trim().toLowerCase().replace(/\s+/g, "");
    if (cleanNombre || cleanApellido) {
      setFormUsuario(`${cleanNombre}.${cleanApellido}`);
      setFormCorreo(`${cleanNombre}.${cleanApellido}@cooperativa.com`);
    }
  };

  // Guardar nuevo operario
  const handleCreateOperario = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formNombre.trim() || !formApellido.trim()) {
      setFormError("Nombre y apellido son obligatorios.");
      return;
    }
    if (!formUsuario.trim() || !formCorreo.trim()) {
      setFormError("Usuario y correo son obligatorios.");
      return;
    }
    if (formIdRol === 0) {
      setFormError("Debes seleccionar un rol para el personal.");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await createOperarioAction({
        idCooperativa: formIdCoop || undefined,
        idRol: formIdRol,
        nombre: formNombre.trim(),
        apellido: formApellido.trim(),
        usuario: formUsuario.trim(),
        correo: formCorreo.trim(),
        telefono: formTelefono.trim() || undefined,
        passwd: formPasswd,
      });

      if (res.success) {
        setShowCreateModal(false);
        setFormNombre("");
        setFormApellido("");
        setFormUsuario("");
        setFormCorreo("");
        setFormTelefono("");
        setFeedbackMsg({ type: "success", text: "Personal operativo registrado exitosamente con credenciales iniciales." });
        await fetchData();
      } else {
        setFormError(res.error || "No se pudo registrar el usuario.");
      }
    } catch (err: any) {
      setFormError(err.message || "Error al conectar con el servidor.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Cambiar estado en vivo
  const handleUpdateEstado = async (idUsuario: number, nuevoEstado: EstadoUsuario) => {
    setUpdatingId(idUsuario);
    try {
      const res = await updateEstadoOperarioAction(idUsuario, nuevoEstado);
      if (res.success) {
        setPersonal((prev) =>
          prev.map((p) => (p.idUsuario === idUsuario ? { ...p, estado: nuevoEstado } : p))
        );
        setFeedbackMsg({ type: "success", text: `Estado del colaborador cambiado a ${nuevoEstado}.` });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error al actualizar estado del usuario." });
    } finally {
      setUpdatingId(null);
    }
  };

  // Eliminar operario
  const handleConfirmDelete = async () => {
    if (!selectedOperario) return;
    setUpdatingId(selectedOperario.idUsuario);
    try {
      const res = await deleteOperarioAction(selectedOperario.idUsuario);
      if (res.success) {
        setPersonal((prev) => prev.filter((p) => p.idUsuario !== selectedOperario.idUsuario));
        setFeedbackMsg({
          type: "success",
          text: `Colaborador ${selectedOperario.nombre} ${selectedOperario.apellido} retirado del sistema.`,
        });
        setShowDeleteModal(false);
        setSelectedOperario(null);
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "No se pudo eliminar el colaborador." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error de red al intentar eliminar el operario." });
    } finally {
      setUpdatingId(null);
    }
  };

  const getRolBadgeStyle = (rolNombre: string) => {
    switch (rolNombre) {
      case "CHOFER":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "AYUDANTE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ADMIN_COOP":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Icon path={mdiAccountGroup} size={1} className="text-primary" />
            Directorio de Personal Operativo
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Gestión de choferes y ayudantes de la cooperativa, teléfonos y asignaciones de viaje.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-95"
        >
          <Icon path={mdiPlus} size={0.8} />
          Registrar Personal
        </button>
      </div>

      {/* Banner de feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              path={feedbackMsg.type === "success" ? mdiCheckCircle : mdiAlertCircle}
              size={0.8}
              className={feedbackMsg.type === "success" ? "text-emerald-600" : "text-red-600"}
            />
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <Icon path={mdiClose} size={0.7} />
          </button>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Colaboradores</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <Icon path={mdiAccountGroup} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Choferes Registrados</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{stats.choferes}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon path={mdiSteering} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Ayudantes de Ruta</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{stats.ayudantes}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon path={mdiAccount} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">En Turno Activo</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{stats.enRuta}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon path={mdiBus} size={0.9} />
          </div>
        </div>
      </div>

      {/* Buscador y filtro por Rol */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Icon
            path={mdiMagnify}
            size={0.8}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon path={mdiClose} size={0.6} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {["TODOS", "CHOFER", "AYUDANTE", "TAQUILLERO", "ADMIN_COOP"].map((r) => {
            const active = rolFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRolFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r === "TODOS" ? "Todos" : r.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla de Personal Operativo */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-gray-600">Cargando directorio de colaboradores...</p>
          </div>
        ) : filteredPersonal.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-300">
              <Icon path={mdiAccountGroup} size={1.4} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No se encontraron colaboradores</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {searchTerm || rolFilter !== "TODOS"
                ? "Prueba a cambiar tus filtros de búsqueda."
                : "Registra a los choferes y cobradores de la cooperativa para gestionar la flota."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-6">Personal</th>
                  <th className="py-4 px-6">Rol Operativo</th>
                  <th className="py-4 px-6">Contacto y Teléfono</th>
                  <th className="py-4 px-6">Estado de Asignación</th>
                  <th className="py-4 px-6">Estado Cuenta</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredPersonal.map((operario) => {
                  const asignacionActiva = operario.asignacionesAsignadas?.[0];
                  const isUpdating = updatingId === operario.idUsuario;

                  return (
                    <tr
                      key={operario.idUsuario}
                      className="hover:bg-gray-50/60 transition-colors group"
                    >
                      {/* Avatar y Nombre */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/20">
                            {operario.foto ? (
                              <img
                                src={operario.foto}
                                alt={operario.nombre}
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : (
                              `${operario.nombre.charAt(0)}${operario.apellido.charAt(0)}`
                            )}
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900 leading-tight">
                              {operario.nombre} {operario.apellido}
                            </p>
                            <p className="text-[11px] font-mono font-medium text-gray-400 mt-0.5">
                              @{operario.usuario}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rol con Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-extrabold border ${getRolBadgeStyle(
                            operario.rol.nombre
                          )}`}
                        >
                          {operario.rol.nombre}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="py-4 px-6">
                        {operario.telefono ? (
                          <a
                            href={`tel:${operario.telefono}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-primary transition-colors"
                          >
                            <Icon path={mdiPhone} size={0.6} className="text-gray-400" />
                            {operario.telefono}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin teléfono</span>
                        )}
                        <p className="text-[11px] text-gray-400 font-medium truncate max-w-xs mt-0.5">
                          {operario.correo}
                        </p>
                      </td>

                      {/* Asignación en ruta */}
                      <td className="py-4 px-6">
                        {asignacionActiva?.unidad ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold">
                            <Icon path={mdiBus} size={0.6} className="text-blue-600" />
                            En Unidad #{asignacionActiva.unidad.numeroUnidad}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold">
                            Disponible para Turno
                          </span>
                        )}
                      </td>

                      {/* Selector de Estado */}
                      <td className="py-4 px-6">
                        <div className="relative inline-block">
                          <select
                            disabled={isUpdating}
                            value={operario.estado}
                            onChange={(e) =>
                              handleUpdateEstado(
                                operario.idUsuario,
                                e.target.value as EstadoUsuario
                              )
                            }
                            className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              operario.estado === "ACTIVO"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : operario.estado === "BLOQUEADO"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            <option value="ACTIVO">ACTIVO</option>
                            <option value="INACTIVO">INACTIVO</option>
                            <option value="BLOQUEADO">BLOQUEADO</option>
                          </select>
                          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-70">
                            ▼
                          </div>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-right">
                        <button
                          title="Dar de baja / Retirar"
                          onClick={() => {
                            setSelectedOperario(operario);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        >
                          <Icon path={mdiTrashCanOutline} size={0.8} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: REGISTRAR NUEVO PERSONAL OPERATIVO                  */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiAccountGroup} size={0.8} className="text-primary" />
                  Registrar Personal Operativo
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Alta de choferes, cobradores y taquilleros para la operación diaria.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.8} />
              </button>
            </div>

            <form onSubmit={handleCreateOperario} className="p-6 space-y-5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.8} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Rol Operativo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Rol del Colaborador
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {roles.map((rol) => {
                    const isSelected = formIdRol === rol.idRol;
                    return (
                      <div
                        key={rol.idRol}
                        onClick={() => setFormIdRol(rol.idRol)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary font-black shadow-2xs"
                            : "border-gray-200 hover:border-gray-300 font-bold text-gray-700 bg-white"
                        }`}
                      >
                        <p className="text-xs">{rol.nombre}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marvin José"
                    value={formNombre}
                    onChange={(e) => handleNombreChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Castillo Ruiz"
                    value={formApellido}
                    onChange={(e) => handleApellidoChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Teléfono y Cooperativa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Teléfono Celular
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: +505 8888-9999"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Cooperativa
                  </label>
                  <select
                    value={formIdCoop}
                    onChange={(e) => setFormIdCoop(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {cooperativas.map((c) => (
                      <option key={c.idCooperativa} value={c.idCooperativa}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Credenciales de Acceso */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon path={mdiKeyOutline} size={0.7} className="text-primary" />
                  Credenciales de Acceso al Sistema
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsuario}
                      onChange={(e) => setFormUsuario(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={formCorreo}
                      onChange={(e) => setFormCorreo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Contraseña Temporal Asignada
                  </label>
                  <input
                    type="text"
                    required
                    value={formPasswd}
                    onChange={(e) => setFormPasswd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    El operario podrá cambiar su contraseña desde su perfil en cualquier momento.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {formSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  )}
                  {formSubmitting ? "Registrando..." : "Guardar Personal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CONFIRMAR ELIMINACIÓN DE OPERARIO                   */}
      {/* ============================================================ */}
      {showDeleteModal && selectedOperario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Icon path={mdiAlertCircle} size={1.2} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-gray-900">¿Retirar este colaborador?</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Estás a punto de eliminar a {selectedOperario.nombre} {selectedOperario.apellido} (
                {selectedOperario.rol.nombre}). Si tiene registros históricos de viaje, te
                recomendamos cambiar su estado a INACTIVO.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedOperario(null);
                }}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
              >
                Sí, Retirar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
