import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/frontend/components/ui/card";
import Icon from "@mdi/react";
import { mdiTicketConfirmationOutline, mdiBusDoubleDecker, mdiCurrencyUsd, mdiAccountGroup } from "@mdi/js";

export default function DashboardHome() {
  const stats = [
    { title: "Ventas de Hoy", value: "C$ 12,450", icon: mdiCurrencyUsd, trend: "+14%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Boletos Emitidos", value: "342", icon: mdiTicketConfirmationOutline, trend: "+5%", color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Unidades Activas", value: "18 / 24", icon: mdiBusDoubleDecker, trend: "Estable", color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Nuevos Pasajeros", value: "89", icon: mdiAccountGroup, trend: "+22%", color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Resumen de Operaciones</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Monitoreo en tiempo real de la flota y ventas.
          </p>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {new Date().toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Estadísticas (Bento Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {stats.map((stat, i) => (
          <Card key={i} className="rounded-3xl border-gray-100 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.title}</CardTitle>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <Icon path={stat.icon} size={0.9} />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{stat.value}</div>
              <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-gray-400'}`}>
                {stat.trend} <span className="text-gray-400 font-medium">vs ayer</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sección Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <Card className="rounded-3xl border-gray-100 bg-white shadow-xs h-full">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="font-extrabold text-gray-900 tracking-tight">Últimas Ventas</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-xs flex items-center justify-center mb-4 text-gray-300">
                  <Icon path={mdiTicketConfirmationOutline} size={1.3} />
                </div>
                <p className="font-bold text-gray-700">Conectando con base de datos...</p>
                <p className="text-xs text-gray-400 mt-1">La tabla de transacciones aparecerá aquí</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Ocupación Promedio */}
        <div className="lg:col-span-1">
          <Card className="rounded-3xl border-gray-100 bg-white shadow-xs h-full flex flex-col items-center justify-center relative overflow-hidden group">
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
            
            <CardHeader className="text-center z-10 w-full pt-8">
              <CardTitle className="font-extrabold text-gray-900 tracking-tight">Ocupación Promedio</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 z-10">
              
              {/* Radial Progress Widget */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="fill-none stroke-gray-100" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="fill-none stroke-emerald-500 drop-shadow-sm transition-all duration-1000 ease-out" 
                    strokeWidth="8" 
                    strokeDasharray="251.2" 
                    strokeDashoffset="55.26" // (1 - 0.78) * 251.2
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">78%</span>
                </div>
              </div>

              <div className="mt-8 text-center bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-emerald-600 font-bold text-sm">Excelente rendimiento</p>
                <p className="text-gray-500 text-xs font-medium mt-1">Ruta Managua - León lidera</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
