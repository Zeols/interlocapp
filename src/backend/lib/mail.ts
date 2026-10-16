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

// Helper para obtener configuración SMTP actual
export function getMailConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : (port === 465);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const from = process.env.SMTP_FROM || (user ? `InterlocApp <${user}>` : 'InterlocApp <notificaciones@interlocapp.com>');

  return { host, port, secure, user, pass, from };
}

// Singleton del transporter de nodemailer
let transporter: Transporter | null = null;
let lastUsedUser = '';
let lastUsedPass = '';

export function getMailTransporter(): Transporter | null {
  const config = getMailConfig();
  if (!config.user || !config.pass) {
    return null;
  }

  // Si cambiaron las credenciales o no existe, recrear el transporter
  if (!transporter || lastUsedUser !== config.user || lastUsedPass !== config.pass) {
    lastUsedUser = config.user;
    lastUsedPass = config.pass;

    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass.replace(/\s+/g, ''), // Remueve espacios si el usuario pegó la clave de aplicación con espacios
      },
      tls: {
        rejectUnauthorized: false, // Compatibilidad con redes serverless
      },
      requireTLS: config.port === 587,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      // Desactivar pool en entornos serverless (Vercel) para evitar sockets congelados
      pool: false,
    });
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
 * Envío genérico de correos electrónicos con soporte para logo embebido (CID)
 */
