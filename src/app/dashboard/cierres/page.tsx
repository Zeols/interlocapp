"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiCashCheck,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiRefresh,
  mdiLockCheckOutline,
  mdiCashMultiple,
  mdiReceiptTextOutline,
  mdiCalculator,
  mdiTicketConfirmationOutline,
  mdiBusSide,
  mdiInformationOutline,
} from "@mdi/js";
import {
  getArqueoEnVivoAction,
  cerrarJornadaAction,
  getHistorialCierresAction,
  ResumenArqueoEnVivo,
  CierreJornadaItem,
  DenominacionConteo,
} from "@/backend/actions/cierres";
import { useCurrency } from "@/frontend/context/CurrencyContext";

const DENOMINACIONES_BASE: { valor: number; tipo: "BILLETE" | "MONEDA"; label: string }[] = [
  { valor: 1000, tipo: "BILLETE", label: "Billete C$ 1,000" },
  { valor: 500, tipo: "BILLETE", label: "Billete C$ 500" },
  { valor: 200, tipo: "BILLETE", label: "Billete C$ 200" },
  { valor: 100, tipo: "BILLETE", label: "Billete C$ 100" },
  { valor: 50, tipo: "BILLETE", label: "Billete C$ 50" },
  { valor: 20, tipo: "BILLETE", label: "Billete C$ 20" },
  { valor: 10, tipo: "BILLETE", label: "Billete C$ 10" },
  { valor: 5, tipo: "MONEDA", label: "Moneda C$ 5" },
  { valor: 1, tipo: "MONEDA", label: "Moneda C$ 1" },
];

