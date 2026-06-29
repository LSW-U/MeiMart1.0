import type { RiderProfile } from '@/src/types/rider';

import { api, isMockMode } from './api';

export type LoginPayload = {
  phone: string;
  password?: string;
  code?: string;
};

export type AuthResult = {
  userId: string;
  role: 'customer' | 'rider' | 'super_admin' | 'warehouse_staff' | 'customer_service';
  phone: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string;
  // login 后立即用 getProfile() 拿骑手信息；mock 模式直接构造
  rider?: RiderProfile;
};

const phoneRegex = /^(\+670)?[2-9]\d{6,7}$/;

export function isValidPhone(phone: string): boolean {
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

// mock 模式下返回 fake 数据，让 dev 环境 UI 全流程可演示
const mockRider: RiderProfile = {
  id: 'r001',
  userId: 'mock-uid',
  riderName: 'Alex Rider',
  phone: '+670 7700 0000',
  vehicleType: 'MOTORCYCLE',
  vehiclePlate: 'BI-1234567',
  status: 'OFFLINE',
  applicationStatus: 'APPROVED',
  totalDeliveries: 0,
  rating: 5,
  isOnline: false,
  preferredWarehouseIds: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fromLoginResponse(data: {
  user: { id: string; role: AuthResult['role']; phone: string | null; email: string | null; name: string | null; avatarUrl: string | null };
  accessToken: string;
  refreshToken: string;
}): AuthResult {
  return {
    userId: data.user.id,
    role: data.user.role,
    phone: data.user.phone,
    email: data.user.email,
    name: data.user.name,
    avatarUrl: data.user.avatarUrl,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export const authApi = {
  async sendSmsCode(phone: string): Promise<{ success: boolean; expireIn: number }> {
    if (!isValidPhone(phone)) {
      throw new Error('invalid_phone');
    }
    if (isMockMode) {
      return mockDelay({ success: true, expireIn: 300 }, 300);
    }
    const res = await api.post<{ expireIn: number }>('/common/auth/sms-code', {
      phone,
      scene: 'LOGIN',
    });
    return { success: true, expireIn: res.data.expireIn };
  },

  async login(payload: LoginPayload): Promise<AuthResult> {
    if (isMockMode) {
      return mockDelay(
        {
          userId: mockRider.userId,
          role: 'rider',
          phone: mockRider.phone,
          email: null,
          name: mockRider.riderName,
          avatarUrl: null,
          accessToken: 'mock-token-' + Date.now(),
          refreshToken: 'mock-refresh-' + Date.now(),
          rider: { ...mockRider },
        },
        500,
      );
    }
    if (payload.password) {
      const res = await api.post<{
        user: { id: string; role: AuthResult['role']; phone: string | null; email: string | null; name: string | null; avatarUrl: string | null };
        accessToken: string;
        refreshToken: string;
      }>('/common/auth/login-password', {
        phone: payload.phone,
        password: payload.password,
      });
      return fromLoginResponse(res.data);
    }
    if (payload.code) {
      const res = await api.post<{
        user: { id: string; role: AuthResult['role']; phone: string | null; email: string | null; name: string | null; avatarUrl: string | null };
        accessToken: string;
        refreshToken: string;
      }>('/common/auth/login-sms', {
        phone: payload.phone,
        smsCode: payload.code,
      });
      return fromLoginResponse(res.data);
    }
    throw new Error('login requires password or code');
  },

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    if (isMockMode) {
      return mockDelay({ success: true }, 200);
    }
    // 后端 logout 返回 204 无 body
    await api.post('/common/auth/logout', { refreshToken });
    return { success: true };
  },
};

// 兼容 login.tsx 现有调用
export async function sendSmsCode(phone: string): Promise<void> {
  await authApi.sendSmsCode(phone);
}
