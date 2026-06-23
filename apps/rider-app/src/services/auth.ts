import type { RiderProfile } from '@/src/types/rider';

import { request, setAuthToken } from './api';

export type LoginPayload = {
  phone: string;
  password?: string;
  code?: string;
};

type LoginResponse = {
  token: string;
  rider: RiderProfile;
};

const phoneRegex = /^(\+670)?[2-9]\d{6,7}$/;

export function isValidPhone(phone: string): boolean {
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

export async function sendSmsCode(phone: string): Promise<void> {
  if (!isValidPhone(phone)) {
    throw new Error('invalid_phone');
  }
  await request<void>('/auth/sms', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function login(payload: LoginPayload): Promise<RiderProfile | null> {
  const res = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(res.token);
  return res.rider;
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
}
