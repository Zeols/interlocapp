"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiFinance,
  mdiCashCheck,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiClockOutline,
  mdiRefresh,
  mdiLockCheckOutline,
  mdiCashMultiple,
  mdiReceiptTextOutline,
} from "@mdi/js";
import {
  getArqueoEnVivoAction,
  cerrarJornadaAction,
  getHistorialCierresAction,
  ResumenArqueoEnVivo,
  CierreJornadaItem,
} from "@/backend/actions/cierres";
import { useCurrency } from "@/frontend/context/CurrencyContext";

export default function CierresPage() {
  const { formatPrice } = useCurrency();
  const [arqueo, setArqueo] = useState<ResumenArqueoEnVivo | null>(null);
  const [historial, setHistorial] = useState<CierreJornadaItem[]>([]);
  const [montoEntregado, setMontoEntregado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [cierreExitoso, setCierreExitoso] = useState<CierreJornadaItem | null>(null);

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

  // Cálculos de cuadre en vivo
  const esperado = arqueo?.montoEsperado || 0;
  const entregadoNum = parseFloat(montoEntregado) || 0;
  const diferencia = entregadoNum - esperado;
  const tieneInput = montoEntregado.trim().length > 0;
  const esExacto = Math.abs(diferencia) < 0.01 && tieneInput;
  const esFaltante = diferencia < -0.01 && tieneInput;
  const esSobrante = diferencia > 0.01 && tieneInput;

  const handleCerrarJornada = async () => {
    if (!tieneInput) {
      setErrorCierre("Ingrese el monto físico entregado por el cajero.");
      return;
    }

    if (!confirm("¿Confirmas el cierre definitivo de la jornada actual? Los gastos de hoy quedarán vinculados a este cierre.")) {
      return;
    }

    setCerrando(true);
    setErrorCierre(null);

    try {
      const res = await cerrarJornadaAction({
        montoEntregado: entregadoNum,
      });

      if (!res.success || !res.data) {
        setErrorCierre(res.error || "No se pudo completar el cierre.");
        setCerrando(false);
        return;
      }

      setCierreExitoso(res.data);
      setMontoEntregado("");
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
            Arqueo Diario y Cierres de Turno
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Conciliación de recaudación por ventas frente a gastos y efectivo físico.
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
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-600">
              <Icon path={mdiCheckCircleOutline} size={0.8} />
            </div>
            <div className="text-xs">
              <p className="font-bold text-sm">Jornada Cerrada Exitosamente (#{cierreExitoso.idCierre})</p>
              <p className="mt-0.5">
                Monto esperado: <span className="font-bold">{formatPrice(cierreExitoso.montoEsperado)}</span> | Entregado:{" "}
                <span className="font-bold">{formatPrice(cierreExitoso.montoEntregado)}</span> | Diferencia:{" "}
                <span className={`font-bold ${cierreExitoso.diferencia === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatPrice(cierreExitoso.diferencia)}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setCierreExitoso(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Tarjeta de Arqueo Activo en Vivo */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Jornada en Curso
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Balance de Caja del Día ({arqueo?.fecha || "Hoy"})
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md self-start sm:self-auto">
            Responsable: {arqueo?.taquillero}
          </span>
        </div>

        {/* 3 Bloques Matemáticos: Recaudación - Gastos = Esperado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ingresos */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-1">
              <span>(+) Total Ventas en Boletos</span>
              <Icon path={mdiCashMultiple} size={0.7} />
            </div>
            <span className="text-2xl font-bold text-emerald-700 block">
              {formatPrice(arqueo?.totalVentas || 0)}
            </span>
            <span className="text-[11px] text-emerald-800/80 block mt-1">
              {arqueo?.cantidadVentas || 0} boletos cobrados hoy
            </span>
          </div>

          {/* Egresos */}
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
            <div className="flex items-center justify-between text-rose-800 text-xs font-bold mb-1">
              <span>(-) Gastos y Combustible</span>
              <Icon path={mdiReceiptTextOutline} size={0.7} />
            </div>
            <span className="text-2xl font-bold text-rose-700 block">
              {formatPrice(arqueo?.totalGastos || 0)}
            </span>
            <span className="text-[11px] text-rose-800/80 block mt-1">
              {arqueo?.cantidadGastos || 0} comprobantes imputados
            </span>
          </div>

          {/* Monto Neto Esperado */}
          <div className="p-4 rounded-xl bg-slate-900 text-white">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>(=) Efectivo Esperado en Caja</span>
              <Icon path={mdiCashCheck} size={0.7} />
            </div>
            <span className="text-2xl font-bold text-white block">
              {formatPrice(esperado)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Balance contable exacto
            </span>
          </div>
        </div>

        {/* Sección de Cuadre Físico */}
        <div className="p-4.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Recepción y Conteo de Efectivo Físico
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-5">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Efectivo Físico Entregado (C$)
              </label>
              <input
                type="number"
                step="any"
                value={montoEntregado}
                onChange={(e) => setMontoEntregado(e.target.value)}
                placeholder="Ingresa el monto contado..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-slate-900 rounded-lg text-base font-bold text-slate-900 outline-none transition-colors"
              />
            </div>

            {/* Semáforo de Cuadre */}
            <div className="md:col-span-4">
              <div
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  !tieneInput
                    ? "bg-white text-slate-400 border-slate-200"
                    : esExacto
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                    : esFaltante
                    ? "bg-rose-50 text-rose-900 border-rose-300"
                    : "bg-amber-50 text-amber-900 border-amber-300"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider block">
                  {!tieneInput
                    ? "Estado del Cuadre"
                    : esExacto
                    ? "Cuadre Exacto"
                    : esFaltante
                    ? "Faltante en Caja"
                    : "Sobrante en Caja"}
                </span>
                <span className="text-sm sm:text-base font-bold">
                  {!tieneInput ? "Esperando conteo" : formatPrice(diferencia)}
                </span>
              </div>
            </div>

            {/* Botón de Cierre */}
            <div className="md:col-span-3">
              <button
                type="button"
                disabled={!tieneInput || cerrando}
                onClick={handleCerrarJornada}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <Icon path={mdiLockCheckOutline} size={0.65} />
                {cerrando ? "Cerrando..." : "Cerrar Jornada"}
              </button>
            </div>
          </div>

          {errorCierre && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
              {errorCierre}
            </div>
          )}
        </div>
      </div>

      {/* Historial de Cierres de Caja */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Historial de Cierres de Turno
            </h3>
            <p className="text-xs text-slate-500">
              Auditoría de liquidaciones previas y actas de arqueo.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-sm animate-pulse">
            Cargando historial de cierres...
          </div>
        ) : historial.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No hay cierres de jornada registrados todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Cajero / Taquillero</th>
                  <th className="py-3 px-4 text-right">Monto Esperado</th>
                  <th className="py-3 px-4 text-right">Monto Entregado</th>
                  <th className="py-3 px-4 text-right">Diferencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Gastos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {historial.map((c) => {
                  const esCuadreExacto = Math.abs(c.diferencia) < 0.01;
                  return (
                    <tr key={c.idCierre} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {new Date(c.fechaHora).toLocaleString("es-NI", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {c.usuarioNombre}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-700">
                        {formatPrice(c.montoEsperado)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatPrice(c.montoEntregado)}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] ${
                            esCuadreExacto
                              ? "bg-emerald-50 text-emerald-700"
                              : c.diferencia < 0
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {formatPrice(c.diferencia)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            c.estado === "CONFIRMADO"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {c.gastosAsociados}
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
