import type { TFunction } from 'i18next';
import { formatPrice } from '@/utils/format';
import type { ClientCoupon } from '@/services/promotion';

// Why: 券折扣展示文案统一。checkout 选券 Modal + CouponCard 共用，避免两处各写一遍
//      （checkout 本地 copy 在 abdf964，抽到 util 消除重复 - 折扣 UI 统一方案 §5 D3-3）。

/**
 * 按 ClientCoupon.type 算可读折扣描述。
 * Why: PERCENTAGE/FIXED_AMOUNT 的数字+符号是格式化非文案；但 `OFF` 是英文单词，
 *      属文案（模块方案 D5 拍板：OFF 走翻译）。FREE_DELIVERY 同理走 i18n。
 */
export function formatCouponValue(
  coupon: Pick<ClientCoupon, 'type' | 'value'>,
  t: TFunction,
): string {
  switch (coupon.type) {
    case 'PERCENTAGE':
      return `${coupon.value}% ${t('coupons.off', { defaultValue: 'OFF' })}`;
    case 'FIXED_AMOUNT':
      // Why: 批2 手拼清零（M3）——原 `-$${coupon.value}` 裸拼无千分位/无位数规整；
      //      sign 档 + 负值入参（rider 版语义）产出 `-$5.00`，与原展示一致。
      return formatPrice(-coupon.value, 'USD', 2, { sign: true });
    case 'FREE_DELIVERY':
      return t('checkout.coupon.freeDelivery', { defaultValue: 'FREE DELIVERY' });
    default:
      return '';
  }
}
