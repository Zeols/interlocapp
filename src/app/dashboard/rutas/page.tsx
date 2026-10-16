"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiMapMarkerPath,
  mdiMapMarker,
  mdiArrowRight,
  mdiCurrencyUsd,
  mdiPlus,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiTrashCanOutline,
  mdiMagnify,
  mdiClose,
  mdiArrowUp,
  mdiArrowDown,
  mdiTableLarge,
  mdiEyeOutline,
  mdiTagOutline,
  mdiBusDoubleDecker,
} from "@mdi/js";
import {
  getAllRutasAction,
  getPuntos,
  createPunto,
  createRutaConPuntosYTarifas,
  updateEstadoRutaAction,
  deleteRutaAction,
  getTiposRutaAction,
  createTipoRutaAction,
} from "@/backend/actions/rutas";
import { getCooperativas } from "@/backend/actions/cooperativas";
import { TableSkeleton } from "@/frontend/components/ui/Skeleton";
import { Pagination } from "@/frontend/components/ui/Pagination";

interface TipoRutaItem {
  idTipoRuta: number;
  nombre: string;
  descripcion?: string | null;
}

interface PuntoItem {
  idPunto: number;
  nombre: string;
  descripcion?: string | null;
}

interface TarifaItem {
  idTarifa: number;
  idPuntoOrigen: number | null;
  idPuntoDestino: number | null;
  monto: any;
  puntoOrigen?: PuntoItem | null;
  puntoDestino?: PuntoItem | null;
}

interface PuntoRutaItem {
  idPuntoRuta: number;
  idPunto: number;
  orden: number;
  punto: PuntoItem;
}

interface RutaItem {
  idRuta: number;
  idCooperativa: number;
  idTipoRuta?: number | null;
  nombre: string;
  descripcion?: string | null;
  estado: "ACTIVO" | "INACTIVO";
  tipoRuta?: TipoRutaItem | null;
  cooperativa?: {
    idCooperativa: number;
    nombre: string;
  };
  puntosRuta: PuntoRutaItem[];
  tarifas: TarifaItem[];
  _count?: {
    viajes: number;
  };
}

