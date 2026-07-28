import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';

// Why: 优惠券/促销 API 层。后端 first-tier-fix B10 已通：
//   GET  /api/v1/client/coupons       我的优惠券列表（available + 有效期内）
//   POST /api/v1/promotions/validate  实时校验券码算折扣（不 increment usedCount）
// 本 service 对齐后端 ClientCoupon schema；旧前端 Coupon 类型（mock 推导）保留给现有 cart/profile UI，
// 此处不动的目的是让 checkout 券选择 UI（待做）直接消费真实契约。

/** 后端 ClientCoupon schema（api-types.ts），GET /client/coupons 返回数组 */
export interface ClientCoupon {
  id: string;
  /** 券码（validate 入参用，旧前端 Coupon 无此字段） */
  code: string;
  name: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  /** 折扣值：PERCENTAGE 是百分比（8 = 8%），FIXED_AMOUNT 是金额，FREE_DELIVERY 免运 */
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  startAt: string;
  endAt: string;
  status: 'available';
}

export interface ValidateCouponInput {
  code: string;
  /** 订单金额（不含运费），后端用于校验 minOrderAmount */
  orderAmount: number;
  /** 运费（FREE_DELIVERY 类型算折扣用），可选 */
  deliveryFee?: number;
}

/** 后端 validate 响应：{ valid, discount, reason?, type? }，reason 仅 valid=false 时有值 */
export interface ValidateCouponResult {
  valid: boolean;
  /** 折扣金额（valid=true 时为实际折扣，valid=false 为 0） */
  discount: number;
  reason?: string;
  type?: string;
}

// Why: mock 模式把旧 Coupon（mockDb.coupons，cp001 等）适配到 ClientCoupon 结构。
//      旧 mock 的 type 是 'fixed'/'percentage'，映射到后端枚举；code 用 id 大写作可读券码。
function adaptMockCoupon(c: {
  id: string;
  name: string;
  discount: number;
  type: string;
  minPurchase: number;
  validUntil: string;
}): ClientCoupon {
  const typeMap: Record<string, ClientCoupon['type']> = {
    fixed: 'FIXED_AMOUNT',
    percentage: 'PERCENTAGE',
  };
  return {
    id: c.id,
    code: c.id.toUpperCase(),
    name: c.name,
    description: null,
    type: typeMap[c.type] ?? 'FIXED_AMOUNT',
    value: c.discount,
    minOrderAmount: c.minPurchase,
    maxDiscountAmount: null,
    startAt: new Date().toISOString(),
    endAt: c.validUntil,
    status: 'available',
  };
}

export const promotionApi = {
  /** 我的优惠券列表（GET /client/coupons，B10） */
  async listCoupons(): Promise<ClientCoupon[]> {
    if (isMockMode) {
      return mockResponse(mockDb.coupons.map(adaptMockCoupon));
    }
    const res = await api.get<ClientCoupon[]>('/client/coupons');
    return res.data;
  },

  /**
   * 校验券码算折扣（POST /promotions/validate，W7-ext-G P1-3）
   * 购物车/结算页实时预览，不消耗 usedCount。
   */
  async validate(input: ValidateCouponInput): Promise<ValidateCouponResult> {
    if (isMockMode) {
      // Why: mock 按 code 找券，满 minOrderAmount 则有效，按 type 算折扣
      const coupon = mockDb.coupons.find(
        (c) => c.id.toUpperCase() === input.code || c.id === input.code,
      );
      if (!coupon) {
        return mockResponse({ valid: false, discount: 0, reason: 'NOT_FOUND' });
      }
      if (input.orderAmount < coupon.minPurchase) {
        return mockResponse({ valid: false, discount: 0, reason: 'MIN_NOT_MET' });
      }
      const discount =
        coupon.type === 'percentage'
          ? Math.round((input.orderAmount * coupon.discount) / 100)
          : coupon.discount;
      return mockResponse({ valid: true, discount, type: coupon.type });
    }
    const res = await api.post<ValidateCouponResult>('/promotions/validate', input);
    return res.data;
  },
};
