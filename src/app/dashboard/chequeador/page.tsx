"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@mdi/react";
import {
  mdiClipboardCheckOutline,
  mdiBus,
  mdiClockOutline,
  mdiAccountCheck,
  mdiMapMarkerCheck,
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiRefresh,
  mdiMagnify,
  mdiFilterVariant,
  mdiClose,
  mdiLoading,
  mdiStamper,
  mdiQrcodeScan,
} from "@mdi/js";
import {
  getViajesChequeadorAction,
  registrarControlChequeadorAction,
} from "@/backend/actions/viajes";
import { useTenant } from "@/frontend/context/TenantContext";
import {
  formatManaguaTime,
  calculateDelayMinutes,
  getPunctualityStatus,
} from "@/lib/date-time";

interface ChequeadorViajeItem {
  idViaje: number;
  rutaNombre: string;
  origen: string;
  destino: string;
  cooperativaNombre: string;
  busNumero: string;
  placa: string;
  choferNombre: string;
  hrSalidaProgramada: string;
  estado: string;
  boletosAbordados: number;
  totalBoletos: number;
  puntosRuta: Array<{
    idPuntoRuta: number;
    idPunto: number;
    nombre: string;
    orden: number;
  }>;
  ultimoControl: {
    idControlViaje: number;
    puntoNombre: string;
    fechaHora: string;
    pasajerosConteo: number | null;
    observacion: string | null;
    chequeador: string;
  } | null;
}

