import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/backend/lib/session';

// Roles administrativos y operacionales autorizados para acceder al dashboard
const DASHBOARD_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO', 'CHOFER', 'AYUDANTE'];

// Roles autorizados para el escáner de boletos
const OPERATIONAL_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO', 'CHOFER', 'AYUDANTE'];

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir endpoints de autenticación pública y webhooks
  if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = !!session;

  // -------------------------------------------------------------
  // 1. CONTROL DE ACCESO A PÁGINAS DE AUTENTICACIÓN (/login, /signup)
  // -------------------------------------------------------------
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot')) {
    if (isAuthenticated) {
      if (DASHBOARD_ROLES.includes(session.rolNombre)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Rutas públicas de libre acceso sin sesión
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 2. TODAS LAS DEMÁS RUTAS REQUIEREN AUTENTICACIÓN
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // -------------------------------------------------------------
  // 3. RESTRICCIONES DE ROL (RBAC) PARA USUARIOS AUTENTICADOS
  // -------------------------------------------------------------

  // Portal de Pasajeros (Home, Trips, Tickets, Compra): Exclusivo para PASAJERO
  const PASSENGER_PORTAL_ROUTES = ['/home', '/trips', '/tickets', '/compra'];
  if (PASSENGER_PORTAL_ROUTES.some((route) => pathname.startsWith(route))) {
    if (session.rolNombre !== 'PASAJERO') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protección de /dashboard/* (Permite Admins, Taquilleros, Choferes y Ayudantes)
  if (pathname.startsWith('/dashboard')) {
    if (!DASHBOARD_ROLES.includes(session.rolNombre)) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Protección de /validar-boleto/* (Solo tripulación y administradores)
  if (pathname.startsWith('/validar-boleto')) {
    if (!OPERATIONAL_ROLES.includes(session.rolNombre)) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (archivos estáticos compilados)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, icon.svg, logo.svg y extensiones multimedia
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};