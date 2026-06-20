import { isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { PaymentMethod } from '@/types';

/**
 * 支付方式 API
 *
 * 后端契约（待实现）：
 *   GET /api/payments/methods
 *     → 200 PaymentMethod[]
 *
 * 字段说明见 src/types/index.ts 的 PaymentMethod 接口
 */
export const paymentApi = {
  async getMethods(): Promise<PaymentMethod[]> {
    if (isMockMode) return mockResponse(mockDb.payments);
    throw new Error('Real API not implemented');
  },
};
