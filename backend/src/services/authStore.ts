import { createHash, randomInt } from 'crypto';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;

export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

export function generateOtp(): { plain: string; hashed: string } {
  const plain = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
  return { plain, hashed: hashOtp(plain) };
}

export function getOtpExpiry(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + OTP_EXPIRY_MINUTES);
  return d;
}
