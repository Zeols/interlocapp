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
  mdiCashRegister,
  mdiGasStation,
  mdiFinance,
  mdiQrcodeScan,
} from "@mdi/js";
import { Logo } from "@/frontend/components/ui/Logo";
import { getCurrentUserAction, logoutAction } from "@/backend/actions/auth";
import { getUserProfileAction } from "@/backend/actions/usuarios";
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
  const [userFoto, setUserFoto] = useState<string | null>(null);

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
        const profileRes = await getUserProfileAction();
        if (profileRes.success && profileRes.data) {
          setUserFoto(profileRes.data.foto || null);
        }
      } catch (err) {
        console.error("Error al cargar sesión en layout:", err);
      }
    }
    initLayout();

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ foto?: string | null }>;
      if (customEvent.detail && customEvent.detail.foto !== undefined) {
        setUserFoto(customEvent.detail.foto);
      }
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  // Normalizamos el rol de forma segura para evitar fallos por mayúsculas/minúsculas o espacios
  const rolUsuario = (session?.rolNombre || (session as any)?.rol || "").trim().toUpperCase();
  const isAyudante = rolUsuario === "AYUDANTE" || rolUsuario === "CHOFER";
  const isLoadingSession = session === null;

  // Si la sesión está cargando, mostramos un spinner limpio para evitar el parpadeo de pestañas
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Menú dinámico según el rol validado
  const menuItems = isAyudante
    ? [
        { name: "Resumen", path: "/dashboard", icon: mdiViewDashboard },
        { name: "Viaje", path: "/dashboard/ayudante", icon: mdiBus },
        { name: "Validar Boletos", path: "/validar-boleto", icon: mdiQrcodeScan },
      ]
    : [
        { name: "Resumen", path: "/dashboard", icon: mdiViewDashboard },
        ...(isSuperAdmin
          ? [{ name: "Cooperativas", path: "/dashboard/cooperativas", icon: mdiDomain }]
          : []),
        { name: "Salidas y Despacho", path: "/dashboard/viajes", icon: mdiBus },
        { name: "Taquilla POS", path: "/dashboard/pos", icon: mdiCashRegister },
        { name: "Flota", path: "/dashboard/flota", icon: mdiBusDoubleDecker },
        { name: "Personal", path: "/dashboard/choferes", icon: mdiAccountGroup },
        { name: "Gastos", path: "/dashboard/gastos", icon: mdiGasStation },
        { name: "Cierres de Caja", path: "/dashboard/cierres", icon: mdiFinance },
        { name: "Usuarios", path: "/dashboard/usuarios", icon: mdiAccountMultiple },
        { name: "Rutas", path: "/dashboard/rutas", icon: mdiMapMarkerPath },
        { name: "Validar Boletos", path: "/validar-boleto", icon: mdiQrcodeScan },
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
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Logo size={0.85} />
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">InterlocApp</span>
                
                {/* 🟢 CAMBIO 1: Badge dinámico en el Sidebar */}
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                  {isAyudante ? "Ayudante" : isSuperAdmin ? "Super Admin" : "Admin"}
                </span>

              </div>
            </Link>
            {/* Botón cerrar exclusivamente en móvil */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
              title="Cerrar panel"
            >
              <Icon path={mdiClose} size={0.7} />
            </button>
          </div>
          {!isAyudante && selectedCoop && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                <Icon path={mdiDomain} size={0.55} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight" title={selectedCoop.nombre}>
                  {selectedCoop.nombre}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Cooperativa asignada</p>
              </div>
            </div>
          )}
        </div>

        {/* Selector de cooperativa en móvil si es Super Admin */}
        {!isAyudante && isSuperAdmin && cooperativas.length > 0 && (
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
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5 min-w-0">
                
                {/* 🟢 CAMBIO 2: Título dinámico en el Header superior */}
                <h2 className="font-bold text-slate-900 text-xs sm:text-sm md:text-base tracking-tight truncate">
                  {isAyudante ? "Panel de Ayudante" : selectedCoop ? selectedCoop.nombre : "Panel Administrativo"}
                </h2>

                {/* Etiqueta de Cooperativa o Super Admin */}
                {!isAyudante && (
                  selectedCoop ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-auto">
                      <Icon path={mdiDomain} size={0.45} className="text-emerald-600" />
                      <span>Cooperativa</span>
                    </span>
                  ) : isSuperAdmin ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      <span>Super Admin</span>
                    </span>
                  ) : null
                )}

              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Si es Super Admin, selector de Cooperativa global en Header */}
            {!isAyudante && isSuperAdmin && cooperativas.length > 0 && (
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
                  {userFoto ? (
                    <img
                      src={userFoto}
                      alt={userName}
                      className="w-8 h-8 rounded-full object-cover border border-primary/20 shadow-2xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {userInitial}
                    </div>
                  )}
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