'use server';

import { verifyEmailConnection, sendEmail, sendWelcomeEmail, sendTicketEmail } from '../lib/mail';

/**
 * Server Action para verificar si la conexión SMTP con Gmail funciona correctamente
 */
export async function testSmtpConnectionAction() {
  try {
    const result = await verifyEmailConnection();
    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Error inesperado al probar la conexión SMTP.',
    };
  }
}

/**
 * Server Action para enviar un correo de prueba a una dirección dada
 */
export async function sendTestEmailAction(to: string) {
  if (!to || !to.includes('@')) {
    return {
      success: false,
      error: 'Debes proporcionar una dirección de correo válida.',
    };
  }

  try {
    const result = await sendEmail({
      to,
      subject: 'Prueba de Conexión: InterlocApp Mail Service',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #F8FAFC; color: #0F172A;">
          <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 24px; border: 1px solid #E2E8F0;">
            <h2 style="margin: 0 0 12px 0; color: #0F172A;">Prueba Exitosa</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              Este es un correo de prueba enviado desde <strong>InterlocApp</strong> utilizando <strong>Nodemailer</strong> y el servidor SMTP de <strong>Gmail</strong>.
            </p>
            <div style="background: #F1F5F9; padding: 12px; border-radius: 8px; font-size: 13px; color: #334155; margin-top: 16px;">
              Configuración completada con éxito.
            </div>
          </div>
        </div>
      `,
    });

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Error al enviar el correo de prueba.',
    };
  }
}