export default function CierresPage() {
  const { formatPrice } = useCurrency();
  const [arqueo, setArqueo] = useState<ResumenArqueoEnVivo | null>(null);
  const [historial, setHistorial] = useState<CierreJornadaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [cierreExitoso, setCierreExitoso] = useState<CierreJornadaItem | null>(null);

  // Modo de conteo: "PESO_A_PESO" o "MANUAL"
  const [modoConteo, setModoConteo] = useState<"PESO_A_PESO" | "MANUAL">("PESO_A_PESO");

  // Estado para conteo detallado por denominación
  const [cantidades, setCantidades] = useState<Record<number, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });

  // Estado para conteo manual directo
  const [montoManual, setMontoManual] = useState<string>("");

  // Justificación obligatoria en caso de faltante
  const [observaciones, setObservaciones] = useState<string>("");

  const cargarDatos = async () => {
    setLoading(true);
    setErrorCierre(null);
    try {
      const [resArqueo, resHist] = await Promise.all([
        getArqueoEnVivoAction(),
        getHistorialCierresAction(),
      ]);

      if (resArqueo.success && resArqueo.data) {
        setArqueo(resArqueo.data);
      }
      if (resHist.success && resHist.data) {
        setHistorial(resHist.data);
      }
    } catch (err) {
      console.error("Error al cargar arqueo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCantidadChange = (denominacion: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    setCantidades((prev) => ({
      ...prev,
      [denominacion]: isNaN(val) || val < 0 ? 0 : val,
    }));
  };

  // Cálculo del total físico según el modo
  const totalDetallado = useMemo(() => {
    return Object.entries(cantidades).reduce((acc, [denom, cant]) => {
      return acc + Number(denom) * (cant || 0);
    }, 0);
  }, [cantidades]);

  const totalFisico = modoConteo === "PESO_A_PESO" ? totalDetallado : parseFloat(montoManual) || 0;
  const tieneConteo = modoConteo === "PESO_A_PESO" ? totalDetallado > 0 : montoManual.trim().length > 0;

  // Cuadre matemático
  const esperado = arqueo?.montoEsperado || 0;
  const diferencia = totalFisico - esperado;
  const esCuadreExacto = Math.abs(diferencia) <= 0.05 && tieneConteo;
  const esFaltante = diferencia < -0.05 && tieneConteo;
  const esSobrante = diferencia > 0.05 && tieneConteo;

  // Validación de cierre
  const faltaJustificacion = esFaltante && observaciones.trim().length < 5;

  const handleCerrarJornada = async () => {
    if (!tieneConteo) {
      setErrorCierre("Ingrese el conteo de efectivo físico antes de liquidar la jornada.");
      return;
    }

    if (esFaltante && faltaJustificacion) {
      setErrorCierre("Existe un faltante en caja. Ingrese una justificación obligatoria.");
      return;
    }

    if (
      !confirm(
        `¿Confirmas el cierre definitivo de caja?\n\n` +
          `Monto Esperado: C$ ${esperado.toFixed(2)}\n` +
          `Efectivo Entregado: C$ ${totalFisico.toFixed(2)}\n` +
          `Diferencia: ${diferencia >= 0 ? "+" : ""}${diferencia.toFixed(2)}\n\n` +
          `Esta acción archivará los gastos pendientes y sellará la jornada contable.`
      )
    ) {
      return;
    }

    setCerrando(true);
    setErrorCierre(null);

    try {
      const desgloseList: DenominacionConteo[] = DENOMINACIONES_BASE.map((d) => ({
        denominacion: d.valor,
        tipo: d.tipo,
        cantidad: cantidades[d.valor] || 0,
        subtotal: d.valor * (cantidades[d.valor] || 0),
      })).filter((d) => d.cantidad > 0);

      const res = await cerrarJornadaAction({
        montoEntregado: totalFisico,
        observaciones: observaciones.trim() || undefined,
        desglose: modoConteo === "PESO_A_PESO" ? desgloseList : undefined,
      });

      if (!res.success || !res.data) {
        setErrorCierre(res.error || "No se pudo completar el cierre.");
        setCerrando(false);
        return;
      }

      setCierreExitoso(res.data);
      // Resetear formulario
      setCantidades({
        1000: 0,
        500: 0,
        200: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        1: 0,
      });
      setMontoManual("");
      setObservaciones("");
      cargarDatos();
    } catch (err: any) {
      setErrorCierre(err.message || "Error al cerrar jornada.");
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Arqueo de Caja y Cierre de Turno
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Conciliación en tiempo real de recaudación en taquilla y ruta frente a gastos e inventario físico en córdobas.
          </p>
        </div>

        <button
          onClick={cargarDatos}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Icon path={mdiRefresh} size={0.65} />
          Actualizar arqueo en vivo
        </button>
      </div>

      {/* Alerta de Cierre Exitoso */}
      {cierreExitoso && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-600">
              <Icon path={mdiCheckCircleOutline} size={0.9} />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">Jornada Cerrada y Archivada Exitosamente (#{cierreExitoso.idCierre})</p>
              <p className="text-emerald-800">
                Monto esperado por sistema: <span className="font-bold">{formatPrice(cierreExitoso.montoEsperado)}</span> | Entregado en físico:{" "}
                <span className="font-bold">{formatPrice(cierreExitoso.montoEntregado)}</span> | Descuadre final:{" "}
                <span className={`font-bold ${Math.abs(cierreExitoso.diferencia) <= 0.05 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatPrice(cierreExitoso.diferencia)}
                </span>
              </p>
              {cierreExitoso.observaciones && (
                <p className="text-[11px] text-emerald-950/80 italic">
                  Nota registrada: &quot;{cierreExitoso.observaciones}&quot;
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setCierreExitoso(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs cursor-pointer px-2 py-1"
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Balance del Sistema en Tiempo Real */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Jornada Contable en Vivo
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Balance del Turno ({arqueo?.fecha || "Hoy"})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
              Cooperativa: <span className="font-semibold text-slate-900">{arqueo?.cooperativa}</span>
            </span>
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
              Cajero: <span className="font-semibold text-slate-900">{arqueo?.taquillero}</span>
            </span>
          </div>
        </div>

        {/* 4 Bloques: Ventas Taquilla + Ventas A Bordo - Gastos = Total Esperado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Taquilla POS */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
              <span>Ventas Taquilla (POS)</span>
              <Icon path={mdiTicketConfirmationOutline} size={0.7} />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-emerald-700 block">
              {formatPrice(arqueo?.ventasTaquilla || 0)}
            </span>
            <span className="text-[11px] text-emerald-800/80 block mt-1">
              Boletos emitidos en ventanilla
            </span>
          </div>

          {/* En Ruta / A Bordo */}
          <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/80">
            <div className="flex items-center justify-between text-teal-800 text-xs font-semibold mb-1">
              <span>Ventas en Ruta (A Bordo)</span>
              <Icon path={mdiBusSide} size={0.7} />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-teal-700 block">
              {formatPrice(arqueo?.ventasABordo || 0)}
            </span>
            <span className="text-[11px] text-teal-800/80 block mt-1">
              Boletos cobrados por ayudante
            </span>
          </div>

          {/* Egresos Pendientes */}
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/80">
            <div className="flex items-center justify-between text-rose-800 text-xs font-semibold mb-1">
              <span>(-) Gastos y Combustible</span>
              <Icon path={mdiReceiptTextOutline} size={0.7} />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-rose-700 block">
              {formatPrice(arqueo?.totalGastos || 0)}
            </span>
            <span className="text-[11px] text-rose-800/80 block mt-1">
              {arqueo?.cantidadGastos || 0} comprobantes hoy
            </span>
          </div>

          {/* Neto Esperado */}
          <div className="p-4 rounded-xl bg-slate-900 text-white">
            <div className="flex items-center justify-between text-slate-300 text-xs font-semibold mb-1">
              <span>(=) Esperado en Efectivo</span>
              <Icon path={mdiCashCheck} size={0.7} />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white block">
              {formatPrice(esperado)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {arqueo?.cantidadVentas || 0} ventas netas
            </span>
          </div>
        </div>

        {/* Sección de Conteo Peso a Peso */}
        <div className="pt-2">
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Icon path={mdiCalculator} size={0.65} />
                  Conteo Físico de Gaveta (Peso a Peso)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Desglose por billetes y monedas en curso legal de Nicaragua (C$).
                </p>
              </div>

              {/* Selector de Modo */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setModoConteo("PESO_A_PESO")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    modoConteo === "PESO_A_PESO"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Peso a Peso
                </button>
                <button
                  type="button"
                  onClick={() => setModoConteo("MANUAL")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    modoConteo === "MANUAL"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monto Global
                </button>
              </div>
            </div>

            {modoConteo === "PESO_A_PESO" ? (
              /* Grid de denominaciones Córdobas */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DENOMINACIONES_BASE.map((denom) => {
                  const cant = cantidades[denom.valor] || 0;
                  const subtotal = cant * denom.valor;
                  return (
                    <div
                      key={denom.valor}
                      className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block">
                          {denom.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Subtotal: <span className="font-bold text-slate-700">{formatPrice(subtotal)}</span>
                        </span>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={cant === 0 ? "" : cant}
                          onChange={(e) => handleCantidadChange(denom.valor, e.target.value)}
                          className="w-full text-right px-2.5 py-1.5 bg-slate-50 border border-slate-300 focus:border-slate-900 rounded-md text-xs font-bold text-slate-900 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Conteo Manual Directo */
              <div className="max-w-md">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Monto Total en Efectivo Contado (C$)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej: 4500.00"
                  value={montoManual}
                  onChange={(e) => setMontoManual(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-slate-900 rounded-lg text-base font-bold text-slate-900 outline-none transition-colors"
                />
              </div>
            )}

            {/* Comparativa y Semáforo de Cuadre */}
            <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              {/* Total Físico Calculado */}
              <div className="md:col-span-4 bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Efectivo Físico
                </span>
                <span className="text-xl font-bold text-slate-900 block mt-0.5">
                  {formatPrice(totalFisico)}
                </span>
              </div>

              {/* Semáforo de Descuadre */}
              <div className="md:col-span-4">
                <div
                  className={`p-3 rounded-lg border text-center transition-all ${
                    !tieneConteo
                      ? "bg-white text-slate-400 border-slate-200"
                      : esCuadreExacto
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : esFaltante
                      ? "bg-rose-50 text-rose-900 border-rose-300"
                      : "bg-amber-50 text-amber-900 border-amber-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider block">
                    {!tieneConteo
                      ? "Estado del Cuadre"
                      : esCuadreExacto
                      ? "Cuadre Exacto (Caja Cuadrada)"
                      : esFaltante
                      ? "Faltante en Caja"
                      : "Sobrante en Caja"}
                  </span>
                  <span className="text-base font-extrabold block mt-0.5">
                    {!tieneConteo
                      ? "Esperando conteo"
                      : `${diferencia >= 0 ? "+" : ""}${formatPrice(diferencia)}`}
                  </span>
                </div>
              </div>

              {/* Botón de Liquidación */}
              <div className="md:col-span-4">
                <button
                  type="button"
                  disabled={!tieneConteo || cerrando || faltaJustificacion}
                  onClick={handleCerrarJornada}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                >
                  <Icon path={mdiLockCheckOutline} size={0.7} />
                  {cerrando ? "Procesando Cierre..." : "Cerrar y Sellar Jornada"}
                </button>
              </div>
            </div>

            {/* Input obligatorio si hay faltante */}
            {esFaltante && (
              <div className="p-3.5 rounded-lg bg-rose-50/70 border border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 text-xs font-bold">
                  <Icon path={mdiAlertCircleOutline} size={0.65} className="text-rose-600" />
                  <span>Se ha detectado un faltante de {formatPrice(Math.abs(diferencia))}. Ingrese justificación obligatoria:</span>
                </div>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Explique el motivo del descuadre para la auditoría contable (ej: billete deteriorado retenido, cambio pendiente de devolución)..."
                  className="w-full px-3 py-2 bg-white border border-rose-300 focus:border-rose-600 rounded-md text-xs text-slate-800 outline-none"
                />
                {faltaJustificacion && (
                  <p className="text-[10px] text-rose-700 font-semibold">
                    * La justificación es mandatoria para autorizar el arqueo con faltante.
                  </p>
                )}
              </div>
            )}

            {errorCierre && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Icon path={mdiAlertCircleOutline} size={0.65} />
                <span>{errorCierre}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Cierres de Turno */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Historial de Cierres de Caja
            </h3>
            <p className="text-xs text-slate-500">
              Actas de liquidación con sellos horarios oficiales de Managua y auditoría de descuadres.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-medium text-xs animate-pulse">
            Cargando historial de cierres...
          </div>
        ) : historial.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No hay cierres de jornada archivados todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora (Managua)</th>
                  <th className="py-3 px-4">Responsable</th>
                  <th className="py-3 px-4 text-right">Monto Esperado</th>
                  <th className="py-3 px-4 text-right">Efectivo Físico</th>
                  <th className="py-3 px-4 text-right">Diferencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {historial.map((c) => {
                  const esCuadreExacto = Math.abs(c.diferencia) <= 0.05;
                  return (
                    <tr key={c.idCierre} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {c.fechaHoraFormatted || new Date(c.fechaHora).toLocaleString("es-NI")}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {c.usuarioNombre}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {c.cooperativaNombre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatPrice(c.montoEsperado)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatPrice(c.montoEntregado)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] ${
                            esCuadreExacto
                              ? "bg-emerald-50 text-emerald-700"
                              : c.diferencia < 0
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {c.diferencia >= 0 ? "+" : ""}{formatPrice(c.diferencia)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.estado === "CONFIRMADO"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {c.observaciones ? (
                          <span title={c.observaciones} className="text-slate-700 font-normal italic">
                            &quot;{c.observaciones}&quot;
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
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
    </div>
  );
}
