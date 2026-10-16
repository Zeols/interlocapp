"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiPlus,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiWrench,
  mdiCloseCircle,
  mdiTrashCanOutline,
  mdiMagnify,
  mdiCarSeat,
  mdiSteering,
  mdiRefresh,
  mdiClose,
  mdiShieldCheckOutline,
  mdiDotsVertical,
  mdiEyeOutline,
} from "@mdi/js";
import {
  getAllUnidadesAction,
  getTiposUnidadAction,
  createUnidadWithAsientos,
  updateEstadoUnidadAction,
  deleteUnidadAction,
} from "@/backend/actions/unidades";
import { getCooperativas } from "@/backend/actions/cooperativas";

type EstadoUnidad = "DISPONIBLE" | "EN_RUTA" | "MANTENIMIENTO" | "INOPERATIVA";

interface AsientoItem {
  idAsiento: number;
  numero: string;
  estado: string;
}

interface UnidadItem {
  idUnidad: number;
  idCooperativa: number;
  idTipoUnidad: number;
  numeroUnidad: string;
  placa: string;
  estado: EstadoUnidad;
  createdAt: string | Date;
  tipoUnidad?: {
    idTipoUnidad: number;
    nombre: string;
    descripcion: string | null;
  };
  cooperativa?: {
    idCooperativa: number;
    nombre: string;
  };
  asientos?: AsientoItem[];
  _count?: {
    asientos: number;
  };
}

interface TipoUnidadItem {
  idTipoUnidad: number;
  nombre: string;
  descripcion: string | null;
}

interface CooperativaItem {
  idCooperativa: number;
  nombre: string;
}

