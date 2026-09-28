import { api, isMockMode } from './api';
import { mockResponse } from './mockDb';

export type UserRole =
  'customer' | 'rider' | 'super_admin' | 'warehouse_staff' | 'customer_service';

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

// 调用方（useAuth.ts）传的 input 是 union 弱类型，service 内部按方法挑字段并校验。
// 批1：scene 已从本 payload 移除——发码统一 sendUnifiedSmsCode(phone, scene, captcha)；
// 批1 P2-2（审查）: email/name 字段随 useRegister（旧 /register 链）删除——已无消费方
interface LoginPayload {
  phone: string;
  password?: string;
  smsCode?: string;
  newPassword?: string;
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

// Why: 图形验证码签发（批A2-2，GET /common/auth/captcha）——SMS_CAPTCHA_REQUIRED=true 时
// 发码前必调；captchaId 60s 一次性票据，答案随 captchaText 携带（不区分大小写，消费即焚）
export interface CaptchaResponse {
  captchaId: string;
  svg: string;
  expireIn: number;
}

// 发码可选携带的图形码凭证（契约 UnifiedSendSmsRequest captchaId/captchaText optional）
export interface CaptchaPayload {
  captchaId: string;
  captchaText: string;
}

// Why: unified 发码响应（POST /common/auth/sms/send，202 统一响应不暴露是否已注册）
export interface SendUnifiedSmsResult {
  challengeId: string;
  expireIn: number;
}

// Why: unified verify 响应（POST /common/auth/sms/verify），按 action 分流；
// LOGIN 时带 token 四件套，REGISTER 时带 registrationTicket（complete 时消费）
export interface VerifySmsResult {
  action: 'LOGIN' | 'REGISTER' | 'BLOCKED';
  accessToken?: string;
  refreshToken?: string;
  registrationTicket?: string;
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

  async fetchCaptcha(): Promise<CaptchaResponse> {
    if (isMockMode) {
      return mockResponse(
        {
          captchaId: 'mock-captcha-id',
          svg: '<svg xmlns="http://www.w3.org/2000/svg"/>',
          expireIn: 60,
        },
        100,
      );
    }
    const res = await api.get<CaptchaResponse>('/common/auth/captcha');
    return res.data;
  },

  // Why: unified 发码入口（批A2-1）——POST /common/auth/sms/send，202 统一响应
  // （防枚举）返回 challengeId，verify / register/complete 必须回传。
  // 批1 scene 透传（R1）：scene 随请求携带（LOGIN 缺省；register/reset 两页传各自场景）。
  // 批A2-2：后端开关 SMS_CAPTCHA_REQUIRED=true 时 captchaId/captchaText 必带（E-CAPTCHA-001）
  async sendUnifiedSmsCode(
    phone: string,
    scene?: OtpScene,
    captcha?: CaptchaPayload,
  ): Promise<SendUnifiedSmsResult> {
    if (isMockMode) {
      return mockResponse({ challengeId: 'mock-challenge-id', expireIn: 300 }, 300);
    }
    const res = await api.post<SendUnifiedSmsResult>('/common/auth/sms/send', {
      phone,
      ...(scene ? { scene } : {}),
      ...(captcha ? { captchaId: captcha.captchaId, captchaText: captcha.captchaText } : {}),
    });
    return res.data;
  },

  // Why: unified verify——后端按 action 分流（LOGIN/REGISTER/BLOCKED），
  // 不暴露手机号是否已注册（防枚举）；challengeId 来自 sendUnifiedSmsCode 响应
  async verifySms(payload: {
    phone: string;
    code: string;
    challengeId: string;
  }): Promise<VerifySmsResult> {
    if (isMockMode) {
      return mockResponse({ action: 'LOGIN', ...buildMockAuthResult('customer') }, 500);
    }
    const res = await api.post<VerifySmsResult>('/common/auth/sms/verify', payload);
    return res.data;
  },

  // Why: unified 完成注册——registrationTicket 原子消费（GETDEL），
  // 契约要求 agreedToTerms 必须字面量 true；challengeId 与 ticket 绑定校验。
  // 批1 R7（方案v3）：password 可选——register 页提交表单密码（后端 hash 入库），
  // login-sms 侧不传（后端建号 password:null，SMS-only 设计不破坏）
  async completeRegister(payload: {
    registrationTicket: string;
    challengeId: string;
    password?: string;
  }): Promise<AuthResult> {
    if (isMockMode) {
      return mockResponse(buildMockAuthResult('customer'), 800);
    }
    const res = await api.post<AuthResult>('/common/auth/register/complete', {
      registrationTicket: payload.registrationTicket,
      agreedToTerms: true as const,
      challengeId: payload.challengeId,
      ...(payload.password ? { password: payload.password } : {}),
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
    // Why: 后端 mock-login 要求 role 大写（SUPER_ADMIN/CUSTOMER/RIDER...），前端内部用小写
    const res = await api.post<MockLoginRawResponse>('/common/auth/mock-login', {
      ...payload,
      role: payload.role.toUpperCase() as Uppercase<UserRole>,
    });
    const { user, ...rest } = res.data;
    return {
      userId: user.id,
      role: user.role.toLowerCase() as UserRole,
      ...rest,
    };
  },
};
