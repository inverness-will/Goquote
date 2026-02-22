import { createHash } from 'crypto';

// Other imports and code

function hashOtp(otp) {
  return createHash('sha256')
    .update(otp)
    .digest('hex');
}

// Other functions and code
