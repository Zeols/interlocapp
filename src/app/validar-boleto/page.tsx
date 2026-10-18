"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiQrcodeScan,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiClockOutline,
  mdiAccount,
  mdiTicketConfirmationOutline,
  mdiRefresh,
  mdiCamera,
  mdiCameraOff,
  mdiClose,
  mdiArrowLeft,
  mdiMapMarker,
  mdiShieldCheckOutline,
} from "@mdi/js";
import Link from "next/link";
import { validarBoletoAction, getManifiestoViajeAction, ResultadoValidacionBoleto } from "@/backend/actions/boletos";
import { getCurrentUserAction } from "@/backend/actions/auth";

interface ManifiestoData {
  idViaje: number;
  origen: string;
  destino: string;
  cooperativa: string;
  horaSalida: string;
  estadoViaje: string;
  unidad: string;
  placa: string;
  chofer: string;
  ayudante: string;
  capacidadUnidad: number;
  boletosAbordados: number;
  boletosPagados: number;
  totalBoletos: number;
  boletos: Array<{
    idBoleto: number;
    codigoBoleto: string;
    asientoNumero: string | number;
    monto: number;
    estado: string;
    fechaHora: string;
  }>;
}

export default function ValidarBoletoPage() {
  const [codigoInput, setCodigoInput] = useState("");
  const [loadingValidacion, setLoadingValidacion] = useState(false);
  const [loadingManifiesto, setLoadingManifiesto] = useState(true);
  const [manifiesto, setManifiesto] = useState<ManifiestoData | null>(null);
  const [resultado, setResultado] = useState<ResultadoValidacionBoleto | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [alreadyBoardedNotice, setAlreadyBoardedNotice] = useState(false);
  const [filtroManifiesto, setFiltroManifiesto] = useState<"todos" | "abordados" | "pendientes">("todos");
  const [currentUser, setCurrentUser] = useState<{ nombre: string; rolNombre: string; cooperativaNombre?: string } | null>(null);

  // Cargar usuario y viaje
  const loadData = async () => {
    setLoadingManifiesto(true);
    try {
      const [user, maniRes] = await Promise.all([
        getCurrentUserAction(),
        getManifiestoViajeAction(),
      ]);

      if (user) {
        setCurrentUser({
          nombre: user.nombre,
          rolNombre: user.rolNombre,
        });
      }

      if (maniRes.success && maniRes.data) {
        setManifiesto(maniRes.data as ManifiestoData);
      }
    } catch (err) {
      console.error("Error al cargar datos operativos:", err);
    } finally {
      setLoadingManifiesto(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleValidar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!codigoInput.trim()) return;

    setLoadingValidacion(true);
    setFeedbackError(null);
    setResultado(null);
    setAlreadyBoardedNotice(false);

    try {
      const res = await validarBoletoAction(codigoInput.trim());
      if (res.success && res.data) {
        setResultado(res.data);
        setCodigoInput("");
        // Refrescar manifiesto para actualizar contadores
        loadData();
      } else {
        if (res.alreadyBoarded && res.data) {
          setResultado(res.data);
          setAlreadyBoardedNotice(true);
        } else {
          setFeedbackError(res.error || "No se pudo validar el boleto.");
        }
      }
    } catch {
      setFeedbackError("Error de comunicación al contactar con el servidor.");
    } finally {
      setLoadingValidacion(false);
    }
  };

  const boletosFiltrados = (manifiesto?.boletos || []).filter((b) => {
    if (filtroManifiesto === "abordados") return b.estado === "ABORDADO";
    if (filtroManifiesto === "pendientes") return b.estado !== "ABORDADO";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Operativo */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={currentUser?.rolNombre === "TAQUILLERO" || currentUser?.rolNombre === "ADMIN_COOP" || currentUser?.rolNombre === "SUPER_ADMIN" ? "/dashboard" : "#"}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              title="Panel"
            >
              <Icon path={mdiArrowLeft} size={0.7} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Icon path={mdiBus} size={0.65} />
                </span>
                <h1 className="font-bold text-sm sm:text-base tracking-tight leading-none">
                  Validación de Boletos
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Terminal de abordaje para Ayudante, Chofer y Taquilla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loadingManifiesto}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Actualizar datos del viaje"
            >
              <Icon path={mdiRefresh} size={0.7} className={loadingManifiesto ? "animate-spin text-white" : ""} />
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 leading-none">{currentUser?.nombre || "Operario"}</p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300 uppercase mt-0.5">
                {currentUser?.rolNombre || "TRIPULACIÓN"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        {/* RESUMEN DEL VIAJE EN CURSO */}
        {loadingManifiesto ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="h-5 w-48 bg-slate-200 animate-pulse rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        ) : manifiesto ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
                  Unidad #{manifiesto.unidad}
                </span>
                <span className="text-xs text-slate-500 font-medium">Placa: {manifiesto.placa}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-700">{manifiesto.cooperativa}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <Icon path={mdiClockOutline} size={0.6} className="text-slate-500" />
                <span>Salida: <strong className="text-slate-900">{manifiesto.horaSalida}</strong></span>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-bold text-base sm:text-lg text-slate-900">
                <Icon path={mdiMapMarker} size={0.8} className="text-primary shrink-0" />
                <span>{manifiesto.origen}</span>
                <span className="text-slate-400">→</span>
                <span>{manifiesto.destino}</span>
              </div>

              {/* Indicador de Abordaje */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Pasajeros Abordados</p>
                  <p className="text-lg font-black text-slate-900 leading-none">
                    {manifiesto.boletosAbordados} <span className="text-xs text-slate-400 font-normal">/ {manifiesto.totalBoletos}</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                  {manifiesto.totalBoletos > 0 ? `${Math.round((manifiesto.boletosAbordados / manifiesto.totalBoletos) * 100)}%` : "0%"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            <Icon path={mdiBus} size={1.2} className="mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-sm text-slate-800">No hay viajes programados activos en este momento</p>
            <p className="text-xs text-slate-500 mt-1">
              Aún puedes validar cualquier boleto emitido ingresando el código a continuación.
            </p>
          </div>
        )}

        {/* VALIDADOR DE BOLETO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Icon path={mdiQrcodeScan} size={0.8} className="text-primary" />
              Validar Código de Boleto
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escanea el código QR del boleto impreso o digita el número del boleto (Ej: 1, 10 o BOLETO-12)
            </p>
          </div>

          <form onSubmit={handleValidar} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon path={mdiTicketConfirmationOutline} size={0.75} />
              </div>
              <input
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                placeholder="Ingresa código o escanea QR (Ej: BOLETO-14)..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all uppercase"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loadingValidacion || !codigoInput.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingValidacion ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon path={mdiShieldCheckOutline} size={0.7} />
              )}
              <span>Validar y Abordar</span>
            </button>
          </form>

          {/* MENSAJES DE ERROR */}
          {feedbackError && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <Icon path={mdiAlertCircleOutline} size={0.8} className="text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{feedbackError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackError(null)}
                className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.65} />
              </button>
            </div>
          )}

          {/* RESULTADO DE LA VALIDACIÓN */}
          {resultado && (
            <div
              className={`mt-5 p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 ${
                alreadyBoardedNotice
                  ? "bg-amber-50/80 border-amber-300 text-amber-900"
                  : "bg-emerald-50/80 border-emerald-300 text-emerald-950"
              }`}
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/10">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      alreadyBoardedNotice ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <Icon path={alreadyBoardedNotice ? mdiAlertCircleOutline : mdiCheckCircleOutline} size={0.85} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                      {alreadyBoardedNotice ? "Boleto Ya Abordado Anteriormente" : "¡Boleto Validado y Abordado con Éxito!"}
                    </h3>
                    <p className="text-xs opacity-80 mt-0.5">
                      {resultado.codigoBoleto} • {resultado.cooperativaNombre}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                    alreadyBoardedNotice ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"
                  }`}
                >
                  {alreadyBoardedNotice ? "YA ABORDADO" : "ABORDADO AHORA"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5 text-xs">
                <div className="bg-white/70 p-2.5 rounded-xl border border-black/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Asiento Asignado</span>
                  <span className="font-black text-base text-slate-900">#{resultado.asientoNumero}</span>
                </div>
                <div className="bg-white/70 p-2.5 rounded-xl border border-black/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ruta</span>
                  <span className="font-bold text-slate-900 truncate block">{resultado.origen} → {resultado.destino}</span>
                </div>
                <div className="bg-white/70 p-2.5 rounded-xl border border-black/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Unidad de Viaje</span>
                  <span className="font-bold text-slate-900">Unidad #{resultado.unidadNumero}</span>
                </div>
                <div className="bg-white/70 p-2.5 rounded-xl border border-black/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Hora Programada</span>
                  <span className="font-bold text-slate-900">{resultado.horaSalida}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MANIFIESTO DE PASAJEROS DEL VIAJE */}
        {manifiesto && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Manifiesto de Pasajeros ({manifiesto.totalBoletos})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control en tiempo real de abordaje en la unidad #{manifiesto.unidad}
                </p>
              </div>

              {/* Filtro de Pestañas */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setFiltroManifiesto("todos")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filtroManifiesto === "todos" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos ({manifiesto.totalBoletos})
                </button>
                <button
                  onClick={() => setFiltroManifiesto("abordados")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filtroManifiesto === "abordados" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Abordados ({manifiesto.boletosAbordados})
                </button>
                <button
                  onClick={() => setFiltroManifiesto("pendientes")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filtroManifiesto === "pendientes" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pendientes ({manifiesto.totalBoletos - manifiesto.boletosAbordados})
                </button>
              </div>
            </div>

            {boletosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No hay boletos en este filtro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Asiento</th>
                      <th className="py-3 px-4">Código Boleto</th>
                      <th className="py-3 px-4">Monto</th>
                      <th className="py-3 px-4">Estado Abordaje</th>
                      <th className="py-3 px-4 text-right">Acción Rápida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {boletosFiltrados.map((b) => {
                      const isAbordado = b.estado === "ABORDADO";
                      return (
                        <tr key={b.idBoleto} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-black text-slate-900 text-sm">
                            #{b.asientoNumero}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            {b.codigoBoleto}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            C$ {b.monto.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isAbordado
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isAbordado ? "bg-emerald-500" : "bg-amber-500"}`} />
                              {isAbordado ? "Abordado" : "Pendiente"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isAbordado && (
                              <button
                                onClick={() => {
                                  setCodigoInput(b.codigoBoleto);
                                  validarBoletoAction(b.idBoleto).then((res) => {
                                    if (res.success && res.data) {
                                      setResultado(res.data);
                                      setCodigoInput("");
                                      loadData();
                                    }
                                  });
                                }}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                Abordar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
