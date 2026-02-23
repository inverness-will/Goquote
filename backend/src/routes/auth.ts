import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OtpPurpose } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { generateOtp, getOtpExpiry } from '../services/authStore';

export const authRouter = Router();

const isDev = env.NODE_ENV !== 'production';

const signupSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const signinSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email')
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email'),
  code: z.string().min(1, 'Code is required')
});

const resetPasswordSchema = z
  .object({
    email: z.string().email('Invalid email'),
    code: z.string().min(1, 'Code is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = signupSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      throw new HttpError(409, 'An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        fullName: body.fullName.trim(),
        passwordHash,
        isEmailVerified: false
      }
    });
    const { plain, hashed } = generateOtp();
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash: hashed,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresAt: getOtpExpiry()
      }
    });
    const response: { message: string; debugOtpCode?: string } = {
      message: 'Account created. Please verify your email with the code we sent you.'
    };
    if (isDev) response.debugOtpCode = plain;
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = signinSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      throw new HttpError(401, 'Invalid email or password.');
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, 'Invalid email or password.');
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
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

authRouter.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      return res.json({
        message: 'If an account exists for this email, you will receive a reset code.'
      });
    }
    const { plain, hashed } = generateOtp();
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash: hashed,
        purpose: OtpPurpose.PASSWORD_RESET,
        expiresAt: getOtpExpiry()
      }
    });
    const response: { message: string; debugOtpCode?: string } = {
      message: 'If an account exists for this email, you will receive a reset code.'
    };
    if (isDev) response.debugOtpCode = plain;
    res.json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = verifyOtpSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      throw new HttpError(400, 'Invalid or expired code.');
    }
    const { createHash } = await import('crypto');
    const codeHash = createHash('sha256').update(body.code).digest('hex');
    const otps = await prisma.otpCode.findMany({
      where: { userId: user.id, codeHash, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
    const otp = otps.find((o) => !o.consumedAt);
    if (!otp) {
      throw new HttpError(400, 'Invalid or expired code.');
    }
    if (otp.purpose === OtpPurpose.EMAIL_VERIFICATION) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true }
        }),
        prisma.otpCode.update({
          where: { id: otp.id },
          data: { consumedAt: new Date() }
        })
      ]);
    }
    res.json({ message: 'Code verified successfully.' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      throw new HttpError(400, 'Invalid or expired code.');
    }
    const { createHash } = await import('crypto');
    const codeHash = createHash('sha256').update(body.code).digest('hex');
    const otp = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        codeHash,
        purpose: OtpPurpose.PASSWORD_RESET,
        expiresAt: { gt: new Date() },
        consumedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
    if (!otp) {
      throw new HttpError(400, 'Invalid or expired code.');
    }
    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() }
      })
    ]);
    res.json({ message: 'Password has been reset. You can now sign in.' });
  } catch (error) {
    next(error);
  }
});
