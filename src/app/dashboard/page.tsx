"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiTicketConfirmationOutline,
  mdiBusDoubleDecker,
  mdiCurrencyUsd,
  mdiAccountGroup,
  mdiRefresh,
  mdiReceiptTextOutline,
} from "@mdi/js";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";
import { getDashboardStatsAction } from "@/backend/actions/ventas";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { useTenant } from "@/frontend/context/TenantContext";

interface VentaResumenItem {
  idVenta: number;
  total: number;
  estado: string;
  tipoVenta: string;
  rutaNombre: string;
  boletosCantidad: number;
  asientosNumeros: string[];
  fechaHora: string;
}

interface DashboardMetrics {
  ventasHoy: number;
  ventasHistoricas: number;
  transaccionesHoy: number;
  boletosCount: number;
  unidadesActivas: number;
  totalUnidades: number;
  pasajerosCount: number;
  ocupacionPorcentaje: number;
  ultimasVentas: VentaResumenItem[];
}

export default function DashboardHome() {
  const { formatPrice } = useCurrency();
  const { selectedCoopId, selectedCoop, isSuperAdmin } = useTenant();
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const coopIdNumber = selectedCoopId === "ALL" ? undefined : Number(selectedCoopId);
      const res = await getDashboardStatsAction(coopIdNumber);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Error al cargar métricas del dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedCoopId]);

  const showPasajerosCount = isSuperAdmin && (!selectedCoopId || selectedCoopId === "ALL");

  const stats = [
    {
      title: "Ventas de Hoy",
      value: data ? formatPrice(data.ventasHoy) : "C$ 0.00",
      subtext: data ? `${data.transaccionesHoy} transacciones procesadas` : "Sin cobros registrados",
      icon: mdiCurrencyUsd,
    },
    {
      title: "Boletos Emitidos",
      value: data ? `${data.boletosCount}` : "0",
      subtext: "Boletos validados en plataforma",
      icon: mdiTicketConfirmationOutline,
    },
    {
      title: "Flota Operativa",
      value: data ? `${data.unidadesActivas} / ${data.totalUnidades}` : "0 / 0",
      subtext: "Unidades en servicio activo",
      icon: mdiBusDoubleDecker,
    },
    ...(showPasajerosCount
      ? [
          {
            title: "Pasajeros Registrados",
            value: data ? `${data.pasajerosCount}` : "0",
            subtext: "Cuentas registradas en sistema",
            icon: mdiAccountGroup,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Resumen de Operaciones {selectedCoop ? `(${selectedCoop.nombre})` : ""}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {selectedCoop
              ? `Métricas auditadas y transacciones en tiempo real de ${selectedCoop.nombre}.`
              : "Métricas consolidadas y transacciones en tiempo real de todas las cooperativas."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            title="Actualizar datos"
          >
            <Icon path={mdiRefresh} size={0.7} className={loading ? "animate-spin text-slate-900" : ""} />
          </button>

          <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {new Date().toLocaleDateString("es-NI", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Sobrias con Skeleton */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showPasajerosCount ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
        {loading
          ? Array.from({ length: showPasajerosCount ? 4 : 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-slate-200 animate-pulse rounded" />
                  <div className="h-7 w-28 bg-slate-200 animate-pulse rounded" />
                  <div className="h-3 w-36 bg-slate-100 animate-pulse rounded" />
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse shrink-0" />
              </div>
            ))
          : stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.subtext}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <Icon path={stat.icon} size={0.8} />
                </div>
              </div>
            ))}
      </div>

      {/* Sección Inferior: Transacciones Recientes y Ocupación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tabla de Últimas Ventas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs h-full flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                  Últimas Transacciones Registradas
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ventas procesadas por taquilla o portal digital
                </p>
              </div>

              {data && data.ultimasVentas.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {data.ultimasVentas.length} transacciones
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5 flex-1">
              {loading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                      <div className="space-y-1.5">
                        <div className="h-4 w-44 bg-slate-200 animate-pulse rounded" />
                        <div className="h-3 w-28 bg-slate-100 animate-pulse rounded" />
                      </div>
                      <div className="h-5 w-20 bg-slate-200 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : !data || data.ultimasVentas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200 p-6">
                  <div className="w-10 h-10 bg-white rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-center mb-2.5 text-slate-400">
                    <Icon path={mdiReceiptTextOutline} size={0.9} />
                  </div>
                  <p className="font-semibold text-slate-800 text-xs sm:text-sm">No hay transacciones registradas hoy</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Las compras emitidas en taquilla y reservas en línea aparecerán automáticamente aquí.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-2.5">Código</th>
                        <th className="px-4 py-2.5">Ruta</th>
                        <th className="px-4 py-2.5">Canal</th>
                        <th className="px-4 py-2.5">Boletos</th>
                        <th className="px-4 py-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.ultimasVentas.map((venta) => (
                        <tr key={venta.idVenta} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-slate-900">
                            #TK-{venta.idVenta}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            {venta.rutaNombre}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                              {venta.tipoVenta}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {venta.boletosCantidad} {venta.boletosCantidad === 1 ? "asiento" : "asientos"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                            {formatPrice(venta.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ocupación Promedio */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs h-full flex flex-col items-center justify-between p-5">
            <div className="text-center w-full">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                Ocupación de Flota
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Porcentaje de asientos vendidos sobre capacidad total
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-6 w-full">
              <AnimatedCircularProgressBar
                value={data?.ocupacionPorcentaje || 0}
                gaugePrimaryColor="#FE7D22"
                gaugeSecondaryColor="rgba(254, 125, 34, 0.12)"
                className="size-32 text-xl font-bold text-slate-900"
              />

              <div className="mt-5 text-center bg-slate-50 rounded-lg p-3 border border-slate-200/80 w-full">
                <p className="text-primary font-semibold text-xs uppercase tracking-wider">
                  {data && data.ocupacionPorcentaje > 0 ? "Ocupación Activa" : "Capacidad Disponible"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {data && data.ocupacionPorcentaje > 0
                    ? `${data.ocupacionPorcentaje}% de los asientos de la flota están reservados`
                    : "Asientos disponibles para despacho inmediato"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

