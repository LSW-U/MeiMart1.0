import type { Product } from '@/types';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';

// Why: 全局卡片统一方案 §9.3 - 瀑布流卡片（home 推荐用，两列错落）
export interface MasonryProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  badge?: ProductBadge;
  testID?: string;
}
