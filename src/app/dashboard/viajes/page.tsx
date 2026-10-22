"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiBusDoubleDecker,
  mdiPlus,
  mdiRefresh,
  mdiMagnify,
  mdiClockOutline,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiClose,
  mdiCheck,
  mdiSteering,
  mdiAccountGroup,
  mdiMapMarkerRadius,
  mdiCarSeat,
  mdiAlert,
  mdiLoading,
  mdiArrowRight,
  mdiTicketConfirmationOutline,
} from "@mdi/js";
import { useTenant } from "@/frontend/context/TenantContext";
import { TableSkeleton } from "@/frontend/components/ui/Skeleton";
import {
  getViajesByCooperativa,
  createViaje,
  despacharViajeCompletoAction,
  finalizarViaje,
  cancelarViajeAction,
  getDatosParaDespachoAction,
  getManifiestoPasajerosAction,
  ViajeMonitorItem,
} from "@/backend/actions/viajes";

export default function SalidasViajesPage() {
  const { selectedCoopId, selectedCoop, isSuperAdmin } = useTenant();

  // Estados principales de datos
  const [viajes, setViajes] = useState<ViajeMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fechaFilter, setFechaFilter] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [verTodasLasFechas, setVerTodasLasFechas] = useState<boolean>(false);

  // Recursos de soporte para Despacho y Programación
  const [recursosDespacho, setRecursosDespacho] = useState<{
    unidades: any[];
    choferes: any[];
    ayudantes: any[];
    rutas: any[];
  }>({
    unidades: [],
    choferes: [],
    ayudantes: [],
    rutas: [],
  });

  // Modales
  const [showProgramarModal, setShowProgramarModal] = useState(false);
  const [showDespachoModal, setShowDespachoModal] = useState(false);
  const [showManifiestoModal, setShowManifiestoModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);

  // Elemento seleccionado para operaciones
  const [viajeSeleccionado, setViajeSeleccionado] = useState<ViajeMonitorItem | null>(null);

  // Formulario: Programar Salida
  const [formRutaId, setFormRutaId] = useState<number | "">("");
  const [formFecha, setFormFecha] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formHora, setFormHora] = useState<string>("07:00");
  const [formSentido, setFormSentido] = useState<string>("IDA");
  const [guardandoViaje, setGuardandoViaje] = useState(false);
  const [errorProgramar, setErrorProgramar] = useState<string | null>(null);

  // Formulario: Autorizar Despacho
  const [despachoUnidadId, setDespachoUnidadId] = useState<number | "">("");
  const [despachoChoferId, setDespachoChoferId] = useState<number | "">("");
  const [despachoAyudanteId, setDespachoAyudanteId] = useState<number | "">("");
  const [despachoObservacion, setDespachoObservacion] = useState<string>("");
  const [despachando, setDespachando] = useState(false);
  const [errorDespacho, setErrorDespacho] = useState<string | null>(null);

  // Manifiesto de Pasajeros
  const [manifiestoPasajeros, setManifiestoPasajeros] = useState<any[]>([]);
  const [cargandoManifiesto, setCargandoManifiesto] = useState(false);

  // Cancelar y Finalizar
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  // Mensaje de éxito global
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const coopNumericId =
    selectedCoopId === "ALL" ? undefined : Number(selectedCoopId);

  // 1. Cargar Viajes
  const fetchViajes = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await getViajesByCooperativa(coopNumericId);
      if (res.success && res.data) {
        setViajes(res.data);
      }
    } catch (err) {
      console.error("Error al cargar viajes del monitor:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Cargar Recursos para Despacho / Programación
  const fetchRecursos = async () => {
    try {
      const res = await getDatosParaDespachoAction(coopNumericId);
      if (res.success && res.data) {
        setRecursosDespacho(res.data);
      }
    } catch (err) {
      console.error("Error al cargar recursos de despacho:", err);
    }
  };

  useEffect(() => {
    fetchViajes();
    fetchRecursos();
  }, [selectedCoopId]);

  // Filtrado de Viajes en Memoria
  const viajesFiltrados = useMemo(() => {
    return viajes.filter((v) => {
      // Filtro por Estado
      if (estadoFilter !== "TODOS" && v.estado !== estadoFilter) {
        return false;
      }

      // Filtro por Fecha
      if (!verTodasLasFechas && fechaFilter) {
        const viajeFechaStr = v.fecha.split("T")[0];
        if (viajeFechaStr !== fechaFilter) {
          return false;
        }
      }

      // Filtro por Búsqueda (Ruta, Unidad, Placa, Chofer)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchRuta = v.rutaNombre.toLowerCase().includes(q);
        const matchUnidad = v.unidad?.numeroUnidad?.toLowerCase().includes(q) || false;
        const matchPlaca = v.unidad?.placa?.toLowerCase().includes(q) || false;
        const matchChofer = v.tripulacion.chofer?.nombre?.toLowerCase().includes(q) || false;
        const matchCoop = v.cooperativaNombre?.toLowerCase().includes(q) || false;

        if (!matchRuta && !matchUnidad && !matchPlaca && !matchChofer && !matchCoop) {
          return false;
        }
      }

      return true;
    });
  }, [viajes, estadoFilter, fechaFilter, verTodasLasFechas, searchQuery]);

  // Contadores KPI
  const kpis = useMemo(() => {
    const total = viajes.length;
    const programados = viajes.filter((v) => v.estado === "PROGRAMADO").length;
    const enCurso = viajes.filter((v) => v.estado === "EN_CURSO").length;
    const finalizados = viajes.filter((v) => v.estado === "FINALIZADO").length;
    const cancelados = viajes.filter((v) => v.estado === "CANCELADO").length;

    return { total, programados, enCurso, finalizados, cancelados };
  }, [viajes]);

  // Manejar creación de Salida Programada
  const handleGuardarSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorProgramar(null);

    if (!formRutaId) {
      setErrorProgramar("Por favor selecciona una ruta para la salida.");
      return;
    }
    if (!formFecha || !formHora) {
      setErrorProgramar("Especifica la fecha y hora estimada de salida.");
      return;
    }

    setGuardandoViaje(true);
    const hrSalidaIso = `${formFecha}T${formHora}:00.000Z`;

    const res = await createViaje({
      idRuta: Number(formRutaId),
      fecha: `${formFecha}T00:00:00.000Z`,
      hrSalidaProgramada: hrSalidaIso,
      sentido: formSentido,
    });

    setGuardandoViaje(false);
    if (res.success) {
      setShowProgramarModal(false);
      setFormRutaId("");
      setFeedbackSuccess("Salida programada exitosamente en el sistema.");
      setTimeout(() => setFeedbackSuccess(null), 4000);
      fetchViajes(true);
    } else {
      setErrorProgramar(res.error || "No se pudo programar la salida.");
    }
  };

  // Abrir Modal de Despacho
  const handleAbrirDespacho = (viaje: ViajeMonitorItem) => {
    setViajeSeleccionado(viaje);
    setErrorDespacho(null);
    setDespachoUnidadId("");
    setDespachoChoferId("");
    setDespachoAyudanteId("");
    setDespachoObservacion("");
    setShowDespachoModal(true);
    fetchRecursos();
  };

  // Manejar Despacho Atómico
  const handleConfirmarDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viajeSeleccionado) return;
    setErrorDespacho(null);

    if (!despachoUnidadId) {
      setErrorDespacho("Selecciona el autobús a despachar.");
      return;
    }
    if (!despachoChoferId) {
      setErrorDespacho("Selecciona el chofer titular para la unidad.");
      return;
    }

    setDespachando(true);
    const res = await despacharViajeCompletoAction({
      idViaje: viajeSeleccionado.idViaje,
      idUnidad: Number(despachoUnidadId),
      idChofer: Number(despachoChoferId),
      idAyudante: despachoAyudanteId ? Number(despachoAyudanteId) : undefined,
      observacion: despachoObservacion.trim() || undefined,
    });
    setDespachando(false);

    if (res.success) {
      setShowDespachoModal(false);
      setFeedbackSuccess(
        `¡Viaje #${viajeSeleccionado.idViaje} despachado exitosamente! La unidad ya está en ruta.`
      );
      setTimeout(() => setFeedbackSuccess(null), 4000);
      fetchViajes(true);
    } else {
      setErrorDespacho(res.error || "Error al despachar el viaje.");
    }
  };

  // Abrir Manifiesto de Pasajeros
  const handleVerManifiesto = async (viaje: ViajeMonitorItem) => {
    setViajeSeleccionado(viaje);
    setShowManifiestoModal(true);
    setCargandoManifiesto(true);
    const res = await getManifiestoPasajerosAction(viaje.idViaje);
    setCargandoManifiesto(false);
    if (res.success && res.data) {
      setManifiestoPasajeros(res.data);
    } else {
      setManifiestoPasajeros([]);
    }
  };

  // Finalizar Viaje Manualmente
  const handleConfirmarFinalizar = async () => {
    if (!viajeSeleccionado) return;
    setProcesandoAccion(true);
    const res = await finalizarViaje(viajeSeleccionado.idViaje);
    setProcesandoAccion(false);
    setShowFinalizarModal(false);

    if (res.success) {
      setFeedbackSuccess(
        `Viaje #${viajeSeleccionado.idViaje} finalizado. La unidad y los asientos han sido liberados.`
      );
      setTimeout(() => setFeedbackSuccess(null), 4000);
      fetchViajes(true);
    } else {
      alert(res.error || "No se pudo finalizar el viaje.");
    }
  };

  // Cancelar Salida Programada
  const handleConfirmarCancelar = async () => {
    if (!viajeSeleccionado) return;
    setProcesandoAccion(true);
    const res = await cancelarViajeAction(
      viajeSeleccionado.idViaje,
      motivoCancelacion.trim() || undefined
    );
    setProcesandoAccion(false);
    setShowCancelarModal(false);
    setMotivoCancelacion("");

    if (res.success) {
      setFeedbackSuccess(
        `La salida #${viajeSeleccionado.idViaje} fue cancelada y sus recursos liberados.`
      );
      setTimeout(() => setFeedbackSuccess(null), 4000);
      fetchViajes(true);
    } else {
      alert(res.error || "No se pudo cancelar el viaje.");
    }
  };

  // Formato de hora legible
  const formatHora = (isoStr: string | null) => {
    if (!isoStr) return "N/D";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString("es-NI", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const formatFechaCorta = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("es-NI", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. ENCABEZADO PRINCIPAL DE LA PÁGINA                     */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Monitor de Salidas y Despacho
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {selectedCoop ? selectedCoop.nombre : "Vista Global"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Programación de horarios, asignación de flota con tripulación y despacho en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchViajes(true);
              fetchRecursos();
            }}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            title="Refrescar datos en vivo"
          >
            <Icon
              path={mdiRefresh}
              size={0.75}
              className={refreshing ? "animate-spin text-primary" : ""}
            />
          </button>

          <button
            onClick={() => {
              setErrorProgramar(null);
              setShowProgramarModal(true);
            }}
            className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Icon path={mdiPlus} size={0.75} />
            <span>Programar Salida</span>
          </button>
        </div>
      </div>

      {/* Banner de retroalimentación exitosa */}
      {feedbackSuccess && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold animate-in fade-in">
          <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-600 shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TARJETAS KPI RESUMEN DE SALIDAS                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Salidas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Salidas
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {kpis.total}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Icon path={mdiBus} size={0.9} />
          </div>
        </div>

        {/* En Ruta / Activas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                En Ruta
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-900 mt-1">
              {kpis.enCurso}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Icon path={mdiSteering} size={0.9} />
          </div>
        </div>

        {/* Programadas / Por Despachar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
              Programadas
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-sky-900 mt-1">
              {kpis.programados}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <Icon path={mdiClockOutline} size={0.9} />
          </div>
        </div>

        {/* Finalizadas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Finalizadas
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {kpis.finalizados}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Icon path={mdiCheckCircleOutline} size={0.9} />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BARRA DE FILTROS, FECHAS Y BÚSQUEDA                   */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        {/* Pestañas de Estado con soporte touch horizontal sin desborde */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {[
            { id: "TODOS", label: "Todos", count: kpis.total },
            { id: "PROGRAMADO", label: "Programados", count: kpis.programados },
            { id: "EN_CURSO", label: "En Ruta", count: kpis.enCurso },
            { id: "FINALIZADO", label: "Finalizados", count: kpis.finalizados },
            { id: "CANCELADO", label: "Cancelados", count: kpis.cancelados },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setEstadoFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                estadoFilter === tab.id
                  ? "bg-slate-900 text-white font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  estadoFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filtro de Fecha y Búsqueda */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Selector de fecha */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5">
            <input
              type="date"
              value={fechaFilter}
              disabled={verTodasLasFechas}
              onChange={(e) => setFechaFilter(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer disabled:opacity-40"
            />
            <button
              type="button"
              onClick={() => setVerTodasLasFechas(!verTodasLasFechas)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                verTodasLasFechas
                  ? "bg-primary text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
              title={verTodasLasFechas ? "Filtrar por fecha específica" : "Ver histórico de todas las fechas"}
            >
              {verTodasLasFechas ? "Todas las Fechas" : "Histórico"}
            </button>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative w-full sm:w-60">
            <Icon
              path={mdiMagnify}
              size={0.7}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar ruta, bus o chofer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. LISTADO Y CARDS DE SALIDAS (MONITOR EN TIEMPO REAL)   */}
      {/* ======================================================== */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : viajesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Icon path={mdiBus} size={1.4} />
          </div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900">
            No se encontraron salidas para los filtros seleccionados
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "Prueba cambiando el término de búsqueda o seleccionando otra fecha."
              : "No hay viajes programados para esta jornada. Puedes programar una nueva salida con el botón superior."}
          </p>
          <button
            onClick={() => {
              setErrorProgramar(null);
              setShowProgramarModal(true);
            }}
            className="mt-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <Icon path={mdiPlus} size={0.65} />
            <span>Programar Salida Ahora</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {viajesFiltrados.map((viaje) => {
            const esProgramado = viaje.estado === "PROGRAMADO";
            const esEnCurso = viaje.estado === "EN_CURSO";
            const esFinalizado = viaje.estado === "FINALIZADO";
            const esCancelado = viaje.estado === "CANCELADO";

            return (
              <div
                key={viaje.idViaje}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs hover:shadow-xs ${
                  esEnCurso
                    ? "border-emerald-300 ring-1 ring-emerald-200/50"
                    : esProgramado
                    ? "border-slate-200 hover:border-slate-300"
                    : esFinalizado
                    ? "border-slate-200 opacity-90"
                    : "border-red-200 bg-red-50/20"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Columna Izquierda: Ruta, Sentido, Horarios */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Estado */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          esEnCurso
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : esProgramado
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : esFinalizado
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {esEnCurso && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        {esEnCurso
                          ? "En Ruta"
                          : esProgramado
                          ? "Programado"
                          : esFinalizado
                          ? "Finalizado"
                          : "Cancelado"}
                      </span>

                      {/* Sentido */}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                          viaje.sentido === "RETORNO"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-primary/10 text-primary border-primary/20"
                        }`}
                      >
                        {viaje.sentido || "IDA"}
                      </span>

                      {/* Cooperativa (vista global SuperAdmin) */}
                      {isSuperAdmin && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {viaje.cooperativaNombre}
                        </span>
                      )}

                      {/* Fecha */}
                      <span className="text-xs font-medium text-slate-400">
                        {formatFechaCorta(viaje.fecha)}
                      </span>
                    </div>

                    {/* Nombre de la Ruta */}
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {viaje.rutaNombre}
                      </h2>
                    </div>

                    {/* Horarios y checkpoints */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-slate-900">
                        <Icon path={mdiClockOutline} size={0.65} className="text-primary" />
                        Salida Programada: {formatHora(viaje.hrSalidaProgramada)}
                      </span>

                      {viaje.hrSalidaEstimada && (
                        <span className="flex items-center gap-1">
                          Despachado: {formatHora(viaje.hrSalidaEstimada)}
                        </span>
                      )}

                      {viaje.hrLlegadaReal && (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          Llegada: {formatHora(viaje.hrLlegadaReal)}
                        </span>
                      )}

                      {viaje.ultimaParada && (
                        <span className="flex items-center gap-1 text-primary font-bold">
                          <Icon path={mdiMapMarkerRadius} size={0.65} />
                          Última estación: {viaje.ultimaParada.nombre} ({formatHora(viaje.ultimaParada.fechaHora)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Columna Centro: Unidad Asignada y Tripulación */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 min-w-[280px] lg:w-72 space-y-2">
                    {viaje.unidad ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon path={mdiBus} size={0.7} className="text-slate-700" />
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              Bus #{viaje.unidad.numeroUnidad}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            {viaje.unidad.placa}
                          </span>
                        </div>

                        {/* Chofer y Ayudante */}
                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
                          <p className="flex items-center gap-1 truncate">
                            <span className="font-semibold text-slate-700">Chofer:</span>
                            <span>{viaje.tripulacion.chofer?.nombre || "No asignado"}</span>
                          </p>
                          {viaje.tripulacion.ayudante && (
                            <p className="flex items-center gap-1 truncate">
                              <span className="font-semibold text-slate-700">Ayudante:</span>
                              <span>{viaje.tripulacion.ayudante.nombre}</span>
                            </p>
                          )}
                        </div>

                        {/* Ocupación de Asientos */}
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span className="flex items-center gap-1">
                              <Icon path={mdiCarSeat} size={0.5} />
                              Ocupación
                            </span>
                            <span>
                              {viaje.ocupacion.boletosVendidos} / {viaje.ocupacion.totalAsientos} ({viaje.ocupacion.porcentaje}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                viaje.ocupacion.porcentaje > 80
                                  ? "bg-emerald-600"
                                  : viaje.ocupacion.porcentaje > 40
                                  ? "bg-primary"
                                  : "bg-slate-400"
                              }`}
                              style={{ width: `${viaje.ocupacion.porcentaje}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-slate-400">
                        <Icon path={mdiAlert} size={0.8} className="mx-auto mb-1 text-amber-500" />
                        <p className="text-xs font-semibold text-slate-700">Sin autobús asignado</p>
                        <p className="text-[11px] text-slate-500">Pendiente de autorización de salida</p>
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Botones de Acción Operativa */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-end gap-2 shrink-0">
                    {/* Botón: Despachar (si está Programado) */}
                    {esProgramado && (
                      <button
                        onClick={() => handleAbrirDespacho(viaje)}
                        className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Icon path={mdiSteering} size={0.65} />
                        <span>Asignar y Despachar</span>
                      </button>
                    )}

                    {/* Botón: Finalizar Viaje (si está En Ruta) */}
                    {esEnCurso && (
                      <button
                        onClick={() => {
                          setViajeSeleccionado(viaje);
                          setShowFinalizarModal(true);
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Icon path={mdiCheckCircleOutline} size={0.65} />
                        <span>Finalizar Viaje</span>
                      </button>
                    )}

                    {/* Botón: Ver Manifiesto de Pasajeros */}
                    <button
                      onClick={() => handleVerManifiesto(viaje)}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Icon path={mdiTicketConfirmationOutline} size={0.65} />
                      <span>Manifiesto ({viaje.ocupacion.boletosVendidos})</span>
                    </button>

                    {/* Botón: Cancelar Salida (si no está finalizado ni cancelado) */}
                    {(esProgramado || esEnCurso) && (
                      <button
                        onClick={() => {
                          setViajeSeleccionado(viaje);
                          setMotivoCancelacion("");
                          setShowCancelarModal(true);
                        }}
                        className="text-slate-400 hover:text-red-600 text-xs font-semibold px-2 py-1 transition-colors cursor-pointer"
                      >
                        Cancelar salida
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: PROGRAMAR NUEVA SALIDA                           */}
      {/* ======================================================== */}
      {showProgramarModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Programar Salida de Autobús
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea un nuevo itinerario de viaje en la plataforma para la venta y despacho.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProgramarModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            {errorProgramar && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <Icon path={mdiAlertCircleOutline} size={0.7} className="text-red-600 shrink-0" />
                <span>{errorProgramar}</span>
              </div>
            )}

            <form onSubmit={handleGuardarSalida} className="space-y-4">
              {/* Selector de Ruta */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ruta de Transporte *
                </label>
                <select
                  value={formRutaId}
                  onChange={(e) => setFormRutaId(e.target.value ? Number(e.target.value) : "")}
                  required
                  className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                >
                  <option value="">Selecciona una ruta registrada...</option>
                  {recursosDespacho.rutas.map((r) => (
                    <option key={r.idRuta} value={r.idRuta}>
                      {r.nombre} ({r.cooperativa})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Hora de Salida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha de Salida *
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hora Programada *
                  </label>
                  <input
                    type="time"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              {/* Sentido del Viaje */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sentido del Recorrido *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormSentido("IDA")}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formSentido === "IDA"
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Sentido: IDA</span>
                    {formSentido === "IDA" && <Icon path={mdiCheck} size={0.6} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSentido("RETORNO")}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formSentido === "RETORNO"
                        ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Sentido: RETORNO</span>
                    {formSentido === "RETORNO" && <Icon path={mdiCheck} size={0.6} />}
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgramarModal(false)}
                  disabled={guardandoViaje}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardandoViaje}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {guardandoViaje ? (
                    <>
                      <Icon path={mdiLoading} size={0.65} className="animate-spin text-white" />
                      <span>Programando...</span>
                    </>
                  ) : (
                    <span>Confirmar y Programar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: AUTORIZAR DESPACHO Y ASIGNAR TRIPULACIÓN        */}
      {/* ======================================================== */}
      {showDespachoModal && viajeSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiSteering} size={0.8} className="text-primary" />
                  Autorizar Despacho a Ruta
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asigna la unidad y tripulación para poner el viaje en curso inmediatamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDespachoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            {/* Resumen del viaje seleccionado */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 mb-4 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {viajeSeleccionado.rutaNombre}
                </span>
                <span className="font-extrabold text-[10px] uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {viajeSeleccionado.sentido}
                </span>
              </div>
              <p className="text-slate-500">
                Salida Programada: <strong className="text-slate-700">{formatHora(viajeSeleccionado.hrSalidaProgramada)}</strong> ({formatFechaCorta(viajeSeleccionado.fecha)})
              </p>
            </div>

            {errorDespacho && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <Icon path={mdiAlertCircleOutline} size={0.7} className="text-red-600 shrink-0" />
                <span>{errorDespacho}</span>
              </div>
            )}

            <form onSubmit={handleConfirmarDespacho} className="space-y-4">
              {/* Selector de Autobús Disponible */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Autobús Disponible *
                </label>
                {recursosDespacho.unidades.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                    ⚠️ No hay unidades en estado <strong>DISPONIBLE</strong> en este momento. Finaliza un viaje previo o registra unidades en la sección Flota.
                  </div>
                ) : (
                  <select
                    value={despachoUnidadId}
                    onChange={(e) => setDespachoUnidadId(e.target.value ? Number(e.target.value) : "")}
                    required
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white"
                  >
                    <option value="">Selecciona una unidad disponible...</option>
                    {recursosDespacho.unidades.map((u) => (
                      <option key={u.idUnidad} value={u.idUnidad}>
                        Bus #{u.numeroUnidad} ({u.placa}) - {u.tipo} ({u.capacidad} asientos)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selector de Chofer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chofer Titular *
                </label>
                {recursosDespacho.choferes.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                    ⚠️ No hay choferes activos registrados en la cooperativa.
                  </div>
                ) : (
                  <select
                    value={despachoChoferId}
                    onChange={(e) => setDespachoChoferId(e.target.value ? Number(e.target.value) : "")}
                    required
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white"
                  >
                    <option value="">Selecciona el chofer conductor...</option>
                    {recursosDespacho.choferes.map((c) => (
                      <option key={c.idUsuario} value={c.idUsuario}>
                        {c.nombre} {c.telefono ? `(${c.telefono})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selector de Ayudante / Cobrador (Opcional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ayudante / Cobrador (Opcional)
                  </label>
                  <span className="text-[11px] text-slate-400">Tendrá acceso al reporte de estaciones</span>
                </div>
                <select
                  value={despachoAyudanteId}
                  onChange={(e) => setDespachoAyudanteId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white"
                >
                  <option value="">Sin ayudante / Solo chofer</option>
                  {recursosDespacho.ayudantes.map((a) => (
                    <option key={a.idUsuario} value={a.idUsuario}>
                      {a.nombre} {a.telefono ? `(${a.telefono})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observación de Despacho */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Observaciones de Salida
                </label>
                <input
                  type="text"
                  placeholder="Ej: Salida a tiempo con tanque lleno y revisión mecánica OK."
                  value={despachoObservacion}
                  onChange={(e) => setDespachoObservacion(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDespachoModal(false)}
                  disabled={despachando}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={despachando || recursosDespacho.unidades.length === 0 || recursosDespacho.choferes.length === 0}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {despachando ? (
                    <>
                      <Icon path={mdiLoading} size={0.65} className="animate-spin text-white" />
                      <span>Despachando...</span>
                    </>
                  ) : (
                    <span>Autorizar y Despachar Unidad</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: MANIFIESTO DE PASAJEROS DEL VIAJE               */}
      {/* ======================================================== */}
      {showManifiestoModal && viajeSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Icon path={mdiTicketConfirmationOutline} size={0.8} className="text-primary" />
                  Manifiesto de Pasajeros
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lista de boletos emitidos y estado de abordaje para la salida #{viajeSeleccionado.idViaje}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManifiestoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            {/* Sub-cabecera con datos del viaje */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-900">{viajeSeleccionado.rutaNombre}</span>
                <span className="text-slate-400 ml-2">({viajeSeleccionado.sentido})</span>
              </div>
              <div className="font-semibold text-slate-600">
                Bus: <strong className="text-slate-900">{viajeSeleccionado.unidad?.numeroUnidad ? `#${viajeSeleccionado.unidad.numeroUnidad}` : "Sin asignar"}</strong>
              </div>
            </div>

            {/* Listado de Pasajeros */}
            <div className="flex-1 overflow-y-auto py-3">
              {cargandoManifiesto ? (
                <div className="py-8 text-center text-slate-400">
                  <Icon path={mdiLoading} size={1} className="animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs">Cargando manifiesto de boletos...</p>
                </div>
              ) : manifiestoPasajeros.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm font-bold text-slate-700">No hay boletos vendidos aún</p>
                  <p className="text-xs mt-1">Este viaje aún no cuenta con pasajeros registrados.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-2">Asiento</th>
                      <th className="pb-2">Trayecto</th>
                      <th className="pb-2">Tarifa</th>
                      <th className="pb-2 text-right">Estado Abordaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifiestoPasajeros.map((p) => (
                      <tr key={p.idBoleto} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-bold text-slate-900">
                          Asiento #{p.asientoNumero}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {p.origen} <Icon path={mdiArrowRight} size={0.5} className="inline text-slate-400" /> {p.destino}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-800">
                          C$ {p.monto.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.estado === "ABORDADO"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : p.estado === "PAGADO"
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {p.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">
                Total Pasajeros: <strong>{manifiestoPasajeros.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowManifiestoModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Cerrar Manifiesto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CONFIRMAR FINALIZACIÓN DE VIAJE                  */}
      {/* ======================================================== */}
      {showFinalizarModal && viajeSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Icon path={mdiCheckCircleOutline} size={1} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ¿Finalizar Viaje #{viajeSeleccionado.idViaje}?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Esta acción marcará el viaje como <strong>FINALIZADO</strong>, registrará la hora de llegada real y liberará el autobús <strong>#{viajeSeleccionado.unidad?.numeroUnidad}</strong> a estado disponible para nuevas salidas.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowFinalizarModal(false)}
                disabled={procesandoAccion}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmarFinalizar}
                disabled={procesandoAccion}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
              >
                {procesandoAccion ? "Finalizando..." : "Sí, Finalizar Viaje"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: CONFIRMAR CANCELACIÓN DE SALIDA                 */}
      {/* ======================================================== */}
      {showCancelarModal && viajeSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
              <Icon path={mdiAlert} size={1} />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              ¿Cancelar Salida #{viajeSeleccionado.idViaje}?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1 mb-4">
              La salida será marcada como <strong>CANCELADA</strong> y la unidad/asientos vinculados volverán a estar disponibles.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo de la Cancelación (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Avería mecánica o falta de demanda"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCancelarModal(false)}
                disabled={procesandoAccion}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelar}
                disabled={procesandoAccion}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
              >
                {procesandoAccion ? "Cancelando..." : "Confirmar Cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
