import { isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { Address } from '@/types';

export const addressApi = {
  async getAddresses(): Promise<Address[]> {
    if (isMockMode) return mockResponse(mockDb.addresses);
    throw new Error('Real API not implemented');
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
    throw new Error('Real API not implemented');
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
    throw new Error('Real API not implemented');
  },
  async deleteAddress(id: string): Promise<void> {
    if (isMockMode) {
      mockDb.addresses = mockDb.addresses.filter((a) => a.id !== id);
      return mockResponse(undefined);
    }
    throw new Error('Real API not implemented');
  },
};
