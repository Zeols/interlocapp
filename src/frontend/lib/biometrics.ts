/**
 * Utilidades para autenticación biométrica (Huella Digital / Face ID / Windows Hello)
 * utilizando la API estándar del navegador Web Authentication (WebAuthn / Passkeys).
 */

const STORAGE_KEY = 'interlocapp_biometric_device';

export interface StoredBiometricDevice {
  credentialId: string;
  deviceToken: string;
  deviceName: string;
  userEmail: string;
  userName: string;
  registeredAt: string;
}

// Convertidores de búfer a Base64URL y viceversa
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Comprueba si el navegador actual soporta WebAuthn y autenticadores de plataforma (huella/biometría).
 */
export async function isBiometricsAvailable(): Promise<{
  supported: boolean;
  hasPlatformAuthenticator: boolean;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { supported: false, hasPlatformAuthenticator: false };
  }

  let hasPlatformAuthenticator = false;
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      hasPlatformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    hasPlatformAuthenticator = false;
  }

  return {
    supported: true,
    hasPlatformAuthenticator,
  };
}

/**
 * Detecta un nombre amigable para el dispositivo actual.
 */
export function getFriendlyDeviceName(): string {
  if (typeof window === 'undefined') return 'Dispositivo Web';
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) return 'iPhone / iPad (Touch ID / Face ID)';
  if (/Android/.test(ua)) return 'Dispositivo Android (Huella / Biometría)';
  if (/Windows/.test(ua)) return 'PC Windows (Windows Hello)';
  if (/Macintosh/.test(ua)) return 'Mac (Touch ID)';
  if (/Linux/.test(ua)) return 'Dispositivo Linux';
  return 'Navegador Web Seguro';
}

/**
 * Retorna etiquetas descriptivas según el tipo de biometría del sistema actual (Face ID / Huella).
 */
export function getBiometricTypeLabel(): {
  label: string;
  shortLabel: string;
  isFaceId: boolean;
} {
  if (typeof window === 'undefined') {
    return { label: 'Huella / Biometría', shortLabel: 'Biometría', isFaceId: false };
  }
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) {
    return { label: 'Face ID / Touch ID', shortLabel: 'Face ID', isFaceId: true };
  }
  if (/Macintosh/.test(ua)) {
    return { label: 'Touch ID', shortLabel: 'Touch ID', isFaceId: false };
  }
  if (/Windows/.test(ua)) {
    return { label: 'Windows Hello / Huella', shortLabel: 'Windows Hello', isFaceId: false };
  }
  if (/Android/.test(ua)) {
    return { label: 'Huella Digital', shortLabel: 'Huella', isFaceId: false };
  }
  return { label: 'Face ID / Huella Digital', shortLabel: 'Huella / Biometría', isFaceId: false };
}

/**
 * Obtiene la credencial biométrica guardada en este dispositivo (si existe).
 */
export function getStoredBiometricDevice(): StoredBiometricDevice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredBiometricDevice;
  } catch {
    return null;
  }
}

/**
 * Guarda la credencial biométrica en este dispositivo.
 */
export function saveBiometricDevice(data: StoredBiometricDevice): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Elimina la credencial biométrica de este dispositivo.
 */
export function removeStoredBiometricDevice(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Solicita al sistema operativo registrar una nueva huella digital / passkey
 * a través de `navigator.credentials.create`.
 */
export async function createBiometricCredential(
  userEmail: string,
  userName: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'Tu navegador no soporta autenticación biométrica WebAuthn.' };
    }

    // Generar un challenge aleatorio criptográfico de 32 bytes
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Identificador de usuario único
    const userIdBuffer = new TextEncoder().encode(userEmail);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'InterlocApp Transporte',
          id: window.location.hostname,
        },
        user: {
          id: userIdBuffer,
          name: userEmail,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Obliga al sensor biométrico local (TouchID, Windows Hello, Huella Android)
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'No se completó el registro de la huella digital.' };
    }

    const credentialId = bufferToBase64Url(credential.rawId);
    return { success: true, credentialId };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'Operación cancelada o no se detectó el sensor biométrico.' };
    }
    return { success: false, error: error.message || 'Error al registrar huella digital.' };
  }
}

/**
 * Pide al usuario escanear su huella digital / Face ID / Windows Hello
 * a través de `navigator.credentials.get`.
 */
export async function verifyBiometricCredential(
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'Tu navegador no soporta autenticación biométrica.' };
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: base64UrlToBuffer(credentialId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { success: false, error: 'No se pudo verificar la huella digital.' };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'Acceso biométrico denegado o cancelado por el usuario.' };
    }
    return { success: false, error: error.message || 'Error al validar huella digital.' };
  }
}
