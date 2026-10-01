import type { Product } from '@/types';

// Why: 全局卡片统一方案 §4 - 横滑小卡统一组件（home Buy Again + cart People Also Bought）
export interface SmallProductCardProps {
  product: Product;
  /**
   * 批3 P2-2：签名统一 `(product) => void`——卡片内部调 onPress(product)，
   * 调用方直传稳定 handler（useCallback 不含 item 依赖），memo 浅比较才能命中。
   */
  onPress: (product: Product) => void;
  /** 加购（同 onPress 口径：卡片内部调 onAddToCart(product)） */
  onAddToCart: (product: Product) => void;
  testID?: string;
}
