import type { Coupon } from '@/types';

export interface CouponCardProps {
  coupon: Coupon;
  onPress?: (coupon: Coupon) => void;
  onUse?: (coupon: Coupon) => void;
  testID?: string;
}
