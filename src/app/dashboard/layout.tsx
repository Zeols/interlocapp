"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  mdiClipboardCheckOutline,
  mdiBusSide,
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

interface NavSection {
  title: string;
  items: {
    name: string;
    path: string;
    icon: string;
  }[];
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

  // Rol normalizado
  const rolUsuario = (session?.rolNombre || (session as any)?.rol || "").trim().toUpperCase();
  const isAyudante = rolUsuario === "AYUDANTE";
  const isChofer = rolUsuario === "CHOFER";
  const isChequeador = rolUsuario === "CHEQUEADOR";
  const isTaquillero = rolUsuario === "TAQUILLERO";
  const isAdminCoop = rolUsuario === "ADMIN_COOP";
  const isLoadingSession = session === null;

  // Secciones organizadas según RBAC
  const navigationSections: NavSection[] = useMemo(() => {
    const sections: NavSection[] = [];

    // 1. Resumen General
    sections.push({
      title: "PANEL PRINCIPAL",
      items: [
        { name: "Resumen Operativo", path: "/dashboard", icon: mdiViewDashboard },
      ],
    });

    // 2. Operaciones en Ruta
    const operacionesItems = [];
    if (isSuperAdmin || isAdminCoop || isTaquillero || isChequeador || isChofer || isAyudante) {
      operacionesItems.push({ name: "Salidas y Despacho", path: "/dashboard/viajes", icon: mdiBus });
    }
    if (isSuperAdmin || isAdminCoop || isChequeador) {
      operacionesItems.push({ name: "Puntos de Control", path: "/dashboard/chequeador", icon: mdiClipboardCheckOutline });
    }
    if (isSuperAdmin || isAyudante) {
      operacionesItems.push({ name: "Modo Ayudante", path: "/dashboard/ayudante", icon: mdiBusSide });
    }
    operacionesItems.push({ name: "Validar Boletos", path: "/validar-boleto", icon: mdiQrcodeScan });

    if (operacionesItems.length > 0) {
      sections.push({
        title: "OPERACIONES EN RUTA",
        items: operacionesItems,
      });
    }

    // 3. Ventas y Caja
    const ventasItems = [];
    if (isSuperAdmin || isAdminCoop || isTaquillero) {
      ventasItems.push({ name: "Taquilla POS", path: "/dashboard/pos", icon: mdiCashRegister });
      ventasItems.push({ name: "Cierres y Arqueos", path: "/dashboard/cierres", icon: mdiFinance });
    }

    if (ventasItems.length > 0) {
      sections.push({
        title: "VENTAS & CAJA",
        items: ventasItems,
      });
    }

    // 4. Gestión de Flota & Rutas
    const flotaItems = [];
    if (isSuperAdmin || isAdminCoop) {
      flotaItems.push({ name: "Flota de Unidades", path: "/dashboard/flota", icon: mdiBusDoubleDecker });
      flotaItems.push({ name: "Rutas y Paradas", path: "/dashboard/rutas", icon: mdiMapMarkerPath });
    }
    if (isSuperAdmin || isAdminCoop || isTaquillero) {
      flotaItems.push({ name: "Gastos Operativos", path: "/dashboard/gastos", icon: mdiGasStation });
    }

    if (flotaItems.length > 0) {
      sections.push({
        title: "FLOTA & RUTAS",
        items: flotaItems,
      });
    }

    // 5. Administración
    const adminItems = [];
    if (isSuperAdmin || isAdminCoop) {
      adminItems.push({ name: "Personal y Choferes", path: "/dashboard/choferes", icon: mdiAccountGroup });
      adminItems.push({ name: "Usuarios", path: "/dashboard/usuarios", icon: mdiAccountMultiple });
    }
    if (isSuperAdmin) {
      adminItems.push({ name: "Cooperativas", path: "/dashboard/cooperativas", icon: mdiDomain });
    }

    if (adminItems.length > 0) {
      sections.push({
        title: "ADMINISTRACIÓN",
        items: adminItems,
      });
    }

    return sections;
  }, [isSuperAdmin, isAdminCoop, isTaquillero, isChequeador, isChofer, isAyudante]);

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

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

