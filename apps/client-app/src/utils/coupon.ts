import type { TFunction } from 'i18next';
import type { ClientCoupon } from '@/services/promotion';

// Why: 券折扣展示文案统一。checkout 选券 Modal + CouponCard 共用，避免两处各写一遍
//      （checkout 本地 copy 在 abdf964，抽到 util 消除重复 - 折扣 UI 统一方案 §5 D3-3）。

/**
 * 按 ClientCoupon.type 算可读折扣描述。
 * Why: PERCENTAGE/FIXED_AMOUNT 是数字+符号（格式化，非文案，可接受硬编码）；
 *      FREE_DELIVERY 是文案，走 i18n（审查报告 Q2，德顿语/中文用户不看英文）。
 */
export function formatCouponValue(
  coupon: Pick<ClientCoupon, 'type' | 'value'>,
  t: TFunction,
): string {
  switch (coupon.type) {
    case 'PERCENTAGE':
      return `${coupon.value}% OFF`;
    case 'FIXED_AMOUNT':
      return `-$${coupon.value}`;
    case 'FREE_DELIVERY':
      return t('checkout.coupon.freeDelivery', { defaultValue: 'FREE DELIVERY' });
    default:
      return '';
  }
}

