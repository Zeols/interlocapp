import nodemailer, { type Transporter } from 'nodemailer';
import path from 'path';
import fs from 'fs';

// Tipos de datos para el servicio de correos
export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
}

export interface TicketEmailData {
  to: string;
  passengerName: string;
  ticketCode: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  seats: string[] | number[];
  unitPlate?: string;
  totalAmount: number;
}

export interface WelcomeEmailData {
  to: string;
  name: string;
}

// Convierte HTML a texto plano limpio para snippets de preview en clientes de correo
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper para obtener configuración SMTP actual
export function getMailConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const rawPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const port = isNaN(rawPort) ? 587 : rawPort;

  // En serverless (Vercel) y la mayoría de redes, el puerto 587 con STARTTLS (secure: false)
  // es el estándar recomendado para evitar 'Greeting never received'.
  // El puerto 465 requiere secure: true; el puerto 587 requiere obligatoriamente secure: false.
  let secure = port === 465;
  if (process.env.SMTP_SECURE !== undefined) {
    const isExplicitlyTrue = process.env.SMTP_SECURE === 'true';
    if (port === 587) {
      secure = false; // El puerto 587 jamás debe usar secure: true (provoca bloqueo en el saludo TLS inicial)
    } else if (port === 465) {
      secure = true;
    } else {
      secure = isExplicitlyTrue;
    }
  }

  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const from = process.env.SMTP_FROM || (user ? `InterlocApp <${user}>` : 'InterlocApp <notificaciones@interlocapp.com>');

  return { host, port, secure, user, pass, from };
}

// Crea una instancia de transporter con configuraciones optimizadas
function createTransporterInstance(
  config: ReturnType<typeof getMailConfig>,
  portOverride?: number,
  secureOverride?: boolean
): Transporter {
  const port = portOverride ?? config.port;
  const secure = secureOverride ?? (port === 465 ? true : false);

  return nodemailer.createTransport({
    host: config.host,
    port,
    secure,
    auth: {
      user: config.user,
      pass: config.pass.replace(/\s+/g, ''), // Remueve espacios si el usuario pegó la clave de aplicación con espacios
    },
    tls: {
      rejectUnauthorized: false, // Compatibilidad con redes cloud/serverless
    },
    requireTLS: port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    pool: false, // Desactivar pool en entornos serverless (Vercel) para evitar sockets congelados
  });
}

// Singleton del transporter de nodemailer
let transporter: Transporter | null = null;
let lastUsedUser = '';
let lastUsedPass = '';
let lastUsedPort = 0;

export function getMailTransporter(): Transporter | null {
  const config = getMailConfig();
  if (!config.user || !config.pass) {
    return null;
  }

  // Si cambiaron las credenciales o el puerto o no existe, recrear el transporter
  if (
    !transporter ||
    lastUsedUser !== config.user ||
    lastUsedPass !== config.pass ||
    lastUsedPort !== config.port
  ) {
    lastUsedUser = config.user;
    lastUsedPass = config.pass;
    lastUsedPort = config.port;
    transporter = createTransporterInstance(config);
  }

  return transporter;
}

/**
 * Valida la conexión SMTP configurada
 */
export async function verifyEmailConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const client = getMailTransporter();
    if (!client) {
      return {
        success: false,
        message: 'No se han configurado las credenciales de correo (SMTP_USER y SMTP_PASS en el archivo .env).',
      };
    }

    await client.verify();
    return {
      success: true,
      message: 'Conexión SMTP con Gmail verificada y lista para enviar correos.',
    };
  } catch (error: any) {
    console.error('Error al verificar conexión SMTP con Gmail:', error);
    return {
      success: false,
      message: error?.message || 'Error al autenticar contra el servidor SMTP de Gmail.',
    };
  }
}

