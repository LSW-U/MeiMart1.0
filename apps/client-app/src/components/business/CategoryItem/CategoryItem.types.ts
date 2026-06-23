import type { Category } from '@/types';

export interface CategoryItemProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  onPress?: (category: Category) => void;
  testID?: string;
}
