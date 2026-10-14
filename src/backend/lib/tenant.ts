import { getSession, SessionPayload } from './session';

export class AuthError extends Error {
  code: 'UNAUTHENTICATED' | 'FORBIDDEN';
  constructor(message: string, code: 'UNAUTHENTICATED' | 'FORBIDDEN') {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Extrae y valida el contexto multi-tenant de la sesión activa en el servidor.
 * Garantiza que ninguna acción sensible se ejecute sin una sesión verificada.
 */
export async function getCurrentTenant(allowedRoles?: string[]): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    throw new AuthError('No se encontró una sesión activa.', 'UNAUTHENTICATED');
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.rolNombre)) {
      throw new AuthError(
        `Acceso no autorizado. Tu rol (${session.rolNombre}) no tiene permisos para esta operación.`,
        'FORBIDDEN'
      );
    }
  }

  return session;
}

/**
 * Genera el filtro de aislamiento `where: { idCooperativa }` para Prisma.
 * Si el usuario es SUPER_ADMIN y no tiene cooperativa asignada, permite bypass opcional.
 */
export function getTenantFilter(session: SessionPayload): { idCooperativa: number } {
  if (!session.idCooperativa) {
    throw new AuthError('El usuario no pertenece a ninguna cooperativa configurada.', 'FORBIDDEN');
  }
  return { idCooperativa: session.idCooperativa };
}
