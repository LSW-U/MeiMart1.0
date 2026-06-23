import type { Product } from '@/types';

export type ProductBadgeVariant = 'fresh' | 'best-seller' | 'new' | 'top-rated' | 'local';

export interface ProductBadge {
  label: string;
  variant: ProductBadgeVariant;
}

export interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  /** 左上角彩色角标 */
  badge?: ProductBadge;
  /** 右上角收藏按钮（Fix-2） */
  showFavorite?: boolean;
  isFavorite?: boolean;
  onFavoritePress?: (product: Product) => void;
  testID?: string;
}
