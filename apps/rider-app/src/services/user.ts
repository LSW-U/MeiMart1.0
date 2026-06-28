import type { ApplyRiderPayload, RiderProfile, RiderStatus, UpdateDutyPayload } from '@/src/types/rider';

import { api, isMockMode } from './api';
import { tokenStorage } from './token-storage';

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const defaultProfile: RiderProfile = {
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
  preferredWarehouseIds: [],
  isOnline: false,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  // 兼容字段（mock 模式填充让旧 UI 可用）
  avatarUrl: '',
  bondPaid: false,
  name: 'Alex Rider',
  licenseNumber: 'BI-1234567',
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

  // 入驻申请：用 customer token 调（端点 @Roles('customer')）
  async apply(payload: ApplyRiderPayload): Promise<RiderProfile> {
    if (isMockMode) {
      const next: RiderProfile = {
        ...getMockProfile(),
        riderName: payload.riderName,
        phone: payload.phone,
        vehicleType: payload.vehicleType ?? 'MOTORCYCLE',
        vehiclePlate: payload.vehiclePlate ?? null,
        name: payload.riderName,
        licenseNumber: payload.vehiclePlate ?? undefined,
        applicationStatus: 'PENDING',
      };
      saveMockProfile(next);
      return mockDelay({ ...next }, 600);
    }
    const res = await api.post<RiderProfile>('/common/rider/apply', payload);
    return res.data;
  },

  async updateDuty(payload: UpdateDutyPayload): Promise<RiderProfile> {
    if (isMockMode) {
      const next: RiderProfile = {
        ...getMockProfile(),
        status: payload.status,
        isOnline: payload.status === 'ONLINE' || payload.status === 'BUSY',
      };
      saveMockProfile(next);
      return mockDelay({ ...next }, 400);
    }
    const res = await api.patch<RiderProfile>('/rider/duty', payload);
    return res.data;
  },

  async heartbeat(): Promise<{ renewed: boolean }> {
    if (isMockMode) {
      return mockDelay({ renewed: true }, 50);
    }
    const res = await api.post<{ renewed: boolean }>('/rider/heartbeat');
    return res.data;
  },

  // 后端无 rider 自助改资料端点（W6+ 才支持）。real 模式抛错让 UI onError 回滚。
  async updateProfile(patch: Partial<RiderProfile>): Promise<RiderProfile> {
    if (isMockMode) {
      const next: RiderProfile = { ...getMockProfile(), ...patch };
      saveMockProfile(next);
      return mockDelay({ ...next }, 400);
    }
    throw new Error('rider profile update not supported by backend (W6+)');
  },
};

// ── 兼容 export ──────────────────────────────────────────────────────
// B.2.3 清理：getRiderProfile / registerRiderProfile / updateRiderProfile 已被
// riderApi 替代且无外部调用方；isRiderSessionActive 保留因 useGoBack.ts 仍在用。
//
// 兼容旧 API（部分调用方仍用 setStatus）：
export async function setRiderStatus(status: RiderStatus): Promise<RiderProfile> {
  return riderApi.updateDuty({ status });
}

export async function isRiderSessionActive(): Promise<boolean> {
  if (isMockMode) return true;
  const token = await tokenStorage.get();
  return token !== null;
}
