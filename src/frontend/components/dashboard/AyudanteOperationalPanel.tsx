"use client";

import React, { useState, useEffect } from "react";
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
  mdiCashCheck,
  mdiInformationOutline,
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

  // Ley de Parkinson: Preselección automática del primer asiento libre disponible
  useEffect(() => {
    if (showVentaModal && tipoAsiento === "ASIENTO" && !asientoVentaId) {
      if (operacionAyudante?.asientosDisponibles?.length > 0) {
        setAsientoVentaId(operacionAyudante.asientosDisponibles[0].idAsiento);
      }
    }
  }, [showVentaModal, tipoAsiento, operacionAyudante]);

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

  // Emitir venta de boleto a bordo
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
        setEfectivoRecibido("");
        setAsientoVentaId(null);
        await onRefresh();
      } else {
        setFeedback({ type: "error", text: res.error || "No se pudo registrar la venta a bordo." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error al procesar la venta." });
    } finally {
      setGuardandoVenta(false);
    }
  };

  const handleToggleSeleccionDescenso = (idBoleto: number) => {
    setDescendidosSeleccionados((prev) =>
      prev.includes(idBoleto) ? prev.filter((id) => id !== idBoleto) : [...prev, idBoleto]
    );
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              path={feedback.type === "success" ? mdiCheckCircleOutline : mdiAlertCircleOutline}
              size={0.75}
              className={feedback.type === "success" ? "text-emerald-600 shrink-0" : "text-rose-600 shrink-0"}
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

      {/* Cabecera Operativa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiBus} size={0.85} className="text-primary" />
            Panel Operativo de Ayudante en Ruta
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control de aforo en carretera, descensos por parada y venta de boletos en ruta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTicketEmitido(null);
              setShowVentaModal(true);
            }}
            disabled={!viajeActivo || esFinalizado}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Icon path={mdiCashRegister} size={0.65} />
            <span>Vender Boleto en Ruta</span>
          </button>

          <Link
            href="/validar-boleto"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Icon path={mdiQrcodeScan} size={0.65} />
            <span>Validar QR</span>
          </Link>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            title="Refrescar estado"
          >
            <Icon path={mdiRefresh} size={0.7} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4 Métricas de Aforo y Ocupación (Ley de Miller: 4 unidades significativas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pasajeros a Bordo</span>
            <Icon path={mdiSeatPassenger} size={0.65} className="text-slate-700" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{aBordo}</span>
            <span className="text-xs text-slate-400 font-medium">/ {capacidad} cap.</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Ocupación en tiempo real</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Asientos Libres</span>
            <Icon path={mdiCheckCircle} size={0.65} className="text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-700">{libres}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Disponibles para venta</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Boletos Turno</span>
            <Icon path={mdiTicketConfirmationOutline} size={0.65} className="text-slate-700" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{totalVendidos}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Taquilla + cobros a bordo</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Próxima Parada</span>
            <Icon path={mdiMapMarkerRadius} size={0.65} className="text-primary" />
          </div>
          <span className="text-sm font-bold text-slate-900 truncate block mt-1">
            {proximaParada?.nombre || (esFinalizado ? "Destino Final" : "En Terminal")}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            {proximaParada ? `Parada #${paradaActualIndex + 2}` : "Viaje completado"}
          </span>
        </div>
      </div>

      {/* Recorrido de Paradas con Modal de Verificación */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Estaciones de la Ruta ({paradasList.length} Puntos)
            </h3>
            <p className="text-xs text-slate-500">
              Toca una parada para registrar descensos de pasajeros y liberar asientos automáticamente.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {viajeActivo?.busNumero ? `Unidad #${viajeActivo.busNumero}` : "Sin Unidad"}
          </span>
        </div>

        {paradasList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No hay ruta asignada o el viaje no contiene puntos de control intermedios.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paradasList.map((parada: any, idx: number) => {
              const esPasada = idx <= paradaActualIndex;
              const esSiguiente = idx === paradaActualIndex + 1;

              return (
                <div
                  key={parada.id}
                  className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    esPasada
                      ? "bg-slate-50/80 border-slate-200 text-slate-600"
                      : esSiguiente
                      ? "bg-white border-primary/60 ring-1 ring-primary/20 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        esPasada
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : esSiguiente
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate text-slate-900">{parada.nombre}</p>
                      <p className="text-[10px] text-slate-400">
                        {esPasada ? "Completada" : esSiguiente ? "Siguiente parada" : "En camino"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAbrirModalParada(idx, parada)}
                    disabled={esFinalizado}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                      esSiguiente
                        ? "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {esPasada ? "Revisar" : "Llegar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: VERIFICACIÓN AL PASAR DE PARADA (DESCENSO Y LIBERACIÓN DE ASIENTOS) */}
      {modalPasoParada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-slate-100 text-slate-800">
                  <Icon path={mdiMapMarkerRadius} size={0.7} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Llegada a {modalPasoParada.parada.nombre}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confirma los pasajeros que bajan en esta estación
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
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Icon path={mdiLoading} size={0.7} className="animate-spin" />
                <span>Consultando lista de descensos...</span>
              </div>
            ) : pasajerosDescenso.length === 0 ? (
              /* Ley de Miller: Información clara y estructurada */
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center space-y-1">
                <p className="font-bold text-xs text-slate-800">Ningún pasajero tiene destino en esta parada</p>
                <p className="text-[11px] text-slate-500">
                  Todos los pasajeros a bordo continúan hacia estaciones posteriores.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                  <span>Pasajeros con boleto a esta parada ({pasajerosDescenso.length})</span>
                  <span>Seleccionar para liberar</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {pasajerosDescenso.map((pasajero: any) => {
                    const isChecked = descendidosSeleccionados.includes(pasajero.idBoleto);
                    return (
                      <div
                        key={pasajero.idBoleto}
                        onClick={() => handleToggleSeleccionDescenso(pasajero.idBoleto)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs">{pasajero.nombrePasajero || "Pasajero a bordo"}</p>
                          <p className="text-[10px] font-mono text-slate-500">
                            Boleto #{pasajero.codigoBoleto} · Asiento #{pasajero.asientoNumero || "De pie"}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-slate-900 border-slate-300 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalPasoParada(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmandoPaso || loadingDescenso}
                onClick={handleConfirmarPasoParada}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
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
              /* Ticket Emitido con Estructuración Clave-Valor (Ley de Miller) */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center">
                  <p className="font-bold text-slate-900 text-sm uppercase">{ticketEmitido.cooperativaNombre}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Comprobante Oficial a Bordo</p>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-1">{ticketEmitido.codigoBoleto}</p>

                  <div className="my-3 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
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

                  {/* Chunking de Especificaciones del Boleto */}
                  <div className="w-full text-xs space-y-1.5 text-slate-700 border-t border-slate-200 pt-2.5">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-500">Destino:</span>
                      <strong className="text-slate-900">{ticketEmitido.destino}</strong>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-500">Ubicación:</span>
                      <strong className="text-slate-900">
                        {ticketEmitido.asiento === "De pie" ? "De pie (Sin asiento)" : `Asiento #${ticketEmitido.asiento}`}
                      </strong>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-500">Monto Cobrado:</span>
                      <strong className="text-emerald-700">C$ {ticketEmitido.monto.toFixed(2)}</strong>
                    </div>
                    {ticketEmitido.cambio > 0 && (
                      <div className="flex justify-between py-0.5 text-slate-600 font-semibold">
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
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-2xs"
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
              <form onSubmit={handleEmitirVentaABordo} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Estación de Destino:</label>
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    {operacionAyudante?.paradas?.map((p: any) => (
                      <option key={p.idPunto} value={p.idPunto}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modalidad de Asiento (Ley de Hick: 2 opciones claras) */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Modalidad de Pasaje:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoAsiento("ASIENTO")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        tipoAsiento === "ASIENTO"
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
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
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      De Pie (Tramo Corto)
                    </button>
                  </div>
                </div>

                {tipoAsiento === "ASIENTO" && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">
                      Asiento ({operacionAyudante?.asientosDisponibles?.length || 0} disponibles):
                    </label>
                    {operacionAyudante?.asientosDisponibles?.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        Todos los asientos están ocupados. Selecciona la modalidad &quot;De Pie&quot; para continuar.
                      </p>
                    ) : (
                      <select
                        value={asientoVentaId || ""}
                        onChange={(e) => setAsientoVentaId(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
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
                    <label className="font-semibold text-slate-700">Monto Pasaje (C$):</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={montoVenta}
                      onChange={(e) => setMontoVenta(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Efectivo Recibido (C$):</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ej: 100"
                      value={efectivoRecibido}
                      onChange={(e) => setEfectivoRecibido(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Ley de Parkinson: Rellenado automático y sugerencias de cobro rápido */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Cobro Rápido:
                  </span>
                  {[montoVenta, 100, 200, 500]
                    .filter((val, idx, arr) => val >= montoVenta && arr.indexOf(val) === idx)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEfectivoRecibido(String(val))}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                          Number(efectivoRecibido) === val
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        }`}
                      >
                        {val === montoVenta ? "Exacto" : `C$ ${val}`}
                      </button>
                    ))}
                </div>

                {efectivoRecibido && Number(efectivoRecibido) >= montoVenta && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
                    <span className="text-emerald-800 font-semibold">Cambio / Vuelto a Entregar:</span>
                    <strong className="text-emerald-900 text-sm font-black">
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
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
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