/**
 * Envío genérico de correos electrónicos con soporte para logo embebido (CID) y fallback de puerto
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments = [],
}: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getMailTransporter();
    if (!client) {
      console.warn(
        '[MailService Warning] Variables SMTP no detectadas (SMTP_USER y SMTP_PASS). En Vercel, agrégalas en Project Settings > Environment Variables.'
      );
      return {
        success: false,
        error: 'Servicio de correo no configurado en variables de entorno (SMTP_USER/SMTP_PASS).',
      };
    }

    // Soporte para simular o desactivar globalmente envíos de correo en testing
    if (process.env.DISABLE_EMAIL_SENDING === 'true') {
      console.log(`[MailService] Envío simulado (DISABLE_EMAIL_SENDING=true) para: ${Array.isArray(to) ? to.join(', ') : to}`);
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    // Envío de adjuntos solo si se especificaron explícitamente (sin archivos pesados embebidos para acelerar la entrega)
    const finalAttachments = [...attachments];

    const config = getMailConfig();
    let info;

    const cleanText = text || stripHtmlToText(html);

    try {
      const sendPromise = client.sendMail({
        from: config.from,
        to,
        replyTo: config.user,
        subject,
        html,
        text: cleanText,
        attachments: finalAttachments,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      });

      // Timeout de protección de 8 segundos
      info = await Promise.race([
        sendPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Greeting never received (Timeout local)')), 8000)
        ),
      ]);
    } catch (primaryError: any) {
      const isConnectionIssue =
        primaryError?.code === 'ETIMEDOUT' ||
        primaryError?.command === 'CONN' ||
        primaryError?.message?.includes('Greeting never received');

      // Si falló por timeout de conexión o saludo en Vercel, reintentar automáticamente en el puerto alternativo
      if (isConnectionIssue) {
        const altPort = config.port === 465 ? 587 : 465;
        const altSecure = altPort === 465;
        console.warn(
          `[MailService Warning] Falló envío en puerto ${config.port} (${primaryError?.message}). Reintentando automáticamente en puerto alternativo ${altPort} (secure: ${altSecure})...`
        );

        const fallbackTransporter = createTransporterInstance(config, altPort, altSecure);
        const fallbackPromise = fallbackTransporter.sendMail({
          from: config.from,
          to,
          replyTo: config.user,
          subject,
          html,
          text: cleanText,
          attachments: finalAttachments,
          priority: 'high',
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high',
          },
        });

        info = await Promise.race([
          fallbackPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Greeting never received (Timeout en puerto alternativo)')), 8000)
          ),
        ]);
      } else {
        throw primaryError;
      }
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[MailService Error]:', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
    });

    let friendlyError = error?.message || 'Fallo desconocido al enviar correo.';
    if (error?.code === 'EAUTH' || error?.responseCode === 535 || error?.message?.includes('BadCredentials')) {
      friendlyError =
        'Error de autenticación con Gmail: La contraseña de aplicación (SMTP_PASS) es incorrecta o fue revocada. Genera una nueva contraseña de aplicación en tu cuenta de Google.';
    } else if (error?.code === 'ETIMEDOUT' || error?.message?.includes('Greeting never received')) {
      friendlyError =
        'Tiempo de espera agotado al conectar con el servidor SMTP. Configura el puerto 587 con STARTTLS en las variables de entorno de Vercel.';
    }

    return {
      success: false,
      error: friendlyError,
    };
  }
}

// URL pública del logo oficial alojado en CDN/GitHub (cero adjuntos binarios para entrega instantánea)
const REMOTE_LOGO_URL =
  process.env.APP_LOGO_URL ||
  'https://raw.githubusercontent.com/Zeols/ruta-corp/enrique/public/apple-touch-icon.png';

const BRAND_LOGO_HTML = `
  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
    <tr>
      <td style="vertical-align: middle; padding-right: 12px;">
        <img src="${REMOTE_LOGO_URL}" width="38" height="38" alt="InterlocApp" style="display: block; width: 38px; height: 38px; border-radius: 9px; border: 0;" />
      </td>
      <td style="vertical-align: middle;">
        <span style="font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">InterlocApp</span>
      </td>
    </tr>
  </table>
`;

const TICKET_BRAND_LOGO_HTML = `
  <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-right: 10px; vertical-align: middle;">
        <img src="${REMOTE_LOGO_URL}" width="32" height="32" alt="InterlocApp" style="display: block; width: 32px; height: 32px; border-radius: 7px; border: 0;" />
      </td>
      <td style="vertical-align: middle;">
        <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">InterlocApp</span>
      </td>
    </tr>
  </table>
`;

/**
 * Plantilla de Bienvenida a InterlocApp
 */
