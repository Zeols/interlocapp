"use client";

import React, { useState } from "react";
import Link from "next/link";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiCashRegister,
  mdiQrcodeScan,
  mdiRefresh,
  mdiSeatPassenger,
  mdiHumanGreetingProximity,
  mdiTicketConfirmationOutline,
  mdiMapMarkerRadius,
  mdiCheckCircle,
  mdiClose,
  mdiLoading,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiPrinter,
} from "@mdi/js";
import {
  getPasajerosDescensoParadaAction,
  confirmarPasoParadaConDescensosAction,
} from "@/backend/actions/viajes";
import { venderBoletoABordoAction } from "@/backend/actions/ventas";
import { QRCodeOffline, encodeBoletoQRPayload } from "@/frontend/components/ui/QRCodeOffline";

interface AyudantePanelProps {
  viajeActivo: any;
  operacionAyudante: any;
  paradaActualIndex: number;
  session: any;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export function AyudanteOperationalPanel({
  viajeActivo,
  operacionAyudante,
  paradaActualIndex,
  session,
  onRefresh,
  loading,
}: AyudantePanelProps) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados Modal de Paso de Parada (Descenso)
  const [modalPasoParada, setModalPasoParada] = useState<{ index: number; parada: any } | null>(null);
  const [pasajerosDescenso, setPasajerosDescenso] = useState<any[]>([]);
  const [descendidosSeleccionados, setDescendidosSeleccionados] = useState<number[]>([]);
  const [loadingDescenso, setLoadingDescenso] = useState(false);
  const [confirmandoPaso, setConfirmandoPaso] = useState(false);

  // Estados Modal de Venta a Bordo
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [destinoSeleccionadoId, setDestinoSeleccionadoId] = useState<number | null>(
    operacionAyudante?.paradas?.[paradaActualIndex + 1]?.idPunto || null
  );
  const [tipoAsiento, setTipoAsiento] = useState<"ASIENTO" | "DE_PIE">("ASIENTO");
  const [asientoVentaId, setAsientoVentaId] = useState<number | null>(null);
  const [montoVenta, setMontoVenta] = useState<number>(
    operacionAyudante?.tarifas?.[0]?.monto || 50
  );
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>("");
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [ticketEmitido, setTicketEmitido] = useState<any | null>(null);

  const esFinalizado = viajeActivo?.estado === "FINALIZADO";
  const paradasList = viajeActivo?.paradas || [];
  const paradaActual = paradasList[paradaActualIndex];
  const proximaParada = paradasList[paradaActualIndex + 1];

  const capacidad = operacionAyudante?.capacidadTotal || 0;
  const aBordo = operacionAyudante?.pasajerosABordo || 0;
  const libres = operacionAyudante?.asientosDisponibles?.length || 0;
  const totalVendidos = operacionAyudante?.totalVendidos || 0;

  // Abrir modal de verificación al pasar de parada
  const handleAbrirModalParada = async (index: number, parada: any) => {
    if (!viajeActivo?.idViaje || esFinalizado) return;
    setModalPasoParada({ index, parada });
    setLoadingDescenso(true);
    try {
      const res = await getPasajerosDescensoParadaAction(viajeActivo.idViaje, parada.id);
      if (res.success && res.data) {
        setPasajerosDescenso(res.data);
        setDescendidosSeleccionados(res.data.map((p: any) => p.idBoleto));
      } else {
        setPasajerosDescenso([]);
        setDescendidosSeleccionados([]);
      }
    } catch (err) {
      console.error("Error al cargar descensos:", err);
      setPasajerosDescenso([]);
    } finally {
      setLoadingDescenso(false);
    }
  };

