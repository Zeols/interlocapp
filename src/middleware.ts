import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/backend/lib/session';

// Roles administrativos autorizados para el dashboard
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO'];

// Roles operativos autorizados para el escáner de boletos
const OPERATIONAL_ROLES = ['SUPER_ADMIN', 'ADMIN_COOP', 'TAQUILLERO', 'CHOFER', 'AYUDANTE'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = !!session;

  // -------------------------------------------------------------
  // 1. CONTROL DE ACCESO A PÁGINAS DE AUTENTICACIÓN (/login, /signup)
  // -------------------------------------------------------------
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    if (isAuthenticated) {
      if (ADMIN_ROLES.includes(session.rolNombre)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (['CHOFER', 'AYUDANTE'].includes(session.rolNombre)) {
        return NextResponse.redirect(new URL('/validar-boleto', request.url));
      }
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 2. PROTECCIÓN DEL DASHBOARD ADMINISTRATIVO (/dashboard/*)
  // -------------------------------------------------------------
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!ADMIN_ROLES.includes(session.rolNombre)) {
      // Pasajeros o roles no autorizados son redirigidos al portal de pasajero
      return NextResponse.redirect(new URL('/home', request.url));
    }

    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 3. PROTECCIÓN DEL ESCÁNER DE ABORDAJE (/validar-boleto/*)
  // -------------------------------------------------------------
  if (pathname.startsWith('/validar-boleto')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!OPERATIONAL_ROLES.includes(session.rolNombre)) {
      return NextResponse.redirect(new URL('/home', request.url));
    }

    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 4. RUTAS PRIVADAS DEL PASAJERO (/tickets, /profile, /settings)
  // -------------------------------------------------------------
  const privatePassengerRoutes = ['/tickets', '/profile', '/settings'];
  if (privatePassengerRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/validar-boleto/:path*',
    '/tickets/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
};
