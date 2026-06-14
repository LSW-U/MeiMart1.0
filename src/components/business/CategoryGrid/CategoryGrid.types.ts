import type { Category } from '@/types';
import type { PriceSize } from '@/components/ui/PriceText/PriceText.types';
import type { ComponentProps } from 'react';

type CategoryItemSize = ComponentProps<
  typeof import('@/components/business/CategoryItem/CategoryItem').CategoryItem
>['size'];

export interface CategoryGridProps {
  categories: Category[];
  /** 每行几列，默认 4 */
  columns?: number;
  /** 单元格尺寸，默认 'md' */
  itemSize?: CategoryItemSize;
  onCategoryPress?: (category: Category) => void;
  testID?: string;
}

export type { PriceSize };
