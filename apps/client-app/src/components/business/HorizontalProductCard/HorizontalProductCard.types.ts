import type { Product } from '@/types';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';

// Why: 全局卡片统一方案 §9 - 横向卡（categories Hot + product/list 共用）
export interface HorizontalProductCardProps {
  product: Product;
  onPress: () => void; // 点图/名跳详情
  onAddToCart: () => void; // 加购
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
