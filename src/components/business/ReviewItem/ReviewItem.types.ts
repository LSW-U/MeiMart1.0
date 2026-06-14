import type { Review } from '@/types';

export interface ReviewItemProps {
  review: Review;
  onPress?: (review: Review) => void;
  testID?: string;
}