export default function ChequeadorPage() {
  const { isSuperAdmin, selectedCoopId, cooperativas } = useTenant();
  const [viajes, setViajes] = useState<ChequeadorViajeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("ALL");
  const [filtroCoop, setFiltroCoop] = useState<string>("ALL");

  // Estados Modal de Sellado / Control
  const [viajeSeleccionado, setViajeSeleccionado] = useState<ChequeadorViajeItem | null>(null);
  const [idPuntoRutaSeleccionado, setIdPuntoRutaSeleccionado] = useState<number | null>(null);
  const [tipoControl, setTipoControl] = useState<"SALIDA_TERMINAL" | "CONTROL_PASO">("SALIDA_TERMINAL");
  const [conteoPasajeros, setConteoPasajeros] = useState<number>(0);
  const [observacion, setObservacion] = useState("");
  const [sellando, setSellando] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchViajes = async () => {
    setLoading(true);
    try {
      const coopNumber =
        filtroCoop === "ALL"
          ? selectedCoopId === "ALL"
            ? undefined
            : Number(selectedCoopId)
          : Number(filtroCoop);

      const res = await getViajesChequeadorAction(coopNumber);
      if (res.success && res.data) {
        setViajes(res.data);
      } else {
        setViajes([]);
      }
    } catch (err) {
      console.error("Error al cargar viajes en chequeador:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViajes();
  }, [selectedCoopId, filtroCoop]);

  const handleOpenSelloModal = (viaje: ChequeadorViajeItem) => {
    setViajeSeleccionado(viaje);
    setIdPuntoRutaSeleccionado(viaje.puntosRuta[0]?.idPuntoRuta || null);
    setTipoControl(viaje.estado === "PROGRAMADO" ? "SALIDA_TERMINAL" : "CONTROL_PASO");
    setConteoPasajeros(viaje.boletosAbordados || viaje.totalBoletos || 0);
    setObservacion("");
  };

  const handleConfirmarSello = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viajeSeleccionado || !idPuntoRutaSeleccionado) return;

    setSellando(true);
    setFeedback(null);
    try {
      const res = await registrarControlChequeadorAction({
        idViaje: viajeSeleccionado.idViaje,
        idPuntoRuta: idPuntoRutaSeleccionado,
        pasajerosConteo: Number(conteoPasajeros),
        observacion: observacion.trim() || undefined,
        tipo: tipoControl,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: `Sello digital registrado exitosamente en ${res.data?.puntoNombre}.`,
        });
        setViajeSeleccionado(null);
        await fetchViajes();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo registrar el sello de control." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de conexión al registrar sello de control." });
    } finally {
      setSellando(false);
    }
  };

  const filteredViajes = viajes.filter((v) => {
    if (filtroEstado !== "ALL" && v.estado !== filtroEstado) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchPlaca = v.placa.toLowerCase().includes(query);
      const matchBus = v.busNumero.toLowerCase().includes(query);
      const matchRuta = v.rutaNombre.toLowerCase().includes(query);
      const matchChofer = v.choferNombre.toLowerCase().includes(query);
      return matchPlaca || matchBus || matchRuta || matchChofer;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              path={feedback.type === "success" ? mdiCheckCircleOutline : mdiAlertCircleOutline}
              size={0.75}
              className={feedback.type === "success" ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"}
            />
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <Icon path={mdiClose} size={0.6} />
          </button>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiClipboardCheckOutline} size={0.85} className="text-primary" />
            Control y Tarjeta Digital de Chequeador
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro oficial de horas de salida en terminal, marcas de paso e inspección de aforo en Nicaragua (UTC-6).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/validar-boleto"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Icon path={mdiQrcodeScan} size={0.65} />
            <span>Validar QR</span>
          </Link>

          <button
            onClick={fetchViajes}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            title="Refrescar salidas"
          >
            <Icon path={mdiRefresh} size={0.7} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Icon
            path={mdiMagnify}
            size={0.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por bus, placa, chofer o ruta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <select
              value={filtroCoop}
              onChange={(e) => setFiltroCoop(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">Todas las Cooperativas</option>
              {cooperativas.map((c) => (
                <option key={c.idCooperativa} value={c.idCooperativa.toString()}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PROGRAMADO">Programado (Por Salir)</option>
            <option value="EN_CURSO">En Curso (En Ruta)</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>
        </div>
      </div>

      {/* Lista de Salidas y Controles */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Cargando salidas del día...</p>
        </div>
      ) : filteredViajes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-2xs text-slate-500 text-xs">
          No se encontraron viajes programados o activos bajo los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredViajes.map((viaje) => {
            const delayMin = calculateDelayMinutes(viaje.hrSalidaProgramada);
            const punctuality = getPunctualityStatus(delayMin);

            return (
              <div
                key={viaje.idViaje}
                className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  {/* Fila superior: Unidad + Estado */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 font-bold text-xs border border-slate-200">
                        <Icon path={mdiBus} size={0.7} />
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-900 leading-tight">
                          Bus #{viaje.busNumero}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">{viaje.placa}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        viaje.estado === "EN_CURSO"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : viaje.estado === "FINALIZADO"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}
                    >
                      {viaje.estado === "EN_CURSO" ? "En Ruta" : viaje.estado}
                    </span>
                  </div>

                  {/* Trayecto y Cooperativa */}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1" title={viaje.rutaNombre}>
                      {viaje.origen} → {viaje.destino}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {viaje.cooperativaNombre} · Cond.: {viaje.choferNombre}
                    </p>
                  </div>

                  {/* Hora de Salida Oficial y Puntualidad */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Salida Oficial</span>
                      <p className="font-bold text-slate-900 flex items-center gap-1">
                        <Icon path={mdiClockOutline} size={0.55} className="text-slate-400" />
                        {formatManaguaTime(viaje.hrSalidaProgramada)}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${punctuality.className}`}
                    >
                      {punctuality.label}
                    </span>
                  </div>

                  {/* Métricas de Pasajeros y Último Sello */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Aforo Reportado</span>
                      <span className="font-bold text-slate-900">
                        {viaje.boletosAbordados} / {viaje.totalBoletos} pas.
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Último Sello</span>
                      <span className="font-bold text-slate-900 truncate block" title={viaje.ultimoControl?.puntoNombre || "Sin sellar"}>
                        {viaje.ultimoControl?.puntoNombre || "Sin sellar"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de Acción: Sellar */}
                <button
                  type="button"
                  disabled={viaje.estado === "FINALIZADO"}
                  onClick={() => handleOpenSelloModal(viaje)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Icon path={mdiStamper} size={0.65} />
                  <span>Sellar Tarjeta de Control</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA SELLAR CONTROL DIGITAL */}
      {viajeSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800">
                  <Icon path={mdiStamper} size={0.7} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Sellar Control de Unidad</h3>
                  <p className="text-xs text-slate-500">
                    Bus #{viajeSeleccionado.busNumero} ({viajeSeleccionado.placa})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViajeSeleccionado(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.65} />
              </button>
            </div>

            <form onSubmit={handleConfirmarSello} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Punto de Control o Terminal:</label>
                <select
                  value={idPuntoRutaSeleccionado || ""}
                  onChange={(e) => setIdPuntoRutaSeleccionado(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-400"
                  required
                >
                  {viajeSeleccionado.puntosRuta.map((pr) => (
                    <option key={pr.idPuntoRuta} value={pr.idPuntoRuta}>
                      Estación #{pr.orden}: {pr.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tipo de Control:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoControl("SALIDA_TERMINAL")}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      tipoControl === "SALIDA_TERMINAL"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Salida de Terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoControl("CONTROL_PASO")}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      tipoControl === "CONTROL_PASO"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Punto en Carretera
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Conteo Físico de Pasajeros:</label>
                <input
                  type="number"
                  min="0"
                  value={conteoPasajeros}
                  onChange={(e) => setConteoPasajeros(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Manifiesto en sistema: {viajeSeleccionado.boletosAbordados} pasajeros abordados
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Observaciones o Novedades:</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Salida a tiempo, sobrecupo verificado, retraso por desvío..."
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViajeSeleccionado(null)}
                  disabled={sellando}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sellando}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {sellando && <Icon path={mdiLoading} size={0.6} className="animate-spin" />}
                  <span>{sellando ? "Sellando..." : "Confirmar y Sellar"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
