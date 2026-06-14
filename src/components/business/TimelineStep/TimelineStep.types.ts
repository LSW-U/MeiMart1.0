import type { TrackingStep } from '@/types';

export interface TimelineStepProps {
  steps: TrackingStep[];
  /** 当前进行到第几步（从 0 开始） */
  currentIndex?: number;
  testID?: string;
}
