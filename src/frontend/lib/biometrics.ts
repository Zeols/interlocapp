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
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
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
 * Diseñado con compatibilidad estricta para iOS Safari / WebKit (Face ID / Touch ID),
 * evitando errores de RP ID en IPs y conflictos de residentKey que mandaban al usuario a Configuración.
 */
export async function createBiometricCredential(
  userEmail: string,
  userName: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'Tu navegador no soporta autenticación biométrica WebAuthn.' };
    }

    // Generar un challenge criptográfico seguro de 32 bytes
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Asegurar que el userId no sea una cadena vacía (WebAuthn exige entre 1 y 64 bytes)
    const validEmail = (userEmail || '').trim() || 'usuario@interlocapp.com';
    const validName = (userName || '').trim() || validEmail;
    const userIdBuffer = new TextEncoder().encode(validEmail);

    // Configuración del Relying Party:
    // La especificación WebAuthn prohíbe que rp.id sea una dirección IP (IPv4/IPv6).
    // Si estamos en un dominio válido o localhost, lo asignamos.
    // Si se accede mediante una dirección IP (ej. pruebas en red local Wi-Fi desde iPhone),
    // omitimos `id` para que el navegador utilice el origen de forma nativa sin arrojar SecurityError.
    const rp: { name: string; id?: string } = {
      name: 'InterlocApp Transporte',
    };
    const hostname = window.location.hostname || '';
    const isIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname) || hostname.includes(':');
    if (hostname && !isIpAddress) {
      rp.id = hostname;
    }

    // Parámetros de algoritmos de clave pública compatibles
    // ES256 (-7): Estándar por defecto para Apple Secure Enclave (Face ID / Touch ID) y Android
    // RS256 (-257): Compatibilidad con Windows Hello y hardware TPM
    const pubKeyCredParams: PublicKeyCredentialParameters[] = [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ];

    let credential: PublicKeyCredential | null = null;

    // Intento 1: Registro nativo de Passkey con plataforma (Face ID / Touch ID / Sensor local)
    // NOTA CRÍTICA PARA iOS:
    // - NUNCA enviar `requireResidentKey: false`, ya que en iOS Safari los autenticadores de plataforma
    //   (Face ID / iCloud Keychain) solo admiten resident keys. Enviar `false` provocaba que iOS
    //   mostrara el diálogo "Ve a Configuración a habilitar opciones" y bloqueara Face ID.
    // - Usamos `residentKey: 'preferred'` y `userVerification: 'preferred'` para máxima compatibilidad.
    try {
      credential = (await navigator.credentials.create({
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
            authenticatorAttachment: 'platform',
            residentKey: 'preferred',
            userVerification: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;
    } catch (platformErr: unknown) {
      const err = platformErr as Error;
      // Si el navegador rechaza el requerimiento estricto de 'platform' (ej. en ciertas versiones de WebView o iOS)
      // reintentamos sin forzar attachment para que Safari muestre su hoja de Passkey nativa
      if (err.name === 'NotSupportedError' || err.name === 'ConstraintError') {
        credential = (await navigator.credentials.create({
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
      } else {
        throw platformErr;
      }
    }

    if (!credential) {
      return { success: false, error: 'No se completó el registro de los datos biométricos.' };
    }

    const credentialId = bufferToBase64Url(credential.rawId);
    return { success: true, credentialId };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'Operación cancelada o permiso biométrico denegado en el dispositivo.' };
    }
    if (error.name === 'SecurityError') {
      return { success: false, error: 'Contexto de seguridad no válido. Asegúrate de acceder mediante un dominio seguro (HTTPS o localhost).' };
    }
    if (error.name === 'NotSupportedError') {
      return { success: false, error: 'Tu dispositivo o navegador no soporta el método biométrico configurado.' };
    }
    return { success: false, error: error.message || 'Error al registrar Face ID / huella digital.' };
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