export default function RutasDashboardPage() {
  const [rutas, setRutas] = useState<RutaItem[]>([]);
  const [catalogoPuntos, setCatalogoPuntos] = useState<PuntoItem[]>([]);
  const [tiposRuta, setTiposRuta] = useState<TipoRutaItem[]>([]);
  const [cooperativas, setCooperativas] = useState<{ idCooperativa: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateTipoModal, setShowCreateTipoModal] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNewPuntoInput, setShowNewPuntoInput] = useState(false);

  // Ruta seleccionada para inspección
  const [selectedRuta, setSelectedRuta] = useState<RutaItem | null>(null);

  // Formulario Constructor de Ruta
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formCoopId, setFormCoopId] = useState<number>(0);
  const [formIdTipoRuta, setFormIdTipoRuta] = useState<number>(0);
  const [selectedPuntosIds, setSelectedPuntosIds] = useState<number[]>([]);
  const [tarifaValores, setTarifaValores] = useState<Record<string, number>>({});
  const [newPuntoNombre, setNewPuntoNombre] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Formulario Nuevo Tipo de Ruta
  const [newTipoNombre, setNewTipoNombre] = useState("");
  const [newTipoDescripcion, setNewTipoDescripcion] = useState("");
  const [submittingTipo, setSubmittingTipo] = useState(false);
  const [tipoModalError, setTipoModalError] = useState<string | null>(null);

  // Feedback y estado
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRutas, resPuntos, resCoops, resTipos] = await Promise.all([
        getAllRutasAction(),
        getPuntos(),
        getCooperativas(),
        getTiposRutaAction(),
      ]);

      if (resRutas.success && resRutas.data) {
        setRutas(resRutas.data as any);
      }
      if (resPuntos.success && resPuntos.data) {
        setCatalogoPuntos(resPuntos.data);
      }
      if (resTipos.success && resTipos.data) {
        setTiposRuta(resTipos.data);
        if (resTipos.data.length > 0 && formIdTipoRuta === 0) {
          setFormIdTipoRuta(resTipos.data[0].idTipoRuta);
        }
      }
      if (resCoops.success && resCoops.data) {
        setCooperativas(resCoops.data as any);
        if (resCoops.data.length > 0 && formCoopId === 0) {
          setFormCoopId(resCoops.data[0].idCooperativa);
        }
      }
    } catch (err) {
      console.error("Error al cargar rutas y tarifas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado reactivo de rutas
  const filteredRutas = useMemo(() => {
    return rutas.filter((r) => {
      const matchSearch =
        r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.tipoRuta?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.puntosRuta.some((pr) => pr.punto.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === "TODOS" || r.estado === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rutas, searchTerm, statusFilter]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredRutas.length / pageSize) || 1;
  const paginatedRutas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRutas.slice(start, start + pageSize);
  }, [filteredRutas, currentPage, pageSize]);

  // Contadores
  const stats = useMemo(() => {
    const totalTarifas = rutas.reduce((acc, r) => acc + (r.tarifas?.length || 0), 0);
    return {
      total: rutas.length,
      activas: rutas.filter((r) => r.estado === "ACTIVO").length,
      puntosCount: catalogoPuntos.length,
      tiposCount: tiposRuta.length,
      totalTarifas,
    };
  }, [rutas, catalogoPuntos, tiposRuta]);

  // Manejo de secuencias de paradas en el constructor
  const handleAddPuntoToSecuencia = (idPunto: number) => {
    if (!selectedPuntosIds.includes(idPunto)) {
      setSelectedPuntosIds([...selectedPuntosIds, idPunto]);
    }
  };

  const handleRemovePunto = (index: number) => {
    setSelectedPuntosIds(selectedPuntosIds.filter((_, i) => i !== index));
  };

  const handleMovePunto = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === selectedPuntosIds.length - 1)
    ) {
      return;
    }
    const newArr = [...selectedPuntosIds];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    setSelectedPuntosIds(newArr);
  };

  // Crear nuevo punto al vuelo
  const handleCreateNuevoPunto = async () => {
    if (!newPuntoNombre.trim()) return;
    try {
      const res = await createPunto({ nombre: newPuntoNombre.trim() });
      if (res.success && res.data) {
        setCatalogoPuntos((prev) => [...prev, res.data]);
        setSelectedPuntosIds((prev) => [...prev, res.data.idPunto]);
        setNewPuntoNombre("");
        setShowNewPuntoInput(false);
      }
    } catch (err) {
      console.error("Error al crear punto:", err);
    }
  };

  // Crear nuevo tipo de ruta
  const handleCreateTipoRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    setTipoModalError(null);

    if (!newTipoNombre.trim()) {
      setTipoModalError("El nombre del tipo de ruta es obligatorio.");
      return;
    }

    setSubmittingTipo(true);
    try {
      const res = await createTipoRutaAction(
        newTipoNombre.trim(),
        newTipoDescripcion.trim() || undefined
      );

      if (res.success && res.data) {
        setTiposRuta((prev) => [...prev, res.data]);
        setFormIdTipoRuta(res.data.idTipoRuta);
        setNewTipoNombre("");
        setNewTipoDescripcion("");
        setShowCreateTipoModal(false);
        setFeedbackMsg({
          type: "success",
          text: `Tipo de ruta "${res.data.nombre}" registrado exitosamente en el catálogo.`,
        });
      } else {
        setTipoModalError(res.error || "No se pudo registrar el tipo de ruta.");
      }
    } catch {
      setTipoModalError("Error al conectar con el servidor.");
    } finally {
      setSubmittingTipo(false);
    }
  };

  // Generar pares de tramos para la matriz de tarifas
  const tramosGenerados = useMemo(() => {
    const tramos: {
      origenId: number;
      destinoId: number;
      origenNombre: string;
      destinoNombre: string;
      key: string;
    }[] = [];
    if (selectedPuntosIds.length < 2) return tramos;

    const puntosObj = selectedPuntosIds
      .map((id) => catalogoPuntos.find((p) => p.idPunto === id))
      .filter(Boolean) as PuntoItem[];

    for (let i = 0; i < puntosObj.length; i++) {
      for (let j = i + 1; j < puntosObj.length; j++) {
        tramos.push({
          origenId: puntosObj[i].idPunto,
          destinoId: puntosObj[j].idPunto,
          origenNombre: puntosObj[i].nombre,
          destinoNombre: puntosObj[j].nombre,
          key: `${puntosObj[i].idPunto}-${puntosObj[j].idPunto}`,
        });
      }
    }
    return tramos;
  }, [selectedPuntosIds, catalogoPuntos]);

  const handleTarifaChange = (key: string, valor: number) => {
    setTarifaValores((prev) => ({
      ...prev,
      [key]: valor,
    }));
  };

  // Guardar nueva ruta
  const handleCreateRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formNombre.trim()) {
      setFormError("Por favor ingresa un nombre para la ruta.");
      return;
    }
    if (selectedPuntosIds.length < 2) {
      setFormError("Debes secuenciar al menos 2 paradas (Origen y Destino).");
      return;
    }
    if (formCoopId === 0) {
      setFormError("Debes seleccionar una cooperativa operadora.");
      return;
    }

    // Armar tarifas validadas
    const tarifasPayload = tramosGenerados.map((t) => ({
      idPuntoOrigen: t.origenId,
      idPuntoDestino: t.destinoId,
      monto: Number(tarifaValores[t.key]) || 50,
    }));

    setFormSubmitting(true);
    try {
      const res = await createRutaConPuntosYTarifas({
        idCooperativa: formCoopId,
        idTipoRuta: formIdTipoRuta || undefined,
        nombre: formNombre.trim(),
        descripcion: formDescripcion.trim() || undefined,
        puntosIds: selectedPuntosIds,
        tarifas: tarifasPayload,
      });

      if (res.success) {
        setShowCreateModal(false);
        setFormNombre("");
        setFormDescripcion("");
        setSelectedPuntosIds([]);
        setTarifaValores({});
        setFeedbackMsg({
          type: "success",
          text: "Nueva ruta y matriz tarifaria registradas con éxito.",
        });
        await fetchData();
      } else {
        setFormError(res.error || "No se pudo crear la ruta.");
      }
    } catch (err: any) {
      setFormError(err.message || "Error al conectar con el servidor.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Alternar estado de ruta
  const handleToggleEstado = async (idRuta: number, estadoActual: "ACTIVO" | "INACTIVO") => {
    const nuevoEstado = estadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    setUpdatingId(idRuta);
    try {
      const res = await updateEstadoRutaAction(idRuta, nuevoEstado);
      if (res.success) {
        setRutas((prev) =>
          prev.map((r) => (r.idRuta === idRuta ? { ...r, estado: nuevoEstado } : r))
        );
        setFeedbackMsg({
          type: "success",
          text: `Ruta ${nuevoEstado === "ACTIVO" ? "activada" : "desactivada"} exitosamente.`,
        });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error al actualizar estado de la ruta." });
    } finally {
      setUpdatingId(null);
    }
  };

  // Eliminar ruta
  const handleConfirmDelete = async () => {
    if (!selectedRuta) return;
    setUpdatingId(selectedRuta.idRuta);
    try {
      const res = await deleteRutaAction(selectedRuta.idRuta);
      if (res.success) {
        setRutas((prev) => prev.filter((r) => r.idRuta !== selectedRuta.idRuta));
        setFeedbackMsg({
          type: "success",
          text: `Ruta ${selectedRuta.nombre} eliminada correctamente.`,
        });
        setShowDeleteModal(false);
        setSelectedRuta(null);
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "No se pudo eliminar la ruta." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error de red al eliminar la ruta." });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabecera y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiMapMarkerPath} size={0.9} className="text-primary" />
            Constructor de Rutas y Tarifas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Definición secuencial de paradas intermedias, catálogo de modalidades y tarifas por tramo en Córdobas (C$).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón para registrar Tipo de Ruta en el catálogo */}
          <button
            onClick={() => {
              setTipoModalError(null);
              setShowCreateTipoModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <Icon path={mdiTagOutline} size={0.7} className="text-slate-500" />
            + Tipo de Ruta
          </button>

          {/* Botón para crear nueva ruta */}
          <button
            onClick={() => {
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Icon path={mdiPlus} size={0.7} />
            Crear Nueva Ruta
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

      {/* Métricas con diseño neutral y acentos del sistema */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rutas Totales</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiMapMarkerPath} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rutas Activas</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.activas}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiCheckCircle} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paradas</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.puntosCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiMapMarker} size={0.8} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Modalidades</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">{stats.tiposCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Icon path={mdiTagOutline} size={0.8} />
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Icon
            path={mdiMagnify}
            size={0.7}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre de ruta, parada o modalidad..."
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

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
          {(["TODOS", "ACTIVO", "INACTIVO"] as const).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "TODOS" ? "Todas" : tab === "ACTIVO" ? "Activas" : "Inactivas"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Rutas */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="mb-3 px-1">
              <div className="h-4 w-40 bg-slate-200/80 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-64 bg-slate-200/60 rounded animate-pulse"></div>
            </div>
            <TableSkeleton rows={5} cols={4} />
          </div>
        ) : filteredRutas.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2.5 text-slate-400">
              <Icon path={mdiMapMarkerPath} size={1} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No se encontraron rutas</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "TODOS"
                ? "Intenta con otros términos de búsqueda."
                : "Crea tu primera ruta definiendo paradas intermedias, modalidad y tarifas por tramo."}
            </p>
          </div>
        ) : (
          paginatedRutas.map((ruta) => {
            const paradasOrdenadas = (ruta.puntosRuta || []).map((pr) => pr.punto?.nombre || "");
            const tarifasCount = ruta.tarifas?.length || 0;
            const tarifaMinima = ruta.tarifas?.[0]?.monto ? Number(ruta.tarifas[0].monto) : 0;
            const tarifaMaxima =
              ruta.tarifas && ruta.tarifas.length > 0
                ? Math.max(...ruta.tarifas.map((t) => Number(t.monto)))
                : 0;

            return (
              <div
                key={ruta.idRuta}
                className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                      <Icon path={mdiMapMarkerPath} size={0.75} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                          {ruta.nombre}
                        </h2>

                        {/* Modalidad dinámica (Tipo de Ruta) */}
                        {ruta.tipoRuta && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {ruta.tipoRuta.nombre}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            ruta.estado === "ACTIVO"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {ruta.estado === "ACTIVO" ? "Activa" : "Inactiva"}
                        </span>

                        <span className="text-xs text-slate-400 font-normal">
                          {ruta.cooperativa?.nombre || "Cooperativa"}
                        </span>
                      </div>
                      {ruta.descripcion && (
                        <p className="text-xs text-slate-500 font-normal mt-0.5">{ruta.descripcion}</p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 self-end lg:self-auto">
                    <button
                      onClick={() => {
                        setSelectedRuta(ruta);
                        setShowMatrixModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Icon path={mdiTableLarge} size={0.65} className="text-slate-500" />
                      Matriz ({tarifasCount} Tarifas)
                    </button>

                    <button
                      onClick={() => handleToggleEstado(ruta.idRuta, ruta.estado)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        ruta.estado === "ACTIVO"
                          ? "border-amber-200 text-amber-800 hover:bg-amber-50"
                          : "border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                      }`}
                    >
                      {ruta.estado === "ACTIVO" ? "Pausar" : "Activar"}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRuta(ruta);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Icon path={mdiTrashCanOutline} size={0.7} />
                    </button>
                  </div>
                </div>

                {/* Secuencia visual de paradas */}
                <div className="pt-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Paradas del trayecto ({paradasOrdenadas.length} Estaciones)
                  </p>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {paradasOrdenadas.map((punto, idx) => (
                      <React.Fragment key={idx}>
                        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 text-slate-700">
                            {idx + 1}
                          </span>
                          <span>{punto}</span>
                        </div>
                        {idx < paradasOrdenadas.length - 1 && (
                          <Icon path={mdiArrowRight} size={0.5} className="text-slate-300 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Resumen de Tarifas */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span>
                      Tarifa Mínima: <strong className="text-slate-900 font-semibold">C$ {tarifaMinima.toFixed(2)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Tramo Completo: <strong className="text-slate-900 font-semibold">C$ {tarifaMaxima.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Paginación */}
        {!loading && filteredRutas.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRutas.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: FORMULARIO REGISTRAR TIPO DE RUTA                   */}
      {/* ============================================================ */}
      {showCreateTipoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiTagOutline} size={0.75} className="text-slate-700" />
                  Registrar Tipo de Ruta
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Agrega una nueva modalidad de servicio al catálogo de rutas.
                </p>
              </div>
              <button
                onClick={() => setShowCreateTipoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <form onSubmit={handleCreateTipoRuta} className="p-5 space-y-3.5">
              {tipoModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.7} />
                  <span>{tipoModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de la Modalidad
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Expreso Nocturno, Rutero Interurbano..."
                  value={newTipoNombre}
                  onChange={(e) => setNewTipoNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción del Servicio (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Servicio directo con aire acondicionado sin paradas intermedias..."
                  value={newTipoDescripcion}
                  onChange={(e) => setNewTipoDescripcion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 resize-none"
                />
              </div>

              {/* Lista actual del catálogo */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Tipos ya registrados ({tiposRuta.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tiposRuta.map((t) => (
                    <span
                      key={t.idTipoRuta}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                    >
                      {t.nombre}
                    </span>
                  ))}
                </div>
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
                  {submittingTipo ? "Guardando..." : "Guardar Modalidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CONSTRUCTOR DE RUTA Y MATRIZ TARIFARIA              */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiMapMarkerPath} size={0.75} className="text-slate-700" />
                  Constructor de Ruta y Tarifas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modalidad de servicio, secuencia de paradas y tarifas por tramo en Córdobas (C$).
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <form onSubmit={handleCreateRuta} className="p-5 space-y-5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.7} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Paso 1: Datos de la Ruta */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  1. Información de la Ruta
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Nombre de la Ruta
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Managua UCA - Rivas - San Juan del Sur"
                      value={formNombre}
                      onChange={(e) => setFormNombre(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                    />
                  </div>

                  {/* Cooperativa */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Cooperativa
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
                </div>

                {/* Modalidad de ruta (Cargada dinámicamente) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Modalidad / Tipo de Ruta
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoModalError(null);
                          setShowCreateTipoModal(true);
                        }}
                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        + Registrar nuevo tipo
                      </button>
                    </div>
                    <select
                      value={formIdTipoRuta}
                      onChange={(e) => setFormIdTipoRuta(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                    >
                      <option value={0}>Selecciona una modalidad del catálogo...</option>
                      {tiposRuta.map((tr) => (
                        <option key={tr.idTipoRuta} value={tr.idTipoRuta}>
                          {tr.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Descripción del Trayecto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Salidas directas cada 30 minutos"
                      value={formDescripcion}
                      onChange={(e) => setFormDescripcion(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                    />
                  </div>
                </div>
              </div>

              {/* Paso 2: Secuenciador de Paradas Intermedias */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    2. Paradas y Trayecto (Mínimo 2 Paradas)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowNewPuntoInput(!showNewPuntoInput)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    {showNewPuntoInput ? "Cancelar nueva parada" : "+ Registrar nueva parada al catálogo"}
                  </button>
                </div>

                {showNewPuntoInput && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Nombre de la nueva parada (ej: Nandaime Central)"
                      value={newPuntoNombre}
                      onChange={(e) => setNewPuntoNombre(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNuevoPunto}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 cursor-pointer"
                    >
                      Guardar y Añadir
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">Añadir parada:</span>
                  <select
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) {
                        handleAddPuntoToSecuencia(id);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  >
                    <option value="" disabled>
                      Selecciona una parada del catálogo...
                    </option>
                    {catalogoPuntos.map((p) => (
                      <option
                        key={p.idPunto}
                        value={p.idPunto}
                        disabled={selectedPuntosIds.includes(p.idPunto)}
                      >
                        {p.nombre} {selectedPuntosIds.includes(p.idPunto) ? "(Ya añadida)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                  {selectedPuntosIds.length === 0 ? (
                    <p className="text-xs text-slate-400 font-normal text-center py-4">
                      Aún no has agregado paradas. Selecciona al menos un origen y un destino.
                    </p>
                  ) : (
                    selectedPuntosIds.map((pId, idx) => {
                      const puntoObj = catalogoPuntos.find((p) => p.idPunto === pId);
                      return (
                        <div
                          key={pId}
                          className="bg-white p-2.5 rounded-md border border-slate-200 flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 text-slate-700">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-slate-900 leading-none">
                                {puntoObj?.nombre || "Parada"}
                              </p>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {idx === 0
                                  ? "Punto de Partida (Origen)"
                                  : idx === selectedPuntosIds.length - 1
                                  ? "Terminal de Llegada (Destino)"
                                  : "Parada Intermedia"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMovePunto(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            >
                              <Icon path={mdiArrowUp} size={0.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePunto(idx, "down")}
                              disabled={idx === selectedPuntosIds.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            >
                              <Icon path={mdiArrowDown} size={0.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePunto(idx)}
                              className="p-1 text-red-400 hover:text-red-600 cursor-pointer ml-1"
                            >
                              <Icon path={mdiClose} size={0.5} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Paso 3: Matriz Tarifaria Generada */}
              {tramosGenerados.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      3. Matriz Tarifaria en Córdobas (C$)
                    </h4>
                    <span className="text-xs font-normal text-slate-500">
                      {tramosGenerados.length} tramos generados
                    </span>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Tramo de Trayecto</th>
                          <th className="py-2.5 px-3 w-36 text-right">Tarifa (C$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tramosGenerados.map((tramo) => (
                          <tr key={tramo.key} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 flex items-center gap-1.5">
                              <span className="font-medium text-slate-900">{tramo.origenNombre}</span>
                              <Icon path={mdiArrowRight} size={0.4} className="text-slate-400" />
                              <span className="font-medium text-slate-900">{tramo.destinoNombre}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-medium text-slate-400 text-xs">C$</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  required
                                  value={tarifaValores[tramo.key] ?? 50}
                                  onChange={(e) =>
                                    handleTarifaChange(tramo.key, Number(e.target.value))
                                  }
                                  className="w-20 px-2 py-1 text-right font-semibold text-xs sm:text-sm rounded border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
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
                  disabled={formSubmitting || selectedPuntosIds.length < 2}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {formSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  {formSubmitting ? "Registrando..." : "Guardar Ruta y Matriz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: VER MATRIZ TARIFARIA COMPLETA                       */}
      {/* ============================================================ */}
      {showMatrixModal && selectedRuta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiTableLarge} size={0.75} className="text-slate-700" />
                  Matriz Tarifaria: {selectedRuta.nombre}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modalidad: {selectedRuta.tipoRuta?.nombre || "Estándar"} | Tarifas oficiales en C$.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMatrixModal(false);
                  setSelectedRuta(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50/75">
                    <th className="py-2.5 px-3">Origen</th>
                    <th className="py-2.5 px-3">Destino</th>
                    <th className="py-2.5 px-3 text-right">Tarifa Oficial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedRuta.tarifas || []).map((tarifa) => (
                    <tr key={tarifa.idTarifa} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-800">
                        {tarifa.puntoOrigen?.nombre || "Parada"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        {tarifa.puntoDestino?.nombre || "Parada"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        C$ {Number(tarifa.monto).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => {
                  setShowMatrixModal(false);
                  setSelectedRuta(null);
                }}
                className="w-full py-2 rounded-lg bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar Matriz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: CONFIRMAR ELIMINACIÓN DE RUTA                       */}
      {/* ============================================================ */}
      {showDeleteModal && selectedRuta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Icon path={mdiAlertCircle} size={1} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">¿Eliminar esta ruta?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Estás a punto de eliminar la ruta &quot;{selectedRuta.nombre}&quot; junto a sus paradas y tarifas asociadas.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRuta(null);
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
    </div>
  );
}


