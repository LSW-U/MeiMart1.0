import type { Product } from '@/types';

export type ProductBadgeVariant =
  'fresh' | 'best-seller' | 'new' | 'top-rated' | 'local' | 'near-expiry';

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
  /**
   * 图片区固定高（px）。不传保持 aspectRatio: 1 正方形（默认，存量页面零影响）；
   * 搜索结果页传 176 对齐原型 SearchResultPage.html h-44（卡片压扁非正方形图）。
   */
  imageHeight?: number;
  /** 右上角收藏按钮（Fix-2） */
  showFavorite?: boolean;
  isFavorite?: boolean;
  onFavoritePress?: (product: Product) => void;
  testID?: string;
}
