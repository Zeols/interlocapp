import 'dotenv/config';
import { verifyEmailConnection, sendVerificationCodeEmail } from '../src/backend/lib/mail';

async function test() {
  const targetEmail = process.argv[2] || 'leekath780@gmail.com';
  console.log('Testing email connection...');
  const conn = await verifyEmailConnection();
  console.log('Connection result:', conn);

  if (conn.success) {
    const { getMailTransporter, getMailConfig } = await import('../src/backend/lib/mail');
    const transporter = getMailTransporter();
    const config = getMailConfig();
    console.log(`Sending directly through transporter to ${targetEmail}...`);
    const info = await transporter!.sendMail({
      from: config.from,
      to: targetEmail,
      subject: `Código de verificación de prueba InterlocApp: 991823`,
      text: 'Hola, este es un correo de prueba directa enviado desde InterlocApp.',
      html: '<p>Hola, este es un correo de prueba directa enviado desde <strong>InterlocApp</strong>.</p><p>Código: <b>991823</b></p>',
    });
    console.log('Raw SMTP info:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  }
}

test();
