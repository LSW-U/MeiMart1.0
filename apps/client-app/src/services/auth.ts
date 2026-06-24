import { isMockMode } from './api';
import { mockResponse } from './mockDb';

interface LoginPayload {
  phone: string;
  password?: string;
  smsCode?: string;
}

interface AuthResult {
  token: string;
  refreshToken: string;
  userId: string;
}

export const authApi = {
  async loginPassword(payload: LoginPayload): Promise<AuthResult> {
    if (isMockMode) {
      return mockResponse(
        { token: 'mock-token-' + Date.now(), refreshToken: 'mock-refresh', userId: 'u001' },
        500,
      );
    }
    throw new Error('Real API not implemented');
  },
  async loginSms(payload: LoginPayload): Promise<AuthResult> {
    if (isMockMode) {
      return mockResponse(
        { token: 'mock-token-' + Date.now(), refreshToken: 'mock-refresh', userId: 'u001' },
        500,
      );
    }
    throw new Error('Real API not implemented');
  },
  async register(payload: LoginPayload): Promise<AuthResult> {
    if (isMockMode) {
      return mockResponse(
        { token: 'mock-token-' + Date.now(), refreshToken: 'mock-refresh', userId: 'u001' },
        800,
      );
    }
    throw new Error('Real API not implemented');
  },
  async sendSmsCode(phone: string): Promise<{ success: boolean }> {
    if (isMockMode) {
      return mockResponse({ success: true }, 300);
    }
    throw new Error('Real API not implemented');
  },
  async resetPassword(payload: LoginPayload): Promise<{ success: boolean }> {
    if (isMockMode) {
      return mockResponse({ success: true }, 600);
    }
    throw new Error('Real API not implemented');
  },
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    if (isMockMode) {
      return mockResponse({ success: true }, 200);
    }
    throw new Error('Real API not implemented');
  },
};
