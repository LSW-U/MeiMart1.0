import type { TrackingStep } from '@/types';

export interface OrderTimelineCardProps {
  steps: TrackingStep[];
  /** 当前进行到第几步（从 0 开始） */
  currentIndex?: number;
  /** 卡片标题，默认 t('order.progress') */
  title?: string;
  testID?: string;
}
