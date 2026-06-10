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
