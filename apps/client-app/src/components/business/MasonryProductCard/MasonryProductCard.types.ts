import type { Product } from '@/types';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';

// Why: 全局卡片统一方案 §9.3 - 瀑布流卡片（home 推荐用，两列错落）
export interface MasonryProductCardProps {
  product: Product;
  onPress: () => void;
  /** 长按（favorites 长按进管理态用；home/search 不传无影响） */
  onLongPress?: () => void;
  onAddToCart: () => void;
  badge?: ProductBadge;
  testID?: string;
}
