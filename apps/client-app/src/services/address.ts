import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { Address } from '@/types';

// Why: 后端 Address 字段结构差异：region 是嵌套 {province, city, district?}，前端是平铺。
// 设默认靠 PATCH /addresses/:id with isDefault: true（后端无独立端点）。
interface AddressRaw {
  id: string;
  name: string;
  phone: string;
  region: { province: string; city: string; district?: string | null };
  detail: string;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  tag?: string | null;
}

function transformAddress(raw: AddressRaw): Address {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    province: raw.region.province,
    city: raw.region.city,
    district: raw.region.district ?? '',
    detail: raw.detail,
    isDefault: raw.isDefault,
  };
}

// Why: 前端 Address → 后端 region 嵌套结构
function toAddressPayload(addr: Omit<Address, 'id'>): Record<string, unknown> {
  return {
    name: addr.name,
    phone: addr.phone,
    region: {
      province: addr.province,
      city: addr.city,
      ...(addr.district ? { district: addr.district } : {}),
    },
    detail: addr.detail,
    isDefault: addr.isDefault,
  };
}

export const addressApi = {
  async getAddresses(): Promise<Address[]> {
    if (isMockMode) return mockResponse(mockDb.addresses);
    const res = await api.get<AddressRaw[]>('/client/addresses');
    return res.data.map(transformAddress);
  },

  async createAddress(addr: Omit<Address, 'id'>): Promise<Address> {
    if (isMockMode) {
      const newAddr: Address = { ...addr, id: `a${Date.now()}` };
      if (newAddr.isDefault) {
        mockDb.addresses.forEach((a) => (a.isDefault = false));
      }
      mockDb.addresses.push(newAddr);
      return mockResponse(newAddr);
    }
    const res = await api.post<AddressRaw>('/client/addresses', toAddressPayload(addr));
    return transformAddress(res.data);
  },

  async updateAddress(id: string, updates: Partial<Address>): Promise<Address> {
    if (isMockMode) {
      const addr = mockDb.addresses.find((a) => a.id === id);
      if (addr) {
        if (updates.isDefault) {
          mockDb.addresses.forEach((a) => (a.isDefault = false));
        }
        Object.assign(addr, updates);
      }
      return mockResponse(addr as Address);
    }
    // Why: 后端 PATCH /addresses/:id 接受部分字段，前端 Partial<Address> 需把平铺转回嵌套 region
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.phone !== undefined) body.phone = updates.phone;
    if (updates.detail !== undefined) body.detail = updates.detail;
    if (updates.isDefault !== undefined) body.isDefault = updates.isDefault;
    if (updates.province !== undefined || updates.city !== undefined || updates.district !== undefined) {
      // Why: region 是整体更新，需要从老地址补全未传字段（避免部分更新丢失 province/city）
      const existing = mockDb.addresses.find((a) => a.id === id);
      body.region = {
        province: updates.province ?? existing?.province ?? '',
        city: updates.city ?? existing?.city ?? '',
        ...((updates.district ?? existing?.district) ? { district: updates.district ?? existing?.district } : {}),
      };
    }
    const res = await api.patch<AddressRaw>(`/client/addresses/${id}`, body);
    return transformAddress(res.data);
  },

  async deleteAddress(id: string): Promise<void> {
    if (isMockMode) {
      mockDb.addresses = mockDb.addresses.filter((a) => a.id !== id);
      return mockResponse(undefined);
    }
    await api.delete(`/client/addresses/${id}`);
  },
};
