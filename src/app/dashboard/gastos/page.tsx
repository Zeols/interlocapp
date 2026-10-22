"use client";

import React, { useState, useEffect } from "react";
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
  mdiReceiptTextOutline,
  mdiCashMultiple,
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

export default function GastosPage() {
  const { formatPrice } = useCurrency();
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");

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

  // Cálculos métricos
  const totalGeneral = gastos.reduce((acc, g) => acc + g.monto, 0);
  const totalCombustible = gastos
    .filter((g) => g.tipo === "GASOLINA")
    .reduce((acc, g) => acc + g.monto, 0);
  const totalGalones = gastos
    .filter((g) => g.tipo === "GASOLINA" && g.abastecimientoGasolina)
    .reduce((acc, g) => acc + (g.abastecimientoGasolina?.cantidadGalones || 0), 0);
  const totalMantenimiento = gastos
    .filter((g) => g.tipo === "MANTENIMIENTO")
    .reduce((acc, g) => acc + g.monto, 0);
  const totalOtros = totalGeneral - totalCombustible - totalMantenimiento;

  const gastosFiltrados = gastos.filter((g) =>
    filtroTipo === "TODOS" ? true : g.tipo === filtroTipo
  );

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
          color: "bg-purple-50 text-purple-800 border-purple-200",
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
          <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Icon path={mdiReceiptTextOutline} size={0.7} />
            Módulo Financiero
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Gastos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro de egresos operativos y combustible para liquidaciones y arqueos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cargarGastos}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors shadow-xs cursor-pointer"
            title="Refrescar gastos"
          >
            <Icon path={mdiRefresh} size={0.7} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Icon path={mdiPlus} size={0.7} />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Egresos
          </span>
          <span className="text-2xl font-black text-slate-900">{formatPrice(totalGeneral)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">{gastos.length} registros</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Combustible Diesel
          </span>
          <span className="text-2xl font-black text-amber-600">{formatPrice(totalCombustible)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">{totalGalones.toFixed(1)} galones</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Mantenimiento Flota
          </span>
          <span className="text-2xl font-black text-blue-600">{formatPrice(totalMantenimiento)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Reparaciones y repuestos</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Peajes y Viáticos
          </span>
          <span className="text-2xl font-black text-slate-700">{formatPrice(totalOtros)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Gastos de ruta</span>
        </div>
      </div>

      {/* Filtros de Tabla */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {["TODOS", "GASOLINA", "MANTENIMIENTO", "PEAJE", "VIATICOS", "OTRO"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltroTipo(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filtroTipo === f
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "TODOS" ? "Todos los gastos" : f}
          </button>
        ))}
      </div>

      {/* Tabla de Gastos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-sm animate-pulse">
            Cargando registros contables...
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No se han registrado gastos en esta categoría.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Detalle / Proveedor</th>
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${b.color}`}
                        >
                          <Icon path={b.icon} size={0.55} />
                          {b.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {g.descripcion || "Sin descripción"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {g.abastecimientoGasolina ? (
                          <span>
                            {g.abastecimientoGasolina.cantidadGalones} gal @ C${" "}
                            {g.abastecimientoGasolina.precioUnitario.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(g.fechaHora).toLocaleString("es-NI", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm text-slate-900">
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
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Icon path={mdiClose} size={0.8} />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">Registrar Gasto Operativo</h3>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa el gasto para imputarlo a la jornada actual.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo de Gasto</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoGasto)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-slate-900"
                >
                  <option value="GASOLINA">Combustible (Gasolina / Diesel)</option>
                  <option value="PEAJE">Peaje en Carretera</option>
                  <option value="VIATICOS">Viáticos de Tripulación</option>
                  <option value="MANTENIMIENTO">Mantenimiento y Reparación</option>
                  <option value="OTRO">Otro Gasto</option>
                </select>
              </div>

              {tipo === "GASOLINA" ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Galones</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={galones}
                      onChange={(e) => setGalones(e.target.value)}
                      placeholder="10.5"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Precio/Galón (C$)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={precioGalon}
                      onChange={(e) => setPrecioGalon(e.target.value)}
                      placeholder="175.50"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto Total (C$)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Descripción / Factura / Observación
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Factura Puma Gasolinera #4582"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-slate-900"
                />
              </div>

              {errorForm && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold">
                  {errorForm}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
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
