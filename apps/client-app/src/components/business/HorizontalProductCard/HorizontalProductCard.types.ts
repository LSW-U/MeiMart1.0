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
  /** 加购请求进行中（P19 D4：页面控制对应商品加购按钮 loading/disabled，防重复提交） */
  addPending?: boolean;
  testID?: string;
}
