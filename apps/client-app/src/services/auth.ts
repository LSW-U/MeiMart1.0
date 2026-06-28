import { api, isMockMode } from './api';
import { mockResponse } from './mockDb';

export type UserRole =
  | 'customer'
  | 'rider'
  | 'super_admin'
  | 'warehouse_staff'
  | 'customer_service';

export type OtpScene = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';

export type DeviceType = 'client_app' | 'rider_app' | 'admin_web';

// Why: 后端 login-password / login-sms / register 响应顶层即业务字段（无 user 对象嵌套）。
// mock-login 响应结构略不同（user 嵌在 user 对象里），在 mockLogin 内部拍平后再返回，对调用方保持一致。
export interface AuthResult {
  userId: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  // Why: 后端返回 Unix 时间戳（秒），不是 ISO 字符串
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

// 调用方（useAuth.ts）传的 input 是 union 弱类型，service 内部按方法挑字段并校验
interface LoginPayload {
  phone: string;
  password?: string;
  smsCode?: string;
  email?: string;
  name?: string;
  newPassword?: string;
  scene?: OtpScene;
}

interface MockLoginPayload {
  role: UserRole;
  deviceType: DeviceType;
  userId?: string;
}

// Why: mock-login 响应结构，与标准 AuthResult 略不同，service 内拍平
interface MockLoginRawResponse {
  user: {
    id: string;
    role: UserRole;
    deviceType: string;
    phone: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

function buildMockAuthResult(role: UserRole = 'customer'): AuthResult {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    userId: 'mock-user-001',
    role,
    accessToken: 'mock-token-' + Date.now(),
    refreshToken: 'mock-refresh-' + Date.now(),
    accessExpiresAt: nowSec + 3600,
    refreshExpiresAt: nowSec + 86400 * 30,
  };
}

export const authApi = {
  async loginPassword(payload: LoginPayload): Promise<AuthResult> {
    if (!payload.password) {
      throw new Error('loginPassword requires password');
    }
    if (isMockMode) {
      return mockResponse(buildMockAuthResult('customer'), 500);
    }
    // Why: 后端按 user.role 推断 deviceType，前端不传 deviceType（更安全）
    const res = await api.post<AuthResult>('/common/auth/login-password', {
      phone: payload.phone,
      password: payload.password,
    });
    return res.data;
  },

  async loginSms(payload: LoginPayload): Promise<AuthResult> {
    if (!payload.smsCode) {
      throw new Error('loginSms requires smsCode');
    }
    if (isMockMode) {
      return mockResponse(buildMockAuthResult('customer'), 500);
    }
    const res = await api.post<AuthResult>('/common/auth/login-sms', {
      phone: payload.phone,
      smsCode: payload.smsCode,
    });
    return res.data;
  },

  async register(payload: LoginPayload): Promise<AuthResult> {
    if (!payload.password || !payload.smsCode) {
      throw new Error('register requires password + smsCode');
    }
    if (isMockMode) {
      return mockResponse(buildMockAuthResult('customer'), 800);
    }
    const res = await api.post<AuthResult>('/common/auth/register', {
      phone: payload.phone,
      password: payload.password,
      smsCode: payload.smsCode,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.name ? { name: payload.name } : {}),
    });
    return res.data;
  },

  async sendSmsCode(payload: LoginPayload): Promise<{ expireIn: number }> {
    if (isMockMode) {
      return mockResponse({ expireIn: 300 }, 300);
    }
    const res = await api.post<{ expireIn: number }>('/common/auth/sms-code', {
      phone: payload.phone,
      ...(payload.scene ? { scene: payload.scene } : {}),
    });
    return res.data;
  },

  async resetPassword(payload: LoginPayload): Promise<void> {
    if (!payload.smsCode || !payload.newPassword) {
      throw new Error('resetPassword requires smsCode + newPassword');
    }
    if (isMockMode) {
      return mockResponse(undefined, 600);
    }
    await api.post('/common/auth/password-reset', {
      phone: payload.phone,
      smsCode: payload.smsCode,
      newPassword: payload.newPassword,
    });
  },

  async logout(refreshToken: string): Promise<void> {
    if (isMockMode) {
      return mockResponse(undefined, 200);
    }
    await api.post('/common/auth/logout', { refreshToken });
  },

  // Why: mock-login 是 dev/staging 跳过密码的便利端点（prod 不存在）。
  // 响应把 user 嵌套在 user 对象里，与标准 AuthResult 不同，service 内拍平后再返回。
  async mockLogin(payload: MockLoginPayload): Promise<AuthResult> {
    if (isMockMode) {
      return mockResponse(buildMockAuthResult(payload.role), 500);
    }
    const res = await api.post<MockLoginRawResponse>('/common/auth/mock-login', payload);
    const { user, ...rest } = res.data;
    return {
      userId: user.id,
      role: user.role,
      ...rest,
    };
  },
};
