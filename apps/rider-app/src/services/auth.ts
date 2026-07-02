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

// Why: 后端 login-password / login-sms 响应结构（参考 OpenAPI 定义）
// 响应是 { user: {...}, accessToken, refreshToken }，不是顶层字段
type BackendLoginResponse = {
  user: {
    id: string;
    role: AuthResult['role'];
    phone: string | null;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
  accessToken: string;
  refreshToken: string;
};

// Why: mock-login 响应结构，与普通 login 不同（含 accessExpiresAt/refreshExpiresAt）
// api.ts 响应拦截器会剥掉 { success: true, data: T } 层
type MockLoginResponse = {
  user: {
    id: string;
    role: AuthResult['role'];
    deviceType: string;
    phone: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
};

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
      const res = await api.post<BackendLoginResponse>('/common/auth/login-password', {
        phone: payload.phone,
        password: payload.password,
      });
      return {
        userId: res.data.user.id,
        role: res.data.user.role,
        phone: res.data.user.phone,
        email: res.data.user.email,
        name: res.data.user.name,
        avatarUrl: res.data.user.avatarUrl,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      };
    }
    if (payload.code) {
      const res = await api.post<BackendLoginResponse>('/common/auth/login-sms', {
        phone: payload.phone,
        smsCode: payload.code,
      });
      return {
        userId: res.data.user.id,
        role: res.data.user.role,
        phone: res.data.user.phone,
        email: res.data.user.email,
        name: res.data.user.name,
        avatarUrl: res.data.user.avatarUrl,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      };
    }
    throw new Error('login requires password or code');
  },

  // Why: mock-login 仅 dev/staging 可用，跳过密码验证，直接按 role/deviceType 登录
  // 用于骑手端开发调试，避免需要真实骑手账号密码
  // role: customer → 用于注册骑手申请（apply 要求 customer 角色）
  // role: rider → 用于骑手功能测试
  async mockLogin(role: 'customer' | 'rider' = 'rider'): Promise<AuthResult> {
    if (isMockMode) {
      return mockDelay(
        {
          userId: mockRider.userId,
          role,
          phone: mockRider.phone,
          email: null,
          name: mockRider.riderName,
          avatarUrl: null,
          accessToken: 'mock-token-' + Date.now(),
          refreshToken: 'mock-refresh-' + Date.now(),
          rider: role === 'rider' ? { ...mockRider } : undefined,
        },
        500,
      );
    }
    const deviceType = role === 'rider' ? 'rider_app' : 'client_app';
    const res = await api.post<MockLoginResponse>('/common/auth/mock-login', {
      role,
      deviceType,
    });
    return {
      userId: res.data.user.id,
      role: res.data.user.role,
      phone: res.data.user.phone,
      email: res.data.user.email,
      name: res.data.user.name,
      avatarUrl: null,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    };
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
