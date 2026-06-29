import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { User, Coupon } from '@/types';

// Why: 后端 user 字段名/类型与前端 User 有差异，service 层做转换避免改组件代码。
interface ProfileRaw {
  id: string;
  phone: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

function transformProfile(raw: ProfileRaw): User {
  return {
    id: raw.id,
    name: raw.name ?? '',
    phone: raw.phone,
    email: raw.email,
    avatar: raw.avatarUrl ?? undefined,
  };
}

export const userApi = {
  // Why: 使用 /client/user/profile 获取完整用户信息（后端已统一该端点）
  async getProfile(): Promise<User> {
    if (isMockMode) return mockResponse(mockDb.user);
    const res = await api.get<ProfileRaw>('/client/user/profile');
    return transformProfile(res.data);
  },

  // Why: 后端 PATCH /client/user/profile 接受 {name?, avatarUrl?, email?}，前端 Partial<User> 多字段做映射
  async updateProfile(updates: Partial<User>): Promise<User> {
    if (isMockMode) {
      Object.assign(mockDb.user, updates);
      return mockResponse(mockDb.user);
    }
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.email !== undefined) body.email = updates.email;
    // Why: 前端 User.avatar 对应后端 avatarUrl
    if (updates.avatar !== undefined) body.avatarUrl = updates.avatar;
    const res = await api.patch<ProfileRaw>('/client/user/profile', body);
    return transformProfile(res.data);
  },

  // Why: 后端无 /client/coupons 端点（W6+ 才实现），暂保留 mock
  async getCoupons(): Promise<Coupon[]> {
    if (isMockMode) return mockResponse(mockDb.coupons);
    return mockResponse(mockDb.coupons);
  },
};
