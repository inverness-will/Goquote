import { createHash } from 'crypto';

function hashOtp(otp: string): string {
  return createHash('sha256')
    .update(otp)
    .digest('hex');
}
