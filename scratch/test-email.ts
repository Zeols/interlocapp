import 'dotenv/config';
import { verifyEmailConnection, sendVerificationCodeEmail } from '../src/backend/lib/mail';

async function test() {
  console.log('Testing email connection...');
  const conn = await verifyEmailConnection();
  console.log('Connection result:', conn);

  if (conn.success) {
    console.log('Sending test verification code to interlocapp2026@gmail.com...');
    const sendRes = await sendVerificationCodeEmail({
      to: 'interlocapp2026@gmail.com',
      code: '123456',
      name: 'Tester',
      expiresMinutes: 15,
    });
    console.log('Send result:', sendRes);
  }
}

test();
