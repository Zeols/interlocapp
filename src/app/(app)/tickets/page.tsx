"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@mdi/react";
import {
  mdiTicketConfirmationOutline,
  mdiBus,
  mdiChevronRight,
  mdiChevronLeft,
  mdiClose,
  mdiSeatPassenger,
  mdiClockOutline,
  mdiCalendarOutline,
  mdiCheckCircle,
} from "@mdi/js";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { getMisBoletosAction, type GrupoBoletosItem, type BoletoDetalleItem } from "@/backend/actions/boletos";
import { QRCodeOffline, encodeBoletoQRPayload } from "@/frontend/components/ui/QRCodeOffline";

export default function TicketsPage() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<"activos" | "historial">("activos");
  const [gruposViajes, setGruposViajes] = useState<GrupoBoletosItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GrupoBoletosItem | null>(null);
  const [currentBoletoIndex, setCurrentBoletoIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const cargarBoletos = () => {
    setLoading(true);
    getMisBoletosAction().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setGruposViajes(res.data);
      } else {
        setGruposViajes([]);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    cargarBoletos();
  }, []);

  const abrirModalGrupo = (grupo: GrupoBoletosItem) => {
    setSelectedGroup(grupo);
    // Posicionar por defecto en el primer boleto que aún esté pendiente de abordar
    const primerActivo = grupo.boletos.findIndex((b) => b.estado === "ACTIVO");
    setCurrentBoletoIndex(primerActivo >= 0 ? primerActivo : 0);
  };

  const gruposFiltrados = gruposViajes.filter((g) =>
    activeTab === "activos" ? g.estadoPrincipal === "ACTIVO" : g.estadoPrincipal !== "ACTIVO"
  );

  const conteoActivos = gruposViajes.filter((g) => g.estadoPrincipal === "ACTIVO").length;
  const conteoHistorial = gruposViajes.filter((g) => g.estadoPrincipal !== "ACTIVO").length;

  const currentBoleto: BoletoDetalleItem | null =
    selectedGroup && selectedGroup.boletos[currentBoletoIndex]
      ? selectedGroup.boletos[currentBoletoIndex]
      : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
            Mis Boletos
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Presenta tu código QR o número de boleto al abordar la unidad. Tus asientos comprados para un mismo viaje se agrupan en una sola tarjeta.
          </p>
        </div>

        <Link
          href="/trips"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <Icon path={mdiBus} size={0.8} />
          Comprar nuevo boleto
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("activos")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "activos"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          Próximos viajes ({conteoActivos})
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "historial"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          Historial pasado ({conteoHistorial})
        </button>
      </div>

      {/* Listado de Viajes y Boletos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-gray-200 rounded-md" />
                  <div className="h-5 w-48 bg-gray-200 rounded-md" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-md" />
              </div>

              <div className="grid grid-cols-3 gap-3 my-4 p-3.5 bg-gray-50/80 rounded-lg">
                <div className="space-y-1.5">
                  <div className="h-3 w-14 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-14 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-14 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-8 w-28 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Icon path={mdiTicketConfirmationOutline} size={1.2} />
          </div>
          <h3 className="font-extrabold text-gray-900 text-lg mb-1">
            No tienes boletos en esta sección
          </h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            Cuando compres tus pasajes aparecerán aquí agrupados por viaje con su código QR para abordar.
          </p>
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Explorar viajes disponibles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {gruposFiltrados.map((grupo) => {
            const esActivo = grupo.estadoPrincipal === "ACTIVO";
            const tieneVariosBoletos = grupo.cantidadBoletos > 1;

            return (
              <div
                key={grupo.idViaje}
                onClick={() => abrirModalGrupo(grupo)}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden cursor-pointer hover:border-gray-300 flex flex-col justify-between"
              >
                {/* Badge de Estado del Viaje */}
                {esActivo ? (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-bl-lg flex items-center gap-1">
                    <span>
                      {tieneVariosBoletos
                        ? `Listo · ${grupo.cantidadBoletos} Asientos`
                        : "Listo para viajar"}
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 bg-gray-400 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-bl-lg">
                    {grupo.estadoPrincipal === "UTILIZADO" ? "Completado" : "Vencido / Cancelado"}
                  </div>
                )}

                <div>
                  {/* Encabezado del viaje */}
                  <div className="flex items-start justify-between mb-3.5 pr-20">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        {grupo.cooperativa}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-black text-gray-900">{grupo.origen}</span>
                        <span className="text-gray-300">→</span>
                        <span className="text-lg font-black text-gray-900">{grupo.destino}</span>
                      </div>
                    </div>
                  </div>

                  {/* Datos del viaje y asientos */}
                  <div className="grid grid-cols-3 gap-2.5 p-3 bg-gray-50 rounded-lg mb-4 text-xs">
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1">
                        <Icon path={mdiCalendarOutline} size={0.5} />
                        Fecha
                      </p>
                      <p className="font-bold text-gray-800 mt-0.5">{grupo.fecha}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1">
                        <Icon path={mdiClockOutline} size={0.5} />
                        Salida
                      </p>
                      <p className="font-bold text-gray-800 mt-0.5">{grupo.horaSalida}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1">
                        <Icon path={mdiSeatPassenger} size={0.5} />
                        {tieneVariosBoletos ? "Asientos" : "Asiento"}
                      </p>
                      {tieneVariosBoletos ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {grupo.boletos.map((b) => (
                            <span
                              key={b.id}
                              className={`inline-block px-1.5 py-0.2 rounded text-[11px] font-extrabold ${
                                b.estado !== "ACTIVO"
                                  ? "bg-slate-200 text-slate-500 line-through"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              #{b.asientoNumero}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-extrabold text-primary text-sm mt-0.5">
                          #{grupo.boletos[0].asientoNumero}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pie de tarjeta con total y llamado a acción */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900 text-sm">
                      {formatPrice(grupo.totalPagado)}
                    </span>
                    {tieneVariosBoletos ? (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {grupo.cantidadBoletos} boletos agrupados
                      </span>
                    ) : (
                      <span className="text-gray-500 font-mono text-[11px] font-bold bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                        {grupo.boletos[0].codigoBoleto}
                      </span>
                    )}
                  </div>

                  <span className="text-primary font-bold text-xs flex items-center gap-0.5">
                    {tieneVariosBoletos ? `Ver ${grupo.cantidadBoletos} Boletos y QR` : "Ver QR"}
                    <Icon path={mdiChevronRight} size={0.65} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal con Selector de Asientos y Código QR Individual */}
      {selectedGroup && currentBoleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl p-6 sm:p-7 shadow-2xl relative border border-gray-200 text-center">
            {/* Botón Cerrar */}
            <button
              onClick={() => setSelectedGroup(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <Icon path={mdiClose} size={0.75} />
            </button>

            {/* Cooperativa y Ruta */}
            <span className="inline-block bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md mb-2">
              {selectedGroup.cooperativa}
            </span>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {selectedGroup.origen} → {selectedGroup.destino}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Salida: {selectedGroup.fecha} · {selectedGroup.horaSalida}
              {selectedGroup.unidadNumero && selectedGroup.unidadNumero !== "S/N"
                ? ` · Unidad #${selectedGroup.unidadNumero}`
                : ""}
            </p>

            {/* Selector de Asientos / Pestañas de Boletos Agrupados */}
            {selectedGroup.boletos.length > 1 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-xl max-w-full justify-center">
                  {selectedGroup.boletos.map((b, idx) => {
                    const isSelected = currentBoletoIndex === idx;
                    const isBoarded = b.estado === "UTILIZADO";
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setCurrentBoletoIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-xs"
                            : isBoarded
                            ? "bg-slate-200/80 text-slate-500 hover:bg-slate-200"
                            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/70"
                        }`}
                      >
                        <Icon path={mdiSeatPassenger} size={0.55} />
                        <span>#{b.asientoNumero}</span>
                        {isBoarded && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Abordado" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                  Boleto {currentBoletoIndex + 1} de {selectedGroup.boletos.length} · Selecciona el asiento para ver su QR
                </p>
              </div>
            )}

            {/* Visualizador QR Escaneable Oficial (100% Offline) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 inline-flex flex-col items-center justify-center mb-4 shadow-xs">
              <div className="w-44 h-44 bg-white rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100">
                <QRCodeOffline
                  value={encodeBoletoQRPayload({
                    idBoleto: currentBoleto.idBoleto,
                    idViaje: selectedGroup.idViaje,
                    asiento: currentBoleto.asientoNumero,
                    codigoBoleto: currentBoleto.codigoBoleto,
                  })}
                  size={160}
                  alt={currentBoleto.codigoBoleto}
                />
              </div>
              <span className="mt-2.5 font-mono font-bold text-xs text-slate-900 tracking-wider">
                {currentBoleto.codigoBoleto}
              </span>
            </div>

            {/* Ficha de Detalles del Boleto Actual */}
            <div className="bg-gray-50 rounded-lg p-3.5 mb-4 text-left text-xs space-y-1.5 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Asiento asignado:</span>
                <span className="font-extrabold text-primary text-sm">#{currentBoleto.asientoNumero}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Importe pagado:</span>
                <span className="font-bold text-gray-900">{formatPrice(currentBoleto.precio)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estado de abordaje:</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    currentBoleto.estado === "ACTIVO"
                      ? "text-emerald-600"
                      : currentBoleto.estado === "UTILIZADO"
                      ? "text-slate-600"
                      : "text-red-600"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentBoleto.estado === "ACTIVO"
                        ? "bg-emerald-500"
                        : currentBoleto.estado === "UTILIZADO"
                        ? "bg-slate-400"
                        : "bg-red-500"
                    }`}
                  />
                  {currentBoleto.estado === "ACTIVO"
                    ? "Listo para validar"
                    : currentBoleto.estado === "UTILIZADO"
                    ? "Abordado"
                    : "Vencido / Cancelado"}
                </span>
              </div>
            </div>

            {/* Botones de Navegación Anterior / Siguiente entre Boletos */}
            {selectedGroup.boletos.length > 1 && (
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setCurrentBoletoIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentBoletoIndex === 0}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Icon path={mdiChevronLeft} size={0.65} />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentBoletoIndex((prev) =>
                      Math.min(selectedGroup.boletos.length - 1, prev + 1)
                    )
                  }
                  disabled={currentBoletoIndex === selectedGroup.boletos.length - 1}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Siguiente</span>
                  <Icon path={mdiChevronRight} size={0.65} />
                </button>
              </div>
            )}

            {/* Botón de Cierre */}
            <button
              onClick={() => setSelectedGroup(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
