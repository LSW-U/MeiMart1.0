import type { ClientCoupon } from '@/services/promotion';

// Why: 折扣 UI 统一方案 §4.2 - CouponCard 从旧 Coupon 改造到 ClientCoupon（后端契约）
export interface CouponCardProps {
  coupon: ClientCoupon;
  onPress?: (coupon: ClientCoupon) => void;
  onUse?: (coupon: ClientCoupon) => void;
  /**
   * 卡内主按钮动作（领券中心 B1 复用）：
   * - undefined：默认行为，available 态显示「Use Now」（调 onUse）
   * - 'claim'：显示「领取」按钮（调 onClaim），用于领券中心可领模板
   */
  action?: 'claim';
  onClaim?: (coupon: ClientCoupon) => void;
  /** 领取请求进行中（按钮 spinner + disabled） */
  claiming?: boolean;
  testID?: string;
}
