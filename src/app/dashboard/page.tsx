"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/frontend/components/ui/card";
import Icon from "@mdi/react";
import {
  mdiTicketConfirmationOutline,
  mdiBusDoubleDecker,
  mdiCurrencyUsd,
  mdiAccountGroup,
  mdiRefresh,
  mdiReceiptTextOutline,
  mdiCheckCircleOutline,
  mdiCalendarOutline,
} from "@mdi/js";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";
import { getDashboardStatsAction } from "@/backend/actions/ventas";
import { useCurrency } from "@/frontend/context/CurrencyContext";

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
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStatsAction();
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
  }, []);

  const stats = [
    {
      title: "Ventas de Hoy",
      value: data ? formatPrice(data.ventasHoy) : "C$ 0.00",
      subtext: data ? `${data.transaccionesHoy} transacciones hoy` : "Sin cobros registrados",
      icon: mdiCurrencyUsd,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Boletos Emitidos",
      value: data ? `${data.boletosCount}` : "0",
      subtext: "Boletos registrados en el sistema",
      icon: mdiTicketConfirmationOutline,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Flota Operativa",
      value: data ? `${data.unidadesActivas} / ${data.totalUnidades}` : "0 / 0",
      subtext: "Unidades disponibles o en ruta",
      icon: mdiBusDoubleDecker,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Pasajeros Registrados",
      value: data ? `${data.pasajerosCount}` : "0",
      subtext: "Cuentas de pasajeros en la plataforma",
      icon: mdiAccountGroup,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Resumen de Operaciones</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Métricas auditadas y transacciones en tiempo real de la cooperativa.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
            title="Actualizar datos"
          >
            <Icon path={mdiRefresh} size={0.7} className={loading ? "animate-spin text-primary" : ""} />
          </button>

          <div className="text-xs text-gray-600 bg-white px-3.5 py-2 rounded-2xl border border-gray-100 shadow-2xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {new Date().toLocaleDateString("es-NI", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {stats.map((stat, i) => (
          <Card
            key={i}
            className="rounded-3xl border-gray-100 bg-white shadow-xs hover:shadow-md transition-all duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <Icon path={stat.icon} size={0.9} />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {loading ? "..." : stat.value}
              </div>
              <p className="text-xs font-semibold text-gray-400 mt-1.5">{stat.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sección Inferior: Transacciones Recientes y Ocupación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Tabla de Últimas Ventas Reales */}
        <div className="lg:col-span-2">
          <Card className="rounded-3xl border-gray-100 bg-white shadow-xs h-full flex flex-col">
            <CardHeader className="px-6 sm:px-8 pt-8 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-black text-gray-900 tracking-tight text-lg">
                  Últimas Transacciones Registradas
                </CardTitle>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Ventas procesadas por taquilla o portal digital
                </p>
              </div>

              {data && data.ultimasVentas.length > 0 && (
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {data.ultimasVentas.length} transacciones
                </span>
              )}
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-8 flex-1">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
                  <p className="text-xs font-bold">Consultando registros contables...</p>
                </div>
              ) : !data || data.ultimasVentas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-2xs flex items-center justify-center mb-3 text-gray-300">
                    <Icon path={mdiReceiptTextOutline} size={1.2} />
                  </div>
                  <p className="font-bold text-gray-700 text-sm">No hay transacciones registradas hoy</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    Las compras de boletos emitidos en ventanilla y reservas en línea aparecerán automáticamente aquí.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 pb-2">
                        <th className="py-2.5">Código</th>
                        <th className="py-2.5">Ruta</th>
                        <th className="py-2.5">Canal</th>
                        <th className="py-2.5">Boletos</th>
                        <th className="py-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold">
                      {data.ultimasVentas.map((venta) => (
                        <tr key={venta.idVenta} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 font-mono font-bold text-gray-900">
                            #TK-{venta.idVenta}
                          </td>
                          <td className="py-3 text-gray-800">
                            {venta.rutaNombre}
                          </td>
                          <td className="py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {venta.tipoVenta}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500">
                            {venta.boletosCantidad} {venta.boletosCantidad === 1 ? "asiento" : "asientos"}
                          </td>
                          <td className="py-3 text-right font-black text-emerald-600">
                            {formatPrice(venta.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ocupación Promedio Real */}
        <div className="lg:col-span-1">
          <Card className="rounded-3xl border-gray-100 bg-white shadow-xs h-full flex flex-col items-center justify-between p-6 sm:p-8 relative overflow-hidden">
            <CardHeader className="text-center w-full p-0">
              <CardTitle className="font-black text-gray-900 tracking-tight text-lg">
                Ocupación de Flota
              </CardTitle>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Porcentaje de asientos vendidos sobre capacidad total
              </p>
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center py-6 w-full p-0">
              <AnimatedCircularProgressBar
                value={data?.ocupacionPorcentaje || 0}
                gaugePrimaryColor="#10b981"
                gaugeSecondaryColor="rgba(16, 185, 129, 0.12)"
                className="size-40 text-3xl font-black text-gray-900"
              />

              <div className="mt-6 text-center bg-gray-50 rounded-2xl p-4 border border-gray-100 w-full">
                <p className="text-emerald-700 font-bold text-xs uppercase tracking-wider">
                  {data && data.ocupacionPorcentaje > 0 ? "Ocupación Activa" : "Capacidad Disponible"}
                </p>
                <p className="text-gray-500 text-xs font-medium mt-1">
                  {data && data.ocupacionPorcentaje > 0
                    ? `${data.ocupacionPorcentaje}% de los asientos de la flota están reservados`
                    : "Asientos disponibles para despacho inmediato"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