  // Confirmar paso de parada y liberar asientos
  const handleConfirmarPasoParada = async () => {
    if (!modalPasoParada || !viajeActivo?.idViaje) return;
    setConfirmandoPaso(true);
    try {
      const res = await confirmarPasoParadaConDescensosAction(
        viajeActivo.idViaje,
        modalPasoParada.parada.id,
        descendidosSeleccionados
      );
      if (res.success) {
        setModalPasoParada(null);
        setFeedback({
          type: "success",
          text: `Paso registrado en ${modalPasoParada.parada.nombre}. Asientos liberados para nuevas ventas.`,
        });
        await onRefresh();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo registrar el paso de parada." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de servidor al registrar paso de parada." });
    } finally {
      setConfirmandoPaso(false);
    }
  };

  // Emitir venta de boleto a bordo (en el camino)
  const handleEmitirVentaABordo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viajeActivo?.idViaje) return;
    setGuardandoVenta(true);
    setFeedback(null);
    try {
      const res = await venderBoletoABordoAction({
        idViaje: viajeActivo.idViaje,
        idPuntoDestino: destinoSeleccionadoId || undefined,
        idAsiento: tipoAsiento === "ASIENTO" ? (asientoVentaId || undefined) : null,
        monto: Number(montoVenta),
        efectivoRecibido: efectivoRecibido ? Number(efectivoRecibido) : undefined,
      });

      if (res.success && res.data) {
        setTicketEmitido(res.data);
        await onRefresh();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo emitir el boleto a bordo." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error de conexión al emitir boleto a bordo." });
    } finally {
      setGuardandoVenta(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Alerta de Feedback */}
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

      {/* Cabecera Operativa con Acciones Rápidas */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              <Icon path={mdiBus} size={0.7} />
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Panel Operativo de Ayudante
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Unidad: <strong className="text-slate-800">Bus #{viajeActivo?.busNumero || "S/A"}</strong> ({viajeActivo?.busPlaca || "N/A"}) · Operador: {session?.nombre || "Ayudante"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={!viajeActivo || esFinalizado}
            onClick={() => {
              setShowVentaModal(true);
              setTicketEmitido(null);
            }}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
          >
            <Icon path={mdiCashRegister} size={0.7} />
            <span>Vender Boleto a Bordo</span>
          </button>

          <Link
            href="/validar-boleto"
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <Icon path={mdiQrcodeScan} size={0.7} />
            <span>Escanear QR</span>
          </Link>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            title="Refrescar aforo"
          >
            <Icon path={mdiRefresh} size={0.7} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4 Métricas de Aforo y Capacidad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Aforo a Bordo</span>
            <Icon path={mdiSeatPassenger} size={0.7} className="text-slate-400" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            {aBordo} <span className="text-xs font-normal text-slate-500">/ {capacidad} cap.</span>
          </p>
          <p className="text-[11px] text-slate-500">Pasajeros actualmente en viaje</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Asientos Libres</span>
            <Icon path={mdiHumanGreetingProximity} size={0.7} className="text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-700">{libres}</p>
          <p className="text-[11px] text-slate-500">Disponibles para venta en ruta</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Boletos Turno</span>
            <Icon path={mdiTicketConfirmationOutline} size={0.7} className="text-slate-400" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{totalVendidos}</p>
          <p className="text-[11px] text-slate-500">Emitidos (Ventanilla + A bordo)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Próxima Parada</span>
            <Icon path={mdiMapMarkerRadius} size={0.7} className="text-primary" />
          </div>
          <p className="text-sm font-bold text-slate-900 truncate" title={proximaParada?.nombre || "Destino Final"}>
            {proximaParada?.nombre || "Destino Final"}
          </p>
          <p className="text-[11px] text-slate-500">Estación programada</p>
        </div>
      </div>

      {/* Sección de Ruta Activa y Paradas Interactivas */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                esFinalizado 
                  ? "bg-amber-50 text-amber-800 border-amber-200" 
                  : viajeActivo 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {esFinalizado ? "Viaje Finalizado" : viajeActivo ? "Viaje en Curso" : "Sin Viaje Asignado"}
              </span>

              {viajeActivo && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                  {viajeActivo.sentido || "IDA"}
                </span>
              )}

              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {viajeActivo?.rutaNombre || "No hay ruta activa asignada para hoy"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Toca la siguiente estación para verificar los pasajeros que descienden y liberar sus asientos.
            </p>
          </div>

          {proximaParada && !esFinalizado && (
            <button
              type="button"
              onClick={() => handleAbrirModalParada(paradaActualIndex + 1, proximaParada)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
            >
              <span>Avanzar a {proximaParada.nombre}</span>
            </button>
          )}
        </div>

        {!viajeActivo ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            No tienes un viaje o asignación activa en este momento. Comunícate con el administrador de la cooperativa si esto es un error.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {paradasList.map((parada: any, index: number) => {
                const isPassedOrCurrent = index <= paradaActualIndex;
                const isCurrent = index === paradaActualIndex;

                return (
                  <button
                    key={parada.id}
                    disabled={esFinalizado}
                    onClick={() => handleAbrirModalParada(index, parada)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                      esFinalizado
                        ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-90 shadow-none"
                        : isCurrent
                        ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10 cursor-pointer"
                        : isPassedOrCurrent
                        ? "bg-slate-800 text-white border-slate-800 cursor-pointer"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isCurrent || isPassedOrCurrent || esFinalizado ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        #{index + 1}
                      </span>
                      {isCurrent && !esFinalizado ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Estación Actual
                        </span>
                      ) : isPassedOrCurrent || esFinalizado ? (
                        <Icon path={mdiCheckCircle} size={0.6} className="text-emerald-400" />
                      ) : null}
                    </div>
                    <p className="text-xs font-bold leading-snug line-clamp-2">
                      {parada.nombre}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                {esFinalizado ? (
                  <strong className="text-amber-800">Viaje concluido. En espera de una nueva asignación de ruta.</strong>
                ) : (
                  <span>Estación actual: <strong className="text-slate-900">{paradaActual?.nombre}</strong></span>
                )}
              </span>
              <span className="text-emerald-700 font-bold">
                Sincronizado con base de datos
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: VERIFICACIÓN AL PASAR DE PARADA (DESCENSO DE PASAJEROS) */}
      {modalPasoParada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800">
                  <Icon path={mdiMapMarkerRadius} size={0.7} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Confirmar Arribo a Estación
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Estación: <strong className="text-slate-800">{modalPasoParada.parada.nombre}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPasoParada(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.65} />
              </button>
            </div>

            {loadingDescenso ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Consultando pasajeros con destino en esta parada...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Pasajeros que descienden aquí:</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {pasajerosDescenso.length} pasajeros
                  </span>
                </div>

                {pasajerosDescenso.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 text-center text-xs text-slate-500">
                    Ningún boleto registrado tiene programado descender en esta parada.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {pasajerosDescenso.map((p) => {
                      const isChecked = descendidosSeleccionados.includes(p.idBoleto);
                      return (
                        <label
                          key={p.idBoleto}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDescendidosSeleccionados((prev) => [...prev, p.idBoleto]);
                                } else {
                                  setDescendidosSeleccionados((prev) => prev.filter((id) => id !== p.idBoleto));
                                }
                              }}
                              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-400"
                            />
                            <span className="font-mono text-slate-500 text-[11px]">{p.codigoBoleto}</span>
                          </div>
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            Asiento #{p.asientoNumero}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <p className="font-semibold">Liberación de Asientos:</p>
                  <p className="text-amber-800">
                    Al confirmar el arribo, los asientos de los pasajeros seleccionados quedarán libres de inmediato para permitir nuevas ventas a bordo.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalPasoParada(null)}
                disabled={confirmandoPaso}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmandoPaso || loadingDescenso}
                onClick={handleConfirmarPasoParada}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {confirmandoPaso && <Icon path={mdiLoading} size={0.6} className="animate-spin" />}
                <span>{confirmandoPaso ? "Registrando paso..." : "Confirmar Paso y Descenso"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VENTA DE BOLETO A BORDO (EN EL CAMINO) */}
      {showVentaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Icon path={mdiCashRegister} size={0.7} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Venta de Boleto a Bordo
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cobro directo en ruta para pasajeros en camino
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVentaModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.65} />
              </button>
            </div>

            {ticketEmitido ? (
              /* Ticket Recién Emitido con Código QR Offline */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center">
                  <p className="font-bold text-slate-900 text-sm uppercase">{ticketEmitido.cooperativaNombre}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Comprobante Oficial a Bordo</p>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-1">{ticketEmitido.codigoBoleto}</p>

                  <div className="my-3 p-2 bg-white rounded-lg border border-slate-200">
                    <QRCodeOffline
                      value={encodeBoletoQRPayload({
                        idBoleto: ticketEmitido.idBoleto,
                        codigoBoleto: ticketEmitido.codigoBoleto,
                        asiento: ticketEmitido.asiento,
                      })}
                      size={140}
                      alt="QR Boleto a Bordo"
                    />
                  </div>

                  <div className="w-full text-xs space-y-1 text-slate-700 border-t border-dashed border-slate-200 pt-2 font-mono">
                    <div className="flex justify-between">
                      <span>Destino:</span>
                      <strong className="text-slate-900">{ticketEmitido.destino}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Ubicación:</span>
                      <strong className="text-slate-900">
                        {ticketEmitido.asiento === "De pie" ? "De pie (Sin asiento)" : `Asiento #${ticketEmitido.asiento}`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Cobrado:</span>
                      <strong className="text-emerald-700">C$ {ticketEmitido.monto.toFixed(2)}</strong>
                    </div>
                    {ticketEmitido.cambio > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Cambio Entregado:</span>
                        <span>C$ {ticketEmitido.cambio.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTicketEmitido(null)}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    Emitir Otro Boleto
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVentaModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              /* Formulario de Emisión */
              <form onSubmit={handleEmitirVentaABordo} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Estación de Destino:</label>
                  <select
                    value={destinoSeleccionadoId || ""}
                    onChange={(e) => {
                      const pId = Number(e.target.value);
                      setDestinoSeleccionadoId(pId);
                      const matchTarifa = operacionAyudante?.tarifas?.find((t: any) => t.idPuntoDestino === pId);
                      if (matchTarifa) {
                        setMontoVenta(matchTarifa.monto);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    {operacionAyudante?.paradas?.map((p: any) => (
                      <option key={p.idPunto} value={p.idPunto}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modalidad de Asiento: Asiento Asignado vs De Pie */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Modalidad de Pasaje:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoAsiento("ASIENTO")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        tipoAsiento === "ASIENTO"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Con Asiento Asignado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoAsiento("DE_PIE");
                        setAsientoVentaId(null);
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        tipoAsiento === "DE_PIE"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      De Pie (Tramo Corto)
                    </button>
                  </div>
                </div>

                {tipoAsiento === "ASIENTO" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Seleccionar Asiento Libre ({operacionAyudante?.asientosDisponibles?.length || 0} disponibles):
                    </label>
                    {operacionAyudante?.asientosDisponibles?.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        Todos los asientos están ocupados. Selecciona la modalidad &quot;De Pie&quot; para continuar.
                      </p>
                    ) : (
                      <select
                        value={asientoVentaId || ""}
                        onChange={(e) => setAsientoVentaId(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-400"
                      >
                        <option value="">Seleccionar número de asiento...</option>
                        {operacionAyudante?.asientosDisponibles?.map((a: any) => (
                          <option key={a.idAsiento} value={a.idAsiento}>
                            Asiento #{a.numero}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Monto Pasaje (C$):</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={montoVenta}
                      onChange={(e) => setMontoVenta(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Efectivo Recibido (C$):</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ej: 100"
                      value={efectivoRecibido}
                      onChange={(e) => setEfectivoRecibido(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                {efectivoRecibido && Number(efectivoRecibido) >= montoVenta && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
                    <span className="text-emerald-800 font-semibold">Cambio / Vuelto:</span>
                    <strong className="text-emerald-900 text-sm">
                      C$ {(Number(efectivoRecibido) - montoVenta).toFixed(2)}
                    </strong>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowVentaModal(false)}
                    disabled={guardandoVenta}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoVenta || (tipoAsiento === "ASIENTO" && !asientoVentaId)}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {guardandoVenta && <Icon path={mdiLoading} size={0.6} className="animate-spin" />}
                    <span>{guardandoVenta ? "Emitiendo..." : "Emitir Boleto a Bordo"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