export default function FlotaDashboardPage() {
  const [unidades, setUnidades] = useState<UnidadItem[]>([]);
  const [tiposUnidad, setTiposUnidad] = useState<TipoUnidadItem[]>([]);
  const [cooperativas, setCooperativas] = useState<CooperativaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCroquisModal, setShowCroquisModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Unidad seleccionada para ver o borrar
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadItem | null>(null);

  // Formulario de nueva unidad
  const [formCoopId, setFormCoopId] = useState<number>(0);
  const [formTipoId, setFormTipoId] = useState<number>(0);
  const [formNumero, setFormNumero] = useState("");
  const [formPlaca, setFormPlaca] = useState("");
  const [formCapacidad, setFormCapacidad] = useState<number>(20);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estado de acción rápida (cambio de estado de una unidad)
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUnidades, resTipos, resCoops] = await Promise.all([
        getAllUnidadesAction(),
        getTiposUnidadAction(),
        getCooperativas(),
      ]);

      if (resUnidades.success && resUnidades.data) {
        setUnidades(resUnidades.data as any);
      }
      if (resTipos.success && resTipos.data) {
        setTiposUnidad(resTipos.data);
        if (resTipos.data.length > 0 && formTipoId === 0) {
          // Preseleccionar el tipo correspondiente
          const defaultTipo = resTipos.data[0];
          setFormTipoId(defaultTipo.idTipoUnidad);
          determinarCapacidadPorTipo(defaultTipo.nombre);
        }
      }
      if (resCoops.success && resCoops.data) {
        setCooperativas(resCoops.data as any);
        if (resCoops.data.length > 0 && formCoopId === 0) {
          setFormCoopId(resCoops.data[0].idCooperativa);
        }
      }
    } catch (err) {
      console.error("Error al cargar datos de flota:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const determinarCapacidadPorTipo = (nombreTipo: string) => {
    const lower = nombreTipo.toLowerCase();
    if (lower.includes("15") || lower.includes("microbús")) {
      setFormCapacidad(15);
    } else if (lower.includes("40") || lower.includes("pullman")) {
      setFormCapacidad(40);
    } else {
      setFormCapacidad(20);
    }
  };

  const handleSelectTipo = (tipo: TipoUnidadItem) => {
    setFormTipoId(tipo.idTipoUnidad);
    determinarCapacidadPorTipo(tipo.nombre);
  };

  // Filtrado reactivo
  const filteredUnidades = useMemo(() => {
    return unidades.filter((u) => {
      const matchSearch =
        u.numeroUnidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.tipoUnidad?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "TODOS" || u.estado === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [unidades, searchTerm, statusFilter]);

  // Contadores métricos
  const stats = useMemo(() => {
    return {
      total: unidades.length,
      disponibles: unidades.filter((u) => u.estado === "DISPONIBLE").length,
      enRuta: unidades.filter((u) => u.estado === "EN_RUTA").length,
      mantenimiento: unidades.filter((u) => u.estado === "MANTENIMIENTO" || u.estado === "INOPERATIVA").length,
    };
  }, [unidades]);

  // Cambiar estado operativo en vivo
  const handleUpdateEstado = async (idUnidad: number, nuevoEstado: EstadoUnidad) => {
    setUpdatingId(idUnidad);
    setFeedbackMsg(null);
    try {
      const res = await updateEstadoUnidadAction(idUnidad, nuevoEstado);
      if (res.success) {
        setUnidades((prev) =>
          prev.map((u) => (u.idUnidad === idUnidad ? { ...u, estado: nuevoEstado } : u))
        );
        setFeedbackMsg({ type: "success", text: `Estado de la unidad actualizado a ${nuevoEstado}.` });
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "No se pudo actualizar el estado." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error de red al actualizar estado." });
    } finally {
      setUpdatingId(null);
    }
  };

  // Eliminar unidad
  const handleConfirmDelete = async () => {
    if (!selectedUnidad) return;
    setUpdatingId(selectedUnidad.idUnidad);
    try {
      const res = await deleteUnidadAction(selectedUnidad.idUnidad);
      if (res.success) {
        setUnidades((prev) => prev.filter((u) => u.idUnidad !== selectedUnidad.idUnidad));
        setFeedbackMsg({ type: "success", text: `Unidad ${selectedUnidad.numeroUnidad} eliminada con éxito.` });
        setShowDeleteModal(false);
        setSelectedUnidad(null);
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "No se pudo eliminar la unidad." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error al intentar eliminar la unidad." });
    } finally {
      setUpdatingId(null);
    }
  };

  // Registrar nueva unidad con asientos
  const handleCreateUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formNumero.trim()) {
      setFormError("Por favor ingresa el número identificador de la unidad.");
      return;
    }
    if (!formPlaca.trim()) {
      setFormError("Por favor ingresa la placa de la unidad.");
      return;
    }
    if (formCoopId === 0) {
      setFormError("Debes seleccionar una cooperativa asignada.");
      return;
    }
    if (formTipoId === 0) {
      setFormError("Debes seleccionar un tipo de unidad.");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await createUnidadWithAsientos({
        idCooperativa: formCoopId,
        idTipoUnidad: formTipoId,
        numeroUnidad: formNumero.trim(),
        placa: formPlaca.trim().toUpperCase(),
        capacidadAsientos: formCapacidad,
      });

      if (res.success) {
        setShowCreateModal(false);
        setFormNumero("");
        setFormPlaca("");
        setFeedbackMsg({ type: "success", text: "Nueva unidad y croquis de asientos registrados con éxito." });
        await fetchData();
      } else {
        setFormError(res.error || "Error al crear la unidad.");
      }
    } catch (err: any) {
      setFormError(err.message || "Error al conectar con el servidor.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Helper de badges de estado
  const getBadgeStyle = (estado: EstadoUnidad) => {
    switch (estado) {
      case "DISPONIBLE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "EN_RUTA":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "MANTENIMIENTO":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "INOPERATIVA":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabecera y botón de acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Icon path={mdiBus} size={1} className="text-primary" />
            Flota de Unidades
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Gestión de autobuses registrados, asignación de carrocería y croquis de asientos.
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
          Registrar Nueva Unidad
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

      {/* Tarjetas de métricas de flota */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Flota</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <Icon path={mdiBus} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Disponibles</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{stats.disponibles}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon path={mdiCheckCircle} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">En Ruta</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{stats.enRuta}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon path={mdiSteering} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Taller / Paro</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{stats.mantenimiento}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon path={mdiWrench} size={0.9} />
          </div>
        </div>
      </div>

      {/* Barra de búsqueda por placa y filtro combo box por estado */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Barra de búsqueda especializada para buscar por placa */}
        <div className="relative flex-1 max-w-lg">
          <Icon
            path={mdiMagnify}
            size={0.8}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar unidad por placa (ej: M 321-456) o número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <Icon path={mdiClose} size={0.6} />
            </button>
          )}
        </div>

        {/* Combo box de estado de unidad */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 hidden sm:inline-block">
            Estado Operativo:
          </label>
          <div className="relative min-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 appearance-none pr-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="DISPONIBLE">Disponibles</option>
              <option value="EN_RUTA">En Ruta</option>
              <option value="MANTENIMIENTO">En Mantenimiento</option>
              <option value="INOPERATIVA">Inoperativas</option>
            </select>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
              ▼
            </div>
          </div>

          {(searchTerm || statusFilter !== "TODOS") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("TODOS");
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenedor principal: Lista o Tabla de unidades */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-gray-600">Consultando flota operativa...</p>
          </div>
        ) : filteredUnidades.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-300">
              <Icon path={mdiBus} size={1.4} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No se encontraron unidades</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "TODOS"
                ? "Prueba a cambiar tus criterios de búsqueda o filtros seleccionados."
                : "Aún no hay microbuses registrados. Da de alta tu primera unidad para comenzar a operar."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-6">Unidad</th>
                  <th className="py-4 px-6">Placa Oficial</th>
                  <th className="py-4 px-6">Tipo y Carrocería</th>
                  <th className="py-4 px-6 text-center">Capacidad</th>
                  <th className="py-4 px-6">Estado Operativo</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredUnidades.map((unidad) => {
                  const isUpdating = updatingId === unidad.idUnidad;
                  const capacidadReal = unidad.asientos?.length || unidad._count?.asientos || 20;

                  return (
                    <tr
                      key={unidad.idUnidad}
                      className="hover:bg-gray-50/60 transition-colors group"
                    >
                      {/* Número de Unidad */}
                      <td className="py-4 px-6 font-extrabold text-gray-900 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                          {unidad.numeroUnidad}
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900 leading-tight">
                            Unidad #{unidad.numeroUnidad}
                          </p>
                          <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                            {unidad.cooperativa?.nombre || "Cooperativa General"}
                          </p>
                        </div>
                      </td>

                      {/* Placa estilo nicaragüense */}
                      <td className="py-4 px-6 font-mono">
                        <span className="inline-block px-2.5 py-1 rounded-lg border border-gray-300 bg-gray-100 text-gray-800 font-extrabold text-xs tracking-wider shadow-2xs">
                          {unidad.placa}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-800 text-xs sm:text-sm">
                          {unidad.tipoUnidad?.nombre || "Interlocal Estándar"}
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium truncate max-w-xs">
                          {unidad.tipoUnidad?.descripcion || "Transporte interurbano"}
                        </p>
                      </td>

                      {/* Capacidad */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs">
                          <Icon path={mdiCarSeat} size={0.6} className="text-gray-400" />
                          {capacidadReal} asientos
                        </span>
                      </td>

                      {/* Selector de Estado Operativo */}
                      <td className="py-4 px-6">
                        <div className="relative inline-block">
                          <select
                            disabled={isUpdating}
                            value={unidad.estado}
                            onChange={(e) =>
                              handleUpdateEstado(unidad.idUnidad, e.target.value as EstadoUnidad)
                            }
                            className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${getBadgeStyle(
                              unidad.estado
                            )}`}
                          >
                            <option value="DISPONIBLE">DISPONIBLE</option>
                            <option value="EN_RUTA">EN RUTA</option>
                            <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                            <option value="INOPERATIVA">INOPERATIVA</option>
                          </select>
                          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-70">
                            ▼
                          </div>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Ver Croquis de Asientos"
                            onClick={() => {
                              setSelectedUnidad(unidad);
                              setShowCroquisModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
                          >
                            <Icon path={mdiEyeOutline} size={0.8} />
                          </button>

                          <button
                            title="Dar de baja / Eliminar"
                            onClick={() => {
                              setSelectedUnidad(unidad);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Icon path={mdiTrashCanOutline} size={0.8} />
                          </button>
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

      {/* ============================================================ */}
      {/* MODAL 1: REGISTRAR NUEVA UNIDAD Y GENERAR ASIENTOS           */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiBus} size={0.8} className="text-primary" />
                  Registrar Nueva Unidad de Flota
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Asigna la carrocería y el sistema autogenerará el croquis de asientos correspondiente.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.8} />
              </button>
            </div>

            {/* Contenido con scroll */}
            <form onSubmit={handleCreateUnidad} className="p-6 space-y-6 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.8} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Cooperativa Asignada */}
              {cooperativas.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Cooperativa Operadora
                  </label>
                  <select
                    value={formCoopId}
                    onChange={(e) => setFormCoopId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {cooperativas.map((c) => (
                      <option key={c.idCooperativa} value={c.idCooperativa}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selector visual de tipo de carrocería */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Tipo de Carrocería y Distribución
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {tiposUnidad.map((tipo) => {
                    const isSelected = formTipoId === tipo.idTipoUnidad;
                    const seats = tipo.nombre.includes("15")
                      ? 15
                      : tipo.nombre.includes("40")
                      ? 40
                      : 20;

                    return (
                      <div
                        key={tipo.idTipoUnidad}
                        onClick={() => handleSelectTipo(tipo)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-gray-900 leading-tight">
                              {tipo.nombre.split("(")[0].trim()}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? "bg-primary text-white"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {seats} Asientos
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium line-clamp-2">
                            {tipo.descripcion || "Configuración para ruta interlocal"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Número y Placa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Número de Unidad
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 03 o U-15"
                    value={formNumero}
                    onChange={(e) => setFormNumero(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Placa de Circulación
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: M 345-987"
                    value={formPlaca}
                    onChange={(e) => setFormPlaca(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Previsualización en vivo del croquis de asientos a generarse */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon path={mdiCarSeat} size={0.7} className="text-primary" />
                    Croquis a Generar ({formCapacidad} Asientos)
                  </span>
                  <span className="text-[11px] text-gray-400 font-semibold">
                    Generación secuencial #1 al #{formCapacidad}
                  </span>
                </div>

                {/* Gráfico del Microbús */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 max-w-sm mx-auto shadow-2xs">
                  {/* Cabina */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 text-gray-400">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                      <Icon path={mdiSteering} size={0.7} className="text-gray-500" />
                      Chofer
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Puerta
                    </span>
                  </div>

                  {/* Asientos en cuadrícula interactiva */}
                  <div
                    className={`grid gap-2 ${
                      formCapacidad === 15
                        ? "grid-cols-3"
                        : formCapacidad === 40
                        ? "grid-cols-4"
                        : "grid-cols-4"
                    }`}
                  >
                    {Array.from({ length: formCapacidad }, (_, i) => (
                      <div
                        key={i}
                        className="h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shadow-2xs"
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-center text-gray-400 font-medium mt-3">
                    Vista previa de mapa generado automáticamente al guardar
                  </p>
                </div>
              </div>

              {/* Footer de botones */}
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
                  {formSubmitting ? "Generando..." : "Confirmar y Generar Asientos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: VER CROQUIS DE ASIENTOS DE UNA UNIDAD EXISTENTE     */}
      {/* ============================================================ */}
      {showCroquisModal && selectedUnidad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiCarSeat} size={0.8} className="text-primary" />
                  Croquis - Unidad #{selectedUnidad.numeroUnidad}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Placa: {selectedUnidad.placa} | Modelo: {selectedUnidad.tipoUnidad?.nombre || "Estándar"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCroquisModal(false);
                  setSelectedUnidad(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.8} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Contenedor del autobús */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 max-w-sm mx-auto">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <Icon path={mdiSteering} size={0.8} className="text-gray-600" />
                    Cabina del Conductor
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                    Acceso
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {(selectedUnidad.asientos || []).map((asiento) => {
                    const isOcupado = asiento.estado === "OCUPADO";
                    return (
                      <div
                        key={asiento.idAsiento}
                        className={`h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs border transition-all ${
                          isOcupado
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {asiento.numero}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex items-center justify-center gap-6 text-xs font-bold text-gray-500 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-white border border-emerald-300"></span>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-red-100 border border-red-300"></span>
                  <span>Ocupado</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <button
                onClick={() => {
                  setShowCroquisModal(false);
                  setSelectedUnidad(null);
                }}
                className="w-full py-2.5 rounded-2xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CONFIRMACIÓN PARA ELIMINAR / DAR DE BAJA            */}
      {/* ============================================================ */}
      {showDeleteModal && selectedUnidad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Icon path={mdiAlertCircle} size={1.2} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-gray-900">¿Dar de baja esta unidad?</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Estás a punto de eliminar la Unidad #{selectedUnidad.numeroUnidad} (Placa: {selectedUnidad.placa}).
                Esta acción removerá sus asientos asociados.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUnidad(null);
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
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
