import type { RiderProfile } from '@/src/types/rider';

export type LoginPayload = {
  phone: string;
  password?: string;
  code?: string;
};

export async function login(_payload: LoginPayload): Promise<RiderProfile | null> {
  return null;
}

export async function logout() {
  return undefined;
}

const phoneRegex = /^(\+670\s?)?[2-9]\d{6,7}$/;

export function isValidPhone(phone: string): boolean {
  return phoneRegex.test(phone.trim());
}

export async function sendSmsCode(phone: string): Promise<void> {
  if (!isValidPhone(phone)) {
    throw new Error('invalid_phone');
  }
  console.log('[auth] sendSmsCode → mock send to', phone);
}
