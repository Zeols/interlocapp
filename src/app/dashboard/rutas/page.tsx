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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabecera y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Icon path={mdiMapMarkerPath} size={1} className="text-primary" />
            Constructor de Rutas y Tarifas
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Definición secuencial de paradas intermedias, catálogo de modalidades y tarifas por tramo en Córdobas (C$).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón para registrar Tipo de Ruta en el catálogo */}
          <button
            onClick={() => {
              setTipoModalError(null);
              setShowCreateTipoModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl font-bold text-sm shadow-2xs transition-all cursor-pointer"
          >
            <Icon path={mdiTagOutline} size={0.8} className="text-primary" />
            + Tipo de Ruta
          </button>

          {/* Botón para crear nueva ruta */}
          <button
            onClick={() => {
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-95"
          >
            <Icon path={mdiPlus} size={0.8} />
            Crear Nueva Ruta
          </button>
        </div>
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
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <Icon path={mdiClose} size={0.7} />
          </button>
        </div>
      )}

      {/* Métricas Reales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rutas Totales</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <Icon path={mdiMapMarkerPath} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Rutas Activas</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{stats.activas}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon path={mdiCheckCircle} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Paradas Registradas</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{stats.puntosCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon path={mdiMapMarker} size={0.9} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Modalidades / Tipos</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{stats.tiposCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon path={mdiTagOutline} size={0.9} />
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Icon
            path={mdiMagnify}
            size={0.8}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre de ruta, parada o modalidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <Icon path={mdiClose} size={0.6} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(["TODOS", "ACTIVO", "INACTIVO"] as const).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab === "TODOS" ? "Todas" : tab === "ACTIVO" ? "Activas" : "Inactivas"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Rutas */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-400">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-gray-600">Cargando catálogo dinámico de rutas...</p>
          </div>
        ) : filteredRutas.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-300">
              <Icon path={mdiMapMarkerPath} size={1.4} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No se encontraron rutas</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "TODOS"
                ? "Intenta con otros términos de búsqueda."
                : "Crea tu primera ruta definiendo paradas intermedias, modalidad y tarifas por tramo."}
            </p>
          </div>
        ) : (
          filteredRutas.map((ruta) => {
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
                className="bg-white rounded-3xl border border-gray-100 shadow-xs p-5 sm:p-6 hover:border-gray-200 transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon path={mdiMapMarkerPath} size={0.9} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                          {ruta.nombre}
                        </h2>

                        {/* Modalidad dinámica (Tipo de Ruta) */}
                        {ruta.tipoRuta && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {ruta.tipoRuta.nombre}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            ruta.estado === "ACTIVO"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {ruta.estado}
                        </span>

                        <span className="text-xs font-semibold text-gray-400">
                          {ruta.cooperativa?.nombre || "Cooperativa"}
                        </span>
                      </div>
                      {ruta.descripcion && (
                        <p className="text-xs text-gray-500 font-medium mt-1">{ruta.descripcion}</p>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Icon path={mdiTableLarge} size={0.7} className="text-primary" />
                      Ver Matriz ({tarifasCount} Tarifas)
                    </button>

                    <button
                      onClick={() => handleToggleEstado(ruta.idRuta, ruta.estado)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        ruta.estado === "ACTIVO"
                          ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {ruta.estado === "ACTIVO" ? "Pausar" : "Activar"}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRuta(ruta);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Icon path={mdiTrashCanOutline} size={0.8} />
                    </button>
                  </div>
                </div>

                {/* Secuencia visual de paradas */}
                <div className="pt-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Secuencia de Paradas Intermedias ({paradasOrdenadas.length} Estaciones)
                  </p>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {paradasOrdenadas.map((punto, idx) => (
                      <React.Fragment key={idx}>
                        <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              idx === 0
                                ? "bg-emerald-600 text-white"
                                : idx === paradasOrdenadas.length - 1
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span>{punto}</span>
                        </div>
                        {idx < paradasOrdenadas.length - 1 && (
                          <Icon path={mdiArrowRight} size={0.6} className="text-gray-300 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Resumen de Tarifas */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 pt-1">
                    <span>
                      Tarifa Mínima: <strong className="text-gray-900 font-black">C$ {tarifaMinima.toFixed(2)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Tramo Completo: <strong className="text-gray-900 font-black">C$ {tarifaMaxima.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: FORMULARIO REGISTRAR TIPO DE RUTA                   */}
      {/* ============================================================ */}
      {showCreateTipoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiTagOutline} size={0.8} className="text-primary" />
                  Registrar Tipo de Ruta
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Agrega una nueva modalidad de servicio al catálogo de rutas.
                </p>
              </div>
              <button
                onClick={() => setShowCreateTipoModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.8} />
              </button>
            </div>

            <form onSubmit={handleCreateTipoRuta} className="p-6 space-y-4">
              {tipoModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.8} />
                  <span>{tipoModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nombre de la Modalidad
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Expreso Nocturno, Rutero Interurbano..."
                  value={newTipoNombre}
                  onChange={(e) => setNewTipoNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Descripción del Servicio (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Servicio directo con aire acondicionado sin paradas intermedias..."
                  value={newTipoDescripcion}
                  onChange={(e) => setNewTipoDescripcion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Lista actual del catálogo */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Tipos ya registrados ({tiposRuta.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tiposRuta.map((t) => (
                    <span
                      key={t.idTipoRuta}
                      className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold text-gray-700"
                    >
                      {t.nombre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTipoModal(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTipo}
                  className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingTipo && (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiMapMarkerPath} size={0.8} className="text-primary" />
                  Constructor de Ruta y Tarifas
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Modalidad de servicio, secuencia de paradas y tarifas por tramo en Córdobas (C$).
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.8} />
              </button>
            </div>

            <form onSubmit={handleCreateRuta} className="p-6 space-y-6 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <Icon path={mdiAlertCircle} size={0.8} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Paso 1: Datos de la Ruta */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  1. Información de la Ruta
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nombre de la Ruta
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Managua UCA - Rivas - San Juan del Sur"
                      value={formNombre}
                      onChange={(e) => setFormNombre(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Cooperativa */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Cooperativa
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
                </div>

                {/* Modalidad de ruta (Cargada dinámicamente) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Modalidad / Tipo de Ruta
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoModalError(null);
                          setShowCreateTipoModal(true);
                        }}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        + Registrar nuevo tipo
                      </button>
                    </div>
                    <select
                      value={formIdTipoRuta}
                      onChange={(e) => setFormIdTipoRuta(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Descripción del Trayecto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Salidas directas cada 30 minutos"
                      value={formDescripcion}
                      onChange={(e) => setFormDescripcion(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Paso 2: Secuenciador de Paradas Intermedias */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                    2. Paradas y Trayecto (Mínimo 2 Paradas)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowNewPuntoInput(!showNewPuntoInput)}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {showNewPuntoInput ? "Cancelar nueva parada" : "+ Registrar nueva parada al catálogo"}
                  </button>
                </div>

                {showNewPuntoInput && (
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center gap-3 animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="Nombre de la nueva parada (ej: Nandaime Central)"
                      value={newPuntoNombre}
                      onChange={(e) => setNewPuntoNombre(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNuevoPunto}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-primary-hover cursor-pointer"
                    >
                      Guardar y Añadir
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-500">Añadir parada:</span>
                  <select
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) {
                        handleAddPuntoToSecuencia(id);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
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

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2">
                  {selectedPuntosIds.length === 0 ? (
                    <p className="text-xs text-gray-400 font-semibold text-center py-4">
                      Aún no has agregado paradas. Selecciona al menos un origen y un destino.
                    </p>
                  ) : (
                    selectedPuntosIds.map((pId, idx) => {
                      const puntoObj = catalogoPuntos.find((p) => p.idPunto === pId);
                      return (
                        <div
                          key={pId}
                          className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                idx === 0
                                  ? "bg-emerald-600 text-white"
                                  : idx === selectedPuntosIds.length - 1
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-extrabold text-gray-900 leading-none">
                                {puntoObj?.nombre || "Parada"}
                              </p>
                              <span className="text-[10px] text-gray-400 font-semibold">
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
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                            >
                              <Icon path={mdiArrowUp} size={0.6} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePunto(idx, "down")}
                              disabled={idx === selectedPuntosIds.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                            >
                              <Icon path={mdiArrowDown} size={0.6} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePunto(idx)}
                              className="p-1 text-red-400 hover:text-red-600 cursor-pointer ml-1"
                            >
                              <Icon path={mdiClose} size={0.6} />
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
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                      3. Matriz Tarifaria en Córdobas (C$)
                    </h4>
                    <span className="text-xs font-bold text-gray-500">
                      {tramosGenerados.length} tramos generados
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 font-bold uppercase text-gray-400">
                        <tr>
                          <th className="py-2.5 px-4">Tramo de Trayecto</th>
                          <th className="py-2.5 px-4 w-40 text-right">Tarifa (C$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold">
                        {tramosGenerados.map((tramo) => (
                          <tr key={tramo.key} className="hover:bg-gray-50/50">
                            <td className="py-3 px-4 flex items-center gap-2">
                              <span className="font-bold text-gray-900">{tramo.origenNombre}</span>
                              <Icon path={mdiArrowRight} size={0.5} className="text-gray-400" />
                              <span className="font-bold text-gray-900">{tramo.destinoNombre}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-extrabold text-gray-400 text-xs">C$</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  required
                                  value={tarifaValores[tramo.key] ?? 50}
                                  onChange={(e) =>
                                    handleTarifaChange(tramo.key, Number(e.target.value))
                                  }
                                  className="w-24 px-3 py-1.5 text-right font-black text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  disabled={formSubmitting || selectedPuntosIds.length < 2}
                  className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {formSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiTableLarge} size={0.8} className="text-primary" />
                  Matriz Tarifaria: {selectedRuta.nombre}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Modalidad: {selectedRuta.tipoRuta?.nombre || "Estándar"} | Tarifas oficiales en C$.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMatrixModal(false);
                  setSelectedRuta(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Icon path={mdiClose} size={0.8} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold uppercase text-gray-400 bg-gray-50/75">
                    <th className="py-3 px-4">Origen</th>
                    <th className="py-3 px-4">Destino</th>
                    <th className="py-3 px-4 text-right">Tarifa Oficial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-xs sm:text-sm">
                  {(selectedRuta.tarifas || []).map((tarifa) => (
                    <tr key={tarifa.idTarifa} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-800">
                        {tarifa.puntoOrigen?.nombre || "Parada"}
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {tarifa.puntoDestino?.nombre || "Parada"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        C$ {Number(tarifa.monto).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <button
                onClick={() => {
                  setShowMatrixModal(false);
                  setSelectedRuta(null);
                }}
                className="w-full py-2.5 rounded-2xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Icon path={mdiAlertCircle} size={1.2} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-gray-900">¿Eliminar esta ruta?</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Estás a punto de eliminar la ruta &quot;{selectedRuta.nombre}&quot; junto a sus paradas y tarifas asociadas.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRuta(null);
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
