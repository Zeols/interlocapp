import 'dotenv/config';
import { verifyEmailConnection, sendVerificationCodeEmail } from '../src/backend/lib/mail';

async function test() {
  const targetEmail = process.argv[2] || 'leekath780@gmail.com';
  console.log('Testing email connection...');
  const conn = await verifyEmailConnection();
  console.log('Connection result:', conn);

  if (conn.success) {
    console.log(`Sending optimized verification email template to ${targetEmail}...`);
    const sendRes = await sendVerificationCodeEmail({
      to: targetEmail,
      code: '772109',
      name: 'Enrique',
      expiresMinutes: 15,
    });
    console.log('Template Send Result:', sendRes);
  }
}

test();
