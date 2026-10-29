"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@mdi/react";
import {
  mdiTicketConfirmationOutline,
  mdiBus,
  mdiChevronRight,
  mdiClose,
} from "@mdi/js";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { getMisBoletosAction, type MiBoletoItem } from "@/backend/actions/boletos";
import { QRCodeOffline, encodeBoletoQRPayload } from "@/frontend/components/ui/QRCodeOffline";

export default function TicketsPage() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<"activos" | "historial">("activos");
  const [tickets, setTickets] = useState<MiBoletoItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<MiBoletoItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMisBoletosAction().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setTickets(res.data);
      } else {
        setTickets([]);
      }
      setLoading(false);
    });
  }, []);

  const filteredTickets = tickets.filter((t) =>
    activeTab === "activos" ? t.estado === "ACTIVO" : t.estado !== "ACTIVO"
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
            <Icon path={mdiTicketConfirmationOutline} size={0.7} />
            Bóveda de Boletos
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
            Mis Boletos
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Presenta tu código QR o número de boleto al abordar la unidad.
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
          Próximos viajes ({tickets.filter((t) => t.estado === "ACTIVO").length})
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "historial"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          Historial pasado ({tickets.filter((t) => t.estado !== "ACTIVO").length})
        </button>
      </div>

      {/* List */}
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

              <div className="grid grid-cols-2 gap-4 my-4 p-3.5 bg-gray-50/80 rounded-lg">
                <div className="space-y-1.5">
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-8 w-28 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Icon path={mdiTicketConfirmationOutline} size={1.2} />
          </div>
          <h3 className="font-extrabold text-gray-900 text-lg mb-1">
            No tienes boletos en esta sección
          </h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            Cuando compres tus pasajes aparecerán aquí con su código QR para abordar.
          </p>
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            Explorar viajes disponibles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden cursor-pointer hover:border-gray-300"
            >
              {ticket.estado === "ACTIVO" ? (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-bl-lg">
                  Listo para viajar
                </div>
              ) : (
                <div className="absolute top-0 right-0 bg-gray-400 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-bl-lg">
                  {ticket.estado}
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {ticket.cooperativa}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-gray-900">{ticket.origen}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-lg font-black text-gray-900">{ticket.destino}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg mb-4 text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Fecha</p>
                  <p className="font-bold text-gray-800 mt-0.5">{ticket.fecha}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Salida</p>
                  <p className="font-bold text-gray-800 mt-0.5">{ticket.horaSalida}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Asiento</p>
                  <p className="font-extrabold text-primary text-sm mt-0.5">#{ticket.asientoNumero}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-mono text-[11px] font-bold bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                  {ticket.codigoBoleto}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-gray-900 text-sm">{formatPrice(ticket.precio)}</span>
                  <span className="text-primary font-bold text-xs flex items-center">
                    Ver QR <Icon path={mdiChevronRight} size={0.6} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalle con Código QR para Abordar */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 sm:p-7 shadow-2xl relative border border-gray-200 text-center">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Icon path={mdiClose} size={0.75} />
            </button>

            <span className="inline-block bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md mb-3">
              {selectedTicket.cooperativa}
            </span>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {selectedTicket.origen} → {selectedTicket.destino}
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Salida: {selectedTicket.fecha} · {selectedTicket.horaSalida}
            </p>

            {/* Visualizador QR Escaneable Oficial (100% Offline) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 inline-flex flex-col items-center justify-center mb-5 shadow-xs">
              <div className="w-44 h-44 bg-white rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100">
                <QRCodeOffline
                  value={encodeBoletoQRPayload({
                    idBoleto: Number(selectedTicket.codigoBoleto.replace(/\D/g, "")),
                    asiento: selectedTicket.asientoNumero,
                    codigoBoleto: selectedTicket.codigoBoleto,
                  })}
                  size={160}
                  alt={selectedTicket.codigoBoleto}
                />
              </div>
              <span className="mt-2.5 font-mono font-bold text-xs text-slate-900 tracking-wider">
                {selectedTicket.codigoBoleto}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3.5 mb-5 text-left text-xs space-y-1.5 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Asiento asignado:</span>
                <span className="font-extrabold text-primary">#{selectedTicket.asientoNumero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Importe pagado:</span>
                <span className="font-bold text-gray-900">{formatPrice(selectedTicket.precio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado de abordaje:</span>
                <span className={`font-bold ${selectedTicket.estado === "ACTIVO" ? "text-emerald-600" : "text-gray-600"}`}>
                  {selectedTicket.estado === "ACTIVO" ? "Listo para validar" : selectedTicket.estado}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTicket(null)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
