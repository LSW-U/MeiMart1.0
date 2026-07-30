import { api, isMockMode } from './api';
import { mockDb, mockResponse, type MockCouponRaw } from './mockDb';
import type { PromotionTheme } from '@/theme';
import promotionsData from '../../mocks/data/promotions.json';

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
  // Why: 后端目前只返 'available'（B10，ACTIVE + 有效期内 + 未超额）；
  //      P2 后端补 ?status=used|expired 端点后扩联合，前端类型已就绪（见《优惠券 used/expired 端点-后端需求说明》）
  status: 'available' | 'used' | 'expired';
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

// Why: PromoDock 活动入口数据契约 — 后端 /client/home-entries 返回 Promotion[]，
//      前端按 theme 查 promotionThemes 取色（不让后端传 hex）。方案 §2.3 + §6.2。
export interface Promotion {
  id: string;
  /** 标题 i18n key（如 'promotion.flashDeals'），PromoDock 用 t(titleKey) 渲染 */
  titleKey: string;
  /** Material Symbols 图标名（自动映射） */
  icon: string;
  /** 主题枚举 — 决定图标盒底色 + 色条色（查 promotionThemes） */
  theme: PromotionTheme;
  /** 跳转路径 */
  link: string;
  /** 排序（后端控制） */
  sortOrder: number;
}

// Why: mock 模式把旧 mock 数据（MockCouponRaw，cp001 等）适配到 ClientCoupon 结构。
//      旧 mock 的 type 是 'fixed'/'percentage'，映射到后端枚举；code 用 id 大写作可读券码。
function adaptMockCoupon(c: MockCouponRaw): ClientCoupon {
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
  /**
   * 我的优惠券列表（GET /client/coupons?status=，B10 + used/expired 扩展 6dc4c81）
   * - available（默认）：ACTIVE + 有效期内 + 未超额
   * - used：当前用户用过的（OrderPromotion JOIN Order.userId，去重 + 最近使用 desc）
   * - expired：我用过且已过期（E2 语义，endAt < now）
   */
  async listCoupons(
    status: 'available' | 'used' | 'expired' = 'available',
  ): Promise<ClientCoupon[]> {
    if (isMockMode) {
      // Why: mock 无 used/expired 真实数据（mockDb.coupons 都是 available）；available 返全部，其余返空
      if (status === 'available') {
        return mockResponse(mockDb.coupons.map(adaptMockCoupon));
      }
      return mockResponse([]);
    }
    const res = await api.get<ClientCoupon[]>('/client/coupons', { params: { status } });
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

  /**
   * 活动入口列表（GET /client/home-entries，PromoDock 消费）
   * 横排功能停靠栏 — 常驻功能入口（Flash Deals / Coupons / Free Ship / Points），
   * 后端控制数量/排序/时效。过渡期 mock = 4 项常驻入口。
   */
  async getPromotions(): Promise<Promotion[]> {
    // Why: 后端 /client/home-entries 端点已就绪（home 模块，路线 A 配置接口，常驻 4 入口）。
    //      real 模式调真实端点；mock 模式返本地 promotions.json（4 项常驻入口，离线/降级用）。
    if (isMockMode) return mockResponse(promotionsData as Promotion[]);
    const res = await api.get<Promotion[]>('/client/home-entries');
    return res.data;
  },
};
