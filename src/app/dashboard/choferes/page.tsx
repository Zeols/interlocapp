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
  mdiDomain,
} from "@mdi/js";
import {
  getPersonalOperativoAction,
  getRolesOperativosAction,
  createOperarioAction,
  updateEstadoOperarioAction,
  deleteOperarioAction,
} from "@/backend/actions/usuarios";
import { getCooperativas } from "@/backend/actions/cooperativas";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { TableSkeleton } from "@/frontend/components/ui/Skeleton";
import { Pagination } from "@/frontend/components/ui/Pagination";
import { useTenant } from "@/frontend/context/TenantContext";

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
  const { selectedCoopId, isSuperAdmin, selectedCoop } = useTenant();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [personal, setPersonal] = useState<OperarioItem[]>([]);
  const [roles, setRoles] = useState<RolItem[]>([]);
  const [cooperativas, setCooperativas] = useState<CooperativaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolFilter, setRolFilter] = useState<string>("TODOS");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      const [resPersonal, resRoles, resCoops, session] = await Promise.all([
        getPersonalOperativoAction(),
        getRolesOperativosAction(),
        getCooperativas(),
        getCurrentUserAction(),
      ]);

      if (session) {
        setCurrentUser(session);
        if (session.idCooperativa) {
          setFormIdCoop(session.idCooperativa);
        }
      }

      if (resPersonal.success && resPersonal.data) {
        const rawPersonal = resPersonal.data as any[];
        if (session && session.rolNombre !== "SUPER_ADMIN" && session.idCooperativa) {
          setPersonal(rawPersonal.filter((p) => p.cooperativa?.idCooperativa === session.idCooperativa));
        } else {
          setPersonal(rawPersonal);
        }
      }

      if (resRoles.success && resRoles.data) {
        let availableRoles = resRoles.data;
        // Si el usuario es ADMIN_COOP, solo puede asignar roles inferiores (CHOFER, AYUDANTE, TAQUILLERO)
        if (session && session.rolNombre === "ADMIN_COOP") {
          availableRoles = resRoles.data.filter(
            (r) => r.nombre !== "SUPER_ADMIN" && r.nombre !== "ADMIN_COOP"
          );
        }
        setRoles(availableRoles);
        if (availableRoles.length > 0 && formIdRol === 0) {
          const defaultChofer = availableRoles.find((r) => r.nombre === "CHOFER") || availableRoles[0];
          setFormIdRol(defaultChofer.idRol);
        }
      }

      if (resCoops.success && resCoops.data) {
        setCooperativas(resCoops.data as any);
        if (session && session.idCooperativa) {
          setFormIdCoop(session.idCooperativa);
        } else if (resCoops.data.length > 0 && formIdCoop === 0) {
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

  // Personal filtrado por cooperativa (tenant activo)
  const tenantPersonal = useMemo(() => {
    if (selectedCoopId === "ALL") return personal;
    return personal.filter((p) => p.cooperativa?.idCooperativa === Number(selectedCoopId));
  }, [personal, selectedCoopId]);

  // Filtrado reactivo por texto y rol
  const filteredPersonal = useMemo(() => {
    return tenantPersonal.filter((p) => {
      const fullName = `${p.nombre} ${p.apellido}`.toLowerCase();
      const matchSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        p.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.telefono || "").includes(searchTerm) ||
        (p.cooperativa?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchRol = rolFilter === "TODOS" || p.rol.nombre === rolFilter;
      return matchSearch && matchRol;
    });
  }, [tenantPersonal, searchTerm, rolFilter]);

  // Reset de página al filtrar o cambiar de cooperativa
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rolFilter, selectedCoopId]);

  const totalPages = Math.ceil(filteredPersonal.length / pageSize) || 1;
  const paginatedPersonal = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersonal.slice(start, start + pageSize);
  }, [filteredPersonal, currentPage, pageSize]);

  // Contadores métricos de la cooperativa seleccionada o globales
  const stats = useMemo(() => {
    const choferesCount = tenantPersonal.filter((p) => p.rol.nombre === "CHOFER").length;
    const ayudantesCount = tenantPersonal.filter((p) => p.rol.nombre === "AYUDANTE").length;
    const enRutaCount = tenantPersonal.filter(
      (p) => p.asignacionesAsignadas && p.asignacionesAsignadas.length > 0
    ).length;

    return {
      total: tenantPersonal.length,
      choferes: choferesCount,
      ayudantes: ayudantesCount,
      enRuta: enRutaCount,
    };
  }, [tenantPersonal]);

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
    const targetCoopId = selectedCoopId !== "ALL" ? Number(selectedCoopId) : formIdCoop;
    try {
      const res = await createOperarioAction({
        idCooperativa: targetCoopId || undefined,
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
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "AYUDANTE":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "ADMIN_COOP":
        return "bg-slate-900 text-white border-slate-900";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const showCoopColumn = isSuperAdmin && selectedCoopId === "ALL";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiAccountGroup} size={0.9} className="text-primary" />
            Directorio de Personal {selectedCoop ? `(${selectedCoop.nombre})` : ""}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {selectedCoop
              ? `Gestión del personal y choferes de ${selectedCoop.nombre}.`
              : "Directorio global de personal operativo de todas las cooperativas registradas."}
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            if (selectedCoopId !== "ALL") {
              setFormIdCoop(Number(selectedCoopId));
            }
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Icon path={mdiPlus} size={0.7} />
          Registrar Personal
        </button>
      </div>

      {/* Banner de feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-lg border text-xs sm:text-sm font-medium flex items-center justify-between animate-in fade-in duration-150 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              path={feedbackMsg.type === "success" ? mdiCheckCircle : mdiAlertCircle}
              size={0.7}
              className={feedbackMsg.type === "success" ? "text-emerald-600" : "text-red-600"}
            />
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <Icon path={mdiClose} size={0.6} />
          </button>
        </div>
      )}

      {/* Métricas con diseño neutral y acentos del sistema */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Colaboradores</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiAccountGroup} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Choferes</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.choferes}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiSteering} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ayudantes</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.ayudantes}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiAccount} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">En Turno Activo</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.enRuta}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiBus} size={0.8} />
          </div>
        </div>
      </div>

      {/* Buscador y filtro de Rol en Combo Box */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Icon
            path={mdiMagnify}
            size={0.7}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar colaborador por nombre, usuario o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-normal text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <Icon path={mdiClose} size={0.5} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <label className="text-xs font-medium text-slate-500 shrink-0 hidden sm:inline-block">
            Filtrar por rol:
          </label>
          <div className="relative min-w-[170px]">
            <select
              value={rolFilter}
              onChange={(e) => setRolFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 appearance-none pr-8 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 cursor-pointer transition-colors"
            >
              <option value="TODOS">Todos los roles</option>
              <option value="CHOFER">Chofer</option>
              <option value="AYUDANTE">Ayudante</option>
              <option value="TAQUILLERO">Taquillero</option>
              <option value="ADMIN_COOP">Admin Cooperativa</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {(searchTerm || rolFilter !== "TODOS") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setRolFilter("TODOS");
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Personal Operativo */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : filteredPersonal.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2.5 text-slate-400">
              <Icon path={mdiAccountGroup} size={1} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No se encontraron colaboradores</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || rolFilter !== "TODOS"
                ? "Prueba a cambiar tus filtros de búsqueda."
                : "Registra a los choferes y cobradores de la cooperativa para gestionar la flota."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Personal</th>
                  <th className="py-3 px-4">Rol Operativo</th>
                  {showCoopColumn && <th className="py-3 px-4">Cooperativa</th>}
                  <th className="py-3 px-4">Contacto y Teléfono</th>
                  <th className="py-3 px-4">Asignación</th>
                  <th className="py-3 px-4">Estado Cuenta</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPersonal.map((operario) => {
                  const asignacionActiva = operario.asignacionesAsignadas?.[0];
                  const isUpdating = updatingId === operario.idUsuario;

                  return (
                    <tr
                      key={operario.idUsuario}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Avatar y Nombre */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                            {operario.foto ? (
                              <img
                                src={operario.foto}
                                alt={operario.nombre}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              `${operario.nombre.charAt(0)}${operario.apellido.charAt(0)}`
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {operario.nombre} {operario.apellido}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              @{operario.usuario}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rol con Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRolBadgeStyle(
                            operario.rol.nombre
                          )}`}
                        >
                          {operario.rol.nombre}
                        </span>
                      </td>

                      {/* Cooperativa vinculada (Vista Super Admin Global) */}
                      {showCoopColumn && (
                        <td className="py-3 px-4">
                          {operario.cooperativa ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Icon path={mdiDomain} size={0.55} className="text-blue-500" />
                              {operario.cooperativa.nombre}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Global / Sin asignar</span>
                          )}
                        </td>
                      )}

                      {/* Contacto */}
                      <td className="py-3 px-4">
                        {operario.telefono ? (
                          <a
                            href={`tel:${operario.telefono}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                          >
                            <Icon path={mdiPhone} size={0.5} className="text-slate-400" />
                            {operario.telefono}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin teléfono</span>
                        )}
                        <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {operario.correo}
                        </p>
                      </td>

                      {/* Asignación en ruta */}
                      <td className="py-3 px-4">
                        {asignacionActiva?.unidad ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                            <Icon path={mdiBus} size={0.5} className="text-slate-500" />
                            Unidad #{asignacionActiva.unidad.numeroUnidad}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">
                            Sin turno asignado
                          </span>
                        )}
                      </td>

                      {/* Selector de Estado */}
                      <td className="py-3 px-4">
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
                            className={`text-xs font-medium px-2.5 py-1 rounded-md border appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400/20 ${
                              operario.estado === "ACTIVO"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : operario.estado === "BLOQUEADO"
                                ? "bg-red-50 text-red-800 border-red-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                            <option value="BLOQUEADO">Bloqueado</option>
                          </select>
                          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">
                            ▼
                          </div>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <button
                          title="Dar de baja / Retirar"
                          onClick={() => {
                            setSelectedOperario(operario);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Icon path={mdiTrashCanOutline} size={0.7} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!loading && filteredPersonal.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPersonal.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: REGISTRAR NUEVO PERSONAL OPERATIVO                  */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiAccountGroup} size={0.75} className="text-slate-700" />
                  Registrar Personal Operativo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Alta de choferes, cobradores y taquilleros para la operación diaria.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <form onSubmit={handleCreateOperario} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.7} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Rol Operativo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Rol del Colaborador
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {roles.map((rol) => {
                    const isSelected = formIdRol === rol.idRol;
                    return (
                      <div
                        key={rol.idRol}
                        onClick={() => setFormIdRol(rol.idRol)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer text-center text-xs font-medium ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                            : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                        }`}
                      >
                        <p>{rol.nombre}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marvin José"
                    value={formNombre}
                    onChange={(e) => handleNombreChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Castillo Ruiz"
                    value={formApellido}
                    onChange={(e) => handleApellidoChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                </div>
              </div>

              {/* Teléfono y Cooperativa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono Celular (8 dígitos)
                  </label>
                  <input
                    type="tel"
                    maxLength={8}
                    placeholder="Ej: 88889999"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cooperativa
                  </label>
                  {selectedCoopId !== "ALL" || (currentUser?.rolNombre === "ADMIN_COOP" && currentUser?.idCooperativa) ? (
                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Icon path={mdiDomain} size={0.55} className="text-slate-500" />
                      {selectedCoop?.nombre || cooperativas.find((c) => c.idCooperativa === (selectedCoopId !== "ALL" ? Number(selectedCoopId) : formIdCoop))?.nombre || "Cooperativa Asignada"}
                    </div>
                  ) : (
                    <select
                      value={formIdCoop}
                      onChange={(e) => setFormIdCoop(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                    >
                      {cooperativas.map((c) => (
                        <option key={c.idCooperativa} value={c.idCooperativa}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Credenciales de Acceso */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon path={mdiKeyOutline} size={0.65} className="text-slate-600" />
                  Credenciales de Acceso al Sistema
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsuario}
                      onChange={(e) => setFormUsuario(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={formCorreo}
                      onChange={(e) => setFormCorreo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Contraseña Temporal Asignada
                  </label>
                  <input
                    type="text"
                    required
                    value={formPasswd}
                    onChange={(e) => setFormPasswd(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                  <p className="text-[10px] text-slate-400 font-normal mt-1">
                    El colaborador podrá cambiar su contraseña desde su perfil en cualquier momento.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {formSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Icon path={mdiAlertCircle} size={1} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">¿Retirar este colaborador?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Estás a punto de eliminar a {selectedOperario.nombre} {selectedOperario.apellido} (
                {selectedOperario.rol.nombre}). Si tiene registros históricos de viaje, te
                recomendamos cambiar su estado a INACTIVO.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedOperario(null);
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
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
