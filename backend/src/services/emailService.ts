import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM = env.EMAIL_FROM;
const APP_NAME = 'GoQuote';

export async function sendVerificationEmail(
  to: string,
  code: string,
  fullName?: string
): Promise<{ ok: boolean; error?: string }> {
  console.error('*** in the email code");
  if (!resend) return { ok: false, error: 'Email not configured' };
  const greeting = fullName ? `Hi ${fullName},` : 'Hi,';
  const { error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Verify your email – ${APP_NAME}`,
    html: `
      <p>${greeting}</p>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code expires in 15 minutes. If you didn't create an account, you can ignore this email.</p>
      <p>— ${APP_NAME}</p>
    `
  });
  if (error) {
    console.error('[email] Verification send failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: 'Email not configured' };
  const { error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Password reset code – ${APP_NAME}`,
    html: `
      <p>You requested a password reset.</p>
      <p>Your reset code is: <strong>${code}</strong></p>
      <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      <p>— ${APP_NAME}</p>
    `
  });
  if (error) {
    console.error('[email] Password reset send failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
