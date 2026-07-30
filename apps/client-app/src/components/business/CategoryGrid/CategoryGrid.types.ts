import type { Category } from '@/types';
import type { CategoryItemSize } from '@/components/business/CategoryItem/CategoryItem.types';
import type { PriceSize } from '@/components/ui/PriceText/PriceText.types';

export interface CategoryGridProps {
  categories: Category[];
  /** 每行几列，默认 4 */
  columns?: number;
  /** 单元格尺寸，默认 'md' */
  itemSize?: CategoryItemSize;
  onCategoryPress?: (category: Category) => void;
  /** Why: P6 V1f - 超 MAX_VISIBLE(7) 时第 8 格 More 的点击回调（跳全量分类页） */
  onMorePress?: () => void;
  testID?: string;
}

export type { PriceSize };
