import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';

const SALT_ROUNDS = 12;
const TICKET_SECRET = process.env.TICKET_SIGNING_SECRET || 'interlocapp-super-secret-ticket-key-2026';

/**
 * Genera un hash seguro para la contraseña del usuario utilizando bcrypt con coste 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password.trim(), SALT_ROUNDS);
}

/**
 * Comprueba si la contraseña en texto plano coincide con el hash almacenado.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password.trim(), hash);
}

/**
 * Genera una firma HMAC-SHA256 para el payload del boleto digital (prevención de falsificaciones).
 */
export function signTicketPayload(payload: string): string {
  const hmac = createHmac('sha256', TICKET_SECRET);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Valida de forma segura contra ataques de tiempo si la firma del boleto es auténtica.
 */
export function verifyTicketSignature(payload: string, signature: string): boolean {
  try {
    const expectedSignature = signTicketPayload(payload);
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
