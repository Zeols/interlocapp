"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiRefresh,
  mdiLockCheckOutline,
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiCheck,
  mdiClose,
  mdiEyeOutline,
  mdiLoading,
} from "@mdi/js";
import {
  getArqueoEnVivoAction,
  cerrarJornadaAction,
  getHistorialCierresAction,
  actualizarEstadoCierreAction,
  ResumenArqueoEnVivo,
  CierreJornadaItem,
  DenominacionConteo,
} from "@/backend/actions/cierres";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { useTenant } from "@/frontend/context/TenantContext";
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
  const { selectedCoopId } = useTenant();
  const [arqueo, setArqueo] = useState<ResumenArqueoEnVivo | null>(null);
  const [historial, setHistorial] = useState<CierreJornadaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [cierreExitoso, setCierreExitoso] = useState<CierreJornadaItem | null>(null);
  const [rolUsuario, setRolUsuario] = useState<string>("");

  // Modo de conteo: "PESO_A_PESO" o "MANUAL"
  const [modoConteo, setModoConteo] = useState<"PESO_A_PESO" | "MANUAL">("PESO_A_PESO");
  const [haEditadoDenominacion, setHaEditadoDenominacion] = useState(false);

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

  // Justificación obligatoria en caso de descuadre
  const [observaciones, setObservaciones] = useState<string>("");

  // Modal de auditoría (Confirmar / Rechazar cierre PENDIENTE)
  const [cierreEnRevision, setCierreEnRevision] = useState<{
    cierre: CierreJornadaItem;
    accion: "CONFIRMADO" | "RECHAZADO";
  } | null>(null);
  const [motivoRevision, setMotivoRevision] = useState<string>("");
  const [procesandoRevision, setProcesandoRevision] = useState(false);
  const [errorRevision, setErrorRevision] = useState<string | null>(null);

  // Modal para ver desglose de un cierre
  const [cierreDetalleModal, setCierreDetalleModal] = useState<CierreJornadaItem | null>(null);

  const coopNumber = selectedCoopId === "ALL" ? undefined : Number(selectedCoopId);

  const cargarDatos = async () => {
    setLoading(true);
    setErrorCierre(null);
    try {
      const [user, resArqueo, resHist] = await Promise.all([
        getCurrentUserAction(),
        getArqueoEnVivoAction(coopNumber),
        getHistorialCierresAction(coopNumber),
      ]);

      if (user) {
        setRolUsuario((user.rolNombre || "").trim().toUpperCase());
      }
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
  }, [selectedCoopId]);

  const esSupervisor = rolUsuario === "SUPER_ADMIN" || rolUsuario === "ADMIN_COOP";

  const handleCantidadChange = (denominacion: number, valStr: string) => {
    setHaEditadoDenominacion(true);
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

  const totalFisico =
    modoConteo === "PESO_A_PESO" ? totalDetallado : Math.max(0, parseFloat(montoManual) || 0);
  const tieneConteo =
    modoConteo === "PESO_A_PESO"
      ? totalDetallado > 0 || haEditadoDenominacion
      : montoManual.trim().length > 0;

  // Cuadre matemático
  const esperado = arqueo?.montoEsperado || 0;
  const diferencia = Number((totalFisico - esperado).toFixed(2));
  const esCuadreExacto = Math.abs(diferencia) <= 0.05 && tieneConteo;
  const esFaltante = diferencia < -0.05 && tieneConteo;
  const esSobrante = diferencia > 0.05 && tieneConteo;
  const tieneDescuadre = (esFaltante || esSobrante) && tieneConteo;

  // Validación de cierre: exige justificación si hay faltante o sobrante
  const faltaJustificacion = tieneDescuadre && observaciones.trim().length < 5;

  const handleCerrarJornada = async () => {
    if (!tieneConteo) {
      setErrorCierre("Ingrese el conteo de efectivo físico antes de liquidar la jornada.");
      return;
    }

    if (tieneDescuadre && faltaJustificacion) {
      setErrorCierre(
        esFaltante
          ? "Existe un faltante en caja. Ingrese una justificación obligatoria (mín. 5 caracteres)."
          : "Existe un sobrante en caja. Ingrese una nota justificativa antes de cerrar la jornada."
      );
      return;
    }

    const estadoPrevisto = esCuadreExacto ? "CONFIRMADO (Cuadre Exacto)" : "PENDIENTE (Sujeto a Auditoría)";

    if (
      !confirm(
        `¿Confirmas el cierre de caja de este turno?\n\n` +
          `Monto Esperado: C$ ${esperado.toFixed(2)}\n` +
          `Efectivo Entregado: C$ ${totalFisico.toFixed(2)}\n` +
          `Diferencia: ${diferencia >= 0 ? "+" : ""}${diferencia.toFixed(2)}\n` +
          `Estado Resultante: ${estadoPrevisto}\n\n` +
          `Esta acción archivará los gastos pendientes y registrará el corte contable.`
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
        idCooperativa: coopNumber,
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
      setHaEditadoDenominacion(false);
      setMontoManual("");
      setObservaciones("");
      await cargarDatos();
    } catch (err: any) {
      setErrorCierre(err.message || "Error al cerrar jornada.");
    } finally {
      setCerrando(false);
    }
  };

  const handleConfirmarRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cierreEnRevision) return;

    if (cierreEnRevision.accion === "RECHAZADO" && motivoRevision.trim().length < 4) {
      setErrorRevision("Debe ingresar el motivo del rechazo (mínimo 4 caracteres).");
      return;
    }

    setProcesandoRevision(true);
    setErrorRevision(null);

    try {
      const res = await actualizarEstadoCierreAction({
        idCierre: cierreEnRevision.cierre.idCierre,
        nuevoEstado: cierreEnRevision.accion,
        motivoRevision: motivoRevision.trim() || undefined,
      });

      if (!res.success) {
        setErrorRevision(res.error || "No se pudo actualizar el estado del cierre.");
        return;
      }

      setCierreEnRevision(null);
      setMotivoRevision("");
      await cargarDatos();
    } catch (err: any) {
      setErrorRevision(err.message || "Error al procesar la revisión.");
    } finally {
      setProcesandoRevision(false);
    }
  };

  const getBadgeVariant = (estado: string) => {
    if (estado === "CONFIRMADO") return "success";
    if (estado === "RECHAZADO") return "danger";
    return "warning";
  };

  const parseDesglose = (jsonStr?: string | null): DenominacionConteo[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed.filter((d) => d.cantidad > 0) : [];
    } catch {
      return [];
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
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 shadow-2xs ${
            cierreExitoso.estado === "CONFIRMADO"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <Icon
              path={cierreExitoso.estado === "CONFIRMADO" ? mdiCheckCircleOutline : mdiAlertCircleOutline}
              size={0.8}
              className={cierreExitoso.estado === "CONFIRMADO" ? "text-emerald-600 mt-0.5 shrink-0" : "text-amber-600 mt-0.5 shrink-0"}
            />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm">Jornada registrada (#{cierreExitoso.idCierre})</p>
                <StatusBadge
                  label={cierreExitoso.estado}
                  variant={getBadgeVariant(cierreExitoso.estado)}
                />
              </div>
              <p>
                Esperado: <span className="font-bold">{formatPrice(cierreExitoso.montoEsperado)}</span> | Entregado:{" "}
                <span className="font-bold">{formatPrice(cierreExitoso.montoEntregado)}</span> | Diferencia:{" "}
                <span className={`font-bold ${Math.abs(cierreExitoso.diferencia) <= 0.05 ? "text-emerald-700" : "text-rose-700"}`}>
                  {cierreExitoso.diferencia >= 0 ? "+" : ""}
                  {formatPrice(cierreExitoso.diferencia)}
                </span>
              </p>
              {cierreExitoso.estado === "PENDIENTE" && (
                <p className="text-[11px] font-semibold text-amber-800">
                  El cierre presenta diferencia y ha quedado en estado PENDIENTE para validación de Administración.
                </p>
              )}
              {cierreExitoso.observaciones && (
                <p className="text-[11px] opacity-85 italic">
                  Nota registrada: &quot;{cierreExitoso.observaciones}&quot;
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setCierreExitoso(null)}
            className="font-semibold text-xs cursor-pointer px-2 py-1 opacity-75 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Balance de Turno */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Jornada Contable en Vivo
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Balance del Turno Actual ({arqueo?.fecha || "Hoy"})
            </h2>
            {arqueo?.ultimoCierreHoy && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Último corte de hoy: <span className="font-semibold text-slate-700">#{arqueo.ultimoCierreHoy.idCierre}</span> ({arqueo.ultimoCierreHoy.fechaHoraFormatted}) · Contabilizando movimientos posteriores.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              Cooperativa: <span className="font-bold text-slate-900">{arqueo?.cooperativa || "—"}</span>
            </span>
            <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              Cajero: <span className="font-bold text-slate-900">{arqueo?.taquillero || "—"}</span>
            </span>
          </div>
        </div>

        {/* 4 StatTiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Ventas Taquilla (POS)"
            value={formatPrice(arqueo?.ventasTaquilla || 0)}
            subtext="Efectivo en ventanilla"
          />
          <StatTile
            label="Ventas en Ruta"
            value={formatPrice(arqueo?.ventasABordo || 0)}
            subtext="Efectivo cobrado a bordo"
          />
          <StatTile
            label="Gastos y Combustible"
            value={formatPrice(arqueo?.totalGastos || 0)}
            subtext={`${arqueo?.cantidadGastos || 0} comprobantes pendientes`}
          />
          <StatTile
            label="Esperado en Efectivo"
            value={formatPrice(esperado)}
            subtext={`${arqueo?.cantidadVentas || 0} ventas en efectivo del turno`}
            variant="accent"
          />
        </div>
      </div>

      {/* Conteo Físico Compacto */}
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

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {modoConteo === "PESO_A_PESO" && !haEditadoDenominacion && totalDetallado === 0 && (
              <button
                type="button"
                onClick={() => setHaEditadoDenominacion(true)}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                Declarar Gaveta en C$ 0
              </button>
            )}
            {/* Segmented Control */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
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
              min="0"
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
                  ? "Caja Cuadrada (CONFIRMADO)"
                  : esFaltante
                  ? "Faltante en Caja (PENDIENTE)"
                  : "Sobrante en Caja (PENDIENTE)"}
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

        {/* Justificación obligatoria si hay descuadre (faltante o sobrante) */}
        {tieneDescuadre && (
          <div
            className={`p-3 rounded-lg border space-y-1.5 ${
              esFaltante
                ? "bg-rose-50/70 border-rose-200"
                : "bg-amber-50/70 border-amber-200"
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-xs font-bold ${
                esFaltante ? "text-rose-900" : "text-amber-900"
              }`}
            >
              <Icon
                path={mdiAlertCircleOutline}
                size={0.6}
                className={esFaltante ? "text-rose-600" : "text-amber-600"}
              />
              <span>
                {esFaltante
                  ? `Faltante detectado (${formatPrice(Math.abs(diferencia))}). Justificación obligatoria:`
                  : `Sobrante detectado (+${formatPrice(diferencia)}). Nota justificativa para auditoría:`}
              </span>
            </div>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Explique el motivo de la diferencia para revisión de administración..."
              className={`w-full px-3 py-1.5 bg-white border rounded-md text-xs text-slate-800 outline-none ${
                esFaltante
                  ? "border-rose-300 focus:border-rose-600"
                  : "border-amber-300 focus:border-amber-600"
              }`}
            />
            {faltaJustificacion && (
              <p
                className={`text-[10px] font-semibold ${
                  esFaltante ? "text-rose-700" : "text-amber-800"
                }`}
              >
                * Debe detallar una justificación (mín. 5 caracteres) para registrar el cierre en estado PENDIENTE.
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Historial de Cierres de Caja
            </h3>
            <p className="text-xs text-slate-500">
              Actas de liquidación con sellos horarios oficiales de Managua y validación de estados.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmado
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Pendiente revisión
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Rechazado (Re-arqueo)
            </span>
          </div>
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
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {historial.map((c) => {
                  const esCuadreExactoItem = Math.abs(c.diferencia) <= 0.05;
                  const tieneDesglose = parseDesglose(c.desgloseJson).length > 0;
                  return (
                    <tr
                      key={c.idCierre}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        c.estado === "RECHAZADO" ? "opacity-70 bg-rose-50/20" : ""
                      }`}
                    >
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
                            esCuadreExactoItem
                              ? "bg-emerald-50 text-emerald-700"
                              : c.diferencia < 0
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {c.diferencia >= 0 ? "+" : ""}
                          {formatPrice(c.diferencia)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge
                          label={c.estado}
                          variant={getBadgeVariant(c.estado)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                        {c.observaciones ? (
                          <span title={c.observaciones} className="italic">
                            &quot;{c.observaciones}&quot;
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {tieneDesglose && (
                            <button
                              type="button"
                              onClick={() => setCierreDetalleModal(c)}
                              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Ver desglose de efectivo"
                            >
                              <Icon path={mdiEyeOutline} size={0.55} />
                            </button>
                          )}

                          {esSupervisor && c.estado === "PENDIENTE" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setCierreEnRevision({ cierre: c, accion: "CONFIRMADO" });
                                  setMotivoRevision("");
                                  setErrorRevision(null);
                                }}
                                className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Confirmar y aprobar arqueo"
                              >
                                <Icon path={mdiCheck} size={0.5} />
                                <span>Confirmar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCierreEnRevision({ cierre: c, accion: "RECHAZADO" });
                                  setMotivoRevision("");
                                  setErrorRevision(null);
                                }}
                                className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Rechazar cierre para nuevo conteo"
                              >
                                <Icon path={mdiClose} size={0.5} />
                                <span>Rechazar</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE AUDITORÍA: CONFIRMAR O RECHAZAR CIERRE PENDIENTE */}
      {cierreEnRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {cierreEnRevision.accion === "CONFIRMADO"
                    ? "Confirmar Cierre de Caja"
                    : "Rechazar Cierre de Caja"}
                </h3>
                <p className="text-xs text-slate-500">
                  Cierre #{cierreEnRevision.cierre.idCierre} · {cierreEnRevision.cierre.usuarioNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCierreEnRevision(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <Icon path={mdiClose} size={0.65} />
              </button>
            </div>

            <form onSubmit={handleConfirmarRevision} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto Esperado:</span>
                  <span className="font-bold text-slate-800">
                    {formatPrice(cierreEnRevision.cierre.montoEsperado)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Efectivo Entregado:</span>
                  <span className="font-bold text-slate-900">
                    {formatPrice(cierreEnRevision.cierre.montoEntregado)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-500">Diferencia:</span>
                  <span
                    className={`font-bold ${
                      cierreEnRevision.cierre.diferencia < 0 ? "text-rose-600" : "text-amber-700"
                    }`}
                  >
                    {cierreEnRevision.cierre.diferencia >= 0 ? "+" : ""}
                    {formatPrice(cierreEnRevision.cierre.diferencia)}
                  </span>
                </div>
                {cierreEnRevision.cierre.observaciones && (
                  <p className="text-[11px] text-slate-600 italic pt-1">
                    Nota del cajero: &quot;{cierreEnRevision.cierre.observaciones}&quot;
                  </p>
                )}
              </div>

              {cierreEnRevision.accion === "RECHAZADO" && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                  Al rechazar este cierre, los gastos y ventas de este corte quedarán nuevamente abiertos para que el cajero realice un nuevo arqueo corregido.
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {cierreEnRevision.accion === "CONFIRMADO"
                    ? "Nota de aprobación (opcional):"
                    : "Motivo del rechazo (obligatorio):"}
                </label>
                <textarea
                  rows={2}
                  value={motivoRevision}
                  onChange={(e) => setMotivoRevision(e.target.value)}
                  required={cierreEnRevision.accion === "RECHAZADO"}
                  placeholder={
                    cierreEnRevision.accion === "CONFIRMADO"
                      ? "Ej: Diferencia autorizada y conciliada en supervisión..."
                      : "Ej: Error en conteo de billetes de C$ 500, realizar nuevo arqueo..."
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-slate-800"
                />
              </div>

              {errorRevision && (
                <p className="text-rose-600 font-semibold text-[11px]">{errorRevision}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCierreEnRevision(null)}
                  disabled={procesandoRevision}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoRevision}
                  className={`px-4 py-2 text-white rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    cierreEnRevision.accion === "CONFIRMADO"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {procesandoRevision && <Icon path={mdiLoading} size={0.55} className="animate-spin" />}
                  <span>
                    {cierreEnRevision.accion === "CONFIRMADO"
                      ? "Confirmar Cierre"
                      : "Rechazar Cierre"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE DESGLOSE DE DENOMINACIONES */}
      {cierreDetalleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Desglose de Efectivo — Cierre #{cierreDetalleModal.idCierre}
                </h3>
                <p className="text-xs text-slate-500">
                  {cierreDetalleModal.usuarioNombre} · {cierreDetalleModal.fechaHoraFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCierreDetalleModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <Icon path={mdiClose} size={0.65} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Denominación</th>
                    <th className="py-2 px-3 text-center">Cantidad</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parseDesglose(cierreDetalleModal.desgloseJson).map((d) => (
                    <tr key={d.denominacion}>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {d.tipo === "BILLETE" ? "Billete" : "Moneda"} C$ {d.denominacion}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {d.cantidad}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                        {formatPrice(d.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Total Contado:</span>
              <span className="font-extrabold text-sm text-slate-900">
                {formatPrice(cierreDetalleModal.montoEntregado)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
