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
  /**
   * Why: false 时内层渲染 View 而非 Pressable —— 管理态由外层 wrapper 统一接管点击
   * （Web 端 RNW PressResponder onClick 无条件 stopPropagation，内层空 Pressable 会吞事件，
   * 外层 toggleSelect 收不到点击，见 memory client-app-web-nested-pressable）
   */
  interactive?: boolean;
}