  const userName = session?.nombre || "Usuario";
  const userEmail = session?.correo || "usuario@interlocapp.com";
  const userInitial = userName.charAt(0).toUpperCase();

  const getRolBadge = () => {
    if (isSuperAdmin) return { label: "Super Admin", color: "bg-slate-900 text-white border-slate-900" };
    if (isAdminCoop) return { label: "Admin Coop", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    if (isTaquillero) return { label: "Taquillero", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (isChequeador) return { label: "Chequeador", color: "bg-amber-50 text-amber-700 border-amber-200" };
    if (isAyudante) return { label: "Ayudante", color: "bg-teal-50 text-teal-700 border-teal-200" };
    if (isChofer) return { label: "Chofer", color: "bg-blue-50 text-blue-700 border-blue-200" };
    return { label: rolUsuario, color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  const badgeRol = getRolBadge();

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
        {/* Cabecera del Sidebar */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Logo size={0.85} />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-base tracking-tight">InterlocApp</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeRol.color}`}>
                  {badgeRol.label}
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
              title="Cerrar panel"
            >
              <Icon path={mdiClose} size={0.7} />
            </button>
          </div>

          {selectedCoop && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
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
        {isSuperAdmin && cooperativas.length > 0 && (
          <div className="p-3 border-b border-slate-100 lg:hidden bg-slate-50/60 shrink-0">
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

        {/* Navegación por Secciones Estructuradas con scroll fino y estilizado */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          {navigationSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {sec.title}
              </span>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                        isActive
                          ? "bg-slate-900 text-white shadow-2xs font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon path={item.icon} size={0.7} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer del Sidebar: Perfil de usuario y Cerrar Sesión */}
        <div className="p-3 border-t border-slate-100 space-y-2 shrink-0">
          <Link
            href="/dashboard/perfil"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {userFoto ? (
              <img
                src={userFoto}
                alt={userName}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                {userInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate leading-none">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{userEmail}</p>
            </div>
          </Link>

          <button
            onClick={handleOpenLogout}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors text-xs font-medium cursor-pointer"
          >
            <Icon path={mdiLogout} size={0.65} className="text-slate-400" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col min-h-screen relative w-full overflow-x-hidden transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-0 lg:ml-64" : "ml-0"
        }`}
      >
        <header className="h-14 sm:h-15 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleToggleSidebar}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer shrink-0"
              title={sidebarOpen ? "Colapsar panel lateral" : "Expandir panel lateral"}
              aria-label="Alternar panel lateral"
            >
              <Icon path={mdiMenu} size={0.75} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-bold text-slate-900 text-xs sm:text-sm md:text-base tracking-tight truncate">
                {isAyudante
                  ? "Panel de Ayudante en Ruta"
                  : isChequeador
                  ? "Puntos de Control y Chequeo"
                  : selectedCoop
                  ? selectedCoop.nombre
                  : "Panel de Administración"}
              </h2>

              {selectedCoop ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                  <Icon path={mdiDomain} size={0.4} />
                  <span>Cooperativa</span>
                </span>
              ) : isSuperAdmin ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                  <span>Super Admin</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Si es Super Admin, selector de Cooperativa global en Header */}
            {isSuperAdmin && cooperativas.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                <Icon path={mdiDomain} size={0.6} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium shrink-0">Cooperativa:</span>
                <select
                  value={selectedCoopId}
                  onChange={(e) => setSelectedCoopId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] lg:max-w-[180px] truncate"
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
                  <p className="text-xs font-semibold text-slate-900 leading-none">{userName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-[140px] truncate hidden lg:block">{userEmail}</p>
                </div>
                {userFoto ? (
                  <img
                    src={userFoto}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {userInitial}
                  </div>
                )}
                <Icon path={mdiChevronDown} size={0.5} className="text-slate-400 hidden sm:block shrink-0" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                    <p className="font-semibold text-slate-900 truncate">{userName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                  </div>
                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Icon path={mdiAccountCircleOutline} size={0.65} />
                    Mi Perfil
                  </Link>
                  <button
                    onClick={handleOpenLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Icon path={mdiLogout} size={0.65} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Viewport con padding canónico estándar */}
        <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </TenantProvider>
  );
}
