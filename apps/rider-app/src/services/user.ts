import type { RiderProfile } from '@/src/types/rider';

import { api, isMockMode } from './api';
import { tokenStorage } from './token-storage';

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const defaultProfile: RiderProfile = {
  id: '8842910',
  name: 'Alex Rider',
  phone: '+670 7700 0000',
  avatarUrl: '',
  vehicleType: 'Motorcycle Courier',
  licenseNumber: 'BI-1234567',
  status: 'online',
};

const profileStorageKey = 'mei-delivery-app:rider-profile';

let mockProfileCache: RiderProfile | null = null;

function getMockProfile(): RiderProfile {
  if (mockProfileCache) return mockProfileCache;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(profileStorageKey);
    if (stored) {
      mockProfileCache = JSON.parse(stored) as RiderProfile;
      return mockProfileCache;
    }
  }
  mockProfileCache = { ...defaultProfile };
  return mockProfileCache;
}

function saveMockProfile(profile: RiderProfile): void {
  mockProfileCache = profile;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  }
}

function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ── riderApi 对象 ───────────────────────────────────────────────────

export const riderApi = {
  async getProfile(): Promise<RiderProfile> {
    if (isMockMode) {
      return mockDelay({ ...getMockProfile() });
    }
    const res = await api.get<RiderProfile>('/rider/profile');
    return res.data;
  },

  async register(payload: Partial<RiderProfile>): Promise<RiderProfile> {
    if (isMockMode) {
      const next: RiderProfile = { ...getMockProfile(), ...payload, status: 'online' };
      saveMockProfile(next);
      return mockDelay({ ...next }, 600);
    }
    const res = await api.post<RiderProfile>('/rider/register', payload);
    return res.data;
  },

  async updateProfile(payload: Partial<RiderProfile>): Promise<RiderProfile> {
    if (isMockMode) {
      const next: RiderProfile = { ...getMockProfile(), ...payload };
      saveMockProfile(next);
      return mockDelay({ ...next }, 400);
    }
    const res = await api.patch<RiderProfile>('/rider/profile', payload);
    return res.data;
  },
};

// ── 兼容 export（仅保留仍被外部调用的） ──────────────────────────────
// B.2.3 清理：getRiderProfile / registerRiderProfile / updateRiderProfile 已被
// riderApi 替代且无外部调用方；isRiderSessionActive 保留因 useGoBack.ts 仍在用。

export async function isRiderSessionActive(): Promise<boolean> {
  if (isMockMode) return true;
  const token = await tokenStorage.get();
  return token !== null;
}
