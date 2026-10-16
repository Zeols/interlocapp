"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiDomain,
  mdiCheckCircle,
  mdiCloseCircle,
  mdiClockOutline,
  mdiAccountTie,
  mdiBus,
  mdiMapMarkerPath,
  mdiMagnify,
  mdiPlus,
  mdiPhone,
  mdiEmailOutline,
  mdiAlertCircle,
  mdiRefresh,
  mdiClose,
  mdiCheck,
  mdiCalendarOutline,
  mdiShieldCheckOutline,
} from "@mdi/js";
import {
  getCooperativas,
  getSolicitudesCooperativasAction,
  aprobarCooperativaAction,
  rechazarCooperativaAction,
  createCooperativa,
} from "@/backend/actions/cooperativas";

interface AdminUser {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string | null;
  usuario: string;
  estado: string;
  createdAt: string | Date;
}

interface SolicitudItem {
  idCooperativa: number;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  estado: string;
  createdAt: string | Date;
  usuarios: AdminUser[];
  _count: {
    unidades: number;
    rutas: number;
  };
}

interface CooperativaItem {
  idCooperativa: number;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  estado: string;
  createdAt: string | Date;
  _count: {
    unidades: number;
    usuarios: number;
    rutas: number;
  };
}

export default function CooperativasDashboardPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudItem[]>([]);
  const [cooperativas, setCooperativas] = useState<CooperativaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"solicitudes" | "directorio">("solicitudes");
  const [searchTerm, setSearchTerm] = useState("");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalAction, setModalAction] = useState<{
    type: "aprobar" | "rechazar";
    cooperativa: SolicitudItem;
  } | null>(null);

  // Formulario nueva cooperativa (directa)
  const [formNombre, setFormNombre] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formDireccion, setFormDireccion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSol, resCoops] = await Promise.all([
        getSolicitudesCooperativasAction(),
        getCooperativas(),
      ]);

      if (resSol.success && resSol.data) {
        setSolicitudes(resSol.data as any);
      }
      if (resCoops.success && resCoops.data) {
        setCooperativas(resCoops.data as any);
      }
    } catch (err) {
      console.error("Error al cargar cooperativas:", err);
      setFeedback({ type: "error", text: "Error de conexión al cargar la información." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado de directorio
  const filteredCooperativas = useMemo(() => {
    if (!searchTerm.trim()) return cooperativas;
    const term = searchTerm.toLowerCase();
    return cooperativas.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        (c.telefono && c.telefono.toLowerCase().includes(term)) ||
        (c.direccion && c.direccion.toLowerCase().includes(term))
    );
  }, [cooperativas, searchTerm]);

  // Manejador para aprobar solicitud
  const handleAprobar = async (idCooperativa: number) => {
    setProcessingId(idCooperativa);
    try {
      const res = await aprobarCooperativaAction(idCooperativa);
      if (res.success) {
        setFeedback({
          type: "success",
          text: "Cooperativa y administrador aprobados exitosamente. Se ha enviado un correo de bienvenida.",
        });
        setModalAction(null);
        await fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo aprobar la solicitud." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de servidor al aprobar cooperativa." });
    } finally {
      setProcessingId(null);
    }
  };

  // Manejador para rechazar solicitud
  const handleRechazar = async (idCooperativa: number) => {
    setProcessingId(idCooperativa);
    try {
      const res = await rechazarCooperativaAction(idCooperativa);
      if (res.success) {
        setFeedback({
          type: "success",
          text: "La solicitud ha sido rechazada e inactivada.",
        });
        setModalAction(null);
        await fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo rechazar la solicitud." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error al procesar el rechazo de la solicitud." });
    } finally {
      setProcessingId(null);
    }
  };

  // Manejador para crear cooperativa directa
  const handleCreateCooperativa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setFeedback({ type: "error", text: "El nombre de la cooperativa es obligatorio." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCooperativa({
        nombre: formNombre.trim(),
        telefono: formTelefono.trim() || undefined,
        direccion: formDireccion.trim() || undefined,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Cooperativa creada con éxito." });
        setFormNombre("");
        setFormTelefono("");
        setFormDireccion("");
        setShowCreateModal(false);
        await fetchData();
      } else {
        setFeedback({ type: "error", text: res.error || "Error al crear la cooperativa." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error inesperado al crear cooperativa." });
    } finally {
      setSubmitting(false);
    }
  };

  const totalActivas = cooperativas.filter((c) => c.estado === "ACTIVO").length;
  const totalUnidades = cooperativas.reduce((sum, c) => sum + (c._count?.unidades || 0), 0);
  const totalRutas = cooperativas.reduce((sum, c) => sum + (c._count?.rutas || 0), 0);

  return (
    <div className="space-y-6">
      {/* Alerta de feedback */}
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

      {/* Cabecera del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Cooperativas y Empresas
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Super Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Revisión de solicitudes de alta, auditoría y administración de cooperativas de transporte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Recargar datos"
          >
            <Icon path={mdiRefresh} size={0.7} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Icon path={mdiPlus} size={0.7} />
            <span>+ Nueva Cooperativa</span>
          </button>
        </div>
      </div>

      {/* Métricas / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Solicitudes Nuevas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon path={mdiClockOutline} size={0.75} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{solicitudes.length}</span>
            <span className="text-[11px] text-amber-600 font-medium">Por revisar</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cooperativas Activas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon path={mdiDomain} size={0.75} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalActivas}</span>
            <span className="text-[11px] text-emerald-600 font-medium">En servicio</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Flota Registrada</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon path={mdiBus} size={0.75} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalUnidades}</span>
            <span className="text-[11px] text-slate-500 font-medium">Unidades</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rutas en Red</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon path={mdiMapMarkerPath} size={0.75} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalRutas}</span>
            <span className="text-[11px] text-slate-500 font-medium">Trayectos</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("solicitudes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "solicitudes"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Icon path={mdiClockOutline} size={0.7} />
          <span>Solicitudes de Aprobación</span>
          {solicitudes.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-1.5 py-0.2 rounded-full">
              {solicitudes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("directorio")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "directorio"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Icon path={mdiDomain} size={0.7} />
          <span>Directorio General</span>
          <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-1.5 py-0.2 rounded-full">
            {cooperativas.length}
          </span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: SOLICITUDES DE APROBACIÓN */}
      {activeTab === "solicitudes" && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs font-medium">
              Cargando solicitudes de cooperativas...
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Icon path={mdiShieldCheckOutline} size={1.2} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Al día: No hay solicitudes pendientes</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Todas las cooperativas y administradores registrados han sido evaluados y se encuentran activos o archivados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solicitudes.map((sol) => {
                const admin = sol.usuarios?.[0];
                const fechaFormat = new Date(sol.createdAt).toLocaleDateString("es-NI", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={sol.idCooperativa}
                    className="bg-white rounded-xl border border-amber-200/80 shadow-2xs p-5 flex flex-col justify-between hover:border-amber-300 transition-all"
                  >
                    <div>
                      {/* Cabecera de la Solicitud */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{sol.nombre}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Pendiente
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <Icon path={mdiCalendarOutline} size={0.6} />
                            <span>Solicitado el {fechaFormat}</span>
                          </div>
                        </div>

                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Icon path={mdiDomain} size={0.9} />
                        </div>
                      </div>

                      {/* Datos de contacto de la Cooperativa */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        {sol.telefono && (
                          <div className="flex items-center gap-2">
                            <Icon path={mdiPhone} size={0.65} className="text-slate-400" />
                            <span>{sol.telefono}</span>
                          </div>
                        )}
                        {sol.direccion && (
                          <div className="flex items-center gap-2">
                            <Icon path={mdiMapMarkerPath} size={0.65} className="text-slate-400" />
                            <span className="truncate">{sol.direccion}</span>
                          </div>
                        )}
                      </div>

                      {/* Administrador Responsable */}
                      {admin && (
                        <div className="mt-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2">
                            <Icon path={mdiAccountTie} size={0.65} className="text-primary" />
                            <span>Administrador Responsable</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600">
                            <div>
                              <span className="text-slate-400 block text-[10px] font-medium uppercase">Nombre:</span>
                              <span className="font-medium text-slate-800">{admin.nombre} {admin.apellido}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] font-medium uppercase">Usuario:</span>
                              <span className="font-mono text-slate-800">@{admin.usuario}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 block text-[10px] font-medium uppercase">Correo:</span>
                              <span className="text-slate-800 flex items-center gap-1">
                                <Icon path={mdiEmailOutline} size={0.55} className="text-slate-400" />
                                {admin.correo}
                              </span>
                            </div>
                            {admin.telefono && (
                              <div>
                                <span className="text-slate-400 block text-[10px] font-medium uppercase">Teléfono:</span>
                                <span>{admin.telefono}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalAction({ type: "rechazar", cooperativa: sol })}
                        disabled={processingId === sol.idCooperativa}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 cursor-pointer"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => setModalAction({ type: "aprobar", cooperativa: sol })}
                        disabled={processingId === sol.idCooperativa}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Icon path={mdiCheck} size={0.65} />
                        <span>Aprobar Cooperativa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: DIRECTORIO GENERAL */}
      {activeTab === "directorio" && (
        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Icon
                path={mdiMagnify}
                size={0.75}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, teléfono o ubicación..."
                className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Tabla de Cooperativas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Cooperativa / Empresa</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4 text-center">Unidades</th>
                    <th className="py-3 px-4 text-center">Rutas</th>
                    <th className="py-3 px-4 text-center">Usuarios</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Cargando directorio de cooperativas...
                      </td>
                    </tr>
                  ) : filteredCooperativas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No se encontraron cooperativas registradas.
                      </td>
                    </tr>
                  ) : (
                    filteredCooperativas.map((c) => {
                      const fechaFormat = new Date(c.createdAt).toLocaleDateString("es-NI", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });

                      const badgeColor =
                        c.estado === "ACTIVO"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : c.estado === "PENDIENTE_APROBACION"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200";

                      return (
                        <tr key={c.idCooperativa} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {c.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{c.nombre}</p>
                                {c.direccion && (
                                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.direccion}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {c.telefono ? (
                              <span className="flex items-center gap-1">
                                <Icon path={mdiPhone} size={0.55} className="text-slate-400" />
                                {c.telefono}
                              </span>
                            ) : (
                              <span className="text-slate-300">N/D</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                            {c._count?.unidades || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                            {c._count?.rutas || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                            {c._count?.usuarios || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
                            >
                              {c.estado === "ACTIVO"
                                ? "Activa"
                                : c.estado === "PENDIENTE_APROBACION"
                                ? "Pendiente"
                                : "Inactiva"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                            {fechaFormat}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN (APROBAR / RECHAZAR) */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  modalAction.type === "aprobar"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                <Icon
                  path={modalAction.type === "aprobar" ? mdiCheckCircle : mdiCloseCircle}
                  size={1}
                />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {modalAction.type === "aprobar" ? "¿Aprobar Cooperativa?" : "¿Rechazar Solicitud?"}
                </h3>
                <p className="text-xs text-slate-500">
                  {modalAction.type === "aprobar"
                    ? "Se activará la empresa y el usuario administrador podrá ingresar inmediatamente."
                    : "La cooperativa y su administrador quedarán marcados como inactivos."}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
              <p className="font-semibold text-slate-900">{modalAction.cooperativa.nombre}</p>
              {modalAction.cooperativa.usuarios?.[0] && (
                <p className="text-slate-600">
                  Admin: {modalAction.cooperativa.usuarios[0].nombre} {modalAction.cooperativa.usuarios[0].apellido} (
                  {modalAction.cooperativa.usuarios[0].correo})
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalAction(null)}
                disabled={Boolean(processingId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() =>
                  modalAction.type === "aprobar"
                    ? handleAprobar(modalAction.cooperativa.idCooperativa)
                    : handleRechazar(modalAction.cooperativa.idCooperativa)
                }
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all cursor-pointer ${
                  modalAction.type === "aprobar"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processingId ? "Procesando..." : modalAction.type === "aprobar" ? "Confirmar Aprobación" : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR COOPERATIVA DIRECTA */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon path={mdiDomain} size={0.75} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Registrar Nueva Cooperativa</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <form onSubmit={handleCreateCooperativa} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Cooperativa / Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Cooperativa Parrales Vallejos"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  placeholder="Ej: +505 2222-3344"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección o Base Operativa
                </label>
                <textarea
                  rows={2}
                  value={formDireccion}
                  onChange={(e) => setFormDireccion(e.target.value)}
                  placeholder="Ej: Terminal Managua, pista Suburbana"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/95 rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  {submitting ? "Guardando..." : "Guardar Cooperativa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
