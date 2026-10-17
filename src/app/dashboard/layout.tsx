"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { 
  mdiViewDashboard, 
  mdiBusDoubleDecker, 
  mdiAccountGroup, 
  mdiMapMarkerPath, 
  mdiDomain,
  mdiAccountCircleOutline,
  mdiLogout,
  mdiMenu,
  mdiClose,
  mdiChevronDown,
  mdiBus,
  mdiAccountMultiple,
} from "@mdi/js";
import { Logo } from "@/frontend/components/ui/Logo";
import { getCurrentUserAction, logoutAction } from "@/backend/actions/auth";
import { LogoutModal } from "@/frontend/components/ui/LogoutModal";
import { TenantProvider, useTenant } from "@/frontend/context/TenantContext";

interface SessionData {
  idUsuario: number;
  idCooperativa: number | null;
  idRol: number;
  rolNombre: string;
  correo: string;
  nombre: string;
  usuario: string;
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const {
    selectedCoopId,
    setSelectedCoopId,
    cooperativas,
    isSuperAdmin,
    selectedCoop,
  } = useTenant();

  useEffect(() => {
    async function initLayout() {
      try {
        const user = await getCurrentUserAction();
        if (user) {
          setSession(user);
        }
      } catch (err) {
        console.error("Error al cargar sesión en layout:", err);
      }
    }
    initLayout();
  }, []);

  const menuItems = [
    { name: "Resumen", path: "/dashboard", icon: mdiViewDashboard },
    ...(isSuperAdmin
      ? [{ name: "Cooperativas", path: "/dashboard/cooperativas", icon: mdiDomain }]
      : []),
    { name: "Flota", path: "/dashboard/flota", icon: mdiBusDoubleDecker },
    { name: "Personal", path: "/dashboard/choferes", icon: mdiAccountGroup },
    { name: "Usuarios", path: "/dashboard/usuarios", icon: mdiAccountMultiple },
    { name: "Rutas", path: "/dashboard/rutas", icon: mdiMapMarkerPath },
  ];

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  const handleOpenLogout = () => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    const res = await logoutAction();
    router.push(res.data?.redirectUrl || "/login");
    router.refresh();
  };

  const userName = session?.nombre || "Administrador";
  const userEmail = session?.correo || "admin@interlocapp.com";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 lg:hidden"
        />
      )}

      {/* Sidebar (Desktop collapsable + Mobile slide-over) */}
      <aside
        className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out ${
          mobileMenuOpen
            ? "translate-x-0"
            : sidebarOpen
            ? "-translate-x-full lg:translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={0.85} />
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base tracking-tight">InterlocApp</span>
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </span>
            </div>
          </Link>
          <div className="flex items-center">
            {/* Botón cerrar exclusivamente en móvil */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
              title="Cerrar panel"
            >
              <Icon path={mdiClose} size={0.7} />
            </button>
          </div>
        </div>

        {/* Selector de cooperativa en móvil si es Super Admin */}
        {isSuperAdmin && cooperativas.length > 0 && (
          <div className="p-3 border-b border-slate-100 lg:hidden bg-slate-50/60">
            <label className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
              <Icon path={mdiDomain} size={0.55} className="text-slate-400" />
              Filtrar por Cooperativa:
            </label>
            <select
              value={selectedCoopId}
              onChange={(e) => setSelectedCoopId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Todas (Vista Global)</option>
              {cooperativas.map((c) => (
                <option key={c.idCooperativa} value={c.idCooperativa.toString()}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                  isActive 
                    ? "bg-slate-900 text-white shadow-2xs font-semibold" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon path={item.icon} size={0.75} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleOpenLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors text-xs sm:text-sm font-medium cursor-pointer"
          >
            <Icon path={mdiLogout} size={0.75} className="text-slate-400 group-hover:text-red-600" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col min-h-screen relative w-full overflow-x-hidden transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-0 lg:ml-64" : "ml-0"
        }`}
      >
        <header className="h-14 sm:h-15 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSidebar}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
              title={sidebarOpen ? "Colapsar panel lateral" : "Expandir panel lateral"}
              aria-label="Alternar panel lateral"
            >
              <Icon path={mdiMenu} size={0.8} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base tracking-tight">Panel Administrativo</h2>
              {selectedCoop && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 max-w-[180px] truncate">
                  <Icon path={mdiDomain} size={0.5} />
                  {selectedCoop.nombre}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Si es Super Admin, selector de Cooperativa global en Header */}
            {isSuperAdmin && cooperativas.length > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                <Icon path={mdiDomain} size={0.65} className="text-slate-400" />
                <span className="text-slate-500 font-medium">Cooperativa:</span>
                <select
                  value={selectedCoopId}
                  onChange={(e) => setSelectedCoopId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todas (Vista Global)</option>
                  {cooperativas.map((c) => (
                    <option key={c.idCooperativa} value={c.idCooperativa.toString()}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Menú de usuario con Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left"
              >
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5">
                    {['CHOFER', 'AYUDANTE', 'TAQUILLERO'].includes(session?.rolNombre || '') && (
                      <span className="p-0.5 rounded bg-primary/10 text-primary" title={`Rol operativo: ${session?.rolNombre}`}>
                        <Icon path={mdiBus} size={0.55} />
                      </span>
                    )}
                    <p className="text-xs font-semibold text-slate-900 leading-none">{userName}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-[140px] truncate">{userEmail}</p>
                </div>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    {userInitial}
                  </div>
                  {['CHOFER', 'AYUDANTE', 'TAQUILLERO'].includes(session?.rolNombre || '') && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center border border-white shadow-xs">
                      <Icon path={mdiBus} size={0.35} />
                    </span>
                  )}
                </div>
                <Icon path={mdiChevronDown} size={0.6} className="text-slate-400 hidden sm:block" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    onClick={() => setUserDropdownOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-fadeIn text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 truncate">{userName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{session?.rolNombre || "Administrador"}</p>
                    </div>
                    <Link
                      href="/dashboard/perfil"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <Icon path={mdiAccountCircleOutline} size={0.65} className="text-slate-400" />
                      <span>Mi Perfil</span>
                    </Link>
                    <button
                      onClick={handleOpenLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 font-medium text-left cursor-pointer"
                    >
                      <Icon path={mdiLogout} size={0.65} className="text-red-500" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Modal de confirmación para cerrar sesión en Dashboard */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        userName={userName}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </TenantProvider>
  );
}
