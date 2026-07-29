import type { ClientCoupon } from '@/services/promotion';

// Why: 折扣 UI 统一方案 §4.2 - CouponCard 从旧 Coupon 改造到 ClientCoupon（后端契约）
export interface CouponCardProps {
  coupon: ClientCoupon;
  onPress?: (coupon: ClientCoupon) => void;
  onUse?: (coupon: ClientCoupon) => void;
  testID?: string;
}
