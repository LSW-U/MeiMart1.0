import type { Product } from '@/types';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';

// Why: 全局卡片统一方案 §9.3 - 瀑布流卡片（home 推荐用，两列错落）
export interface MasonryProductCardProps {
  product: Product;
  /**
   * 批3 P2-2：签名统一 `(product) => void`——卡片内部调 onPress(product)，
   * 调用方直传稳定 handler（useCallback 不含 item 依赖），memo 浅比较才能命中。
   */
  onPress: (product: Product) => void;
  /** 长按（favorites 长按进管理态用；home/search 不传无影响）——同 onPress 口径 */
  onLongPress?: (product: Product) => void;
  /** 加购（同 onPress 口径：卡片内部调 onAddToCart(product)） */
  onAddToCart: (product: Product) => void;
  badge?: ProductBadge;
  /**
   * Why: 选择态（favorites 管理态）—— 右上角 select-circle + 选中红边（P19 原型 .selected）；
   * 传 selectMode 时加购钮换成选择圆圈，点按走 onPress（toggleSelect）
   */
  selectMode?: boolean;
  isSelected?: boolean;
  testID?: string;
}
