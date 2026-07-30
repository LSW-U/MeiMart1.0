import type { Category } from '@/types';

export type CategoryItemSize = 'sm' | 'md' | 'lg';

export interface CategoryItemProps {
  category: Category;
  size?: CategoryItemSize;
  onPress?: (category: Category) => void;
  testID?: string;
}
