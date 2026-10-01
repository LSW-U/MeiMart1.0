import type { Product } from '@/types';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';

// Why: 全局卡片统一方案 §9 - 横向卡（categories Hot + product/list 共用）
export interface HorizontalProductCardProps {
  product: Product;
  /**
   * 点图/名跳详情。批3 P2-2：签名统一 `(product) => void`——卡片内部调 onPress(product)，
   * 调用方直传稳定 handler（useCallback [deps] 不含 item），memo 浅比较才能命中
   * （调用点包内联箭头 `() => go(item)` 会让 prop 引用恒新，memo 恒失效）。
   */
  onPress: (product: Product) => void;
  /** 加购（同 onPress 口径：卡片内部调 onAddToCart(product)） */
  onAddToCart: (product: Product) => void;
  /** 长按（favorites 列表态长按进管理；categories/product-list 不传无影响）—— 审查 Q4 对称补齐；同 onPress 口径 (product)=>void */
  onLongPress?: (product: Product) => void;
  /** 左上角 badge（resolveBadges 派生，§9-5） */
  badge?: ProductBadge;
  /** 是否显示评分（categories 显，product/list 不显） */
  showRating?: boolean;
  /** 加购请求进行中（P19 D4：本卡 spinner + disabled） */
  addPending?: boolean;
  /** 禁点加购但不转 spinner（P19 审查 Q4：他卡单飞行期间禁点所有卡，spinner 只在发起卡） */
  addDisabled?: boolean;
  /**
   * Why: 选择态（favorites 列表态进管理）—— 右侧加购位换 22² 选择圆圈，
   * 点按走 onPress（toggleSelect）；badge 隐藏（与 Masonry 管理态一致）
   */
  selectMode?: boolean;
  isSelected?: boolean;
  testID?: string;
}
