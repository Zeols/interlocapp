"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiCashRegister,
  mdiBus,
  mdiMapMarker,
  mdiClockOutline,
  mdiTicketConfirmationOutline,
  mdiPrinter,
  mdiCheckCircleOutline,
  mdiRefresh,
  mdiPlus,
  mdiMinus,
  mdiCashMultiple,
  mdiClose,
  mdiShieldCheckOutline,
} from "@mdi/js";
import {
  getSalidasDelDiaTaquillaAction,
  getAsientosSalidaTaquillaAction,
  venderBoletosTaquillaAction,
  SalidaTaquillaItem,
  AsientoTaquillaItem,
  ResultadoVentaTaquilla,
} from "@/backend/actions/taquilla";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { QRCodeOffline, encodeBoletoQRPayload } from "@/frontend/components/ui/QRCodeOffline";

export default function PosPage() {
  const { formatPrice, currency, exchangeRate } = useCurrency();
  const [salidas, setSalidas] = useState<SalidaTaquillaItem[]>([]);
  const [salidaSeleccionada, setSalidaSeleccionada] = useState<SalidaTaquillaItem | null>(null);
  const [asientos, setAsientos] = useState<AsientoTaquillaItem[]>([]);
  const [asientosSeleccionados, setAsientosSeleccionados] = useState<number[]>([]);
  const [equipajeBultos, setEquipajeBultos] = useState(0);
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>("");
  const [loadingSalidas, setLoadingSalidas] = useState(true);
  const [loadingAsientos, setLoadingAsientos] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const [reciboVenta, setReciboVenta] = useState<ResultadoVentaTaquilla | null>(null);

  const PRECIO_EQUIPAJE = 50;

  // Cargar salidas del día
  const cargarSalidas = async () => {
    setLoadingSalidas(true);
    try {
      const res = await getSalidasDelDiaTaquillaAction();
      if (res.success && res.data) {
        setSalidas(res.data);
        if (res.data.length > 0 && !salidaSeleccionada) {
          seleccionarSalida(res.data[0]);
        }
      }
    } catch (err) {
      console.error("Error al cargar salidas:", err);
    } finally {
      setLoadingSalidas(false);
    }
  };

  useEffect(() => {
    cargarSalidas();
  }, []);

  // Seleccionar salida y cargar sus asientos
  const seleccionarSalida = async (salida: SalidaTaquillaItem) => {
    setSalidaSeleccionada(salida);
    setAsientosSeleccionados([]);
    setEquipajeBultos(0);
    setEfectivoRecibido("");
    setErrorVenta(null);
    setLoadingAsientos(true);

    try {
      const res = await getAsientosSalidaTaquillaAction(salida.idViaje);
      if (res.success && res.data) {
        setAsientos(res.data);
      }
    } catch (err) {
      console.error("Error al cargar asientos:", err);
    } finally {
      setLoadingAsientos(false);
    }
  };

  // Alternar selección de asiento
  const toggleAsiento = (idAsiento: number) => {
    setErrorVenta(null);
    if (asientosSeleccionados.includes(idAsiento)) {
      setAsientosSeleccionados((prev) => prev.filter((id) => id !== idAsiento));
    } else {
      setAsientosSeleccionados((prev) => [...prev, idAsiento]);
    }
  };

  // Cálculos de importes
  const precioUnitario = salidaSeleccionada?.precioBase || 85;
  const subtotalBoletos = asientosSeleccionados.length * precioUnitario;
  const subtotalEquipaje = equipajeBultos * PRECIO_EQUIPAJE;
  const totalACobrar = subtotalBoletos + subtotalEquipaje;

  const efectivoNum = parseFloat(efectivoRecibido) || 0;
  const cambio = Math.max(0, efectivoNum - totalACobrar);
  const esEfectivoSuficiente = efectivoNum >= totalACobrar && totalACobrar > 0;

  // Manejo de botones de denominación rápida
  const aplicarDenominacion = (monto: number) => {
    setEfectivoRecibido(String(monto));
  };

  const aplicarExacto = () => {
    setEfectivoRecibido(String(totalACobrar));
  };

  // Ejecución de la venta y emisión térmica
  const handleCobrar = async () => {
    if (!salidaSeleccionada || asientosSeleccionados.length === 0) return;
    if (!esEfectivoSuficiente) {
      setErrorVenta("El efectivo recibido es insuficiente.");
      return;
    }

    setProcesandoVenta(true);
    setErrorVenta(null);

    try {
      const asientosPayload = asientosSeleccionados.map((id) => {
        const item = asientos.find((a) => a.idAsiento === id);
        return {
          idAsiento: id,
          numero: item ? item.numero : String(id),
          monto: precioUnitario,
        };
      });

      const res = await venderBoletosTaquillaAction({
        idViaje: salidaSeleccionada.idViaje,
        asientos: asientosPayload,
        equipajeCantidad: equipajeBultos,
        equipajeMonto: subtotalEquipaje,
        efectivoRecibido: efectivoNum,
      });

      if (!res.success || !res.data) {
        setErrorVenta(res.error || "Ocurrió un error al procesar la venta.");
        setProcesandoVenta(false);
        return;
      }

      setReciboVenta(res.data);
      // Recargar mapa de asientos para reflejar los recién vendidos
      seleccionarSalida(salidaSeleccionada);
    } catch (err: any) {
      setErrorVenta(err.message || "Error al completar la venta.");
    } finally {
      setProcesandoVenta(false);
    }
  };

  const cerrarRecibo = () => {
    setReciboVenta(null);
    setAsientosSeleccionados([]);
    setEquipajeBultos(0);
    setEfectivoRecibido("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Taquilla */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon path={mdiCashRegister} size={0.9} className="text-slate-800" />
            <span>Taquilla POS (Punto de Venta)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Emisión inmediata de pasajes y vouchers térmicos con código QR.
          </p>
        </div>

        <button
          onClick={cargarSalidas}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
        >
          <Icon path={mdiRefresh} size={0.65} />
          Actualizar salidas
        </button>
      </div>

      {/* Selector de Salidas del Día */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Seleccionar salida activa
        </label>
        {loadingSalidas ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-64 bg-slate-200 rounded-xl animate-pulse shrink-0" />
            ))}
          </div>
        ) : salidas.length === 0 ? (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
            No hay salidas programadas para hoy. Programa una salida en el módulo de Salidas y Despacho.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {salidas.map((s) => {
              const isSelected = salidaSeleccionada?.idViaje === s.idViaje;
              return (
                <div
                  key={s.idViaje}
                  onClick={() => seleccionarSalida(s)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer shrink-0 w-64 text-left shadow-2xs ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-mono font-bold ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      {s.horaSalida}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-500"
                          : s.asientosDisponibles > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {s.asientosDisponibles} disp.
                    </span>
                  </div>
                  <h4 className="font-bold text-sm truncate">
                    {s.origen} → {s.destino}
                  </h4>
                  <div className={`flex items-center justify-between text-[11px] mt-2 pt-2 border-t ${isSelected ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-500"}`}>
                    <span>Bus #{s.unidadNumero}</span>
                    <span className="font-bold">{formatPrice(s.precioBase)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Principal: Croquis a la Izquierda | Calculadora a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Croquis Interactivo de Asientos */}
        <div className="lg:col-span-7 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Croquis de la Unidad</h3>
              <p className="text-xs text-slate-500">Toca los asientos para asignarlos al cliente.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-white border border-slate-300" /> Disp.
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Selec.
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300" /> Ocup.
              </span>
            </div>
          </div>

          {loadingAsientos ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-xs sm:text-sm animate-pulse">
              Cargando distribución de asientos...
            </div>
          ) : asientos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs sm:text-sm">
              Selecciona una salida para ver los asientos.
            </div>
          ) : (
            <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-xl">
              {/* Parabrisas del bus */}
              <div className="w-full bg-slate-200 text-slate-600 font-semibold text-[10px] uppercase py-1.5 rounded-lg text-center mb-5 tracking-wider">
                Frente del autobús / Cabina de conducción
              </div>

              {/* Grid 4 columnas (2 izquierda, pasillo virtual, 2 derecha) */}
              <div className="grid grid-cols-4 gap-2.5">
                {asientos.map((asiento, index) => {
                  const isSelected = asientosSeleccionados.includes(asiento.idAsiento);
                  const isOcupado = asiento.estado === "OCUPADO";

                  return (
                    <button
                      key={asiento.idAsiento}
                      disabled={isOcupado}
                      onClick={() => toggleAsiento(asiento.idAsiento)}
                      className={`h-12 rounded-lg flex flex-col items-center justify-center font-bold text-xs transition-all cursor-pointer shadow-2xs ${
                        isOcupado
                          ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                          : isSelected
                          ? "bg-emerald-600 text-white shadow-xs border border-emerald-700"
                          : "bg-white text-slate-800 border border-slate-300 hover:border-slate-400"
                      } ${index % 4 === 1 ? "mr-2" : ""}`}
                    >
                      <span className="text-[10px] opacity-75 font-medium">Asiento</span>
                      <span className="text-xs sm:text-sm font-bold">#{asiento.numero}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opciones Adicionales: Equipaje */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Equipaje extra en bodega</span>
              <span className="text-[11px] text-slate-500">+ C$ 50.00 por bulto</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-0.5 rounded-lg">
              <button
                disabled={equipajeBultos === 0}
                onClick={() => setEquipajeBultos((prev) => Math.max(0, prev - 1))}
                className="w-7 h-7 rounded-md bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                <Icon path={mdiMinus} size={0.6} />
              </button>
              <span className="w-7 text-center font-bold text-xs sm:text-sm text-slate-800">
                {equipajeBultos}
              </span>
              <button
                onClick={() => setEquipajeBultos((prev) => prev + 1)}
                className="w-7 h-7 rounded-md bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <Icon path={mdiPlus} size={0.6} />
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Teclado de Cobro y Caja Registradora */}
        <div className="lg:col-span-5 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Liquidación en Caja
            </h3>

            {/* Resumen del cobro */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Salida:</span>
                <span className="font-semibold text-slate-900">
                  {salidaSeleccionada ? `${salidaSeleccionada.origen} → ${salidaSeleccionada.destino}` : "Sin seleccionar"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Asientos seleccionados:</span>
                <span className="font-semibold text-slate-900">
                  {asientosSeleccionados.length > 0 ? `${asientosSeleccionados.length} asiento(s)` : "Ninguno"}
                </span>
              </div>
              {equipajeBultos > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Equipaje extra ({equipajeBultos}):</span>
                  <span className="font-semibold text-slate-900">C$ {subtotalEquipaje.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs sm:text-sm">
                <span className="font-bold text-slate-700">Total a Pagar:</span>
                <span className="text-lg sm:text-xl font-bold text-slate-900">C$ {totalACobrar.toFixed(2)}</span>
              </div>
            </div>

            {/* Botones de Denominación Rápida */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Efectivo entregado (Denominaciones Rápidas)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={aplicarExacto}
                  className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Exacto
                </button>
                {[50, 100, 200, 500, 1000].map((den) => (
                  <button
                    key={den}
                    type="button"
                    onClick={() => aplicarDenominacion(den)}
                    className="py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    C$ {den}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Manual de Efectivo */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Efectivo Recibido (C$)
              </label>
              <input
                type="number"
                step="any"
                value={efectivoRecibido}
                onChange={(e) => setEfectivoRecibido(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-slate-900 rounded-lg text-lg font-bold text-slate-900 outline-none transition-colors"
              />
            </div>

            {/* Indicador Visual de Cambio / Vuelto */}
            <div
              className={`p-3.5 rounded-lg border text-center transition-all ${
                esEfectivoSuficiente
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider block">
                {esEfectivoSuficiente ? "Cambio a entregar" : "Esperando pago"}
              </span>
              <span className="text-xl font-bold">
                C$ {cambio.toFixed(2)}
              </span>
            </div>

            {errorVenta && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
                {errorVenta}
              </div>
            )}
          </div>

          {/* Botón Principal de Cobro */}
          <button
            type="button"
            disabled={!esEfectivoSuficiente || procesandoVenta || asientosSeleccionados.length === 0}
            onClick={handleCobrar}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <Icon path={mdiPrinter} size={0.75} />
            {procesandoVenta ? "Emitiendo boletos..." : "Cobrar e Imprimir Boleto"}
          </button>
        </div>
      </div>

      {/* Modal de Voucher Térmico Imprimible (58mm / 80mm) */}
      {reciboVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 sm:p-6 shadow-2xl relative border border-slate-200 flex flex-col items-center">
            <button
              onClick={cerrarRecibo}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Icon path={mdiClose} size={0.7} />
            </button>

            {/* Recibo Térmico Físico Estilizado */}
            <div id="voucher-termico" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-xs text-slate-800 space-y-2 mb-4">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-sm uppercase">{reciboVenta.cooperativa}</p>
                <p className="text-[10px] text-slate-500">Comprobante de Viaje Oficial</p>
                <p className="text-[10px] text-slate-500">Terminal de Transporte Interlocal</p>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span>Recibo:</span>
                  <span className="font-bold">{reciboVenta.codigoVenta}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fecha:</span>
                  <span>{reciboVenta.fechaSalida}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hora Salida:</span>
                  <span className="font-bold">{reciboVenta.horaSalida}</span>
                </div>
                <div className="flex justify-between">
                  <span>Trayecto:</span>
                  <span className="font-bold">{reciboVenta.origen} - {reciboVenta.destino}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unidad:</span>
                  <span>Bus #{reciboVenta.unidadNumero} ({reciboVenta.unidadPlaca})</span>
                </div>
                <div className="flex justify-between">
                  <span>Taquillero:</span>
                  <span>{reciboVenta.taquillero}</span>
                </div>
              </div>

              {/* Boletos emitidos */}
              <div className="py-2 border-y border-dashed border-slate-300 space-y-1">
                <p className="font-bold text-[10px] uppercase">Boletos Emitidos:</p>
                {reciboVenta.boletos.map((b) => (
                  <div key={b.idBoleto} className="flex justify-between text-[11px]">
                    <span>Asiento #{b.numeroAsiento} ({b.codigoBoleto})</span>
                    <span className="font-bold">C$ {b.monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totales y Cambio */}
              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL COBRADO:</span>
                  <span>C$ {reciboVenta.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Efectivo recibido:</span>
                  <span>C$ {reciboVenta.efectivoRecibido.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cambio entregado:</span>
                  <span className="font-bold">C$ {reciboVenta.cambio.toFixed(2)}</span>
                </div>
              </div>

              {/* QR térmico escaneable 100% offline */}
              <div className="pt-3 text-center border-t border-dashed border-slate-300 flex flex-col items-center">
                <div className="w-24 h-24 bg-white border border-slate-300 p-1.5 rounded-lg flex items-center justify-center">
                  <QRCodeOffline
                    value={
                      reciboVenta.boletos.length > 0
                        ? encodeBoletoQRPayload({
                            idBoleto: reciboVenta.boletos[0].idBoleto,
                            codigoBoleto: reciboVenta.boletos[0].codigoBoleto,
                            asiento: reciboVenta.boletos[0].numeroAsiento,
                          })
                        : reciboVenta.codigoVenta
                    }
                    size={84}
                    alt="Voucher QR"
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-1">Escanee al abordar la unidad</span>
              </div>
            </div>

            {/* Botones de acción del modal */}
            <div className="w-full space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Icon path={mdiPrinter} size={0.7} />
                Imprimir Ticket Térmico
              </button>
              <button
                onClick={cerrarRecibo}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
