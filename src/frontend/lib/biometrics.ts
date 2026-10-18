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
  isSecure: boolean;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { supported: false, hasPlatformAuthenticator: false, isSecure: false };
  }

  // WebAuthn requiere obligatoriamente un contexto seguro (HTTPS o localhost).
  const isSecure = window.isSecureContext ?? (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (!isSecure) {
    return { supported: false, hasPlatformAuthenticator: false, isSecure: false };
  }

  let hasPlatformAuthenticator = false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      hasPlatformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    hasPlatformAuthenticator = false;
  }

  return {
    supported: true,
    hasPlatformAuthenticator,
    isSecure: true,
  };
}

/**
 * Detecta un nombre amigable para el dispositivo actual con mención específica de Face ID en iOS.
 */
export function getFriendlyDeviceName(): string {
  if (typeof window === 'undefined') return 'Dispositivo Web';
  const ua = navigator.userAgent;

  if (/iPhone/.test(ua)) return 'iPhone (Face ID / Biometría)';
  if (/iPad/.test(ua)) return 'iPad (Face ID / Biometría)';
  if (/Android/.test(ua)) return 'Dispositivo Android (Huella)';
  if (/Windows/.test(ua)) return 'PC Windows (Windows Hello)';
  if (/Macintosh/.test(ua)) return 'Mac (Touch ID)';
  if (/Linux/.test(ua)) return 'Dispositivo Linux';
  return 'Navegador Web';
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
 * Solicita al sistema operativo registrar una nueva huella digital / Face ID / passkey
 * a través de `navigator.credentials.create`.
 * 
 * Diseñado con compatibilidad universal para iOS Safari / WebKit (Face ID / Touch ID),
 * evitando bloqueos de NotAllowedError y permitiendo la captura biométrica nativa de Apple.
 */
export async function createBiometricCredential(
  userEmail: string,
  userName: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'Tu navegador no soporta autenticación biométrica WebAuthn.' };
    }

    const isSecure = window.isSecureContext ?? (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (!isSecure) {
      return {
        success: false,
        error: 'Face ID / Biometría requiere una conexión segura (HTTPS). En pruebas móviles, accede mediante la URL con HTTPS.',
      };
    }

    // Generar un challenge criptográfico seguro de 32 bytes
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Asegurar que el userId no sea una cadena vacía (WebAuthn exige entre 1 y 64 bytes)
    const validEmail = (userEmail || '').trim() || 'usuario@interlocapp.com';
    const validName = (userName || '').trim() || validEmail;
    const userIdBuffer = new TextEncoder().encode(validEmail);

    // Omitir rp.id para que el navegador resuelva automáticamente el origen efectivo.
    // Esto garantiza 100% de compatibilidad en Safari sin riesgo de SecurityError ni NotAllowedError.
    const rp: { name: string } = {
      name: 'InterlocApp Transporte',
    };

    // Parámetros de algoritmos de clave pública compatibles
    // ES256 (-7): Estándar nativo para Apple Secure Enclave (Face ID / Touch ID)
    // RS256 (-257): Compatibilidad con Windows Hello y TPM
    const pubKeyCredParams: PublicKeyCredentialParameters[] = [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ];

    // Omitir authenticatorAttachment para no forzar restricciones que causen NotAllowedError en iOS.
    // En iPhone/iPad, Safari presentará automáticamente la hoja nativa de Face ID / Passkey.
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp,
        user: {
          id: userIdBuffer,
          name: validEmail,
          displayName: validName,
        },
        pubKeyCredParams,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'No se completó el registro de Face ID / datos biométricos.' };
    }

    const credentialId = bufferToBase64Url(credential.rawId);
    return { success: true, credentialId };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'NotAllowedError') {
      return {
        success: false,
        error: 'Registro cancelado o no autorizado. En iPhone, verifica en Configuración > Face ID y código (y Contraseñas) que el acceso esté permitido.',
      };
    }
    if (error.name === 'SecurityError') {
      return { success: false, error: 'Contexto de seguridad no válido. Asegúrate de acceder mediante una conexión segura HTTPS.' };
    }
    if (error.name === 'NotSupportedError') {
      return { success: false, error: 'Tu dispositivo o navegador no soporta el método biométrico solicitado.' };
    }
    return { success: false, error: error.message || 'Error al registrar Face ID / datos biométricos.' };
  }
}

/**
 * Pide al usuario escanear su Face ID / huella digital / Windows Hello
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
            // En iOS y passkeys sincronizados, permitir tanto local como iCloud Keychain
            transports: ['internal', 'hybrid'],
          },
        ],
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { success: false, error: 'No se pudo verificar la biometría en el dispositivo.' };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'Acceso biométrico cancelado o denegado por el usuario.' };
    }
    return { success: false, error: error.message || 'Error al validar datos biométricos.' };
  }
}