export async function sendWelcomeEmail({ to, name }: WelcomeEmailData) {
  const subject = 'Bienvenido a InterlocApp';
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #0F172A; width: 100% !important; -webkit-text-size-adjust: 100%;">
      <!-- Preheader invisible -->
      <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #F8FAFC;">
        Hola ${name}, tu cuenta en InterlocApp ha sido creada exitosamente. Explora rutas y viaja seguro.
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 32px 12px; width: 100%;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 36px 30px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <tr>
                <td>
                  ${BRAND_LOGO_HTML}

                  <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #0F172A; line-height: 1.25; letter-spacing: -0.3px;">Hola ${name}, bienvenido a bordo</h1>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">Tu cuenta ha sido creada exitosamente. Ahora puedes explorar rutas interlocales, consultar horarios en tiempo real y reservar tus asientos de forma ágil y segura.</p>

                  <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 13px; color: #334155; line-height: 1.6;">
                    <strong style="color: #0F172A;">¿Qué puedes hacer ahora?</strong><br>
                    • Buscar y reservar boletos de microbús.<br>
                    • Visualizar la disponibilidad de asientos.<br>
                    • Gestionar tus viajes e historial desde tu perfil.
                  </div>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; margin-top: 24px; text-align: center;">
              <tr>
                <td style="font-size: 12px; color: #94A3B8; line-height: 1.5; text-align: center;">
                  InterlocApp: Red de Transporte Interlocal.<br>
                  Mensaje generado automáticamente.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Plantilla de Boleto de Viaje Confirmado
 */
export async function sendTicketEmail(data: TicketEmailData) {
  const subject = `Boleto Confirmado: ${data.origin} a ${data.destination} (${data.ticketCode})`;
  const seatsList = Array.isArray(data.seats) ? data.seats.join(', ') : data.seats;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #0F172A; width: 100% !important; -webkit-text-size-adjust: 100%;">
      <!-- Preheader invisible -->
      <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #F8FAFC;">
        Comprobante de abordaje para tu viaje ${data.origin} - ${data.destination}. Código: ${data.ticketCode}.
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 32px 12px; width: 100%;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
              <tr>
                <td style="background-color: #0F172A; color: #FFFFFF; padding: 24px 28px;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 12px;">
                    <tr>
                      <td style="vertical-align: middle;">
                        ${TICKET_BRAND_LOGO_HTML}
                      </td>
                      <td style="text-align: right; vertical-align: middle;">
                        <span style="display: inline-block; background-color: #FE7D22; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Boleto Confirmado</span>
                      </td>
                    </tr>
                  </table>
                  <div style="font-size: 20px; font-weight: 800; margin: 4px 0 0 0; color: #FFFFFF;">${data.origin} → ${data.destination}</div>
                  <div style="font-family: monospace; font-size: 13px; color: #94A3B8; margin-top: 4px;">Boleto digital #${data.ticketCode}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 28px;">
                  <p style="font-size: 14px; color: #475569; margin: 0 0 18px 0; line-height: 1.5;">
                    Estimado/a <strong>${data.passengerName}</strong>, tu compra ha sido procesada exitosamente. Presenta este comprobante o tu código al abordar la unidad.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Fecha del Viaje</div>
                        <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 16px;">${data.departureDate}</div>
                      </td>
                      <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Hora de Salida</div>
                        <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 16px;">${data.departureTime}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Asientos Asignados</div>
                        <div style="color: #FE7D22; font-size: 17px; font-weight: 800;">#${seatsList}</div>
                      </td>
                      <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Unidad / Microbús</div>
                        <div style="font-size: 15px; font-weight: 700; color: #0F172A;">${data.unitPlate || 'Asignada en terminal'}</div>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 12px; padding: 18px; margin: 18px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 13px; font-weight: 700; color: #475569;">Total Abonado</td>
                        <td style="text-align: right; font-size: 22px; font-weight: 900; color: #0F172A;">C$ ${data.totalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>

                  <div style="font-size: 12px; line-height: 1.5; color: #64748B; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px; margin-top: 18px;">
                    <strong>Recomendación para el abordaje:</strong><br>
                    Te sugerimos presentarte en la terminal con al menos 15 minutos de anticipación al horario estipulado de salida.
                  </div>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; width: 100%; margin-top: 24px; text-align: center;">
              <tr>
                <td style="font-size: 12px; color: #94A3B8; line-height: 1.5; text-align: center;">
                  InterlocApp: Red de Transporte Interlocal.<br>
                  Comprobante electrónico de abordaje generado automáticamente.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to: data.to, subject, html });
}

export interface VerificationCodeEmailData {
  to: string;
  name: string;
  code: string;
  expiresMinutes?: number;
}

/**
 * Plantilla de Código de Verificación para Registro de Usuario (Con Logo Oficial InterlocApp)
 */
