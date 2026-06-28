import { api, isMockMode } from './api';
import { mockResponse } from './mockDb';

// Why: pricing 是结算页校验起送价 + 配送费的关键端点（HTML 原型 CheckoutPage.html 有依赖）
export const pricingApi = {
  // Why: 起送价校验：金额不足时后端返回 warning，前端阻止下单并提示用户
  async checkMinOrder(amount: number): Promise<{ meetsMinimum: boolean; minimumAmount: number }> {
    if (isMockMode) {
      return mockResponse({ meetsMinimum: amount >= 1000, minimumAmount: 1000 });
    }
    const res = await api.get<{ meetsMinimum: boolean; minimumAmount: number }>(
      '/client/pricing/min-order-check',
      { params: { amount } },
    );
    return res.data;
  },

  // Why: 配送费按 addressId 查（PostGIS 距离 + 仓库 baseFee 计算）
  async getDeliveryFee(addressId: string): Promise<{ deliveryFee: number; warehouseCode: string | null }> {
    if (isMockMode) {
      return mockResponse({ deliveryFee: 500, warehouseCode: 'W01' });
    }
    const res = await api.get<{ deliveryFee: number; warehouseCode: string | null }>(
      '/client/pricing/delivery-fee',
      { params: { addressId } },
    );
    return res.data;
  },
};
