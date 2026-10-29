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
  mdiTagOutline,
  mdiDomain,
} from "@mdi/js";
import {
  getAllUnidadesAction,
  getTiposUnidadAction,
  createUnidadWithAsientos,
  updateEstadoUnidadAction,
  deleteUnidadAction,
  createTipoUnidad,
} from "@/backend/actions/unidades";
import { getCooperativas } from "@/backend/actions/cooperativas";
import { TableSkeleton } from "@/frontend/components/ui/Skeleton";
import { Pagination } from "@/frontend/components/ui/Pagination";
import { useTenant } from "@/frontend/context/TenantContext";

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
  const { selectedCoopId, isSuperAdmin, selectedCoop } = useTenant();
  const [unidades, setUnidades] = useState<UnidadItem[]>([]);
  const [tiposUnidad, setTiposUnidad] = useState<TipoUnidadItem[]>([]);
  const [cooperativas, setCooperativas] = useState<CooperativaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateTipoModal, setShowCreateTipoModal] = useState(false);
  const [showCroquisModal, setShowCroquisModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Formulario de nuevo Tipo de Unidad
  const [tipoNombre, setTipoNombre] = useState("");
  const [tipoDescripcion, setTipoDescripcion] = useState("");
  const [submittingTipo, setSubmittingTipo] = useState(false);
  const [tipoModalError, setTipoModalError] = useState<string | null>(null);

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

  const handleCreateTipoUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoNombre.trim()) {
      setTipoModalError("El nombre del tipo de unidad es obligatorio.");
      return;
    }
    setSubmittingTipo(true);
    setTipoModalError(null);
    try {
      const res = await createTipoUnidad(tipoNombre.trim(), tipoDescripcion.trim() || undefined);
      if (res.success && res.data) {
        setTiposUnidad((prev) => [...prev, res.data]);
        setFormTipoId(res.data.idTipoUnidad);
        setShowCreateTipoModal(false);
        setTipoNombre("");
        setTipoDescripcion("");
        setFeedbackMsg({
          type: "success",
          text: `Tipo de unidad "${res.data.nombre}" registrado en el catálogo.`,
        });
      } else {
        setTipoModalError(res.error || "No se pudo registrar el tipo de unidad.");
      }
    } catch {
      setTipoModalError("Error al procesar la solicitud en el servidor.");
    } finally {
      setSubmittingTipo(false);
    }
  };

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

  // Unidades filtradas por tenant (cooperativa activa)
  const tenantUnidades = useMemo(() => {
    if (selectedCoopId === "ALL") return unidades;
    return unidades.filter((u) => u.idCooperativa === Number(selectedCoopId));
  }, [unidades, selectedCoopId]);

  // Filtrado reactivo por texto y estado
  const filteredUnidades = useMemo(() => {
    return tenantUnidades.filter((u) => {
      const matchSearch =
        u.numeroUnidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.tipoUnidad?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.cooperativa?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "TODOS" || u.estado === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tenantUnidades, searchTerm, statusFilter]);

  // Reset de página al cambiar filtros o tenant
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedCoopId]);

  const totalPages = Math.ceil(filteredUnidades.length / pageSize) || 1;
  const paginatedUnidades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnidades.slice(start, start + pageSize);
  }, [filteredUnidades, currentPage, pageSize]);

  // Contadores métricos de la cooperativa activa
  const stats = useMemo(() => {
    return {
      total: tenantUnidades.length,
      disponibles: tenantUnidades.filter((u) => u.estado === "DISPONIBLE").length,
      enRuta: tenantUnidades.filter((u) => u.estado === "EN_RUTA").length,
      mantenimiento: tenantUnidades.filter((u) => u.estado === "MANTENIMIENTO" || u.estado === "INOPERATIVA").length,
    };
  }, [tenantUnidades]);

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
    const targetCoopId = selectedCoopId !== "ALL" ? Number(selectedCoopId) : formCoopId;
    if (targetCoopId === 0) {
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
        idCooperativa: targetCoopId,
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
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "EN_RUTA":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "MANTENIMIENTO":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "INOPERATIVA":
        return "bg-red-50 text-red-800 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const showCoopColumn = isSuperAdmin && selectedCoopId === "ALL";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabecera y botón de acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiBus} size={0.9} className="text-primary" />
            Flota de Unidades {selectedCoop ? `(${selectedCoop.nombre})` : ""}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {selectedCoop
              ? `Gestión del parque vehicular registrado para ${selectedCoop.nombre}.`
              : "Catálogo e inventario de unidades de todas las cooperativas vinculadas."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón para registrar Tipo de Unidad en el catálogo */}
          <button
            onClick={() => {
              setTipoModalError(null);
              setShowCreateTipoModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <Icon path={mdiTagOutline} size={0.7} className="text-slate-500" />
            <span>Tipo de Unidad</span>
          </button>

          {/* Botón para registrar nueva unidad */}
          <button
            onClick={() => {
              setFormError(null);
              if (selectedCoopId !== "ALL") {
                setFormCoopId(Number(selectedCoopId));
              }
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Icon path={mdiPlus} size={0.7} />
            Registrar Nueva Unidad
          </button>
        </div>
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

      {/* Tarjetas de métricas de flota con diseño limpio y acentos del sistema */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Flota</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiBus} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Disponibles</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.disponibles}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiCheckCircle} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">En Ruta</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.enRuta}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiSteering} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Taller / Paro</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.mantenimiento}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiWrench} size={0.8} />
          </div>
        </div>
      </div>

      {/* Barra de búsqueda por placa y filtro combo box por estado */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Barra de búsqueda especializada para buscar por placa */}
        <div className="relative flex-1 max-w-md">
          <Icon
            path={mdiMagnify}
            size={0.7}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar unidad por placa (ej: M 321-456) o número..."
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

        {/* Combo box de estado de unidad */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-medium text-slate-500 shrink-0 hidden sm:inline-block">
            Estado Operativo:
          </label>
          <div className="relative min-w-[170px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 appearance-none pr-8 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 cursor-pointer transition-colors"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="DISPONIBLE">Disponibles</option>
              <option value="EN_RUTA">En Ruta</option>
              <option value="MANTENIMIENTO">En Mantenimiento</option>
              <option value="INOPERATIVA">Inoperativas</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {(searchTerm || statusFilter !== "TODOS") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("TODOS");
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenedor principal: Lista o Tabla de unidades */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : filteredUnidades.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2.5 text-slate-400">
              <Icon path={mdiBus} size={1} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No se encontraron unidades</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "TODOS"
                ? "Prueba a cambiar tus criterios de búsqueda o filtros seleccionados."
                : "Aún no hay microbuses registrados. Da de alta tu primera unidad para comenzar a operar."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Unidad</th>
                  {showCoopColumn && <th className="py-3 px-4">Cooperativa</th>}
                  <th className="py-3 px-4">Placa Oficial</th>
                  <th className="py-3 px-4">Tipo y Carrocería</th>
                  <th className="py-3 px-4 text-center">Capacidad</th>
                  <th className="py-3 px-4">Estado Operativo</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUnidades.map((unidad) => {
                  const isUpdating = updatingId === unidad.idUnidad;
                  const capacidadReal = unidad.asientos?.length || unidad._count?.asientos || 20;

                  return (
                    <tr
                      key={unidad.idUnidad}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Número de Unidad */}
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {unidad.numeroUnidad}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">
                            Unidad #{unidad.numeroUnidad}
                          </p>
                          <p className="text-[11px] font-normal text-slate-400 mt-0.5">
                            {unidad.tipoUnidad?.nombre || "Estándar"}
                          </p>
                        </div>
                      </td>

                      {/* Cooperativa vinculada (Vista Super Admin Global) */}
                      {showCoopColumn && (
                        <td className="py-3 px-4">
                          {unidad.cooperativa ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Icon path={mdiDomain} size={0.55} className="text-blue-500" />
                              {unidad.cooperativa.nombre}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin cooperativa</span>
                          )}
                        </td>
                      )}

                      {/* Placa estilo nicaragüense */}
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-block px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-800 font-semibold text-xs tracking-wider">
                          {unidad.placa}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 text-xs sm:text-sm">
                          {unidad.tipoUnidad?.nombre || "Interlocal Estándar"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">
                          {unidad.tipoUnidad?.descripcion || "Transporte interurbano"}
                        </p>
                      </td>

                      {/* Capacidad */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200">
                          <Icon path={mdiCarSeat} size={0.5} className="text-slate-400" />
                          {capacidadReal} asientos
                        </span>
                      </td>

                      {/* Selector de Estado Operativo */}
                      <td className="py-3 px-4">
                        <div className="relative inline-block">
                          <select
                            disabled={isUpdating}
                            value={unidad.estado}
                            onChange={(e) =>
                              handleUpdateEstado(unidad.idUnidad, e.target.value as EstadoUnidad)
                            }
                            className={`text-xs font-medium px-2.5 py-1 rounded-md border appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400/20 transition-all ${getBadgeStyle(
                              unidad.estado
                            )}`}
                          >
                            <option value="DISPONIBLE">Disponible</option>
                            <option value="EN_RUTA">En Ruta</option>
                            <option value="MANTENIMIENTO">Mantenimiento</option>
                            <option value="INOPERATIVA">Inoperativa</option>
                          </select>
                          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-70 text-[9px]">
                            ▼
                          </div>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Ver Croquis de Asientos"
                            onClick={() => {
                              setSelectedUnidad(unidad);
                              setShowCroquisModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Icon path={mdiEyeOutline} size={0.7} />
                          </button>

                          <button
                            title="Dar de baja / Eliminar"
                            onClick={() => {
                              setSelectedUnidad(unidad);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Icon path={mdiTrashCanOutline} size={0.7} />
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

        {/* Paginación */}
        {!loading && filteredUnidades.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUnidades.length}
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
      {/* MODAL 1: REGISTRAR NUEVA UNIDAD Y GENERAR ASIENTOS           */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header del modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiBus} size={0.75} className="text-slate-700" />
                  Registrar Nueva Unidad de Flota
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asigna la carrocería y el sistema autogenerará el croquis de asientos correspondiente.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            {/* Contenido con scroll */}
            <form onSubmit={handleCreateUnidad} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.7} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Cooperativa Asignada */}
              {selectedCoopId !== "ALL" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cooperativa Operadora
                  </label>
                  <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Icon path={mdiDomain} size={0.55} className="text-slate-500" />
                    {selectedCoop?.nombre || cooperativas.find((c) => c.idCooperativa === (selectedCoopId !== "ALL" ? Number(selectedCoopId) : formCoopId))?.nombre || "Cooperativa Asignada"}
                  </div>
                </div>
              ) : cooperativas.length > 1 ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cooperativa Operadora
                  </label>
                  <select
                    value={formCoopId}
                    onChange={(e) => setFormCoopId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  >
                    {cooperativas.map((c) => (
                      <option key={c.idCooperativa} value={c.idCooperativa}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Selector visual de tipo de carrocería */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tipo de Carrocería y Distribución
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-800"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold leading-tight">
                              {tipo.nombre.split("(")[0].trim()}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {seats} Asientos
                            </span>
                          </div>
                          <p className={`text-[11px] line-clamp-2 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                            {tipo.descripcion || "Configuración para ruta interlocal"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Número y Placa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Número de Unidad
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 03 o U-15"
                    value={formNumero}
                    onChange={(e) => setFormNumero(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Placa de Circulación
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: M 345-987"
                    value={formPlaca}
                    onChange={(e) => setFormPlaca(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal uppercase tracking-wider text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                </div>
              </div>

              {/* Previsualización en vivo del croquis de asientos a generarse */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon path={mdiCarSeat} size={0.65} className="text-slate-600" />
                    Croquis a Generar ({formCapacidad} Asientos)
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Generación secuencial #1 al #{formCapacidad}
                  </span>
                </div>

                {/* Gráfico del Microbús */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 max-w-sm mx-auto shadow-2xs">
                  {/* Cabina */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 text-slate-400">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Icon path={mdiSteering} size={0.6} className="text-slate-500" />
                      Chofer
                    </div>
                    <span className="text-[10px] font-medium uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      Puerta
                    </span>
                  </div>

                  {/* Asientos en cuadrícula interactiva */}
                  <div
                    className={`grid gap-1.5 ${
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
                        className="h-7 rounded bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-medium text-xs"
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-center text-slate-400 font-normal mt-2.5">
                    Vista previa de mapa generado automáticamente al guardar
                  </p>
                </div>
              </div>

              {/* Footer de botones */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiCarSeat} size={0.75} className="text-slate-700" />
                  Croquis - Unidad #{selectedUnidad.numeroUnidad}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placa: {selectedUnidad.placa} | Modelo: {selectedUnidad.tipoUnidad?.nombre || "Estándar"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCroquisModal(false);
                  setSelectedUnidad(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Contenedor del autobús */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-w-xs mx-auto">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Icon path={mdiSteering} size={0.65} className="text-slate-500" />
                    Cabina del Conductor
                  </div>
                  <span className="text-[10px] font-medium uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Acceso
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(selectedUnidad.asientos || []).map((asiento) => {
                    const isOcupado = asiento.estado === "OCUPADO";
                    return (
                      <div
                        key={asiento.idAsiento}
                        className={`h-8 rounded flex items-center justify-center font-semibold text-xs border transition-colors ${
                          isOcupado
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-white border-slate-300 text-slate-800 hover:border-slate-400"
                        }`}
                      >
                        {asiento.numero}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex items-center justify-center gap-5 text-xs font-medium text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-slate-300"></span>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-50 border border-red-200"></span>
                  <span>Ocupado</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => {
                  setShowCroquisModal(false);
                  setSelectedUnidad(null);
                }}
                className="w-full py-2 rounded-lg bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Icon path={mdiAlertCircle} size={1} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">¿Dar de baja esta unidad?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verifica los detalles del autobús antes de confirmar la baja de la flota.
              </p>
            </div>

            {/* Ficha estructurada Clave-Valor (Ley de Miller: chunking de información) */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider text-slate-600">
                Ficha Técnica de la Unidad
              </div>
              <div className="divide-y divide-slate-200/70">
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Número de Unidad:</span>
                  <span className="font-bold text-slate-900">Bus #{selectedUnidad.numeroUnidad}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Placa / Matrícula:</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedUnidad.placa}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Tipo de Carrocería:</span>
                  <span className="font-semibold text-slate-800">{selectedUnidad.tipoUnidad?.nombre || "Estándar"}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Cooperativa:</span>
                  <span className="font-semibold text-slate-800">{selectedUnidad.cooperativa?.nombre || "Cooperativa"}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3">
                  <span className="text-slate-500 font-medium">Asientos Físicos:</span>
                  <span className="font-bold text-slate-900">{selectedUnidad.asientos?.length || selectedUnidad._count?.asientos || "N/A"} puestos</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 leading-relaxed">
              <strong>Atención:</strong> Esta acción removerá permanentemente la unidad y sus croquis de asientos vinculados de la plataforma.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUnidad(null);
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
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REGISTRAR NUEVO TIPO DE UNIDAD (CARROCERÍA)           */}
      {/* ============================================================ */}
      {showCreateTipoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiTagOutline} size={0.75} className="text-primary" />
                  Nuevo Tipo de Unidad
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registra un modelo de carrocería en el catálogo de flota
                </p>
              </div>
              <button
                onClick={() => setShowCreateTipoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <form onSubmit={handleCreateTipoUnidad} className="p-5 space-y-4">
              {tipoModalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.7} className="text-red-500 shrink-0" />
                  <span>{tipoModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre del Tipo / Carrocería *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Microbús Toyota Coaster, Pullman Ejecutivo..."
                  value={tipoNombre}
                  onChange={(e) => setTipoNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción Operativa (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Distribución estándar para recorridos interurbanos directos..."
                  value={tipoDescripcion}
                  onChange={(e) => setTipoDescripcion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateTipoModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTipo}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingTipo && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  {submittingTipo ? "Guardando..." : "Guardar Tipo de Unidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
