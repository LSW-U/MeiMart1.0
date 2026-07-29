import type { ClientCoupon } from '@/services/promotion';

// Why: 折扣 UI 统一方案 §4.1 - 从 checkout 内联 Modal 抽离的选券组件，复用 + 可测
export interface CouponPickerProps {
  visible: boolean;
  onClose: () => void;
  coupons: ClientCoupon[];
  /** 当前选中券 code（undefined = 未选/用「不使用券」） */
  selectedCode?: string;
  /** 选券（传 code）或清券（传 undefined），调用方驱动 preview 重查 */
  onSelect: (code: string | undefined) => void;
  testID?: string;
}
