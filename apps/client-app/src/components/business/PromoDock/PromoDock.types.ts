import type { Promotion } from '@/services/promotion';

export interface PromoDockProps {
  /** 活动入口列表（usePromotions 返回，后端控制数量/排序/时效） */
  promotions: Promotion[];
  onPress?: (promotion: Promotion) => void;
  testID?: string;
}
