import 'dotenv/config';
import { verifyEmailConnection, sendVerificationCodeEmail } from '../src/backend/lib/mail';

async function test() {
  const targetEmail = process.argv[2] || 'leekath780@gmail.com';
  console.log('Testing email connection...');
  const conn = await verifyEmailConnection();
  console.log('Connection result:', conn);

  if (conn.success) {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Sending fresh unclipped verification email to ${targetEmail} (Code: ${randomCode})...`);
    const sendRes = await sendVerificationCodeEmail({
      to: targetEmail,
      code: randomCode,
      name: 'Enrique',
      expiresMinutes: 15,
    });
    console.log('Template Send Result:', sendRes);
  }
}

test();
