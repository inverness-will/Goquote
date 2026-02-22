import { OtpPurpose } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function createUser(fullName: string, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    return null;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      fullName,
      passwordHash
    }
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) }
  });
}

export async function validatePassword(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return false;
  }

  return bcrypt.compare(password, user.passwordHash);
}

export async function createOtp(email: string, purpose: OtpPurpose) {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      userId: user.id,
      codeHash,
      purpose,
      expiresAt
    }
  });

  return { code, expiresAt };
}

export async function verifyOtp(email: string, code: string, purpose?: OtpPurpose) {
  const user = await getUserByEmail(email);
  if (!user) {
    return false;
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      ...(purpose ? { purpose } : {})
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!otp) {
    return false;
  }

  return otp.codeHash === hashOtp(code);
}

export async function clearOtp(email: string, purpose?: OtpPurpose) {
  const user = await getUserByEmail(email);
  if (!user) {
    return;
  }

  await prisma.otpCode.updateMany({
    where: {
      userId: user.id,
      consumedAt: null,
      ...(purpose ? { purpose } : {})
    },
    data: {
      consumedAt: new Date()
    }
  });
}

export async function updatePassword(email: string, newPassword: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      isEmailVerified: true
    }
  });
}

export async function markEmailVerified(email: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true }
  });
}
