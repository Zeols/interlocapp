"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiRefresh,
  mdiLockCheckOutline,
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
} from "@mdi/js";
import {
  getArqueoEnVivoAction,
  cerrarJornadaAction,
  getHistorialCierresAction,
  ResumenArqueoEnVivo,
  CierreJornadaItem,
} from "@/backend/actions/cierres";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { StatTile } from "@/frontend/components/ui/StatTile";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";

const BILLETES_BASE = [
  { valor: 1000, label: "Billete C$ 1,000" },
  { valor: 500, label: "Billete C$ 500" },
  { valor: 200, label: "Billete C$ 200" },
  { valor: 100, label: "Billete C$ 100" },
  { valor: 50, label: "Billete C$ 50" },
  { valor: 20, label: "Billete C$ 20" },
  { valor: 10, label: "Billete C$ 10" },
];

const MONEDAS_BASE = [
  { valor: 5, label: "Moneda C$ 5" },
  { valor: 1, label: "Moneda C$ 1" },
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
      const desglose =
        modoConteo === "PESO_A_PESO"
          ? [...BILLETES_BASE, ...MONEDAS_BASE].map((d) => ({
              denominacion: d.valor,
              tipo: (d.valor <= 5 ? "MONEDA" : "BILLETE") as "BILLETE" | "MONEDA",
              cantidad: cantidades[d.valor] || 0,
              subtotal: (cantidades[d.valor] || 0) * d.valor,
            }))
          : [];

      const res = await cerrarJornadaAction({
        montoEntregado: totalFisico,
        desglose,
        observaciones: observaciones.trim() || undefined,
      });

      if (!res.success || !res.data) {
        setErrorCierre(res.error || "No se pudo procesar el cierre de caja.");
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
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Arqueo de Caja y Cierre de Turno"
        description="Conciliación en tiempo real de recaudación en taquilla y ruta frente a gastos e inventario físico en córdobas."
      >
        <button
          onClick={cargarDatos}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
        >
          <Icon path={mdiRefresh} size={0.6} className={loading ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </PageHeader>

      {/* Alerta de Cierre Exitoso */}
      {cierreExitoso && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <Icon path={mdiCheckCircleOutline} size={0.8} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">Jornada cerrada y archivada (#{cierreExitoso.idCierre})</p>
              <p className="text-emerald-800">
                Esperado: <span className="font-bold">{formatPrice(cierreExitoso.montoEsperado)}</span> | Entregado:{" "}
                <span className="font-bold">{formatPrice(cierreExitoso.montoEntregado)}</span> | Descuadre:{" "}
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
            Cerrar
          </button>
        </div>
      )}

      {/* Balance de Turno (Tarjetas Minimalistas Homogéneas) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Jornada Contable en Vivo
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Balance del Turno ({arqueo?.fecha || "Hoy"})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              Cooperativa: <span className="font-bold text-slate-900">{arqueo?.cooperativa || "—"}</span>
            </span>
            <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              Cajero: <span className="font-bold text-slate-900">{arqueo?.taquillero || "—"}</span>
            </span>
          </div>
        </div>

        {/* 4 StatTiles Neutros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Ventas Taquilla (POS)"
            value={formatPrice(arqueo?.ventasTaquilla || 0)}
            subtext="Boletos emitidos en ventanilla"
          />
          <StatTile
            label="Ventas en Ruta"
            value={formatPrice(arqueo?.ventasABordo || 0)}
            subtext="Cobrados a bordo"
          />
          <StatTile
            label="Gastos y Combustible"
            value={formatPrice(arqueo?.totalGastos || 0)}
            subtext={`${arqueo?.cantidadGastos || 0} comprobantes hoy`}
          />
          <StatTile
            label="Esperado en Efectivo"
            value={formatPrice(esperado)}
            subtext={`${arqueo?.cantidadVentas || 0} transacciones netas`}
            variant="accent"
          />
        </div>
      </div>

      {/* Conteo Físico Compacto (Sin Slop) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Conteo Físico de Gaveta
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Desglose detallado por billetes y monedas en córdobas (C$).
            </p>
          </div>

          {/* Segmented Control */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setModoConteo("PESO_A_PESO")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                modoConteo === "PESO_A_PESO"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Por Denominación
            </button>
            <button
              type="button"
              onClick={() => setModoConteo("MANUAL")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                modoConteo === "MANUAL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monto Global
            </button>
          </div>
        </div>

        {modoConteo === "PESO_A_PESO" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tabla Billetes */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Billetes
              </div>
              <table className="w-full text-xs">
                <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold">Denominación</th>
                    <th className="py-2 px-3 text-center font-semibold w-28">Cantidad</th>
                    <th className="py-2 px-3 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BILLETES_BASE.map((b) => {
                    const cant = cantidades[b.valor] || 0;
                    const subtotal = cant * b.valor;
                    return (
                      <tr key={b.valor} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-medium text-slate-800">{b.label}</td>
                        <td className="py-1 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={cant === 0 ? "" : cant}
                            onChange={(e) => handleCantidadChange(b.valor, e.target.value)}
                            className="w-20 text-center px-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded text-xs font-bold text-slate-900 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                          {formatPrice(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tabla Monedas */}
            <div className="border border-slate-200 rounded-lg overflow-hidden self-start">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Monedas
              </div>
              <table className="w-full text-xs">
                <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold">Denominación</th>
                    <th className="py-2 px-3 text-center font-semibold w-28">Cantidad</th>
                    <th className="py-2 px-3 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MONEDAS_BASE.map((m) => {
                    const cant = cantidades[m.valor] || 0;
                    const subtotal = cant * m.valor;
                    return (
                      <tr key={m.valor} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-medium text-slate-800">{m.label}</td>
                        <td className="py-1 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={cant === 0 ? "" : cant}
                            onChange={(e) => handleCantidadChange(m.valor, e.target.value)}
                            className="w-20 text-center px-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded text-xs font-bold text-slate-900 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                          {formatPrice(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="max-w-sm py-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Monto Total en Efectivo Contado (C$)
            </label>
            <input
              type="number"
              step="any"
              placeholder="Ej: 4500.00"
              value={montoManual}
              onChange={(e) => setMontoManual(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-300 focus:border-slate-800 rounded-lg text-sm font-bold text-slate-900 outline-none"
            />
          </div>
        )}

        {/* Resumen de Cuadre y Acción */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Físico en Gaveta
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {formatPrice(totalFisico)}
            </span>
          </div>

          <div className="md:col-span-4">
            <div
              className={`p-3 rounded-lg border text-center transition-all ${
                !tieneConteo
                  ? "bg-slate-50 text-slate-400 border-slate-200"
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
                  ? "Caja Cuadrada"
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

          <div className="md:col-span-4">
            <button
              type="button"
              disabled={!tieneConteo || cerrando || faltaJustificacion}
              onClick={handleCerrarJornada}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <Icon path={mdiLockCheckOutline} size={0.65} />
              <span>{cerrando ? "Procesando..." : "Cerrar y Sellar Turno"}</span>
            </button>
          </div>
        </div>

        {/* Justificación obligatoria si hay faltante */}
        {esFaltante && (
          <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-900 text-xs font-bold">
              <Icon path={mdiAlertCircleOutline} size={0.6} className="text-rose-600" />
              <span>Faltante detectado ({formatPrice(Math.abs(diferencia))}). Justificación obligatoria:</span>
            </div>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Explique el motivo del descuadre para la auditoría contable..."
              className="w-full px-3 py-1.5 bg-white border border-rose-300 focus:border-rose-600 rounded-md text-xs text-slate-800 outline-none"
            />
            {faltaJustificacion && (
              <p className="text-[10px] text-rose-700 font-semibold">
                * Justificación mandatoria para autorizar el arqueo con faltante.
              </p>
            )}
          </div>
        )}

        {errorCierre && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
            <Icon path={mdiAlertCircleOutline} size={0.6} />
            <span>{errorCierre}</span>
          </div>
        )}
      </div>

      {/* Historial de Cierres Recientes */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Historial de Cierres de Caja
          </h3>
          <p className="text-xs text-slate-500">
            Actas de liquidación con sellos horarios oficiales de Managua y auditoría de descuadres.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-400 font-medium text-xs animate-pulse">
            Cargando historial de cierres...
          </div>
        ) : historial.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No hay cierres de jornada archivados todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-right">Esperado</th>
                  <th className="py-2.5 px-3 text-right">Entregado</th>
                  <th className="py-2.5 px-3 text-right">Diferencia</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {historial.map((c) => {
                  const esCuadreExacto = Math.abs(c.diferencia) <= 0.05;
                  return (
                    <tr key={c.idCierre} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-900">
                        {c.fechaHoraFormatted || new Date(c.fechaHora).toLocaleString("es-NI")}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block">{c.usuarioNombre}</span>
                        <span className="text-[10px] text-slate-400">{c.cooperativaNombre}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatPrice(c.montoEsperado)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatPrice(c.montoEntregado)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[11px]">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
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
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge
                          label={c.estado}
                          variant={c.estado === "CONFIRMADO" ? "success" : "warning"}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                        {c.observaciones ? (
                          <span title={c.observaciones} className="italic">&quot;{c.observaciones}&quot;</span>
                        ) : (
                          <span className="text-slate-400">—</span>
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
