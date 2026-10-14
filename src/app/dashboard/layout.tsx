"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { 
  mdiViewDashboard, 
  mdiBusDoubleDecker, 
  mdiAccountGroup, 
  mdiMapMarkerPath, 
  mdiTicketConfirmationOutline,
  mdiLogout,
  mdiMenu,
  mdiClose
} from "@mdi/js";
import { Logo } from "@/frontend/components/ui/Logo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: "Resumen", path: "/dashboard", icon: mdiViewDashboard },
    { name: "Flota", path: "/dashboard/flota", icon: mdiBusDoubleDecker },
    { name: "Choferes", path: "/dashboard/choferes", icon: mdiAccountGroup },
    { name: "Rutas", path: "/dashboard/rutas", icon: mdiMapMarkerPath },
    { name: "Ventas", path: "/dashboard/ventas", icon: mdiTicketConfirmationOutline },
  ];

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-50 lg:hidden"
        />
      )}

      {/* Sidebar (Desktop fixed + Mobile slide-over) */}
      <aside
        className={`w-64 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 z-50 shadow-sm transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={0.9} />
            <span className="font-extrabold text-gray-900 text-lg tracking-tight">AdminApp</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <Icon path={mdiClose} size={0.8} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 text-sm ${
                  isActive 
                    ? "bg-gray-900 text-white font-bold shadow-xs" 
                    : "text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon path={item.icon} size={0.8} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-colors text-sm font-bold group cursor-pointer"
          >
            <Icon path={mdiLogout} size={0.8} className="text-red-400 group-hover:text-red-500 transition-colors" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 lg:ml-64 flex flex-col min-h-screen relative w-full overflow-x-hidden">
        {/* Background ambient light */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />

        <header className="h-16 sm:h-18 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 cursor-pointer"
              aria-label="Abrir menú"
            >
              <Icon path={mdiMenu} size={0.9} />
            </button>
            <h2 className="font-extrabold text-gray-900 text-base sm:text-lg tracking-tight">Panel Operativo</h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-none">Admin</p>
              <p className="text-xs text-gray-500 mt-1">admin@cooperativa.com</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-extrabold shadow-xs text-sm sm:text-base">
              A
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
