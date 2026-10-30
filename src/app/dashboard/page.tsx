"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiRefresh,
  mdiReceiptTextOutline,
} from "@mdi/js";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";
import { getDashboardStatsAction } from "@/backend/actions/ventas";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { useTenant } from "@/frontend/context/TenantContext";
import { getCurrentUserAction } from "@/backend/actions/auth";
import {
  getViajeActivoAyudanteAction,
  getDatosOperacionAyudanteAction,
} from "@/backend/actions/viajes";
import { AyudanteOperationalPanel } from "@/frontend/components/dashboard/AyudanteOperationalPanel";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { StatTile } from "@/frontend/components/ui/StatTile";
import {
  DateRangeFilter,
  DateRangeValue,
  computePresetRange,
} from "@/frontend/components/ui/DateRangeFilter";

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
  const [session, setSession] = useState<any>(null);

  // Filtro de rango de fechas (Managua America/Managua)
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const range = computePresetRange("hoy");
    return { ...range, preset: "hoy" };
  });

  // Estados para la jornada del ayudante (conectados a la BD)
  const [viajeActivo, setViajeActivo] = useState<any>(null);
  const [paradaActualIndex, setParadaActualIndex] = useState<number>(0);
  const [operacionAyudante, setOperacionAyudante] = useState<any>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUserAction();
      if (user) {
        setSession(user);

        // Si el usuario logueado es AYUDANTE, cargamos su viaje activo real de la BD
        if (user.rolNombre === "AYUDANTE") {
          const resViaje = await getViajeActivoAyudanteAction(user.idUsuario);
          if (resViaje.success && resViaje.data) {
            setViajeActivo(resViaje.data);
            const index = resViaje.data.paradas.findIndex((p: any) => p.id === resViaje.data.paradaActualId);
            setParadaActualIndex(index >= 0 ? index : 0);

            const resOp = await getDatosOperacionAyudanteAction(resViaje.data.idViaje);
            if (resOp.success && resOp.data) {
              setOperacionAyudante(resOp.data);
            }
          } else {
            setViajeActivo(null);
            setOperacionAyudante(null);
          }
        }
      }

      const coopIdNumber = selectedCoopId === "ALL" ? undefined : Number(selectedCoopId);
      const res = await getDashboardStatsAction(coopIdNumber, dateRange.desde, dateRange.hasta);
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
  }, [selectedCoopId, dateRange.desde, dateRange.hasta]);

  const rolUsuario = (session?.rolNombre || "").trim().toUpperCase();
  const isAyudante = rolUsuario === "AYUDANTE";

  // VISTA OPERATIVA AYUDANTE
  if (isAyudante) {
    return (
      <AyudanteOperationalPanel
        viajeActivo={viajeActivo}
        operacionAyudante={operacionAyudante}
        paradaActualIndex={paradaActualIndex}
        session={session}
        onRefresh={fetchMetrics}
        loading={loading}
      />
    );
  }

  const showPasajerosCount = isSuperAdmin && (!selectedCoopId || selectedCoopId === "ALL");
  const isSingleDay = dateRange.desde === dateRange.hasta;
  const ventasLabel = dateRange.preset === "hoy"
    ? "Ventas de Hoy"
    : isSingleDay
    ? `Ventas del Día (${dateRange.desde})`
    : `Ventas del Período`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={`Resumen de Operaciones ${selectedCoop ? `(${selectedCoop.nombre})` : ""}`}
        description={
          selectedCoop
            ? `Métricas auditadas y transacciones en tiempo real de ${selectedCoop.nombre}.`
            : "Métricas consolidadas y transacciones en tiempo real de todas las cooperativas."
        }
      >
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          title="Actualizar datos"
        >
          <Icon path={mdiRefresh} size={0.65} className={loading ? "animate-spin text-slate-900" : ""} />
        </button>
      </PageHeader>

      {/* KPI StatTiles */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showPasajerosCount ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3.5`}>
        <StatTile
          label={ventasLabel}
          value={data ? formatPrice(data.ventasHoy) : "C$ 0.00"}
          subtext={data ? `${data.transaccionesHoy} transacciones procesadas` : "Sin cobros registrados"}
          variant="accent"
        />
        <StatTile
          label="Boletos Emitidos"
          value={data ? `${data.boletosCount}` : "0"}
          subtext="Boletos validados en plataforma"
        />
        <StatTile
          label="Flota Operativa"
          value={data ? `${data.unidadesActivas} / ${data.totalUnidades}` : "0 / 0"}
          subtext="Unidades en servicio activo"
        />
        {showPasajerosCount && (
          <StatTile
            label="Pasajeros Registrados"
            value={data ? `${data.pasajerosCount}` : "0"}
            subtext="Cuentas registradas en sistema"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tabla Últimas Transacciones */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs h-full flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Últimas Transacciones Registradas
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Ventas procesadas por taquilla o portal digital</p>
              </div>
              {data && data.ultimasVentas.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
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
                  <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center mb-2.5 text-slate-400">
                    <Icon path={mdiReceiptTextOutline} size={0.9} />
                  </div>
                  <p className="font-semibold text-slate-800 text-xs sm:text-sm">No hay transacciones registradas</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Las compras emitidas en taquilla y reservas en línea aparecerán automáticamente aquí.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3.5 py-2.5">Código</th>
                        <th className="px-3.5 py-2.5">Ruta</th>
                        <th className="px-3.5 py-2.5">Canal</th>
                        <th className="px-3.5 py-2.5">Boletos</th>
                        <th className="px-3.5 py-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {data.ultimasVentas.map((venta) => (
                        <tr key={venta.idVenta} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900">#TK-{venta.idVenta}</td>
                          <td className="px-3.5 py-2.5 text-slate-800">{venta.rutaNombre}</td>
                          <td className="px-3.5 py-2.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {venta.tipoVenta}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500">{venta.boletosCantidad} asientos</td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 tabular-nums font-mono">
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

        {/* Ocupación de Flota */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs h-full flex flex-col items-center justify-between p-5">
            <div className="text-center w-full">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Ocupación de Flota</h2>
              <p className="text-xs text-slate-500 mt-0.5">Porcentaje de asientos vendidos sobre capacidad total</p>
            </div>

            <div className="flex flex-col items-center justify-center py-6 w-full">
              <AnimatedCircularProgressBar
                value={data?.ocupacionPorcentaje || 0}
                gaugePrimaryColor="#FE7D22"
                gaugeSecondaryColor="rgba(254, 125, 34, 0.12)"
                className="size-32 text-xl font-bold text-slate-900"
              />
              <div className="mt-5 text-center bg-slate-50 rounded-lg p-3 border border-slate-200 w-full">
                <p className="text-[#FE7D22] font-bold text-xs uppercase tracking-wider">Capacidad Disponible</p>
                <p className="text-slate-500 text-xs mt-0.5">Asientos disponibles para despacho inmediato</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
