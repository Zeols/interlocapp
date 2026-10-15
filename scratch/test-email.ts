/**
 * Script de prueba para validar la configuración de Nodemailer con Gmail.
 *
 * Uso:
 *   pnpm tsx scratch/test-email.ts tu_correo@ejemplo.com
 */

import fs from 'fs';
import path from 'path';

// Carga directa de .env para scripts independientes
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

import { verifyEmailConnection, sendEmail } from '../src/backend/lib/mail';

async function main() {
  const targetEmail = process.argv[2] || process.env.SMTP_USER;

  console.log('--------------------------------------------------');
  console.log('InterlocApp: Prueba de Servicio de Correo (Gmail)');
  console.log('--------------------------------------------------');
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT || '465'}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER || '(No configurado en .env)'}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '********' : '(No configurado en .env)'}`);
  console.log('--------------------------------------------------');

  console.log('\n1. Verificando conexión con el servidor SMTP de Gmail...');
  const verifyResult = await verifyEmailConnection();

  if (!verifyResult.success) {
    console.error('❌ Error de conexión:', verifyResult.message);
    console.log('\n💡 Instrucciones para solucionar:');
    console.log('1. Abre tu cuenta de Google -> Seguridad.');
    console.log('2. Activa "Verificación en dos pasos".');
    console.log('3. Genera una "Contraseña de aplicaciones" de 16 caracteres.');
    console.log('4. Configura SMTP_USER y SMTP_PASS en tu archivo .env.');
    process.exit(1);
  }

  console.log('✅ Conexión SMTP verificada exitosamente.');

  if (!targetEmail) {
    console.log('\n⚠️ No se especificó correo de destino. Proporciona uno como argumento:');
    console.log('   pnpm tsx scratch/test-email.ts destinatario@gmail.com');
    process.exit(0);
  }

  console.log(`\n2. Enviando correo de prueba a: ${targetEmail}...`);
  const sendResult = await sendEmail({
    to: targetEmail,
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

  if (!sendResult.success) {
    console.error('❌ Error al enviar:', sendResult.error);
    process.exit(1);
  }

  console.log('🎉 Correo de prueba enviado exitosamente!');
  if (sendResult.messageId) {
    console.log(`   Message ID: ${sendResult.messageId}`);
  }
  console.log('   Revisa la bandeja de entrada (o carpeta de spam si es la primera vez).');
}

main().catch((err) => {
  console.error('Error fatal en el script:', err);
  process.exit(1);
});
