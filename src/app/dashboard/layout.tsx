"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@mdi/react";
import { 
  mdiViewDashboard, 
  mdiBusDoubleDecker, 
  mdiAccountGroup, 
  mdiMapMarkerPath, 
  mdiTicketConfirmationOutline,
  mdiLogout
} from "@mdi/js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Resumen", path: "/dashboard", icon: mdiViewDashboard },
    { name: "Flota", path: "/dashboard/flota", icon: mdiBusDoubleDecker },
    { name: "Choferes", path: "/dashboard/choferes", icon: mdiAccountGroup },
    { name: "Rutas", path: "/dashboard/rutas", icon: mdiMapMarkerPath },
    { name: "Ventas", path: "/dashboard/ventas", icon: mdiTicketConfirmationOutline },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Sidebar - Premium Light */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 z-50 shadow-sm">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
              <Icon path={mdiBusDoubleDecker} size={0.7} />
            </div>
            <span className="font-black text-gray-900 text-xl tracking-tight">AdminApp</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                  isActive 
                    ? "bg-primary/10 text-primary font-bold shadow-sm" 
                    : "text-gray-500 font-medium hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon path={item.icon} size={0.8} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors text-sm font-bold group">
            <Icon path={mdiLogout} size={0.8} className="text-red-400 group-hover:text-red-500 transition-colors" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
        {/* Background ambient light */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none"></div>

        <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 z-40">
          <h2 className="font-black text-gray-900 text-xl tracking-tight">Panel Operativo</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-none">Admin</p>
              <p className="text-xs text-gray-500 mt-1">admin@cooperativa.com</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black shadow-sm">
              A
            </div>
          </div>
        </header>
        <div className="flex-1 p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