export async function sendEmail({ to, subject, html, text, attachments = [] }: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getMailTransporter();
    if (!client) {
      console.warn('[MailService Warning] Variables SMTP no detectadas (SMTP_USER y SMTP_PASS). En Vercel, agrégalas en Project Settings > Environment Variables.');
      return {
        success: false,
        error: 'Servicio de correo no configurado en variables de entorno (SMTP_USER/SMTP_PASS).',
      };
    }

    // Adjuntar automáticamente el logo con Content-ID (CID) si la plantilla lo referencia
    const finalAttachments = [...attachments];
    const hasLogoCid = html.includes('cid:logo@interlocapp');
    if (hasLogoCid && !finalAttachments.some((a) => a.cid === 'logo@interlocapp')) {
      const logoPath = path.join(process.cwd(), 'public', 'apple-touch-icon.png');
      if (fs.existsSync(logoPath)) {
        finalAttachments.push({
          filename: 'interlocapp-logo.png',
          path: logoPath,
          cid: 'logo@interlocapp',
        });
      }
    }

    const config = getMailConfig();
    const info = await client.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
      attachments: finalAttachments,
    });

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
    return {
      success: false,
      error: error?.message || 'Fallo desconocido al enviar correo.',
    };
  }
}

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
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px 12px; color: #0F172A; }
        .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 32px 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .brand { font-size: 19px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
        h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #0F172A; line-height: 1.25; }
        p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
        .highlight-box { background: #F1F5F9; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #334155; }
        .btn { display: inline-block; background: #FE7D22; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-align: center; margin-top: 8px; }
        .footer { text-align: center; font-size: 12px; color: #94A3B8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="cid:logo@interlocapp" width="38" height="38" alt="Logo InterlocApp" style="display: block; width: 38px; height: 38px; border-radius: 8px;" />
            </td>
            <td style="vertical-align: middle;">
              <span class="brand">InterlocApp</span>
            </td>
          </tr>
        </table>
        <h1>Hola ${name}, bienvenido a bordo</h1>
        <p>Tu cuenta ha sido creada exitosamente. Ahora puedes explorar rutas interlocales, consultar horarios en tiempo real y reservar tus asientos de forma ágil y segura.</p>
        
        <div class="highlight-box">
          <strong>¿Qué puedes hacer ahora?</strong><br>
          • Buscar y reservar boletos de transporte.<br>
          • Visualizar el mapa de asientos en tiempo real.<br>
          • Gestionar tus viajes e historial desde tu perfil.
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:3000/home" class="btn" target="_blank">Explorar Viajes Disponibles</a>
        </div>
      </div>
      <div class="footer">
        InterlocApp: Sistema de Gestión de Transporte Interlocal.<br>
        Este es un mensaje automático, por favor no respondas a este correo.
      </div>
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
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px 12px; color: #0F172A; }
        .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.04); }
        .header { background: #0F172A; color: #FFFFFF; padding: 24px 28px; }
        .badge { display: inline-block; background: #FE7D22; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .ticket-code { font-family: monospace; font-size: 13px; color: #94A3B8; margin-top: 4px; }
        .route-title { font-size: 20px; font-weight: 800; margin: 4px 0 0 0; color: #FFFFFF; }
        .content { padding: 28px; }
        .section-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .section-value { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
        .grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .grid td { padding: 8px 0; vertical-align: top; width: 50%; }
        .ticket-box { background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 12px; padding: 18px; margin: 18px 0; }
        .total-amount { font-size: 22px; font-weight: 900; color: #0F172A; }
        .notice { font-size: 12px; line-height: 1.5; color: #64748B; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px; margin-top: 18px; }
        .footer { text-align: center; font-size: 12px; color: #94A3B8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 12px;">
            <tr>
              <td style="vertical-align: middle;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right: 10px; vertical-align: middle;">
                      <img src="cid:logo@interlocapp" width="32" height="32" alt="Logo InterlocApp" style="display: block; width: 32px; height: 32px; border-radius: 6px;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">InterlocApp</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <span class="badge">Boleto Confirmado</span>
              </td>
            </tr>
          </table>
          <div class="route-title">${data.origin} → ${data.destination}</div>
          <div class="ticket-code">Boleto digital #${data.ticketCode}</div>
        </div>

        <div class="content">
          <p style="font-size: 14px; color: #475569; margin: 0 0 18px 0;">
            Estimado/a <strong>${data.passengerName}</strong>, tu compra ha sido procesada exitosamente. Presenta este comprobante o tu código al abordar la unidad.
          </p>

          <table class="grid">
            <tr>
              <td>
                <div class="section-label">Fecha del Viaje</div>
                <div class="section-value">${data.departureDate}</div>
              </td>
              <td>
                <div class="section-label">Hora de Salida</div>
                <div class="section-value">${data.departureTime}</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="section-label">Asientos Asignados</div>
                <div class="section-value" style="color: #FE7D22; font-size: 17px;">#${seatsList}</div>
              </td>
              <td>
                <div class="section-label">Unidad / Autobús</div>
                <div class="section-value">${data.unitPlate || 'Asignada en terminal'}</div>
              </td>
            </tr>
          </table>

          <div class="ticket-box">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; font-weight: 700; color: #475569;">Total Abonado</span>
              <span class="total-amount">C$ ${data.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div class="notice">
            <strong>Recomendación para el abordaje:</strong><br>
            Te recomendamos presentarte en la terminal con al menos 15 minutos de anticipación al horario estipulado de salida.
          </div>
        </div>
      </div>

      <div class="footer">
        InterlocApp: Red de Transporte Interlocal.<br>
        Comprobante electrónico de abordaje generado automáticamente.
      </div>
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
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px 12px; color: #0F172A; }
        .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 32px 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .brand { font-size: 19px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
        h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #0F172A; line-height: 1.25; }
        p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
        .code-box { background: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; }
        .code-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8; font-weight: 700; margin-bottom: 8px; }
        .code-digits { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FE7D22; }
        .notice { font-size: 12px; color: #64748B; background: #F1F5F9; border-radius: 8px; padding: 12px; line-height: 1.5; margin-top: 20px; }
        .footer { text-align: center; font-size: 12px; color: #94A3B8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="cid:logo@interlocapp" width="38" height="38" alt="Logo InterlocApp" style="display: block; width: 38px; height: 38px; border-radius: 8px;" />
            </td>
            <td style="vertical-align: middle;">
              <span class="brand">InterlocApp</span>
            </td>
          </tr>
        </table>

        <h1>Verifica tu cuenta</h1>
        <p>Hola ${name}, gracias por registrarte en InterlocApp. Usa el siguiente código de 6 dígitos para completar la creación de tu cuenta:</p>
        
        <div class="code-box">
          <div class="code-title">Código de verificación</div>
          <div class="code-digits">${code}</div>
        </div>

        <p style="font-size: 13px; color: #64748B;">
          Este código es válido durante <strong>${expiresMinutes} minutos</strong>. Por seguridad, no compartas este código con nadie.
        </p>

        <div class="notice">
          Si tú no solicitaste crear una cuenta en InterlocApp, puedes desestimar este mensaje con total seguridad.
        </div>
      </div>
      <div class="footer">
        InterlocApp: Sistema de Transporte Interlocal.<br>
        Mensaje de seguridad generado automáticamente.
      </div>
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
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px 12px; color: #0F172A; }
        .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 32px 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .brand { font-size: 19px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
        h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #0F172A; line-height: 1.25; }
        p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
        .code-box { background: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; }
        .code-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8; font-weight: 700; margin-bottom: 8px; }
        .code-digits { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FE7D22; }
        .alert-box { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400E; line-height: 1.5; margin-top: 18px; }
        .footer { text-align: center; font-size: 12px; color: #94A3B8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="cid:logo@interlocapp" width="38" height="38" alt="Logo InterlocApp" style="display: block; width: 38px; height: 38px; border-radius: 8px;" />
            </td>
            <td style="vertical-align: middle;">
              <span class="brand">InterlocApp</span>
            </td>
          </tr>
        </table>

        <h1>Recuperación de contraseña</h1>
        <p>Hola ${name}, recibimos una solicitud para restablecer la contraseña de tu cuenta en InterlocApp. Ingresa este código único en la aplicación para crear tu nueva contraseña:</p>
        
        <div class="code-box">
          <div class="code-title">Código de recuperación</div>
          <div class="code-digits">${code}</div>
        </div>

        <p style="font-size: 13px; color: #64748B;">
          El código expirará en <strong>${expiresMinutes} minutos</strong>.
        </p>

        <div class="alert-box">
          <strong>Aviso de seguridad:</strong> Si no solicitaste restablecer tu contraseña, desestima este correo. Tu cuenta continúa protegida y nadie puede acceder sin este código.
        </div>
      </div>
      <div class="footer">
        InterlocApp: Red de Transporte Interlocal.<br>
        Notificación de seguridad enviada automáticamente.
      </div>
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
      <title>Cooperativa Aprobada</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
        .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .brand { font-size: 19px; font-weight: 800; color: #0F172A; }
        h1 { font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; }
        p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
        .highlight-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .highlight-title { font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px; }
        .highlight-desc { font-size: 13px; color: #15803D; margin: 0; }
        .btn-wrap { text-align: center; margin: 28px 0 12px 0; }
        .btn { display: inline-block; background: #FE7D22; color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(254, 125, 34, 0.25); }
        .footer { text-align: center; font-size: 12px; color: #94A3B8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="cid:logo@interlocapp" width="38" height="38" alt="Logo InterlocApp" style="display: block; width: 38px; height: 38px; border-radius: 8px;" />
            </td>
            <td style="vertical-align: middle;">
              <span class="brand">InterlocApp</span>
            </td>
          </tr>
        </table>
        <h1>¡Cooperativa Verificada y Aprobada!</h1>
        <p>Estimado(a) <strong>${adminName}</strong>,</p>
        <p>Nos complace informarte que la solicitud de registro para tu cooperativa <strong>"${cooperativaName}"</strong> ha sido verificada satisfactoriamente por el equipo de supervisión de InterlocApp.</p>
        
        <div class="highlight-box">
          <div class="highlight-title">✓ Acceso Administrativo Habilitado</div>
          <p class="highlight-desc">Tu cuenta como Administrador de Cooperativa ya está activa. Puedes ingresar al panel administrativo, registrar tu flota de microbuses, añadir tus rutas y registrar a tu personal operativo (choferes y ayudantes).</p>
        </div>

        <div class="btn-wrap">
          <a href="${loginUrl}" class="btn">Ingresar al Panel Administrativo</a>
        </div>
      </div>
      <div class="footer">
        InterlocApp: Red Nacional de Transporte Interlocal.<br>
        Mensaje corporativo generado automáticamente.
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}