export async function sendVerificationCodeEmail({ to, name, code, expiresMinutes = 15 }: VerificationCodeEmailData) {
  const subject = `Tu código de verificación de InterlocApp: ${code}`;
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #0F172A; width: 100% !important; -webkit-text-size-adjust: 100%;">
      <!-- Preheader para vista previa limpia y evitar recorte en Gmail -->
      <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #F8FAFC;">
        Tu código de verificación de InterlocApp es ${code}. Válido durante ${expiresMinutes} minutos.
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 32px 12px; width: 100%;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 36px 30px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <tr>
                <td>
                  ${BRAND_LOGO_HTML}

                  <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #0F172A; line-height: 1.25; letter-spacing: -0.3px;">Verifica tu cuenta</h1>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">Hola <strong>${name}</strong>, gracias por registrarte en InterlocApp. Usa el siguiente código de 6 dígitos para completar la creación de tu cuenta:</p>

                  <div style="background-color: #0F172A; border: 1px solid #1E293B; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8; font-weight: 700; margin-bottom: 8px;">Código de verificación</div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FE7D22;">${code}</div>
                  </div>

                  <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0;">
                    Este código es válido durante <strong>${expiresMinutes} minutos</strong>. Por seguridad, no compartas este código con nadie.
                  </p>

                  <div style="font-size: 12px; color: #64748B; background-color: #F1F5F9; border-radius: 10px; padding: 14px; line-height: 1.5; border: 1px solid #E2E8F0;">
                    Si tú no solicitaste crear una cuenta en InterlocApp, puedes desestimar este mensaje con total seguridad.
                  </div>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; margin-top: 24px; text-align: center;">
              <tr>
                <td style="font-size: 12px; color: #94A3B8; line-height: 1.5; text-align: center;">
                  InterlocApp: Red de Transporte Interlocal.<br>
                  Mensaje de seguridad generado automáticamente.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Plantilla de Código para Restablecer Contraseña (Con Logo Oficial InterlocApp)
 */
export async function sendPasswordResetCodeEmail({ to, name, code, expiresMinutes = 15 }: VerificationCodeEmailData) {
  const subject = `Código para restablecer tu contraseña: ${code}`;
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #0F172A; width: 100% !important; -webkit-text-size-adjust: 100%;">
      <!-- Preheader invisible -->
      <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #F8FAFC;">
        Tu código para restablecer la contraseña en InterlocApp es ${code}.
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 32px 12px; width: 100%;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 36px 30px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <tr>
                <td>
                  ${BRAND_LOGO_HTML}

                  <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #0F172A; line-height: 1.25; letter-spacing: -0.3px;">Recuperación de contraseña</h1>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">Hola <strong>${name}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en InterlocApp. Ingresa este código único en la aplicación para crear tu nueva contraseña:</p>

                  <div style="background-color: #0F172A; border: 1px solid #1E293B; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8; font-weight: 700; margin-bottom: 8px;">Código de recuperación</div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FE7D22;">${code}</div>
                  </div>

                  <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0;">
                    El código expirará en <strong>${expiresMinutes} minutos</strong>.
                  </p>

                  <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px; font-size: 12px; color: #92400E; line-height: 1.5;">
                    <strong>Aviso de seguridad:</strong> Si no solicitaste restablecer tu contraseña, desestima este correo. Tu cuenta continúa protegida.
                  </div>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; margin-top: 24px; text-align: center;">
              <tr>
                <td style="font-size: 12px; color: #94A3B8; line-height: 1.5; text-align: center;">
                  InterlocApp: Red de Transporte Interlocal.<br>
                  Notificación de seguridad enviada automáticamente.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

export interface CooperativaAprobadaEmailData {
  to: string;
  adminName: string;
  cooperativaName: string;
  loginUrl?: string;
}

/**
 * Notifica al Administrador de una Cooperativa que su solicitud ha sido revisada y aprobada por el Super Admin (Con Logo Oficial InterlocApp).
 */
export async function sendCooperativaAprobadaEmail(data: CooperativaAprobadaEmailData) {
  const { to, adminName, cooperativaName, loginUrl = '/login' } = data;
  const subject = `¡Bienvenido! Tu cooperativa "${cooperativaName}" ha sido aprobada en InterlocApp`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; width: 100% !important; -webkit-text-size-adjust: 100%;">
      <!-- Preheader invisible -->
      <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #F8FAFC;">
        ¡Buenas noticias! Tu cooperativa "${cooperativaName}" ha sido aprobada por el equipo de InterlocApp.
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 32px 12px; width: 100%;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 36px 30px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <tr>
                <td>
                  ${BRAND_LOGO_HTML}

                  <h1 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; letter-spacing: -0.3px;">¡Cooperativa Verificada y Aprobada!</h1>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">Estimado(a) <strong>${adminName}</strong>,</p>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">Nos complace informarte que la solicitud de registro para tu cooperativa <strong>"${cooperativaName}"</strong> ha sido verificada satisfactoriamente por el equipo de supervisión de InterlocApp.</p>

                  <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                    <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px;">✓ Acceso Administrativo Habilitado</div>
                    <p style="font-size: 13px; color: #15803D; margin: 0; line-height: 1.5;">Tu cuenta como Administrador de Cooperativa ya está activa. Puedes ingresar al panel administrativo, registrar tu flota de microbuses, añadir tus rutas y registrar a tu personal operativo.</p>
                  </div>

                  <div style="text-align: center; margin: 28px 0 12px 0;">
                    <a href="${loginUrl}" style="display: inline-block; background-color: #FE7D22; color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(254, 125, 34, 0.25);">Ingresar al Panel Administrativo</a>
                  </div>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; margin-top: 24px; text-align: center;">
              <tr>
                <td style="font-size: 12px; color: #94A3B8; line-height: 1.5; text-align: center;">
                  InterlocApp: Red Nacional de Transporte Interlocal.<br>
                  Mensaje corporativo generado automáticamente.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}
