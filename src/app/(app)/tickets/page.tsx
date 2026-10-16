"use client";

import React, { useState } from "react";
import Link from "next/link";
import Icon from "@mdi/react";
import {
  mdiTicketConfirmationOutline,
  mdiBus,
  mdiMapMarker,
  mdiClockOutline,
  mdiCalendar,
  mdiQrcode,
  mdiChevronRight,
  mdiArrowLeft,
  mdiCheckCircleOutline,
} from "@mdi/js";
import { useCurrency } from "@/frontend/context/CurrencyContext";

interface TicketItem {
  id: string;
  codigoBoleto: string;
  origen: string;
  destino: string;
  fecha: string;
  horaSalida: string;
  asientoNumero: string;
  cooperativa: string;
  precio: number;
  estado: "ACTIVO" | "UTILIZADO" | "CANCELADO";
}

const MOCK_TICKETS: TicketItem[] = [
  {
    id: "t-1",
    codigoBoleto: "BOLETO-782910",
    origen: "Managua (UCA)",
    destino: "Juigalpa",
    fecha: "Hoy, 15 Oct 2026",
    horaSalida: "06:30 AM",
    asientoNumero: "14",
    cooperativa: "COOTRANSTEL R.L.",
    precio: 120,
    estado: "ACTIVO",
  },
  {
    id: "t-2",
    codigoBoleto: "BOLETO-645120",
    origen: "Managua (UCA)",
    destino: "León",
    fecha: "10 Oct 2026",
    horaSalida: "08:00 AM",
    asientoNumero: "05",
    cooperativa: "COOTRANSTEL R.L.",
    precio: 85,
    estado: "UTILIZADO",
  },
];

export default function TicketsPage() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<"activos" | "historial">("activos");

  const filteredTickets = MOCK_TICKETS.filter((t) =>
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
            Presenta tu código QR al abordar la unidad.
          </p>
        </div>

        <Link
          href="/trips"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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
          Próximos viajes ({MOCK_TICKETS.filter((t) => t.estado === "ACTIVO").length})
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "historial"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          Historial pasado ({MOCK_TICKETS.filter((t) => t.estado !== "ACTIVO").length})
        </button>
      </div>

      {/* List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
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
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full transition-colors"
          >
            Explorar viajes disponibles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {ticket.estado === "ACTIVO" && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-bl-2xl">
                  Listo para viajar
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

              <div className="grid grid-cols-3 gap-3 p-3.5 bg-gray-50/80 rounded-2xl mb-4 text-xs">
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
                <span className="text-gray-500 font-mono text-[11px]">{ticket.codigoBoleto}</span>
                <span className="font-extrabold text-gray-900 text-sm">{formatPrice(ticket.precio)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
