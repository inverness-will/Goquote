type AuthUser = {
  email: string;
  fullName: string;
  isEmailVerified: boolean;
};

type SignInResponse = {
  token: string;
  user: AuthUser;
};

type GenericMessageResponse = {
  message: string;
  debugOtpCode?: string;
  email?: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4000';

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function signUp(payload: { fullName: string; email: string; password: string }) {
  return request<GenericMessageResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function signIn(payload: { email: string; password: string }) {
  return request<SignInResponse>('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function forgotPassword(payload: { email: string }) {
  return request<GenericMessageResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function verifyOtp(payload: { email: string; code: string }) {
  return request<GenericMessageResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function resetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return request<GenericMessageResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
