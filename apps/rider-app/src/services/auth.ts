import type { RiderProfile } from '@/src/types/rider';

import { api, isMockMode } from './api';

export type LoginPayload = {
  phone: string;
  password?: string;
  code?: string;
};

export type AuthResult = {
  token: string;
  refreshToken: string;
  rider: RiderProfile;
};

const phoneRegex = /^(\+670)?[2-9]\d{6,7}$/;

export function isValidPhone(phone: string): boolean {
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

// mock 模式下返回 fake 数据（与 client-app authApi 风格一致），让 dev 环境 UI 全流程可演示
const mockRider: RiderProfile = {
  id: 'r001',
  name: 'Alex Rider',
  phone: '+670 7700 0000',
  avatarUrl: '',
  vehicleType: 'Motorcycle Courier',
  licenseNumber: 'BI-1234567',
  status: 'online',
};

function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const authApi = {
  async sendSmsCode(phone: string): Promise<{ success: boolean }> {
    if (!isValidPhone(phone)) {
      throw new Error('invalid_phone');
    }
    if (isMockMode) {
      return mockDelay({ success: true }, 300);
    }
    const res = await api.post<{ success: boolean }>('/auth/sms', { phone });
    return res.data;
  },

  async login(payload: LoginPayload): Promise<AuthResult> {
    if (isMockMode) {
      return mockDelay(
        {
          token: 'mock-token-' + Date.now(),
          refreshToken: 'mock-refresh-' + Date.now(),
          rider: mockRider,
        },
        500,
      );
    }
    const res = await api.post<AuthResult>('/auth/login', payload);
    return res.data;
  },

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    if (isMockMode) {
      return mockDelay({ success: true }, 200);
    }
    const res = await api.post<{ success: boolean }>('/auth/logout', { refreshToken });
    return res.data;
  },
};

// 兼容 login.tsx 现有调用（B.1.3 改造 login.tsx 时整体切换到 authApi + mutation hook）
export async function sendSmsCode(phone: string): Promise<void> {
  await authApi.sendSmsCode(phone);
}
