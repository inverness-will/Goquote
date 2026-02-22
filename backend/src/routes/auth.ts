import { Router } from 'express';
import { OtpPurpose } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import {
  clearOtp,
  createOtp,
  createUser,
  getUserByEmail,
  markEmailVerified,
  updatePassword,
  validatePassword,
  verifyOtp
} from '../services/authStore';

export const authRouter = Router();

const signUpSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const emailSchema = z.object({
  email: z.string().email()
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/)
});

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

function issueToken(user: { email: string; fullName: string }) {
  return jwt.sign(
    {
      sub: user.email,
      email: user.email,
      fullName: user.fullName
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

authRouter.post('/signup', async (req, res, next) => {
  try {
    const payload = signUpSchema.parse(req.body);
    const user = await createUser(payload.fullName, payload.email, payload.password);

    if (!user) {
      throw new HttpError(409, 'User already exists');
    }

    const otp = await createOtp(payload.email, OtpPurpose.EMAIL_VERIFICATION);
    if (!otp) {
      throw new HttpError(404, 'User not found');
    }
    // TODO: send OTP via email provider (e.g. Resend). Kept in response for local dev.
    res.status(201).json({
      message: 'Account created. Verify your email with OTP.',
      email: user.email,
      debugOtpCode: otp.code
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/signin', async (req, res, next) => {
  try {
    const payload = signInSchema.parse(req.body);
    const user = await getUserByEmail(payload.email);
    if (!user) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const isValid = await validatePassword(payload.email, payload.password);
    if (!isValid) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const token = issueToken(user);
    res.json({
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const payload = emailSchema.parse(req.body);
    const user = await getUserByEmail(payload.email);

    if (user) {
      const otp = await createOtp(payload.email, OtpPurpose.PASSWORD_RESET);
      // TODO: send OTP via email provider. Kept in response for local dev.
      return res.json({
        message: 'If that email exists, a reset code has been sent.',
        debugOtpCode: otp?.code
      });
    }

    return res.json({
      message: 'If that email exists, a reset code has been sent.'
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/verify-otp', async (req, res, next) => {
  try {
    const payload = verifyOtpSchema.parse(req.body);
    const isValid = await verifyOtp(payload.email, payload.code);
    if (!isValid) {
      throw new HttpError(400, 'Invalid or expired OTP code');
    }

    await markEmailVerified(payload.email);
    return res.json({ message: 'OTP verified.' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    const isOtpValid = await verifyOtp(payload.email, payload.code, OtpPurpose.PASSWORD_RESET);
    if (!isOtpValid) {
      throw new HttpError(400, 'Invalid or expired OTP code');
    }

    const user = await updatePassword(payload.email, payload.newPassword);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    await clearOtp(payload.email, OtpPurpose.PASSWORD_RESET);
    res.json({ message: 'Password reset successful.' });
  } catch (error) {
    next(error);
  }
});
