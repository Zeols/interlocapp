"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@mdi/react";
import {
  mdiGasStation,
  mdiWrench,
  mdiRoad,
  mdiFood,
  mdiDotsHorizontal,
  mdiPlus,
  mdiTrashCanOutline,
  mdiRefresh,
  mdiClose,
  mdiMagnify,
  mdiFilterVariant,
  mdiCalendarRange,
} from "@mdi/js";
import {
  getGastosAction,
  registrarGastoAction,
  eliminarGastoAction,
  GastoItem,
  RegistrarGastoInput,
} from "@/backend/actions/gastos";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { TipoGasto } from "@prisma/client";

type RangoTiempo = "HOY" | "SEMANA" | "MES" | "TODOS";

export default function GastosPage() {
  const { formatPrice } = useCurrency();
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filtros interactivos
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroRango, setFiltroRango] = useState<RangoTiempo>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Estado del formulario
  const [tipo, setTipo] = useState<TipoGasto>("GASOLINA");
  const [monto, setMonto] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [galones, setGalones] = useState<string>("");
  const [precioGalon, setPrecioGalon] = useState<string>("175.50");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarGastos = async () => {
    setLoading(true);
    try {
      const res = await getGastosAction();
      if (res.success && res.data) {
        setGastos(res.data);
      }
    } catch (err) {
      console.error("Error al cargar gastos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  // Si cambia galones o precio por galón, calcular monto total automáticamente
  useEffect(() => {
    if (tipo === "GASOLINA") {
      const g = parseFloat(galones) || 0;
      const p = parseFloat(precioGalon) || 0;
      if (g > 0 && p > 0) {
        setMonto((g * p).toFixed(2));
      }
    }
  }, [galones, precioGalon, tipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto) || 0;
    if (montoNum <= 0) {
      setErrorForm("Ingrese un monto válido superior a cero.");
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    try {
      const payload: RegistrarGastoInput = {
        tipo,
        monto: montoNum,
        descripcion: descripcion.trim() || undefined,
        ...(tipo === "GASOLINA"
          ? {
              cantidadGalones: parseFloat(galones) || 0,
              precioUnitario: parseFloat(precioGalon) || 0,
            }
          : {}),
      };

      const res = await registrarGastoAction(payload);
      if (!res.success) {
        setErrorForm(res.error || "No se pudo registrar el gasto.");
        setGuardando(false);
        return;
      }

      setShowModal(false);
      setMonto("");
      setDescripcion("");
      setGalones("");
      cargarGastos();
    } catch (err: any) {
      setErrorForm(err.message || "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (idGasto: number) => {
    if (!confirm("¿Deseas eliminar este registro de gasto?")) return;
    try {
      const res = await eliminarGastoAction(idGasto);
      if (res.success) {
        cargarGastos();
      }
    } catch (err) {
      console.error("Error al eliminar gasto:", err);
    }
  };

  // Filtrado compuesto (Categoría + Rango Temporal + Búsqueda de texto)
  const gastosFiltrados = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Inicio de la semana (Lunes)
    const dayOfWeek = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();

    // Inicio del mes
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return gastos.filter((g) => {
      // 1. Filtro por tipo
      if (filtroTipo !== "TODOS" && g.tipo !== filtroTipo) return false;

      // 2. Filtro por rango de fecha
      const fechaItem = new Date(g.fechaHora).getTime();
      if (filtroRango === "HOY" && fechaItem < startOfToday) return false;
      if (filtroRango === "SEMANA" && fechaItem < startOfWeek) return false;
      if (filtroRango === "MES" && fechaItem < startOfMonth) return false;

      // 3. Búsqueda por texto (descripción)
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const desc = (g.descripcion || "").toLowerCase();
        const tipoLabel = g.tipo.toLowerCase();
        if (!desc.includes(query) && !tipoLabel.includes(query)) return false;
      }

      return true;
    });
  }, [gastos, filtroTipo, filtroRango, busqueda]);

  // Cálculos métricos sobre los datos filtrados
  const totalGeneral = useMemo(() => gastosFiltrados.reduce((acc, g) => acc + g.monto, 0), [gastosFiltrados]);
  const totalCombustible = useMemo(
    () =>
      gastosFiltrados
        .filter((g) => g.tipo === "GASOLINA")
        .reduce((acc, g) => acc + g.monto, 0),
    [gastosFiltrados]
  );
  const totalGalones = useMemo(
    () =>
      gastosFiltrados
        .filter((g) => g.tipo === "GASOLINA" && g.abastecimientoGasolina)
        .reduce((acc, g) => acc + (g.abastecimientoGasolina?.cantidadGalones || 0), 0),
    [gastosFiltrados]
  );
  const totalMantenimiento = useMemo(
    () =>
      gastosFiltrados
        .filter((g) => g.tipo === "MANTENIMIENTO")
        .reduce((acc, g) => acc + g.monto, 0),
    [gastosFiltrados]
  );
  const totalOtros = totalGeneral - totalCombustible - totalMantenimiento;

  const tieneFiltrosActivos = filtroTipo !== "TODOS" || filtroRango !== "TODOS" || busqueda.trim().length > 0;

  const limpiarFiltros = () => {
    setFiltroTipo("TODOS");
    setFiltroRango("TODOS");
    setBusqueda("");
  };

  const getBadgeTipo = (tipoGasto: TipoGasto) => {
    switch (tipoGasto) {
      case "GASOLINA":
        return {
          icon: mdiGasStation,
          label: "Combustible",
          color: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "MANTENIMIENTO":
        return {
          icon: mdiWrench,
          label: "Mantenimiento",
          color: "bg-blue-50 text-blue-800 border-blue-200",
        };
      case "PEAJE":
        return {
          icon: mdiRoad,
          label: "Peaje",
          color: "bg-teal-50 text-teal-800 border-teal-200",
        };
      case "VIATICOS":
        return {
          icon: mdiFood,
          label: "Viáticos",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
      default:
        return {
          icon: mdiDotsHorizontal,
          label: "Otro Gasto",
          color: "bg-slate-100 text-slate-800 border-slate-200",
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gastos Operativos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro y fiscalización de egresos en ruta, combustible y taller para arqueos contables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cargarGastos}
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Refrescar gastos"
          >
            <Icon path={mdiRefresh} size={0.7} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Icon path={mdiPlus} size={0.65} />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* Barra de Filtros Avanzada */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Buscador de texto */}
          <div className="relative flex-1 max-w-md">
            <Icon
              path={mdiMagnify}
              size={0.65}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por descripción, factura o concepto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-colors"
            />
          </div>

          {/* Rango de tiempo */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Icon path={mdiCalendarRange} size={0.55} />
              Período:
            </span>
            {[
              { id: "HOY", label: "Hoy" },
              { id: "SEMANA", label: "Esta Semana" },
              { id: "MES", label: "Este Mes" },
              { id: "TODOS", label: "Histórico" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setFiltroRango(r.id as RangoTiempo)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filtroRango === r.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}

            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="ml-2 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer underline underline-offset-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Categorías de Gasto */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Icon path={mdiFilterVariant} size={0.55} />
            Categoría:
          </span>
          {[
            { id: "TODOS", label: "Todas las categorías" },
            { id: "GASOLINA", label: "Combustible" },
            { id: "MANTENIMIENTO", label: "Mantenimiento" },
            { id: "PEAJE", label: "Peajes" },
            { id: "VIATICOS", label: "Viáticos" },
            { id: "OTRO", label: "Otros" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFiltroTipo(cat.id)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                filtroTipo === cat.id
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Dinámicas (Reflejan los filtros activos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Egresos Filtrados
          </span>
          <span className="text-2xl font-bold text-slate-900">{formatPrice(totalGeneral)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {gastosFiltrados.length} comprobantes {tieneFiltrosActivos ? "(según filtros)" : "totales"}
          </span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Combustible Diesel
          </span>
          <span className="text-2xl font-bold text-amber-600">{formatPrice(totalCombustible)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">{totalGalones.toFixed(1)} galones</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Mantenimiento Flota
          </span>
          <span className="text-2xl font-bold text-blue-600">{formatPrice(totalMantenimiento)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Reparaciones y repuestos</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Peajes y Viáticos
          </span>
          <span className="text-2xl font-bold text-slate-700">{formatPrice(totalOtros)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Gastos de ruta</span>
        </div>
      </div>

      {/* Tabla de Gastos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs animate-pulse">
            Cargando registros contables...
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p>No se encontraron gastos que coincidan con los criterios seleccionados.</p>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="text-xs text-slate-900 font-semibold underline underline-offset-2 cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Detalle / Concepto</th>
                  <th className="py-3 px-4">Detalle Combustible</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {gastosFiltrados.map((g) => {
                  const b = getBadgeTipo(g.tipo);
                  return (
                    <tr key={g.idGasto} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${b.color}`}
                        >
                          <Icon path={b.icon} size={0.5} />
                          {b.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {g.descripcion || "Sin descripción"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {g.abastecimientoGasolina ? (
                          <span>
                            {g.abastecimientoGasolina.cantidadGalones} gal @ C${" "}
                            {g.abastecimientoGasolina.precioUnitario.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(g.fechaHora).toLocaleString("es-NI", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm text-slate-900">
                        {formatPrice(g.monto)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleEliminar(g.idGasto)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Icon path={mdiTrashCanOutline} size={0.65} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Gasto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Icon path={mdiClose} size={0.7} />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-0.5">Registrar Gasto Operativo</h3>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa el gasto para imputarlo a la jornada contable actual.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipo de Gasto</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoGasto)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none focus:border-slate-900"
                >
                  <option value="GASOLINA">Combustible (Gasolina / Diesel)</option>
                  <option value="PEAJE">Peaje en Carretera</option>
                  <option value="VIATICOS">Viáticos de Tripulación</option>
                  <option value="MANTENIMIENTO">Mantenimiento y Reparación</option>
                  <option value="OTRO">Otro Gasto</option>
                </select>
              </div>

              {tipo === "GASOLINA" ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                  <div>
                    <label className="font-semibold text-amber-900 block mb-1">Galones</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={galones}
                      onChange={(e) => setGalones(e.target.value)}
                      placeholder="10.5"
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-md font-semibold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-amber-900 block mb-1">Precio/Galón (C$)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={precioGalon}
                      onChange={(e) => setPrecioGalon(e.target.value)}
                      placeholder="175.50"
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-md font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Monto Total (C$)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Descripción / Factura / Observación
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Factura Petronic #10423"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-slate-900"
                />
              </div>

              {errorForm && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-semibold">
                  {errorForm}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {guardando ? "Guardando..." : "Guardar Gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
